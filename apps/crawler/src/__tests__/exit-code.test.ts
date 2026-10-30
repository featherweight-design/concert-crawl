import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runTriggeredCrawls = vi.fn()
const runDailyCrawl = vi.fn()
const flush = vi.fn()
const captureException = vi.fn()
const loggerError = vi.fn()
const loggerWarn = vi.fn()
const loggerInfo = vi.fn()

vi.mock('../instrument.js', () => ({}))
vi.mock('../run.js', () => ({ runTriggeredCrawls, runDailyCrawl }))
vi.mock('@sentry/node', () => ({ flush, captureException }))
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    error: loggerError,
    warn: loggerWarn,
    info: loggerInfo,
  }),
}))

// index.ts runs main() at import time, so each case needs a fresh module
// registry and has to wait for the settled chain before asserting.
async function importEntrypoint() {
  const exitSpy = vi.spyOn(process, 'exit')
  // process.exit is typed as returning never. The stub has to return normally
  // so the test runner survives, which no cast can express honestly — and
  // because the entrypoint never continues past a real exit, returning here is
  // only sound while the code under test treats exit as its last statement.
  // @ts-expect-error deliberate: see above
  exitSpy.mockImplementation(() => undefined)

  vi.resetModules()
  await import('../index.js')
  await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled())

  return exitSpy
}

describe('crawler entrypoint exit code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env['CRAWL_MODE'] = 'daily'
    runDailyCrawl.mockResolvedValue({
      succeeded: 1,
      failed: 0,
      total: 1,
      degraded: false,
    })
    flush.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env['CRAWL_MODE']
  })

  it('exits 0 when the crawl succeeds', async () => {
    const exitSpy = await importEntrypoint()

    expect(exitSpy).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(0)
    expect(captureException).not.toHaveBeenCalled()
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('exits 0 when the crawl succeeds but the Sentry flush rejects', async () => {
    flush.mockRejectedValue(new Error('transport unavailable'))

    const exitSpy = await importEntrypoint()

    // The whole point of the fix: a flush failure is logged, never escalated
    // into the fatal handler, and never changes the exit code.
    expect(exitSpy).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(0)
    expect(loggerWarn).toHaveBeenCalledTimes(1)
    expect(captureException).not.toHaveBeenCalled()
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('exits 1 without reporting a crash when the run is degraded', async () => {
    runDailyCrawl.mockResolvedValue({
      succeeded: 12,
      failed: 8,
      total: 20,
      degraded: true,
    })
    const exitSpy = await importEntrypoint()

    expect(exitSpy).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(captureException).not.toHaveBeenCalled()
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('exits 1 and reports when the crawl itself fails', async () => {
    runDailyCrawl.mockRejectedValue(new Error('crawl blew up'))

    const exitSpy = await importEntrypoint()

    expect(exitSpy).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(captureException).toHaveBeenCalledTimes(1)
    expect(loggerError).toHaveBeenCalledTimes(1)
  })

  it('still exits 1 when the crawl fails and the Sentry flush also rejects', async () => {
    runDailyCrawl.mockRejectedValue(new Error('crawl blew up'))
    flush.mockRejectedValue(new Error('transport unavailable'))

    const exitSpy = await importEntrypoint()

    expect(exitSpy).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(loggerWarn).toHaveBeenCalledTimes(1)
  })

  it('still runs the daily crawl in all mode when the trigger drain throws', async () => {
    process.env['CRAWL_MODE'] = 'all'
    runTriggeredCrawls.mockRejectedValue(new Error('neon blip'))

    const exitSpy = await importEntrypoint()

    expect(runDailyCrawl).toHaveBeenCalledTimes(1)
    expect(captureException).toHaveBeenCalledTimes(1)
    // Reported, and the run still fails so the drain error is not silent.
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
