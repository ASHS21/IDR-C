import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { integrationSources } from '@/lib/db/schema'
import { executeSync } from '@/lib/connectors/sync-engine'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body?.fileContent || !body?.mapping) {
      return NextResponse.json(
        { error: 'fileContent and mapping are required' },
        { status: 400 },
      )
    }

    const { fileContent, mapping } = body as {
      fileContent: string
      mapping: Record<string, string>
    }
    const orgId = session.user.orgId

    // Create a temporary integration source for this CSV import
    const [integration] = await db
      .insert(integrationSources)
      .values({
        name: `CSV Import ${new Date().toISOString().slice(0, 16)}`,
        type: 'manual' as any,
        config: {},
        syncStatus: 'syncing',
        syncFrequencyMinutes: 0,
        orgId,
      })
      .returning()

    // Execute sync through the sync engine with column mapping
    const report = await executeSync({
      orgId,
      integrationId: integration.id,
      config: {
        type: 'csv',
        credentials: {
          fileContent,
          columnMapping: JSON.stringify(mapping),
        },
      },
      skipReconcile: true, // CSV imports don't need reconciliation
    })

    return NextResponse.json({
      success: true,
      integrationId: integration.id,
      report: {
        identitiesUpserted: report.identitiesUpserted,
        groupsUpserted: report.groupsUpserted,
        entitlementsUpserted: report.entitlementsUpserted,
        errors: report.errors,
        duration: report.duration,
      },
    })
  } catch (err: any) {
    console.error('[CSV Import] Error:', err)
    return NextResponse.json(
      { error: 'Import failed', details: err.message },
      { status: 500 },
    )
  }
}
