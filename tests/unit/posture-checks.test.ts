import { describe, it, expect } from 'vitest'
import {
  hasFlag,
  UAC,
  runPostureChecks,
  VIOLATION_IMPACT,
  type PostureIdentity,
} from '@/lib/itdr/posture-checks'

function makeIdentity(overrides: Partial<PostureIdentity> = {}): PostureIdentity {
  return {
    id: 'id-1',
    displayName: 'svc-test',
    adTier: 'tier_2',
    subType: 'service_account',
    status: 'active',
    passwordLastSetAt: new Date(),
    adSecurity: { uac: 0x0200 /* NORMAL_ACCOUNT */, spn: [], adminCount: 0, allowedToDelegateTo: [], rbcd: false },
    ...overrides,
  }
}

describe('posture-checks', () => {
  describe('hasFlag (UAC bit parsing)', () => {
    it('detects a set flag', () => {
      expect(hasFlag(0x0200 | UAC.DONT_REQ_PREAUTH, UAC.DONT_REQ_PREAUTH)).toBe(true)
      expect(hasFlag(0x0200 | UAC.TRUSTED_FOR_DELEGATION, UAC.TRUSTED_FOR_DELEGATION)).toBe(true)
    })

    it('returns false for an unset flag', () => {
      expect(hasFlag(0x0200, UAC.DONT_REQ_PREAUTH)).toBe(false)
      expect(hasFlag(0, UAC.PASSWD_NOTREQD)).toBe(false)
      expect(hasFlag(undefined, UAC.PASSWD_NOTREQD)).toBe(false)
      expect(hasFlag(null, UAC.PASSWD_NOTREQD)).toBe(false)
    })
  })

  describe('individual checks', () => {
    it('flags AS-REP roastable (DONT_REQ_PREAUTH)', () => {
      const findings = runPostureChecks([
        makeIdentity({ adSecurity: { uac: UAC.DONT_REQ_PREAUTH } }),
      ])
      expect(findings.map(f => f.violationType)).toContain('asrep_roastable')
    })

    it('flags unconstrained delegation as critical', () => {
      const findings = runPostureChecks([
        makeIdentity({ adSecurity: { uac: UAC.TRUSTED_FOR_DELEGATION } }),
      ])
      const f = findings.find(f => f.violationType === 'unconstrained_delegation')
      expect(f).toBeDefined()
      expect(f!.severity).toBe('critical')
      expect(f!.impact).toBe('privilege_escalation')
    })

    it('flags kerberoastable when an SPN is present', () => {
      const findings = runPostureChecks([
        makeIdentity({ adSecurity: { uac: 0x0200, spn: ['HTTP/web01'] } }),
      ])
      const f = findings.find(f => f.violationType === 'kerberoastable')
      expect(f).toBeDefined()
      expect(f!.impact).toBe('credential_theft')
    })

    it('escalates kerberoastable to critical for privileged accounts', () => {
      const findings = runPostureChecks([
        makeIdentity({ adTier: 'tier_0', adSecurity: { uac: 0x0200, spn: ['MSSQLSvc/db01'] } }),
      ])
      const f = findings.find(f => f.violationType === 'kerberoastable')
      expect(f!.severity).toBe('critical')
    })

    it('flags reversible encryption and password-not-required', () => {
      const findings = runPostureChecks([
        makeIdentity({ adSecurity: { uac: UAC.ENCRYPTED_TEXT_PWD_ALLOWED | UAC.PASSWD_NOTREQD } }),
      ])
      const types = findings.map(f => f.violationType)
      expect(types).toContain('reversible_encryption')
      expect(types).toContain('password_not_required')
    })

    it('flags constrained delegation (allowedToDelegateTo)', () => {
      const findings = runPostureChecks([
        makeIdentity({ adSecurity: { uac: 0x0200, allowedToDelegateTo: ['CIFS/fs01'] } }),
      ])
      expect(findings.map(f => f.violationType)).toContain('constrained_delegation')
    })

    it('flags stale privileged account (adminCount + dormant)', () => {
      const findings = runPostureChecks([
        makeIdentity({ status: 'dormant', adSecurity: { uac: 0x0200, adminCount: 1 } }),
      ])
      expect(findings.map(f => f.violationType)).toContain('stale_privileged_account')
    })

    it('does NOT flag a clean account', () => {
      const findings = runPostureChecks([makeIdentity()])
      expect(findings).toHaveLength(0)
    })

    it('skips identities with no adSecurity', () => {
      const findings = runPostureChecks([makeIdentity({ adSecurity: null })])
      expect(findings).toHaveLength(0)
    })
  })

  describe('VIOLATION_IMPACT', () => {
    it('maps every posture violation type to an impact category', () => {
      const findings = runPostureChecks([
        makeIdentity({
          adTier: 'tier_0',
          status: 'dormant',
          adSecurity: {
            uac: UAC.DONT_REQ_PREAUTH | UAC.TRUSTED_FOR_DELEGATION | UAC.ENCRYPTED_TEXT_PWD_ALLOWED |
              UAC.PASSWD_NOTREQD | UAC.DONT_EXPIRE_PASSWORD | UAC.TRUSTED_TO_AUTH_FOR_DELEGATION,
            spn: ['HTTP/web01'],
            adminCount: 1,
            allowedToDelegateTo: ['CIFS/fs01'],
            rbcd: true,
          },
        }),
      ])
      for (const f of findings) {
        expect(VIOLATION_IMPACT[f.violationType]).toBeDefined()
        expect(VIOLATION_IMPACT[f.violationType]).toBe(f.impact)
      }
    })
  })
})
