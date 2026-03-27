import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identities, policyViolations, entitlements, integrationSources, identityThreats, attackPaths, shadowAdmins } from '@/lib/db/schema'
import { eq, and, count, desc, sql, avg } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.orgId

  // Run all queries in parallel
  const [
    identityCounts,
    violationCount,
    tierViolationCount,
    topRisky,
    pendingCertifications,
    openViolations,
    integrations,
    activeThreatsResult,
    attackPathsResult,
    shadowAdminsResult,
    riskDistribution,
  ] = await Promise.all([
    // Identity counts by type
    db
      .select({
        type: identities.type,
        count: count(),
      })
      .from(identities)
      .where(eq(identities.orgId, orgId))
      .groupBy(identities.type),

    // Active (open) violations count
    db
      .select({ count: count() })
      .from(policyViolations)
      .where(and(eq(policyViolations.orgId, orgId), eq(policyViolations.status, 'open'))),

    // Tier violations count
    db
      .select({ count: count() })
      .from(identities)
      .where(and(eq(identities.orgId, orgId), eq(identities.tierViolation, true))),

    // Top 5 riskiest identities
    db
      .select({
        id: identities.id,
        displayName: identities.displayName,
        type: identities.type,
        subType: identities.subType,
        riskScore: identities.riskScore,
        adTier: identities.adTier,
        tierViolation: identities.tierViolation,
        status: identities.status,
      })
      .from(identities)
      .where(eq(identities.orgId, orgId))
      .orderBy(desc(identities.riskScore))
      .limit(5),

    // Pending certifications (expired)
    db
      .select({ count: count() })
      .from(entitlements)
      .where(and(eq(entitlements.orgId, orgId), eq(entitlements.certificationStatus, 'expired'))),

    // Open violations (unacknowledged)
    db
      .select({ count: count() })
      .from(policyViolations)
      .where(and(eq(policyViolations.orgId, orgId), eq(policyViolations.status, 'open'))),

    // Integration health
    db
      .select({
        id: integrationSources.id,
        name: integrationSources.name,
        type: integrationSources.type,
        syncStatus: integrationSources.syncStatus,
        lastSyncAt: integrationSources.lastSyncAt,
      })
      .from(integrationSources)
      .where(eq(integrationSources.orgId, orgId)),

    // Active threats count
    db
      .select({ count: count() })
      .from(identityThreats)
      .where(and(eq(identityThreats.orgId, orgId), eq(identityThreats.status, 'active'))),

    // Attack paths count
    db
      .select({ count: count() })
      .from(attackPaths)
      .where(eq(attackPaths.orgId, orgId)),

    // Shadow admins count (open)
    db
      .select({ count: count() })
      .from(shadowAdmins)
      .where(and(eq(shadowAdmins.orgId, orgId), eq(shadowAdmins.status, 'open'))),

    // Risk score distribution
    db
      .select({
        bucket: sql<string>`
          CASE
            WHEN ${identities.riskScore} >= 80 THEN 'critical'
            WHEN ${identities.riskScore} >= 60 THEN 'high'
            WHEN ${identities.riskScore} >= 30 THEN 'medium'
            ELSE 'low'
          END
        `,
        count: count(),
      })
      .from(identities)
      .where(eq(identities.orgId, orgId))
      .groupBy(sql`CASE
        WHEN ${identities.riskScore} >= 80 THEN 'critical'
        WHEN ${identities.riskScore} >= 60 THEN 'high'
        WHEN ${identities.riskScore} >= 30 THEN 'medium'
        ELSE 'low'
      END`),
  ])

  const humanCount = identityCounts.find(r => r.type === 'human')?.count ?? 0
  const nhiCount = identityCounts.find(r => r.type === 'non_human')?.count ?? 0
  const totalIdentities = humanCount + nhiCount
  const tierViolations = tierViolationCount[0]?.count ?? 0
  const compliance = totalIdentities > 0
    ? Math.round(((totalIdentities - tierViolations) / totalIdentities) * 100)
    : 100

  // Generate synthetic trend data (in production, this comes from historical snapshots)
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return {
      date: date.toISOString().split('T')[0],
      avgRiskScore: Math.round(25 + Math.random() * 20 + (i > 20 ? 5 : 0)),
    }
  })

  return NextResponse.json({
    totalIdentities,
    humanIdentities: humanCount,
    nonHumanIdentities: nhiCount,
    activeViolations: violationCount[0]?.count ?? 0,
    tierViolations,
    tierCompliancePercentage: compliance,
    riskDistribution: Object.fromEntries(
      riskDistribution.map(r => [r.bucket, r.count])
    ),
    riskTrendData: trendData,
    topRiskyIdentities: topRisky,
    pendingActions: [
      { type: 'certification', label: 'Certifications Expired', count: pendingCertifications[0]?.count ?? 0 },
      { type: 'violation', label: 'Open Violations', count: openViolations[0]?.count ?? 0 },
    ],
    integrationHealth: integrations,
    activeThreats: activeThreatsResult[0]?.count ?? 0,
    attackPathsCount: attackPathsResult[0]?.count ?? 0,
    shadowAdminCount: shadowAdminsResult[0]?.count ?? 0,
  })
}
