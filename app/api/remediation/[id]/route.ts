import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { db } from '@/lib/db'
import { remediationPlans } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { executeApprovedActions } from '@/lib/remediation/tier-proposals'
import { logAction } from '@/lib/actions/helpers'

/**
 * GET /api/remediation/[id]
 *
 * Get a single remediation plan with all its proposed actions.
 */
export const GET = withApiHandler(async (
  req: NextRequest,
  { orgId, log },
) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const [plan] = await db.select()
    .from(remediationPlans)
    .where(and(eq(remediationPlans.id, id), eq(remediationPlans.orgId, orgId)))
    .limit(1)

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  return NextResponse.json({ plan })
})

/**
 * PUT /api/remediation/[id]
 *
 * Approve or reject a remediation plan.
 *
 * Body:
 *   { action: 'approve' }  — Approves the plan and executes all actions
 *   { action: 'reject', reason: '...' }  — Rejects the plan with rationale
 *
 * Only CISO or Admin can approve/reject plans.
 */
export const PUT = withApiHandler(async (
  req: NextRequest,
  { orgId, session, log },
) => {
  const id = req.nextUrl.pathname.split('/').pop()!
  const body = await req.json()
  const { action, reason } = body

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Use "approve" or "reject"' },
      { status: 400 }
    )
  }

  // Fetch the plan
  const [plan] = await db.select()
    .from(remediationPlans)
    .where(and(eq(remediationPlans.id, id), eq(remediationPlans.orgId, orgId)))
    .limit(1)

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.status !== 'draft') {
    return NextResponse.json(
      { error: `Plan is already '${plan.status}'. Only draft plans can be approved/rejected.` },
      { status: 409 }
    )
  }

  if (action === 'reject') {
    // Reject the plan
    await db.update(remediationPlans)
      .set({ status: 'rejected' })
      .where(eq(remediationPlans.id, id))

    await logAction({
      actionType: 'generate_recommendation',
      actorIdentityId: session.user.id,
      orgId,
      rationale: `Remediation plan rejected: ${reason || 'No reason provided'}`,
      payload: { planId: id, action: 'rejected', reason },
    })

    log.info('Remediation plan rejected', { planId: id, reason })

    return NextResponse.json({ success: true, planId: id, status: 'rejected' })
  }

  // Approve the plan
  await db.update(remediationPlans)
    .set({
      status: 'approved',
      approvedBy: session.user.id,
      approvedAt: new Date(),
    })
    .where(eq(remediationPlans.id, id))

  await logAction({
    actionType: 'generate_recommendation',
    actorIdentityId: session.user.id,
    orgId,
    rationale: 'Remediation plan approved — executing actions',
    payload: { planId: id, action: 'approved' },
  })

  // Execute the approved actions
  const result = await executeApprovedActions(id, orgId, session.user.id)

  log.info('Remediation plan approved and executed', {
    planId: id,
    executed: result.executed,
    failed: result.failed,
  })

  return NextResponse.json({
    success: true,
    planId: id,
    status: 'completed',
    execution: result,
  })
}, { requiredRole: 'ciso' })
