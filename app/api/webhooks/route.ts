import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { webhookEndpoints } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'
import { assertSafeConnectorUrl } from '@/lib/connectors/url-guard'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhooks = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.orgId, session.user.orgId))

  // Never expose the signing secret to the client — return only whether one is set.
  const sanitized = webhooks.map(({ secret, ...rest }) => ({ ...rest, hasSecret: !!secret }))
  return NextResponse.json({ webhooks: sanitized })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Webhooks are an outbound-request + data-egress channel — restrict to integration admins.
  if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) {
    return NextResponse.json({ error: 'Forbidden: iam_admin role required' }, { status: 403 })
  }

  const body = await req.json()
  const { name, url, secret, events } = body

  if (!name || !url || !events?.length) {
    return NextResponse.json({ error: 'Missing required fields: name, url, events' }, { status: 400 })
  }

  // SSRF guard: block loopback / link-local / cloud-metadata destinations.
  try {
    assertSafeConnectorUrl(url)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid webhook URL' }, { status: 400 })
  }

  const [created] = await db.insert(webhookEndpoints).values({
    name,
    url,
    secret: secret || null,
    events,
    orgId: session.user.orgId,
  }).returning()

  const { secret: _s, ...safe } = created
  return NextResponse.json({ ...safe, hasSecret: !!created.secret }, { status: 201 })
}
