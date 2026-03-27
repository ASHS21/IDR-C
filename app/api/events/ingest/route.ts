import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identityEvents, identities } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { unauthorized, forbidden, badRequest } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'analyst')) return forbidden()

    const orgId = session.user.orgId
    const body = await req.json().catch(() => null)

    if (!body || !Array.isArray(body.events)) {
      return badRequest('Expected { events: [...] } array')
    }

    const events = body.events as any[]
    if (events.length === 0) {
      return NextResponse.json({ inserted: 0 })
    }

    if (events.length > 1000) {
      return badRequest('Maximum 1000 events per batch')
    }

    // Resolve identities by UPN/email/samAccountName
    const resolvedEvents: (typeof identityEvents.$inferInsert)[] = []

    for (const event of events) {
      if (!event.eventType || !event.source || !event.eventTimestamp) continue

      let identityId: string | undefined = event.identityId

      // If no identityId provided, try to resolve from parsed fields
      if (!identityId) {
        const upn = event.parsedFields?.upn || event.upn
        const email = event.parsedFields?.email || event.email
        const sam = event.parsedFields?.samAccountName || event.samAccountName

        if (upn || email || sam) {
          const conditions = []
          if (upn) conditions.push(eq(identities.upn, upn))
          if (email) conditions.push(eq(identities.email, email))
          if (sam) conditions.push(eq(identities.samAccountName, sam))

          const [found] = await db
            .select({ id: identities.id })
            .from(identities)
            .where(and(eq(identities.orgId, orgId), or(...conditions)))
            .limit(1)

          identityId = found?.id
        }
      }

      resolvedEvents.push({
        eventType: event.eventType,
        source: event.source,
        identityId: identityId || null,
        rawEvent: event.rawEvent || event,
        parsedFields: event.parsedFields || {
          ipAddress: event.ipAddress,
          location: event.location,
          userAgent: event.userAgent,
          result: event.result,
          mfaMethod: event.mfaMethod,
          riskLevel: event.riskLevel,
          targetResource: event.targetResource,
          eventId: event.eventId,
          sessionId: event.sessionId,
        },
        eventTimestamp: new Date(event.eventTimestamp),
        orgId,
      })
    }

    if (resolvedEvents.length === 0) {
      return badRequest('No valid events to insert')
    }

    // Batch insert
    const inserted = await db.insert(identityEvents).values(resolvedEvents).returning({ id: identityEvents.id })

    return NextResponse.json({
      inserted: inserted.length,
      resolved: resolvedEvents.filter(e => e.identityId).length,
      unresolved: resolvedEvents.filter(e => !e.identityId).length,
    })
  } catch (err: any) {
    console.error('[Events Ingest] Error:', err)
    return NextResponse.json({ error: 'Event ingestion failed', details: err.message }, { status: 500 })
  }
}
