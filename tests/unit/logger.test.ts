import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('outputs JSON in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('@/lib/logger')

    logger.info('test message', { key: 'value' })

    expect(console.log).toHaveBeenCalledOnce()
    const output = (console.log as any).mock.calls[0][0]
    const parsed = JSON.parse(output)
    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('test message')
    expect(parsed.key).toBe('value')
    expect(parsed.timestamp).toBeDefined()

    vi.unstubAllEnvs()
  })

  it('routes error level to console.error', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('@/lib/logger')

    logger.error('something broke', { code: 500 })

    expect(console.error).toHaveBeenCalledOnce()
    const parsed = JSON.parse((console.error as any).mock.calls[0][0])
    expect(parsed.level).toBe('error')
    expect(parsed.code).toBe(500)

    vi.unstubAllEnvs()
  })

  it('routes warn level to console.warn', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('@/lib/logger')

    logger.warn('caution')

    expect(console.warn).toHaveBeenCalledOnce()

    vi.unstubAllEnvs()
  })

  it('creates child loggers with preset context', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('@/lib/logger')

    const child = logger.child({ requestId: 'abc123', path: '/api/test' })
    child.info('handling request', { userId: 'u1' })

    const parsed = JSON.parse((console.log as any).mock.calls[0][0])
    expect(parsed.requestId).toBe('abc123')
    expect(parsed.path).toBe('/api/test')
    expect(parsed.userId).toBe('u1')

    vi.unstubAllEnvs()
  })

  it('respects LOG_LEVEL filter', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'warn')
    const { logger } = await import('@/lib/logger')

    logger.debug('debug msg')
    logger.info('info msg')
    logger.warn('warn msg')
    logger.error('error msg')

    // debug and info should be filtered out
    expect(console.log).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledOnce()

    vi.unstubAllEnvs()
  })
})
