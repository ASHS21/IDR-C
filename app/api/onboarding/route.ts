import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { organizations, users, subscriptions, integrationSources, invitations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { step, data } = body

  if (step === 'organization') {
    const { name, domain, industry, regulatoryFrameworks } = data

    // Create org
    const [org] = await db.insert(organizations).values({
      name,
      domain,
      industry,
      regulatoryFrameworks: regulatoryFrameworks || [],
    }).returning()

    // Create free subscription
    await db.insert(subscriptions).values({
      orgId: org.id,
      tier: 'free',
      maxIdentities: 500,
      maxIntegrations: 1,
      maxUsers: 3,
      maxAiRunsPerMonth: 5,
      retentionDays: 30,
    })

    // Update user with org_id and admin role
    await db.update(users)
      .set({ orgId: org.id, appRole: 'admin' })
      .where(eq(users.id, session.user.id))

    return NextResponse.json({ orgId: org.id, refreshSession: true })
  }

  if (step === 'integration') {
    const orgId = session.user.orgId
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { type, name, config } = data
    const [source] = await db.insert(integrationSources).values({
      name,
      type,
      config: config || {},
      syncStatus: 'disconnected',
      orgId,
    }).returning()

    return NextResponse.json({ integrationId: source.id })
  }

  if (step === 'team') {
    const orgId = session.user.orgId
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { members } = data
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'No team members provided' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const inviteValues = members
      .filter((m: { email: string; role: string }) => m.email && m.email.trim())
      .map((m: { email: string; role: string }) => ({
        email: m.email.trim().toLowerCase(),
        role: m.role || 'viewer',
        orgId,
        invitedBy: session.user.id,
        status: 'pending' as const,
        expiresAt,
      }))

    if (inviteValues.length > 0) {
      await db.insert(invitations).values(inviteValues)
    }

    return NextResponse.json({ invited: inviteValues.length })
  }

  return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
}
