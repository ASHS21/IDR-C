import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { sampleViolations } from '../helpers/mock-db'

// Mock auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth/config', () => ({
  auth: () => mockAuth(),
}))

// Build a mock that handles the multiple parallel db queries in the violations route
const mockDbSelect = vi.fn()
vi.mock('@/lib/db', () => {
  const createChain = (result: any) => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => ({
            offset: () => Promise.resolve(result),
          }),
        }),
        groupBy: () => Promise.resolve([]),
      }),
      leftJoin: (...args: any[]) => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => Promise.resolve(result),
            }),
          }),
        }),
        leftJoin: (...args: any[]) => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: () => Promise.resolve(result),
              }),
            }),
          }),
        }),
      }),
    }),
  })

  return {
    db: {
      select: (cols?: any) => {
        // When selecting count, return [{total: 2}]
        if (cols && cols.total) {
          return createChain([{ total: 2 }])
        }
        // When selecting severity, return breakdown
        if (cols && cols.severity) {
          return createChain([{ severity: 'critical', count: 1 }, { severity: 'high', count: 1 }])
        }
        // When selecting type
        if (cols && cols.type) {
          return createChain([{ type: 'tier_breach', count: 1 }])
        }
        // When selecting status
        if (cols && cols.status) {
          return createChain([{ status: 'open', count: 2 }])
        }
        // Default: return violations list
        return createChain(sampleViolations)
      },
    },
  }
})

vi.mock('@/lib/db/schema', () => ({
  policyViolations: {
    orgId: 'orgId',
    violationType: 'violationType',
    severity: 'severity',
    status: 'status',
    detectedAt: 'detectedAt',
    remediatedAt: 'remediatedAt',
    exceptionReason: 'exceptionReason',
    exceptionExpiresAt: 'exceptionExpiresAt',
    id: 'id',
    policyId: 'policyId',
    identityId: 'identityId',
  },
  policies: {
    id: 'id',
    name: 'name',
  },
  identities: {
    id: 'id',
    displayName: 'displayName',
    type: 'type',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: (...args: any[]) => args,
  eq: (a: any, b: any) => [a, b],
  gt: (a: any, b: any) => [a, '>', b],
  desc: (col: any) => (a: any) => a,
  asc: (col: any) => (a: any) => a,
  count: () => ({ as: () => 'count' }),
  sql: (strings: any, ...vals: any[]) => 'sql',
  SQL: class {},
}))

import { GET } from '@/app/api/violations/route'

describe('GET /api/violations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/violations')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when session has no orgId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } })

    const req = new NextRequest('http://localhost:3000/api/violations')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns violations for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(body).toHaveProperty('pageSize')
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('exceptions')
  })

  it('accepts severity filter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations?severity=critical')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts violationType filter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations?violationType=tier_breach')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts status filter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations?status=open')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts pagination parameters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations?page=2&pageSize=10')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.page).toBe(2)
    expect(body.pageSize).toBe(10)
  })

  it('accepts sort order parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations?sortOrder=asc')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('returns summary with severity, type, and status breakdowns', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toHaveProperty('bySeverity')
    expect(body.summary).toHaveProperty('byType')
    expect(body.summary).toHaveProperty('byStatus')
    expect(body.summary).toHaveProperty('remediationRate')
  })

  it('clamps pageSize to max 100', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations?pageSize=200')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pageSize).toBeLessThanOrEqual(100)
  })

  it('defaults page to 1', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/violations')
    const res = await GET(req)

    const body = await res.json()
    expect(body.page).toBe(1)
  })
})
