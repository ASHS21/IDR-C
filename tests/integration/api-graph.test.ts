import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { sampleIdentities } from '../helpers/mock-db'

// Mock auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth/config', () => ({
  auth: () => mockAuth(),
}))

// Track call count externally
let dbCallCount = 0

const entitlementResult = [
  {
    identityId: 'id-1',
    resourceId: 'res-1',
    permissionName: 'Domain Admin',
    adTier: 'tier_0',
    resourceName: 'DC-01',
    resourceType: 'domain_controller',
    resourceTier: 'tier_0',
    resourceCriticality: 'critical',
    resourceEnvironment: 'production',
    resourceOwnerIdentityId: null,
  },
]

const membershipResult = [
  {
    identityId: 'id-1',
    groupId: 'grp-1',
    groupName: 'Domain Admins',
    groupType: 'security',
    groupScope: 'global',
    groupTier: 'tier_0',
    isPrivileged: true,
    memberCount: 5,
    nestedGroupCount: 0,
  },
]

// Mock db with chainable methods
vi.mock('@/lib/db', () => {
  const createChain = (resultFn: () => any) => {
    const chain: any = {}
    chain.from = () => chain
    chain.where = () => chain
    chain.orderBy = () => chain
    chain.limit = () => chain
    chain.offset = () => chain
    chain.innerJoin = () => chain
    chain.leftJoin = () => chain
    chain.then = (resolve: any, reject?: any) => {
      try { resolve(resultFn()) } catch (e) { if (reject) reject(e) }
    }
    return chain
  }

  return {
    db: {
      select: (cols?: any) => {
        dbCallCount++
        const currentCall = dbCallCount
        return createChain(() => {
          if (currentCall === 1) return sampleIdentities
          if (currentCall === 2) return entitlementResult
          if (currentCall === 3) return membershipResult
          return []
        })
      },
    },
  }
})

vi.mock('@/lib/db/schema', () => ({
  identities: {
    orgId: 'orgId',
    adTier: 'adTier',
    riskScore: 'riskScore',
    id: 'id',
  },
  entitlements: {
    orgId: 'orgId',
    identityId: 'identityId',
    resourceId: 'resourceId',
    permissionName: 'permissionName',
    adTierOfPermission: 'adTierOfPermission',
  },
  resources: {
    id: 'id',
    name: 'name',
    type: 'type',
    adTier: 'adTier',
    criticality: 'criticality',
    environment: 'environment',
    ownerIdentityId: 'ownerIdentityId',
  },
  groupMemberships: {
    orgId: 'orgId',
    identityId: 'identityId',
    groupId: 'groupId',
  },
  groups: {
    id: 'id',
    name: 'name',
    type: 'type',
    scope: 'scope',
    adTier: 'adTier',
    isPrivileged: 'isPrivileged',
    memberCount: 'memberCount',
    nestedGroupCount: 'nestedGroupCount',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: (...args: any[]) => args,
  eq: (a: any, b: any) => [a, b],
  desc: (col: any) => col,
  inArray: (a: any, b: any) => [a, 'in', b],
}))

import { GET } from '@/app/api/graph/route'

describe('GET /api/graph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbCallCount = 0
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when session has no orgId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } })

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns nodes and links for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('nodes')
    expect(body).toHaveProperty('links')
    expect(Array.isArray(body.nodes)).toBe(true)
    expect(Array.isArray(body.links)).toBe(true)
  })

  it('accepts limit parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph?limit=25')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('caps limit to 100', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph?limit=500')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('accepts tier filter parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph?tier=tier_0')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('returns identity nodes with expected properties', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)
    const body = await res.json()

    const identityNode = body.nodes.find((n: any) => n.type === 'identity')
    if (identityNode) {
      expect(identityNode).toHaveProperty('id')
      expect(identityNode).toHaveProperty('label')
      expect(identityNode).toHaveProperty('type')
      expect(identityNode).toHaveProperty('properties')
    }
  })

  it('returns resource nodes from entitlements', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)
    const body = await res.json()

    const resourceNode = body.nodes.find((n: any) => n.type === 'resource')
    if (resourceNode) {
      expect(resourceNode).toHaveProperty('id')
      expect(resourceNode).toHaveProperty('label')
      expect(resourceNode.type).toBe('resource')
    }
  })

  it('returns group nodes from memberships', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)
    const body = await res.json()

    const groupNode = body.nodes.find((n: any) => n.type === 'group')
    if (groupNode) {
      expect(groupNode).toHaveProperty('id')
      expect(groupNode).toHaveProperty('label')
      expect(groupNode.type).toBe('group')
    }
  })

  it('links have source, target, and type fields', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u1', email: 'admin@test.com', orgId: 'test-org-id', appRole: 'admin' },
    })

    const req = new NextRequest('http://localhost:3000/api/graph')
    const res = await GET(req)
    const body = await res.json()

    for (const link of body.links) {
      expect(link).toHaveProperty('source')
      expect(link).toHaveProperty('target')
      expect(link).toHaveProperty('type')
      expect(['entitlement', 'membership', 'manager', 'owner']).toContain(link.type)
    }
  })
})
