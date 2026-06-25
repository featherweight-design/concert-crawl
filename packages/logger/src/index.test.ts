import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock @sentry/node before importing the module under test so that
// reportFailure's captureMessage call lands on the spy. The mock returns
// an object so `import * as Sentry from '@sentry/node'` resolves through
// vitest's ESM mock plumbing the same way the real module does.
const captureMessageSpy = vi.fn()
vi.mock('@sentry/node', () => ({
  captureMessage: captureMessageSpy,
}))

const { createLogger, reportFailure } = await import('./index.js')

describe('createLogger', () => {
  beforeEach(() => {
    delete process.env['LOG_LEVEL']
  })

  afterEach(() => {
    delete process.env['LOG_LEVEL']
  })

  it('returns a logger with standard methods', () => {
    const logger = createLogger('test')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('defaults to info log level', () => {
    const logger = createLogger('test')
    expect(logger.level).toBe('info')
  })

  it('respects LOG_LEVEL env var', () => {
    process.env['LOG_LEVEL'] = 'debug'
    const logger = createLogger('test')
    expect(logger.level).toBe('debug')
  })

  it('includes the name binding', () => {
    const logger = createLogger('api')
    expect(logger.bindings().name).toBe('api')
  })
})

describe('reportFailure', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    captureMessageSpy.mockClear()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('writes a structured JSON log to stdout matching the report shape', () => {
    reportFailure({
      event: 'llm.invalid_tool_input',
      severity: 'error',
      sourceUrl: 'https://example.com/events',
    })

    expect(consoleSpy).toHaveBeenCalledOnce()
    const logged = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]))
    expect(logged.event).toBe('llm.invalid_tool_input')
    expect(logged.severity).toBe('error')
    expect(logged.sourceUrl).toBe('https://example.com/events')
  })

  it("forwards severity 'error' to Sentry as level 'error' with extra context", () => {
    reportFailure({
      event: 'crawl.email_error',
      severity: 'error',
      venueId: 'venue-123',
      attempt: 3,
    })

    expect(captureMessageSpy).toHaveBeenCalledOnce()
    const [message, options] = captureMessageSpy.mock.calls[0] ?? []
    expect(message).toBe('crawl.email_error')
    expect(options.level).toBe('error')
    expect(options.extra).toEqual({ venueId: 'venue-123', attempt: 3 })
  })

  it("forwards severity 'warn' to Sentry as level 'warning' (Sentry's name for warn)", () => {
    reportFailure({
      event: 'email.misconfigured',
      severity: 'warn',
      varName: 'ADMIN_URL',
    })

    expect(captureMessageSpy).toHaveBeenCalledOnce()
    const [, options] = captureMessageSpy.mock.calls[0] ?? []
    expect(options.level).toBe('warning')
  })

  it("does not place 'event' or 'severity' into Sentry extra (they belong on message + level)", () => {
    reportFailure({
      event: 'llm.no_tool_use',
      severity: 'warn',
      sourceUrl: 'https://example.com',
    })

    const [, options] = captureMessageSpy.mock.calls[0] ?? []
    expect(options.extra).not.toHaveProperty('event')
    expect(options.extra).not.toHaveProperty('severity')
    expect(options.extra).toEqual({ sourceUrl: 'https://example.com' })
  })

  it('still emits the stdout log even when Sentry forwarding is the primary intent', () => {
    // Preserves backward compatibility with operators / dashboards that
    // grep stdout for these structured events.
    reportFailure({
      event: 'crawl.event_count_alert.error',
      severity: 'error',
      venueId: 'venue-9',
    })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(captureMessageSpy).toHaveBeenCalledOnce()
  })
})
