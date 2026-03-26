import { db } from '@/lib/db'
import { identities, accounts, entitlements, policyViolations } from '@/lib/db/schema'
import { eq, and, count, sql, lt } from 'drizzle-orm'

interface RiskFactors {
  tierViolation: boolean
  privilegeLevel: number
  dormancyDays: number | null
  violationCount: number
  missingMfa: boolean
  certificationOverdue: boolean
  orphanedNhi: boolean
}

export function calculateRiskScore(factors: RiskFactors): number {
  const score =
    (factors.tierViolation ? 1 : 0) * 30 +
    factors.privilegeLevel * 20 +
    Math.min(1, (factors.dormancyDays ?? 0) / 180) * 15 +
    Math.min(1, factors.violationCount / 5) * 15 +
    (factors.missingMfa ? 1 : 0) * 10 +
    (factors.certificationOverdue ? 1 : 0) * 5 +
    (factors.orphanedNhi ? 1 : 0) * 5

  return Math.min(100, Math.round(score))
}

export async function recalculateRiskForIdentity(identityId: string, orgId: string) {
  const [identity] = await db.select().from(identities)
    .where(and(eq(identities.id, identityId), eq(identities.orgId, orgId)))
    .limit(1)

  if (!identity) return null

  const [violationResult] = await db
    .select({ count: count() })
    .from(policyViolations)
    .where(and(eq(policyViolations.identityId, identityId), eq(policyViolations.status, 'open')))

  const [mfaResult] = await db
    .select({ hasMfa: sql<boolean>`bool_or(${accounts.mfaEnabled})` })
    .from(accounts)
    .where(eq(accounts.identityId, identityId))

  const [certResult] = await db
    .select({ overdue: count() })
    .from(entitlements)
    .where(and(
      eq(entitlements.identityId, identityId),
      eq(entitlements.certificationStatus, 'expired'),
    ))

  const dormancyDays = identity.lastLogonAt
    ? Math.floor((Date.now() - new Date(identity.lastLogonAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const isPrivileged = identity.adTier === 'tier_0' ? 1 : identity.adTier === 'tier_1' ? 0.5 : 0
  const isOrphanedNhi = identity.type === 'non_human' && !identity.ownerIdentityId

  const factors: RiskFactors = {
    tierViolation: identity.tierViolation,
    privilegeLevel: isPrivileged,
    dormancyDays,
    violationCount: Number(violationResult?.count ?? 0),
    missingMfa: !mfaResult?.hasMfa,
    certificationOverdue: Number(certResult?.overdue ?? 0) > 0,
    orphanedNhi: isOrphanedNhi,
  }

  const score = calculateRiskScore(factors)

  await db.update(identities)
    .set({ riskScore: score, riskFactors: factors, updatedAt: new Date() })
    .where(eq(identities.id, identityId))

  return { identityId, score, factors }
}
