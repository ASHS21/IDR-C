import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { gpoObjects, gpoLinks, gpoPermissions, identities, groups, attackPaths } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { unauthorized } from '@/lib/actions/helpers'

// GET: GPO detail with links, permissions, and risk info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()

    const orgId = session.user.orgId
    const { id } = await params

    // Get GPO object
    const [gpo] = await db
      .select()
      .from(gpoObjects)
      .where(and(eq(gpoObjects.id, id), eq(gpoObjects.orgId, orgId)))

    if (!gpo) {
      return NextResponse.json({ error: 'GPO not found' }, { status: 404 })
    }

    // Get owner info
    let owner = null
    if (gpo.ownerIdentityId) {
      const [ownerRow] = await db
        .select({ id: identities.id, displayName: identities.displayName, adTier: identities.adTier })
        .from(identities)
        .where(eq(identities.id, gpo.ownerIdentityId))
      owner = ownerRow || null
    }

    // Get all links with OU info
    const links = await db
      .select()
      .from(gpoLinks)
      .where(and(eq(gpoLinks.gpoId, id), eq(gpoLinks.orgId, orgId)))

    // Get all permissions with identity/group info
    const permissions = await db
      .select({
        id: gpoPermissions.id,
        gpoId: gpoPermissions.gpoId,
        trusteeIdentityId: gpoPermissions.trusteeIdentityId,
        trusteeGroupId: gpoPermissions.trusteeGroupId,
        trusteeName: gpoPermissions.trusteeName,
        permissionType: gpoPermissions.permissionType,
        dangerous: gpoPermissions.dangerous,
        adTierOfGpo: gpoPermissions.adTierOfGpo,
        createdAt: gpoPermissions.createdAt,
        identityName: sql<string>`(SELECT display_name FROM identities WHERE identities.id = ${gpoPermissions.trusteeIdentityId})`,
        identityTier: sql<string>`(SELECT ad_tier FROM identities WHERE identities.id = ${gpoPermissions.trusteeIdentityId})`,
        groupName: sql<string>`(SELECT name FROM groups WHERE groups.id = ${gpoPermissions.trusteeGroupId})`,
        groupTier: sql<string>`(SELECT ad_tier FROM groups WHERE groups.id = ${gpoPermissions.trusteeGroupId})`,
      })
      .from(gpoPermissions)
      .where(and(eq(gpoPermissions.gpoId, id), eq(gpoPermissions.orgId, orgId)))

    // Identify risks for this GPO
    const risks: Array<{ type: string; description: string; severity: string }> = []

    // Check for dangerous permissions
    const dangerousPerms = permissions.filter(p => p.dangerous)
    for (const p of dangerousPerms) {
      const trusteeTier = p.identityTier || p.groupTier || 'unclassified'
      const gpoTier = gpo.adTier
      if (gpoTier === 'tier_0' && (trusteeTier === 'tier_2' || trusteeTier === 'unclassified')) {
        risks.push({
          type: 't2EditT0',
          description: `${p.trusteeName} (${trusteeTier}) can ${p.permissionType} on T0 GPO`,
          severity: 'critical',
        })
      } else if (gpoTier === 'tier_0' && trusteeTier === 'tier_1') {
        risks.push({
          type: 't1EditT0',
          description: `${p.trusteeName} (${trusteeTier}) can ${p.permissionType} on T0 GPO`,
          severity: 'high',
        })
      }
    }

    // Check T0 OU links with non-T0 permission holders
    const t0Links = links.filter(l => l.adTierOfOu === 'tier_0')
    if (t0Links.length > 0) {
      const nonT0Perms = permissions.filter(p => {
        const tier = p.identityTier || p.groupTier || 'unclassified'
        return tier !== 'tier_0' && (p.permissionType === 'edit_settings' || p.permissionType === 'modify_security' || p.permissionType === 'full_control')
      })
      for (const p of nonT0Perms) {
        risks.push({
          type: 'gpoLinkedToT0',
          description: `GPO linked to T0 OU modifiable by ${p.trusteeName}`,
          severity: 'critical',
        })
      }
    }

    if (!gpo.ownerIdentityId) {
      risks.push({
        type: 'noOwner',
        description: 'GPO has no assigned owner',
        severity: 'medium',
      })
    }

    if (links.length === 0) {
      risks.push({
        type: 'unlinked',
        description: 'GPO is not linked to any OU',
        severity: 'low',
      })
    }

    // Find related attack paths that mention this GPO
    const relatedPaths = await db
      .select()
      .from(attackPaths)
      .where(and(
        eq(attackPaths.orgId, orgId),
        sql`${attackPaths.pathNodes}::text LIKE '%' || ${gpo.name} || '%'`
      ))
      .limit(10)

    return NextResponse.json({
      gpo,
      owner,
      links,
      permissions,
      risks,
      relatedPaths,
    })
  } catch (error) {
    console.error('[GPO] GET detail error:', error)
    return NextResponse.json({ error: 'Failed to get GPO detail' }, { status: 500 })
  }
}
