import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { detectionRules } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { unauthorized, forbidden, badRequest } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()

    const rules = await db
      .select()
      .from(detectionRules)
      .where(eq(detectionRules.orgId, session.user.orgId))

    return NextResponse.json({ rules })
  } catch (err: any) {
    console.error('[Detection Rules GET] Error:', err)
    return NextResponse.json({ error: 'Failed to load detection rules', details: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) return forbidden()

    const body = await req.json().catch(() => null)
    if (!body) return badRequest('Invalid request body')

    const { name, description, threatType, killChainPhase, severity, logic, mitreTechniqueIds } = body

    if (!name || !description || !threatType || !killChainPhase || !severity || !logic) {
      return badRequest('Required: name, description, threatType, killChainPhase, severity, logic')
    }

    const [rule] = await db.insert(detectionRules).values({
      name,
      description,
      threatType,
      killChainPhase,
      severity,
      logic,
      mitreTechniqueIds: mitreTechniqueIds || [],
      orgId: session.user.orgId,
    }).returning()

    return NextResponse.json(rule, { status: 201 })
  } catch (err: any) {
    console.error('[Detection Rules POST] Error:', err)
    return NextResponse.json({ error: 'Failed to create rule', details: err.message }, { status: 500 })
  }
}
