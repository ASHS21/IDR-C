import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { webhookEndpoints } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhooks = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.orgId, session.user.orgId))

  return NextResponse.json({ webhooks })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, url, secret, events } = body

  if (!name || !url || !events?.length) {
    return NextResponse.json({ error: 'Missing required fields: name, url, events' }, { status: 400 })
  }

  const [created] = await db.insert(webhookEndpoints).values({
    name,
    url,
    secret: secret || null,
    events,
    orgId: session.user.orgId,
  }).returning()

  return NextResponse.json(created, { status: 201 })
}
