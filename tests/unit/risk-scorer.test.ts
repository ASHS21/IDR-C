import { describe, it, expect, vi } from 'vitest'

// Mock the db module before importing scorer
vi.mock('@/lib/db', () => ({
  db: {},
}))
vi.mock('@/lib/db/schema', () => ({
  identities: {},
  accounts: {},
  entitlements: {},
  policyViolations: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
  lt: vi.fn(),
}))

import { calculateRiskScore } from '@/lib/risk/scorer'

describe('calculateRiskScore', () => {
  it('returns 0 for an identity with no risk factors', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score).toBe(0)
  })

  it('adds 30 points for a tier violation', () => {
    const withViolation = calculateRiskScore({
      tierViolation: true,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    const without = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(withViolation - without).toBe(30)
  })

  it('adds 20 points for full privilege level (1.0)', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 1,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score).toBe(20)
  })

  it('adds 10 points for half privilege level (0.5)', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0.5,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score).toBe(10)
  })

  it('scales dormancy up to 15 points for 180+ days', () => {
    const score180 = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 180,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score180).toBe(15)

    // 360 days should also cap at 15 (clamped by Math.min(1, ...))
    const score360 = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 360,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score360).toBe(15)
  })

  it('scales dormancy proportionally for partial dormancy', () => {
    const score90 = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 90,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    // 90/180 * 15 = 7.5 → rounded to 8
    expect(score90).toBe(8)
  })

  it('scales violation count up to 15 points for 5+ violations', () => {
    const score5 = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 5,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score5).toBe(15)

    // 10 violations should also cap at 15
    const score10 = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 10,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score10).toBe(15)
  })

  it('adds 10 points for missing MFA', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: true,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score).toBe(10)
  })

  it('adds 5 points for certification overdue', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: true,
      orphanedNhi: false,
    })
    expect(score).toBe(5)
  })

  it('adds 5 points for orphaned NHI', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: true,
    })
    expect(score).toBe(5)
  })

  it('computes near-100 score with all risk factors maxed', () => {
    const score = calculateRiskScore({
      tierViolation: true,        // 30
      privilegeLevel: 1,          // 20
      dormancyDays: 365,          // 15
      violationCount: 10,         // 15
      missingMfa: true,           // 10
      certificationOverdue: true, // 5
      orphanedNhi: true,          // 5
    })
    // 30+20+15+15+10+5+5 = 100
    expect(score).toBe(100)
  })

  it('caps the score at 100 even if factors exceed', () => {
    // This shouldn't happen in practice, but let's test the cap
    const score = calculateRiskScore({
      tierViolation: true,
      privilegeLevel: 1,
      dormancyDays: 999,
      violationCount: 999,
      missingMfa: true,
      certificationOverdue: true,
      orphanedNhi: true,
    })
    expect(score).toBeLessThanOrEqual(100)
  })

  it('handles null dormancyDays gracefully (treated as 0)', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: null,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score).toBe(0)
  })

  it('handles zero violation count correctly', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0,
      dormancyDays: 0,
      violationCount: 0,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(score).toBe(0)
  })

  it('returns an integer (rounded)', () => {
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0.33,
      dormancyDays: 45,
      violationCount: 1,
      missingMfa: false,
      certificationOverdue: false,
      orphanedNhi: false,
    })
    expect(Number.isInteger(score)).toBe(true)
  })

  it('computes a medium-risk identity correctly', () => {
    // tier_1 identity with some violations, missing MFA
    const score = calculateRiskScore({
      tierViolation: false,
      privilegeLevel: 0.5,  // 10
      dormancyDays: 30,     // 30/180*15 ≈ 2.5
      violationCount: 2,    // 2/5*15 = 6
      missingMfa: true,     // 10
      certificationOverdue: false,
      orphanedNhi: false,
    })
    // 10 + 2.5 + 6 + 10 = 28.5 → 29
    expect(score).toBeGreaterThanOrEqual(25)
    expect(score).toBeLessThanOrEqual(35)
  })
})
