import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock auth module
const mockAuth = vi.fn()
vi.mock('@/lib/auth/config', () => ({
  auth: () => mockAuth(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

import { withApiHandler } from '@/lib/api/handler'

function createMockRequest(url = 'http://localhost:3000/api/test', method = 'GET'): NextRequest {
  return new NextRequest(new URL(url), { method })
}

describe('withApiHandler', () => {
  beforeEach(() => {
    mockAuth.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when session is missing', async () => {
    mockAuth.mockResolvedValue(null)

    const handler = withApiHandler(async () => {
      return NextResponse.json({ data: 'secret' })
    })

    const response = await handler(createMockRequest())
    expect(response.status).toBe(401)
  })

  it('returns 401 when orgId is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'test@test.com' } })

    const handler = withApiHandler(async () => {
      return NextResponse.json({ data: 'secret' })
    })

    const response = await handler(createMockRequest())
    expect(response.status).toBe(401)
  })

  it('passes session context to handler when authenticated', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@test.com', orgId: 'org-1', appRole: 'admin' },
    })

    let receivedCtx: any
    const handler = withApiHandler(async (_req, ctx) => {
      receivedCtx = ctx
      return NextResponse.json({ ok: true })
    })

    const response = await handler(createMockRequest())
    expect(response.status).toBe(200)
    expect(receivedCtx.orgId).toBe('org-1')
    expect(receivedCtx.session.user.appRole).toBe('admin')
    expect(receivedCtx.log).toBeDefined()
  })

  it('returns 403 when user lacks required role', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@test.com', orgId: 'org-1', appRole: 'viewer' },
    })

    const handler = withApiHandler(
      async () => NextResponse.json({ data: 'admin-only' }),
      { requiredRole: 'iam_admin' }
    )

    const response = await handler(createMockRequest())
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('iam_admin')
  })

  it('allows access when user meets required role', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@test.com', orgId: 'org-1', appRole: 'ciso' },
    })

    const handler = withApiHandler(
      async () => NextResponse.json({ data: 'allowed' }),
      { requiredRole: 'iam_admin' }
    )

    const response = await handler(createMockRequest())
    expect(response.status).toBe(200)
  })

  it('catches unhandled errors and returns 500', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@test.com', orgId: 'org-1', appRole: 'admin' },
    })

    const handler = withApiHandler(async () => {
      throw new Error('Something exploded')
    })

    const response = await handler(createMockRequest())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
    expect(body.requestId).toBeDefined()
  })

  it('skips auth for public endpoints', async () => {
    mockAuth.mockResolvedValue(null) // No session

    const handler = withApiHandler(
      async () => NextResponse.json({ status: 'healthy' }),
      { public: true }
    )

    const response = await handler(createMockRequest())
    expect(response.status).toBe(200)
  })
})
