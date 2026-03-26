import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { identities } from '@/lib/db/schema'
import { eq, and, lt, sql } from 'drizzle-orm'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ninetyDaysAgo = sql`now() - interval '90 days'`

    const result = await db
      .update(identities)
      .set({ status: 'dormant', updatedAt: new Date() })
      .where(
        and(
          eq(identities.status, 'active'),
          lt(identities.lastLogonAt, ninetyDaysAgo)
        )
      )
      .returning({ id: identities.id })

    return NextResponse.json({
      success: true,
      message: `Flagged ${result.length} identities as dormant`,
      count: result.length,
    })
  } catch (error) {
    console.error('Dormancy detector cron error:', error)
    return NextResponse.json(
      { success: false, message: 'Dormancy detector failed', error: String(error) },
      { status: 500 }
    )
  }
}
