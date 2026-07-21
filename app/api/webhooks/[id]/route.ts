import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { webhookEndpoints } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { sendWebhook } from '@/lib/webhooks/sender'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'
import { assertSafeConnectorUrl } from '@/lib/connectors/url-guard'

const isAdmin = (session: any) => hasRole((session?.user as any)?.appRole as AppRole, 'iam_admin')

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const [webhook] = await db
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, session.user.orgId)))
    .limit(1)

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  const { secret, ...rest } = webhook
  return NextResponse.json({ ...rest, hasSecret: !!secret })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden: iam_admin role required' }, { status: 403 })
  }

  const { id } = params
  const body = await req.json()
  const { name, url, secret, events, enabled } = body

  if (url !== undefined) {
    try {
      assertSafeConnectorUrl(url)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid webhook URL' }, { status: 400 })
    }
  }

  const [existing] = await db
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, session.user.orgId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  const updates: Partial<typeof webhookEndpoints.$inferInsert> = {}
  if (name !== undefined) updates.name = name
  if (url !== undefined) updates.url = url
  if (secret !== undefined) updates.secret = secret
  if (events !== undefined) updates.events = events
  if (enabled !== undefined) updates.enabled = enabled

  const [updated] = await db
    .update(webhookEndpoints)
    .set(updates)
    .where(eq(webhookEndpoints.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden: iam_admin role required' }, { status: 403 })
  }

  const { id } = params

  const [existing] = await db
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, session.user.orgId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id))

  return NextResponse.json({ success: true })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden: iam_admin role required' }, { status: 403 })
  }

  const { id } = params

  const [webhook] = await db
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, session.user.orgId)))
    .limit(1)

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  // Re-validate at send time: guards legacy rows stored before the SSRF check existed.
  try {
    assertSafeConnectorUrl(webhook.url)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Webhook URL is not allowed' }, { status: 400 })
  }

  const testPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from Identity Radar',
      webhookName: webhook.name,
    },
  }

  const success = await sendWebhook(webhook.url, testPayload, webhook.secret ?? undefined)

  await db
    .update(webhookEndpoints)
    .set({
      lastDeliveredAt: new Date(),
      lastStatus: success ? 200 : 500,
      failureCount: success ? 0 : webhook.failureCount + 1,
    })
    .where(eq(webhookEndpoints.id, id))

  return NextResponse.json({ success, message: success ? 'Test payload delivered' : 'Delivery failed' })
}
