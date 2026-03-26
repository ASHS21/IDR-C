import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { identities, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { recalculateRiskForIdentity } from '@/lib/risk/scorer'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow all in dev when no secret is set
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allOrgs = await db.select({ id: organizations.id }).from(organizations)
    let totalUpdated = 0

    for (const org of allOrgs) {
      const orgIdentities = await db
        .select({ id: identities.id })
        .from(identities)
        .where(eq(identities.orgId, org.id))

      for (const identity of orgIdentities) {
        await recalculateRiskForIdentity(identity.id, org.id)
        totalUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated risk scores for ${totalUpdated} identities`,
      count: totalUpdated,
    })
  } catch (error) {
    console.error('Risk scorer cron error:', error)
    return NextResponse.json(
      { success: false, message: 'Risk scorer failed', error: String(error) },
      { status: 500 }
    )
  }
}
