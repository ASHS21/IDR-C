import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { eq, and, desc, count, SQL } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(params.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  const conditions: SQL[] = [
    eq(notifications.orgId, session.user.orgId),
    eq(notifications.userId, session.user.id),
  ]
  const where = and(...conditions)

  const [notificationList, totalResult, unreadResult] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(notifications).where(where),
    db.select({ total: count() }).from(notifications).where(
      and(...conditions, eq(notifications.read, false))
    ),
  ])

  return NextResponse.json({
    data: notificationList,
    total: totalResult[0]?.total ?? 0,
    unreadCount: unreadResult[0]?.total ?? 0,
    page,
    pageSize,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { userId, type, title, message, severity, link, metadata } = body

  if (!userId || !type || !title || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [created] = await db.insert(notifications).values({
    orgId: session.user.orgId,
    userId,
    type,
    title,
    message,
    severity: severity || 'info',
    link: link || null,
    metadata: metadata || null,
  }).returning()

  return NextResponse.json(created, { status: 201 })
}
