import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { integrationSources } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { executeSync } from '@/lib/connectors/sync-engine'
import type { SyncProgress } from '@/lib/connectors/base'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const integrationId = req.nextUrl.searchParams.get('integrationId')
  if (!integrationId) {
    return new Response(JSON.stringify({ error: 'integrationId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const orgId = session.user.orgId

  // Verify integration belongs to this org
  const [integration] = await db
    .select()
    .from(integrationSources)
    .where(
      and(
        eq(integrationSources.id, integrationId),
        eq(integrationSources.orgId, orgId),
      ),
    )

  if (!integration) {
    return new Response(JSON.stringify({ error: 'Integration not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const config = (integration.config || {}) as Record<string, string>

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Stream may be closed
        }
      }

      const onProgress: (progress: SyncProgress) => void = (progress) => {
        sendEvent({
          phase: progress.phase,
          progress: progress.current,
          total: progress.total,
          message: progress.message,
        })
      }

      executeSync({
        orgId,
        integrationId,
        config: {
          type: integration.type as any,
          credentials: config,
        },
        onProgress,
      })
        .then((report) => {
          sendEvent({
            phase: 'complete',
            summary: {
              identitiesUpserted: report.identitiesUpserted,
              groupsUpserted: report.groupsUpserted,
              entitlementsUpserted: report.entitlementsUpserted,
              errors: report.errors,
              duration: report.duration,
            },
          })
          controller.close()
        })
        .catch((err) => {
          sendEvent({
            phase: 'error',
            error: err.message || 'Sync failed',
          })
          controller.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
