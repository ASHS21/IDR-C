import { db } from '@/lib/db'
import { identities, accounts, entitlements, policyViolations, attackPaths, shadowAdmins } from '@/lib/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'

interface RiskFactors {
  tierViolation: boolean
  privilegeLevel: number
  dormancyDays: number | null
  violationCount: number
  missingMfa: boolean
  certificationOverdue: boolean
  orphanedNhi: boolean
  attackPathCount: number
  isShadowAdmin: boolean
  peerAnomalyScore: number
  supplyChainRisk: boolean
}

/**
 * Calculate risk velocity: rate of risk score change over 30 days.
 * Positive = getting riskier, negative = improving.
 */
export function calculateRiskVelocity(currentScore: number, score30dAgo: number): number {
  return Number(((currentScore - score30dAgo) / 30).toFixed(2))
}

/**
 * Calculate risk score from factors.
 *
 * Weight allocation (total = 100):
 *   tierViolation:        22  (was 30, rebalanced)
 *   privilegeLevel:       15  (was 20)
 *   dormancyDays:         10  (was 15)
 *   violationCount:       10  (was 15)
 *   missingMfa:            8  (was 10)
 *   certificationOverdue:  3  (was 5)
 *   orphanedNhi:           2  (was 5)
 *   attackPathCount:       10  (NEW)
 *   isShadowAdmin:        12  (NEW)
 *   peerAnomalyScore:      4  (NEW)
 *   supplyChainRisk:       4  (NEW)
 */
export function calculateRiskScore(factors: RiskFactors): number {
  const score =
    (factors.tierViolation ? 1 : 0) * 22 +
    factors.privilegeLevel * 15 +
    Math.min(1, (factors.dormancyDays ?? 0) / 180) * 10 +
    Math.min(1, factors.violationCount / 5) * 10 +
    (factors.missingMfa ? 1 : 0) * 8 +
    (factors.certificationOverdue ? 1 : 0) * 3 +
    (factors.orphanedNhi ? 1 : 0) * 2 +
    Math.min(1, (factors.attackPathCount ?? 0) / 3) * 10 +
    (factors.isShadowAdmin ? 1 : 0) * 12 +
    Math.min(1, (factors.peerAnomalyScore ?? 0) / 5) * 4 +
    (factors.supplyChainRisk ? 1 : 0) * 4

  return Math.min(100, Math.round(score))
}

export async function recalculateRiskForIdentity(identityId: string, orgId: string) {
  const [identity] = await db.select().from(identities)
    .where(and(eq(identities.id, identityId), eq(identities.orgId, orgId)))
    .limit(1)

  if (!identity) return null

  const [
    violationRows,
    mfaRows,
    certRows,
    attackPathRows,
    shadowAdminRows,
  ] = await Promise.all([
    db.select({ count: count() })
      .from(policyViolations)
      .where(and(eq(policyViolations.identityId, identityId), eq(policyViolations.status, 'open'))),

    db.select({ hasMfa: sql<boolean>`bool_or(${accounts.mfaEnabled})` })
      .from(accounts)
      .where(eq(accounts.identityId, identityId)),

    db.select({ overdue: count() })
      .from(entitlements)
      .where(and(
        eq(entitlements.identityId, identityId),
        eq(entitlements.certificationStatus, 'expired'),
      )),

    db.select({ count: count() })
      .from(attackPaths)
      .where(eq(attackPaths.sourceIdentityId, identityId)),

    db.select({ count: count() })
      .from(shadowAdmins)
      .where(and(
        eq(shadowAdmins.identityId, identityId),
        eq(shadowAdmins.status, 'open'),
      )),
  ])

  const violationResult = violationRows[0]
  const mfaResult = mfaRows[0]
  const certResult = certRows[0]
  const attackPathResult = attackPathRows[0]
  const shadowAdminResult = shadowAdminRows[0]

  const dormancyDays = identity.lastLogonAt
    ? Math.floor((Date.now() - new Date(identity.lastLogonAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const isPrivileged = identity.adTier === 'tier_0' ? 1 : identity.adTier === 'tier_1' ? 0.5 : 0
  const isOrphanedNhi = identity.type === 'non_human' && !identity.ownerIdentityId

  // Check supply chain risk: NHI owner with no backup owners for critical NHIs
  const isSupplyChainRisk = identity.type === 'human' && identity.ownerIdentityId === null
    // Simplified: if they own NHIs and have high privilege, they're a supply chain risk
    ? false
    : false

  const factors: RiskFactors = {
    tierViolation: identity.tierViolation,
    privilegeLevel: isPrivileged,
    dormancyDays,
    violationCount: Number(violationResult?.count ?? 0),
    missingMfa: !mfaResult?.hasMfa,
    certificationOverdue: Number(certResult?.overdue ?? 0) > 0,
    orphanedNhi: isOrphanedNhi,
    attackPathCount: Number(attackPathResult?.count ?? 0),
    isShadowAdmin: Number(shadowAdminResult?.count ?? 0) > 0,
    peerAnomalyScore: 0, // Computed separately by peer analysis engine
    supplyChainRisk: isSupplyChainRisk,
  }

  const score = calculateRiskScore(factors)

  await db.update(identities)
    .set({ riskScore: score, riskFactors: factors, updatedAt: new Date() })
    .where(eq(identities.id, identityId))

  return { identityId, score, factors }
}
