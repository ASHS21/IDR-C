import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { users, invitations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [teamMembers, pendingInvites] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      appRole: users.appRole,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.orgId, session.user.orgId)),

    db.select().from(invitations)
      .where(and(eq(invitations.orgId, session.user.orgId), eq(invitations.status, 'pending'))),
  ])

  return NextResponse.json({ members: teamMembers, invitations: pendingInvites })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasRole((session.user as any).appRole as AppRole, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'Email and role required' }, { status: 400 })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const [invite] = await db.insert(invitations).values({
    email,
    role,
    orgId: session.user.orgId,
    invitedBy: session.user.id,
    expiresAt,
  }).returning()

  return NextResponse.json({ invitation: invite })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasRole((session.user as any).appRole as AppRole, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, role } = await req.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

  await db.update(users)
    .set({ appRole: role })
    .where(and(eq(users.id, userId), eq(users.orgId, session.user.orgId)))

  return NextResponse.json({ success: true })
}
