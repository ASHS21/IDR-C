import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { sampleIdentities } from '../helpers/mock-db'

// Mock auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth/config', () => ({
  auth: () => mockAuth(),
}))

// Mock Zod schemas used by the route
vi.mock('@/lib/schemas/identity', () => ({
  identityFilterSchema: {
    safeParse: (data: any) => ({
      success: true,
      data: {
        page: Number(data.page) || 1,
        pageSize: Number(data.pageSize) || 25,
        sortOrder: data.sortOrder || 'desc',
        sortBy: data.sortBy,
        type: data.type,
        subType: data.subType,
        adTier: data.adTier,
        status: data.status,
        sourceSystem: data.sourceSystem,
        riskScoreMin: data.riskScoreMin ? Number(data.riskScoreMin) : undefined,
        riskScoreMax: data.riskScoreMax ? Number(data.riskScoreMax) : undefined,
        tierViolation: data.tierViolation,
        search: data.search,
      },
    }),
  },
}))

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => Promise.resolve(sampleIdentities),
            }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  identities: {
    orgId: 'orgId',
    type: 'type',
    subType: 'subType',
    adTier: 'adTier',
    status: 'status',
    sourceSystem: 'sourceSystem',
    riskScore: 'riskScore',
    tierViolation: 'tierViolation',
    displayName: 'displayName',
    upn: 'upn',
    email: 'email',
    samAccountName: 'samAccountName',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: (...args: any[]) => args,
  eq: (a: any, b: any) => [a, b],
  gte: (a: any, b: any) => [a, '>=', b],
  lte: (a: any, b: any) => [a, '<=', b],
  ilike: (a: any, b: any) => [a, 'ilike', b],
  or: (...args: any[]) => args,
  desc: (a: any) => a,
  asc: (a: any) => a,
  count: () => 'count',
  sql: () => 'sql',
  SQL: class {},
}))

// Import after mocks
import { GET } from '@/app/api/identities/route'

describe('GET /api/identities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/identities')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when session has no orgId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } })

    const req = new NextRequest('http://localhost:3000/api/identities')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns paginated results for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(body).toHaveProperty('pageSize')
  })

  it('accepts tier filter parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?adTier=tier_0')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts type filter parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?type=human')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts status filter parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?status=active')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts pagination parameters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?page=2&pageSize=10')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.page).toBe(2)
    expect(body.pageSize).toBe(10)
  })

  it('accepts search parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?search=john')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts riskScore range parameters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?riskScoreMin=50&riskScoreMax=90')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts sort parameters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/identities?sortBy=displayName&sortOrder=asc')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })
})
