import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { integrationSources, actionLog } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createConnector } from '@/lib/connectors/factory'
import { syncToDatabase } from '@/lib/connectors/transformer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { source: sourceType } = await params

  let body: { integrationId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { integrationId } = body
  if (!integrationId) {
    return NextResponse.json({ error: 'integrationId is required' }, { status: 400 })
  }

  // Verify the integration belongs to this org
  const [integration] = await db
    .select()
    .from(integrationSources)
    .where(
      and(
        eq(integrationSources.id, integrationId),
        eq(integrationSources.orgId, session.user.orgId)
      )
    )

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Set status to syncing
  await db
    .update(integrationSources)
    .set({ syncStatus: 'syncing' })
    .where(eq(integrationSources.id, integrationId))

  try {
    // Create connector from stored config
    const config = (integration.config || {}) as Record<string, string>
    const connector = createConnector({
      type: integration.type as any,
      credentials: config,
    })

    // Extract data from source
    const [rawIdentities, rawGroups] = await Promise.all([
      connector.extractIdentities(),
      connector.extractGroups(),
    ])

    // Transform and load into database
    const result = await syncToDatabase(
      session.user.orgId,
      integration.type,
      rawIdentities,
      rawGroups,
    )

    // Update integration status
    const now = new Date()
    await db
      .update(integrationSources)
      .set({
        syncStatus: result.errors.length > 0 ? 'error' : 'connected',
        lastSyncAt: now,
        lastSyncRecordCount: result.identitiesUpserted + result.groupsUpserted,
      })
      .where(eq(integrationSources.id, integrationId))

    // Log the action
    await db.insert(actionLog).values({
      actionType: 'sync_source',
      actorIdentityId: session.user.id,
      source: 'manual',
      orgId: session.user.orgId,
      payload: {
        integrationId,
        sourceType,
        integrationName: integration.name,
        result,
      },
      rationale: `Sync completed: ${result.identitiesUpserted} identities, ${result.groupsUpserted} groups (${result.duration}ms)`,
    })

    return NextResponse.json({
      success: true,
      result,
      integration: {
        id: integrationId,
        syncStatus: result.errors.length > 0 ? 'error' : 'connected',
        lastSyncAt: now.toISOString(),
        lastSyncRecordCount: result.identitiesUpserted + result.groupsUpserted,
      },
    })
  } catch (err: any) {
    // Mark as error
    await db
      .update(integrationSources)
      .set({ syncStatus: 'error' })
      .where(eq(integrationSources.id, integrationId))

    // Log the failure
    await db.insert(actionLog).values({
      actionType: 'sync_source',
      actorIdentityId: session.user.id,
      source: 'manual',
      orgId: session.user.orgId,
      payload: { integrationId, sourceType, error: err.message },
      rationale: `Sync failed for ${integration.name}: ${err.message}`,
    })

    return NextResponse.json({
      success: false,
      error: err.message,
      integration: { id: integrationId, syncStatus: 'error' },
    }, { status: 500 })
  }
}
