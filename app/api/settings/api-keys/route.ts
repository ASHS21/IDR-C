import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { apiKeys, subscriptions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await db.select({
    id: apiKeys.id,
    label: apiKeys.label,
    keyPrefix: apiKeys.keyPrefix,
    lastUsedAt: apiKeys.lastUsedAt,
    revoked: apiKeys.revoked,
    createdAt: apiKeys.createdAt,
  }).from(apiKeys)
    .where(and(eq(apiKeys.orgId, session.user.orgId), eq(apiKeys.revoked, false)))

  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasRole((session.user as any).appRole as AppRole, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check subscription allows API access
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.orgId, session.user.orgId)).limit(1)
  if (!sub?.apiAccess) {
    return NextResponse.json({ error: 'API access requires Professional or Enterprise tier' }, { status: 403 })
  }

  const { label } = await req.json()
  if (!label) return NextResponse.json({ error: 'Label required' }, { status: 400 })

  const rawKey = `idr_${crypto.randomBytes(32).toString('hex')}`
  const keyPrefix = rawKey.slice(0, 12)
  const keyHash = await bcrypt.hash(rawKey, 10)

  await db.insert(apiKeys).values({
    label,
    keyPrefix,
    keyHash,
    orgId: session.user.orgId,
    createdBy: session.user.id,
  })

  // Return the full key only on creation — it won't be shown again
  return NextResponse.json({ key: rawKey, prefix: keyPrefix })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { keyId } = await req.json()
  await db.update(apiKeys)
    .set({ revoked: true })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, session.user.orgId)))

  return NextResponse.json({ success: true })
}
