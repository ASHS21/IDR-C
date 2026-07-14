import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('CronMonitor', () => {
  // Create fresh instance for each test to avoid state leakage
  async function createMonitor() {
    vi.resetModules()
    const { cronMonitor } = await import('@/lib/cron/monitor')
    return cronMonitor
  }

  it('tracks successful cron job execution', async () => {
    const monitor = await createMonitor()

    await monitor.run('test-job', async (tracker) => {
      tracker.setRecordsProcessed(42)
      return 'done'
    })

    const runs = monitor.getRecentRuns('test-job')
    expect(runs).toHaveLength(1)
    expect(runs[0].jobName).toBe('test-job')
    expect(runs[0].status).toBe('success')
    expect(runs[0].recordsProcessed).toBe(42)
    expect(runs[0].durationMs).toBeGreaterThanOrEqual(0)
  })

  it('tracks failed cron job execution', async () => {
    const monitor = await createMonitor()

    await expect(
      monitor.run('failing-job', async () => {
        throw new Error('DB connection failed')
      })
    ).rejects.toThrow('DB connection failed')

    const runs = monitor.getRecentRuns('failing-job')
    expect(runs).toHaveLength(1)
    expect(runs[0].status).toBe('error')
    expect(runs[0].error).toBe('DB connection failed')
  })

  it('returns correct job summary', async () => {
    const monitor = await createMonitor()

    await monitor.run('job-a', async () => {})
    await monitor.run('job-a', async () => {})
    await monitor.run('job-b', async () => {})
    await expect(
      monitor.run('job-b', async () => { throw new Error('fail') })
    ).rejects.toThrow()

    const summary = monitor.getJobSummary()
    expect(summary['job-a'].totalRuns).toBe(2)
    expect(summary['job-a'].errorCount).toBe(0)
    expect(summary['job-b'].totalRuns).toBe(2)
    expect(summary['job-b'].errorCount).toBe(1)
  })

  it('filters recent runs by job name', async () => {
    const monitor = await createMonitor()

    await monitor.run('job-a', async () => {})
    await monitor.run('job-b', async () => {})
    await monitor.run('job-a', async () => {})

    expect(monitor.getRecentRuns('job-a')).toHaveLength(2)
    expect(monitor.getRecentRuns('job-b')).toHaveLength(1)
    expect(monitor.getRecentRuns()).toHaveLength(3) // all jobs
  })

  it('respects limit parameter', async () => {
    const monitor = await createMonitor()

    for (let i = 0; i < 10; i++) {
      await monitor.run('bulk-job', async () => {})
    }

    expect(monitor.getRecentRuns('bulk-job', 3)).toHaveLength(3)
  })

  it('returns runs in reverse chronological order', async () => {
    const monitor = await createMonitor()

    await monitor.run('ordered-job', async (t) => { t.setRecordsProcessed(1) })
    await monitor.run('ordered-job', async (t) => { t.setRecordsProcessed(2) })
    await monitor.run('ordered-job', async (t) => { t.setRecordsProcessed(3) })

    const runs = monitor.getRecentRuns('ordered-job')
    expect(runs[0].recordsProcessed).toBe(3) // most recent first
    expect(runs[2].recordsProcessed).toBe(1) // oldest last
  })
})
