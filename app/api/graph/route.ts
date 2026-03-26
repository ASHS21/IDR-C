import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identities, entitlements, resources, groupMemberships, groups } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.orgId
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit') || '50'))
  const tierFilter = req.nextUrl.searchParams.get('tier') || undefined

  // Get top identities by risk score (full columns)
  const identityFilter = tierFilter
    ? and(eq(identities.orgId, orgId), eq(identities.adTier, tierFilter as any))
    : eq(identities.orgId, orgId)

  const topIdentities = await db.select().from(identities)
    .where(identityFilter)
    .orderBy(desc(identities.riskScore))
    .limit(limit)

  const identityIds = topIdentities.map(i => i.id)
  if (identityIds.length === 0) {
    return NextResponse.json({ nodes: [], links: [] })
  }

  // Get entitlements + resources for these identities
  const entitlementData = await db.select({
    identityId: entitlements.identityId,
    resourceId: entitlements.resourceId,
    permissionName: entitlements.permissionName,
    adTier: entitlements.adTierOfPermission,
    resourceName: resources.name,
    resourceType: resources.type,
    resourceTier: resources.adTier,
    resourceCriticality: resources.criticality,
    resourceEnvironment: resources.environment,
    resourceOwnerIdentityId: resources.ownerIdentityId,
  }).from(entitlements)
    .innerJoin(resources, eq(entitlements.resourceId, resources.id))
    .where(eq(entitlements.orgId, orgId))
    .limit(500)

  // Filter to only entitlements for our identities
  const relevantEntitlements = entitlementData.filter(e => identityIds.includes(e.identityId))

  // Get group memberships with full group details
  const membershipData = await db.select({
    identityId: groupMemberships.identityId,
    groupId: groupMemberships.groupId,
    groupName: groups.name,
    groupType: groups.type,
    groupScope: groups.scope,
    groupTier: groups.adTier,
    isPrivileged: groups.isPrivileged,
    memberCount: groups.memberCount,
    nestedGroupCount: groups.nestedGroupCount,
  }).from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(eq(groupMemberships.orgId, orgId))
    .limit(500)

  const relevantMemberships = membershipData.filter(m => identityIds.includes(m.identityId))

  // Collect manager/owner IDs that are not already in topIdentities
  const extraIdentityIds = new Set<string>()
  for (const identity of topIdentities) {
    if (identity.managerIdentityId && !identityIds.includes(identity.managerIdentityId)) {
      extraIdentityIds.add(identity.managerIdentityId)
    }
    if (identity.ownerIdentityId && !identityIds.includes(identity.ownerIdentityId)) {
      extraIdentityIds.add(identity.ownerIdentityId)
    }
  }

  // Fetch extra identities (managers/owners not in result set)
  let extraIdentities: typeof topIdentities = []
  if (extraIdentityIds.size > 0) {
    extraIdentities = await db.select().from(identities)
      .where(and(
        eq(identities.orgId, orgId),
        inArray(identities.id, Array.from(extraIdentityIds))
      ))
  }

  const allIdentities = [...topIdentities, ...extraIdentities]
  const allIdentityIds = new Set(allIdentities.map(i => i.id))

  // Build nodes and links
  const nodes: Array<{
    id: string
    label: string
    type: 'identity' | 'resource' | 'group'
    subType?: string
    tier?: string
    riskScore?: number
    tierViolation?: boolean
    identityType?: string
    isPrivileged?: boolean
    properties: Record<string, any>
  }> = []

  const links: Array<{
    source: string
    target: string
    type: 'entitlement' | 'membership' | 'manager' | 'owner'
    label?: string
  }> = []

  const nodeSet = new Set<string>()

  // Add identity nodes with full properties
  for (const identity of allIdentities) {
    if (!nodeSet.has(identity.id)) {
      nodeSet.add(identity.id)
      nodes.push({
        id: identity.id,
        label: identity.displayName,
        type: 'identity',
        subType: identity.subType,
        tier: identity.adTier,
        riskScore: identity.riskScore,
        tierViolation: identity.tierViolation,
        identityType: identity.type,
        properties: {
          displayName: identity.displayName,
          upn: identity.upn,
          email: identity.email,
          samAccountName: identity.samAccountName,
          type: identity.type,
          subType: identity.subType,
          adTier: identity.adTier,
          effectiveTier: identity.effectiveTier,
          tierViolation: identity.tierViolation,
          riskScore: identity.riskScore,
          riskFactors: identity.riskFactors,
          status: identity.status,
          department: identity.department,
          sourceSystem: identity.sourceSystem,
          sourceId: identity.sourceId,
          lastLogonAt: identity.lastLogonAt,
          passwordLastSetAt: identity.passwordLastSetAt,
          createdInSourceAt: identity.createdInSourceAt,
          expiryAt: identity.expiryAt,
          managerIdentityId: identity.managerIdentityId,
          ownerIdentityId: identity.ownerIdentityId,
          createdAt: identity.createdAt,
          updatedAt: identity.updatedAt,
        },
      })
    }
  }

  // Add resource nodes + entitlement links
  for (const ent of relevantEntitlements) {
    if (!nodeSet.has(ent.resourceId)) {
      nodeSet.add(ent.resourceId)
      nodes.push({
        id: ent.resourceId,
        label: ent.resourceName || 'Unknown Resource',
        type: 'resource',
        subType: ent.resourceType,
        tier: ent.resourceTier,
        properties: {
          name: ent.resourceName,
          resourceType: ent.resourceType,
          adTier: ent.resourceTier,
          criticality: ent.resourceCriticality,
          environment: ent.resourceEnvironment,
          ownerIdentityId: ent.resourceOwnerIdentityId,
        },
      })
    }
    links.push({
      source: ent.identityId,
      target: ent.resourceId,
      type: 'entitlement',
      label: ent.permissionName,
    })
  }

  // Add group nodes + membership links
  for (const mem of relevantMemberships) {
    if (!nodeSet.has(mem.groupId)) {
      nodeSet.add(mem.groupId)
      nodes.push({
        id: mem.groupId,
        label: mem.groupName || 'Unknown Group',
        type: 'group',
        tier: mem.groupTier,
        isPrivileged: mem.isPrivileged ?? false,
        properties: {
          name: mem.groupName,
          groupType: mem.groupType,
          scope: mem.groupScope,
          groupTier: mem.groupTier,
          isPrivileged: mem.isPrivileged,
          memberCount: mem.memberCount,
          nestedGroupCount: mem.nestedGroupCount,
        },
      })
    }
    links.push({
      source: mem.identityId,
      target: mem.groupId,
      type: 'membership',
    })
  }

  // Add manager edges
  for (const identity of topIdentities) {
    if (identity.managerIdentityId && allIdentityIds.has(identity.managerIdentityId)) {
      links.push({
        source: identity.managerIdentityId,
        target: identity.id,
        type: 'manager',
        label: 'manages',
      })
    }
  }

  // Add owner edges (NHI -> owner)
  for (const identity of topIdentities) {
    if (identity.ownerIdentityId && allIdentityIds.has(identity.ownerIdentityId)) {
      links.push({
        source: identity.ownerIdentityId,
        target: identity.id,
        type: 'owner',
        label: 'owns',
      })
    }
  }

  return NextResponse.json({ nodes, links })
}
