import { vi } from 'vitest'

export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'admin@test.com',
    name: 'Test Admin',
    orgId: 'test-org-id',
    appRole: 'admin' as const,
  },
}

export const mockUnauthenticatedSession = null

export function setupMockAuth(session = mockSession) {
  vi.mock('@/lib/auth/config', () => ({
    auth: vi.fn(() => Promise.resolve(session)),
  }))
}

export function setupUnauthenticatedAuth() {
  vi.mock('@/lib/auth/config', () => ({
    auth: vi.fn(() => Promise.resolve(null)),
  }))
}
