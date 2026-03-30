import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { automationRules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [rule] = await db.select()
    .from(automationRules)
    .where(and(
      eq(automationRules.id, id),
      eq(automationRules.orgId, session.user.orgId),
    ))
    .limit(1)

  if (!rule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(rule)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.appRole as AppRole | undefined
  if (!userRole || !hasRole(userRole, 'iam_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const updates: Record<string, any> = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.triggerType !== undefined) updates.triggerType = body.triggerType
    if (body.triggerCondition !== undefined) updates.triggerCondition = body.triggerCondition
    if (body.actionType !== undefined) updates.actionType = body.actionType
    if (body.actionParams !== undefined) updates.actionParams = body.actionParams
    if (body.notifyTargets !== undefined) updates.notifyTargets = body.notifyTargets
    if (body.enabled !== undefined) updates.enabled = body.enabled

    const [rule] = await db.update(automationRules)
      .set(updates)
      .where(and(
        eq(automationRules.id, id),
        eq(automationRules.orgId, session.user.orgId),
      ))
      .returning()

    if (!rule) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Update automation rule error:', error)
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.appRole as AppRole | undefined
  if (!userRole || !hasRole(userRole, 'iam_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [rule] = await db.delete(automationRules)
    .where(and(
      eq(automationRules.id, id),
      eq(automationRules.orgId, session.user.orgId),
    ))
    .returning()

  if (!rule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
