import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { integrationSources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sources = await db.select().from(integrationSources)
    .where(eq(integrationSources.orgId, session.user.orgId))

  return NextResponse.json({ sources })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, type, config, syncFrequencyMinutes } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type' }, { status: 400 })
    }

    const [created] = await db.insert(integrationSources).values({
      name,
      type,
      config: config || {},
      syncStatus: 'connected',
      syncFrequencyMinutes: syncFrequencyMinutes || 360,
      orgId: session.user.orgId,
    }).returning()

    return NextResponse.json({ integration: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create integration' },
      { status: 500 }
    )
  }
}
