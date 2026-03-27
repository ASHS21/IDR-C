import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { gpoObjects, gpoLinks, gpoPermissions, identities } from '@/lib/db/schema'
import { eq, and, ilike, desc, sql } from 'drizzle-orm'
import { unauthorized, forbidden } from '@/lib/actions/helpers'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'

// GET: List all GPOs with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()

    const orgId = session.user.orgId
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const tier = url.searchParams.get('tier')
    const search = url.searchParams.get('search')
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 200)
    const offset = Number(url.searchParams.get('offset') || '0')

    const conditions = [eq(gpoObjects.orgId, orgId)]
    if (status) conditions.push(eq(gpoObjects.status, status as any))
    if (tier) conditions.push(eq(gpoObjects.adTier, tier as any))
    if (search) conditions.push(ilike(gpoObjects.name, `%${search}%`))

    // Get GPOs with link and permission counts
    const gpos = await db
      .select({
        id: gpoObjects.id,
        name: gpoObjects.name,
        displayName: gpoObjects.displayName,
        gpoGuid: gpoObjects.gpoGuid,
        status: gpoObjects.status,
        adTier: gpoObjects.adTier,
        version: gpoObjects.version,
        description: gpoObjects.description,
        ownerIdentityId: gpoObjects.ownerIdentityId,
        createdInSourceAt: gpoObjects.createdInSourceAt,
        modifiedInSourceAt: gpoObjects.modifiedInSourceAt,
        createdAt: gpoObjects.createdAt,
        updatedAt: gpoObjects.updatedAt,
        linkCount: sql<number>`(SELECT count(*)::int FROM gpo_links WHERE gpo_links.gpo_id = ${gpoObjects.id})`,
        permissionCount: sql<number>`(SELECT count(*)::int FROM gpo_permissions WHERE gpo_permissions.gpo_id = ${gpoObjects.id})`,
        ownerName: sql<string>`(SELECT display_name FROM identities WHERE identities.id = ${gpoObjects.ownerIdentityId})`,
      })
      .from(gpoObjects)
      .where(and(...conditions))
      .orderBy(
        sql`CASE ${gpoObjects.adTier} WHEN 'tier_0' THEN 0 WHEN 'tier_1' THEN 1 WHEN 'tier_2' THEN 2 ELSE 3 END`,
        gpoObjects.name
      )
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gpoObjects)
      .where(and(...conditions))

    return NextResponse.json({ gpos, total: count })
  } catch (error) {
    console.error('[GPO] GET error:', error)
    return NextResponse.json({ error: 'Failed to list GPOs' }, { status: 500 })
  }
}

// POST: Create GPO (for tracking)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) return forbidden()

    const orgId = session.user.orgId
    const body = await req.json()

    const [gpo] = await db.insert(gpoObjects).values({
      name: body.name,
      displayName: body.displayName || body.name,
      gpoGuid: body.gpoGuid,
      status: body.status || 'enabled',
      adTier: body.adTier || 'unclassified',
      version: body.version || 0,
      description: body.description,
      ownerIdentityId: body.ownerIdentityId,
      securityFiltering: body.securityFiltering,
      wmiFilter: body.wmiFilter,
      createdInSourceAt: body.createdInSourceAt ? new Date(body.createdInSourceAt) : undefined,
      modifiedInSourceAt: body.modifiedInSourceAt ? new Date(body.modifiedInSourceAt) : undefined,
      orgId,
    }).returning()

    return NextResponse.json(gpo, { status: 201 })
  } catch (error) {
    console.error('[GPO] POST error:', error)
    return NextResponse.json({ error: 'Failed to create GPO' }, { status: 500 })
  }
}
