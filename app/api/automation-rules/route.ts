import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { automationRules } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rules = await db.select()
    .from(automationRules)
    .where(eq(automationRules.orgId, session.user.orgId))
    .orderBy(desc(automationRules.createdAt))

  return NextResponse.json({ rules })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.appRole as AppRole | undefined
  if (!userRole || !hasRole(userRole, 'iam_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description, triggerType, triggerCondition, actionType, actionParams, notifyTargets } = body

    if (!name || !triggerType || !triggerCondition || !actionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const [rule] = await db.insert(automationRules).values({
      name,
      description: description || null,
      triggerType,
      triggerCondition,
      actionType,
      actionParams: actionParams || {},
      notifyTargets: notifyTargets || [],
      enabled: true,
      createdBy: (session.user as any).id,
      orgId: session.user.orgId,
    }).returning()

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Create automation rule error:', error)
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }
}
