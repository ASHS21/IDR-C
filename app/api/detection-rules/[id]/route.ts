import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { detectionRules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { unauthorized, forbidden, badRequest } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()

    const [rule] = await db
      .select()
      .from(detectionRules)
      .where(and(eq(detectionRules.id, params.id), eq(detectionRules.orgId, session.user.orgId)))
      .limit(1)

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json(rule)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load rule', details: err.message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) return forbidden()

    const body = await req.json().catch(() => null)
    if (!body) return badRequest('Invalid request body')

    const [existing] = await db
      .select({ id: detectionRules.id })
      .from(detectionRules)
      .where(and(eq(detectionRules.id, params.id), eq(detectionRules.orgId, session.user.orgId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const [updated] = await db
      .update(detectionRules)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.threatType !== undefined && { threatType: body.threatType }),
        ...(body.killChainPhase !== undefined && { killChainPhase: body.killChainPhase }),
        ...(body.severity !== undefined && { severity: body.severity }),
        ...(body.logic !== undefined && { logic: body.logic }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.mitreTechniqueIds !== undefined && { mitreTechniqueIds: body.mitreTechniqueIds }),
        updatedAt: new Date(),
      })
      .where(eq(detectionRules.id, params.id))
      .returning()

    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update rule', details: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) return forbidden()

    const [existing] = await db
      .select({ id: detectionRules.id })
      .from(detectionRules)
      .where(and(eq(detectionRules.id, params.id), eq(detectionRules.orgId, session.user.orgId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    await db.delete(detectionRules).where(eq(detectionRules.id, params.id))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete rule', details: err.message }, { status: 500 })
  }
}
