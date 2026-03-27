import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { shadowAdmins, identities, actionLog } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['confirmed', 'dismissed', 'remediated']),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const [result] = await db
      .select({
        id: shadowAdmins.id,
        identityId: shadowAdmins.identityId,
        identityName: identities.displayName,
        identityType: identities.type,
        identitySubType: identities.subType,
        identityTier: identities.adTier,
        identityRiskScore: identities.riskScore,
        detectionMethod: shadowAdmins.detectionMethod,
        detectionReasons: shadowAdmins.detectionReasons,
        effectiveRights: shadowAdmins.effectiveRights,
        equivalentToGroups: shadowAdmins.equivalentToGroups,
        riskScore: shadowAdmins.riskScore,
        status: shadowAdmins.status,
        confirmedBy: shadowAdmins.confirmedBy,
        confirmedAt: shadowAdmins.confirmedAt,
        detectedAt: shadowAdmins.detectedAt,
      })
      .from(shadowAdmins)
      .innerJoin(identities, eq(shadowAdmins.identityId, identities.id))
      .where(and(eq(shadowAdmins.id, id), eq(shadowAdmins.orgId, session.user.orgId)))

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Shadow admin detail error:', error)
    return NextResponse.json({ error: 'Failed to load shadow admin' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const [existing] = await db
      .select()
      .from(shadowAdmins)
      .where(and(eq(shadowAdmins.id, id), eq(shadowAdmins.orgId, session.user.orgId)))

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.update(shadowAdmins)
      .set({
        status: parsed.data.status,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shadowAdmins.id, id))

    // Log to action_log
    await db.insert(actionLog).values({
      actionType: 'acknowledge_violation',
      actorIdentityId: existing.identityId, // use the shadow admin's identity as a reference
      targetIdentityId: existing.identityId,
      payload: {
        shadowAdminId: id,
        previousStatus: existing.status,
        newStatus: parsed.data.status,
        detectionMethod: existing.detectionMethod,
      },
      rationale: `Shadow admin status changed to ${parsed.data.status}`,
      source: 'manual',
      orgId: session.user.orgId,
    })

    return NextResponse.json({ success: true, status: parsed.data.status })
  } catch (error) {
    console.error('Shadow admin patch error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
