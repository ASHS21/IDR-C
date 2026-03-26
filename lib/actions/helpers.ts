import { db } from '@/lib/db'
import { actionLog } from '@/lib/db/schema'

export async function logAction(params: {
  actionType: typeof actionLog.$inferInsert['actionType']
  actorIdentityId: string
  orgId: string
  targetIdentityId?: string | null
  targetEntitlementId?: string | null
  targetPolicyViolationId?: string | null
  payload?: any
  rationale?: string | null
  source?: typeof actionLog.$inferInsert['source']
}) {
  return db.insert(actionLog).values({
    actionType: params.actionType,
    actorIdentityId: params.actorIdentityId,
    orgId: params.orgId,
    targetIdentityId: params.targetIdentityId ?? undefined,
    targetEntitlementId: params.targetEntitlementId ?? undefined,
    targetPolicyViolationId: params.targetPolicyViolationId ?? undefined,
    payload: params.payload ?? {},
    rationale: params.rationale ?? undefined,
    source: params.source ?? 'manual',
  }).returning()
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export function badRequest(message: string, details?: any) {
  return Response.json({ error: message, details }, { status: 400 })
}
