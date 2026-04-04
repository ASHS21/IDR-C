import { describe, it, expect } from 'vitest'
import { hasRole, hasAnyRole, ROLE_HIERARCHY, type AppRole } from '@/lib/utils/rbac'

describe('RBAC', () => {
  describe('hasRole', () => {
    it('grants access when user role matches required role', () => {
      expect(hasRole('admin', 'admin')).toBe(true)
      expect(hasRole('viewer', 'viewer')).toBe(true)
    })

    it('grants access when user role is higher than required', () => {
      expect(hasRole('admin', 'viewer')).toBe(true)
      expect(hasRole('ciso', 'analyst')).toBe(true)
      expect(hasRole('iam_admin', 'viewer')).toBe(true)
    })

    it('denies access when user role is lower than required', () => {
      expect(hasRole('viewer', 'admin')).toBe(false)
      expect(hasRole('analyst', 'ciso')).toBe(false)
      expect(hasRole('viewer', 'iam_admin')).toBe(false)
    })

    it('enforces full role hierarchy order', () => {
      const roles: AppRole[] = ['viewer', 'analyst', 'iam_admin', 'ciso', 'admin']
      for (let i = 0; i < roles.length; i++) {
        for (let j = 0; j < roles.length; j++) {
          expect(hasRole(roles[i], roles[j])).toBe(i >= j)
        }
      }
    })
  })

  describe('hasAnyRole', () => {
    it('grants access when user has any of the required roles', () => {
      expect(hasAnyRole('analyst', ['viewer', 'analyst'])).toBe(true)
      expect(hasAnyRole('admin', ['ciso', 'iam_admin'])).toBe(true)
    })

    it('denies access when user has none of the required roles', () => {
      expect(hasAnyRole('viewer', ['analyst', 'iam_admin'])).toBe(false)
    })

    it('handles empty required roles array', () => {
      expect(hasAnyRole('admin', [])).toBe(false)
    })
  })

  describe('ROLE_HIERARCHY', () => {
    it('has correct hierarchy values', () => {
      expect(ROLE_HIERARCHY.viewer).toBe(0)
      expect(ROLE_HIERARCHY.analyst).toBe(1)
      expect(ROLE_HIERARCHY.iam_admin).toBe(2)
      expect(ROLE_HIERARCHY.ciso).toBe(3)
      expect(ROLE_HIERARCHY.admin).toBe(4)
    })

    it('includes exactly 5 roles', () => {
      expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(5)
    })
  })
})
