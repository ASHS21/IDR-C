import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { briefings } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.orgId
  const latest = req.nextUrl.searchParams.get('latest')
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '10')

  if (latest === 'true') {
    const [latestBriefing] = await db.select()
      .from(briefings)
      .where(eq(briefings.orgId, orgId))
      .orderBy(desc(briefings.generatedAt))
      .limit(1)

    return NextResponse.json(latestBriefing || null)
  }

  const offset = (page - 1) * pageSize
  const data = await db.select()
    .from(briefings)
    .where(eq(briefings.orgId, orgId))
    .orderBy(desc(briefings.generatedAt))
    .limit(pageSize)
    .offset(offset)

  return NextResponse.json({ data, page, pageSize })
}
