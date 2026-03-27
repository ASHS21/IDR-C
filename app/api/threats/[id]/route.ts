import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identityThreats, identities, detectionRules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { logAction, unauthorized, forbidden, badRequest } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()

    const orgId = session.user.orgId
    const { id } = params

    const [threat] = await db
      .select()
      .from(identityThreats)
      .where(and(eq(identityThreats.id, id), eq(identityThreats.orgId, orgId)))
      .limit(1)

    if (!threat) {
      return NextResponse.json({ error: 'Threat not found' }, { status: 404 })
    }

    // Load linked identity
    const [identity] = await db
      .select()
      .from(identities)
      .where(eq(identities.id, threat.identityId))
      .limit(1)

    // Load detection rule if present
    let rule = null
    if (threat.detectionRuleId) {
      const [r] = await db
        .select()
        .from(detectionRules)
        .where(eq(detectionRules.id, threat.detectionRuleId))
        .limit(1)
      rule = r || null
    }

    return NextResponse.json({ threat, identity, detectionRule: rule })
  } catch (err: any) {
    console.error('[Threat GET] Error:', err)
    return NextResponse.json({ error: 'Failed to load threat', details: err.message }, { status: 500 })
  }
}

const VALID_STATUSES = ['active', 'investigating', 'contained', 'resolved', 'false_positive'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'analyst')) return forbidden()

    const orgId = session.user.orgId
    const { id } = params
    const body = await req.json().catch(() => null)
    if (!body) return badRequest('Invalid request body')

    const { status, rationale } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    // Verify threat belongs to org
    const [existing] = await db
      .select({ id: identityThreats.id, identityId: identityThreats.identityId })
      .from(identityThreats)
      .where(and(eq(identityThreats.id, id), eq(identityThreats.orgId, orgId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Threat not found' }, { status: 404 })
    }

    const updates: Partial<typeof identityThreats.$inferInsert> = {
      status: status as any,
    }

    if (status === 'resolved' || status === 'false_positive') {
      updates.resolvedAt = new Date()
      updates.resolvedBy = session.user.id
    }

    const [updated] = await db
      .update(identityThreats)
      .set(updates)
      .where(eq(identityThreats.id, id))
      .returning()

    await logAction({
      actionType: 'acknowledge_violation',
      actorIdentityId: session.user.id,
      orgId,
      targetIdentityId: existing.identityId,
      rationale: rationale || `Threat status changed to ${status}`,
      payload: { threatId: id, newStatus: status },
      source: 'manual',
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[Threat PATCH] Error:', err)
    return NextResponse.json({ error: 'Failed to update threat', details: err.message }, { status: 500 })
  }
}
