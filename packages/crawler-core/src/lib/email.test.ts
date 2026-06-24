import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the resend SDK before importing the module under test
const mockSend = vi.fn().mockResolvedValue({ id: 'email-1' })
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(
    class {
      emails = { send: mockSend }
    },
  ),
}))

describe('sendCrawlFailureEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      ADMIN_EMAIL: 'admin@example.com',
      SENTRY_ENVIRONMENT: 'production',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends an email with venue name and failure count', async () => {
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail({
      venueName: 'Ogden Theatre',
      venueId: 'venue-ogden',
      consecutiveFailures: 3,
    })

    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('admin@example.com')
    expect(call.subject).toContain('Ogden Theatre')
    expect(call.html).toContain('3')
  })

  it('skips sending + logs warning when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { sendCrawlFailureEmail } = await import('./email.js')
      await sendCrawlFailureEmail({
        venueName: 'Ogden Theatre',
        venueId: 'venue-ogden',
        consecutiveFailures: 3,
      })

      expect(mockSend).not.toHaveBeenCalled()
      const warning = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('email.skipped'))
      expect(warning).toBeDefined()
      expect(warning).toContain('RESEND_API_KEY')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('skips sending + logs warning when ADMIN_EMAIL is not set', async () => {
    delete process.env.ADMIN_EMAIL
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { sendCrawlFailureEmail } = await import('./email.js')
      await sendCrawlFailureEmail({
        venueName: 'Ogden Theatre',
        venueId: 'venue-ogden',
        consecutiveFailures: 3,
      })

      expect(mockSend).not.toHaveBeenCalled()
      const warning = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('email.skipped'))
      expect(warning).toBeDefined()
      expect(warning).toContain('ADMIN_EMAIL')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('deep-links the dashboard with ?venueId= so the admin lands on the alerted row', async () => {
    process.env.ADMIN_URL = 'https://concertcrawl.app'
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail({
      venueName: 'Ogden Theatre',
      venueId: 'venue-ogden-123',
      consecutiveFailures: 3,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain(
      'https://concertcrawl.app/admin/crawl?venueId=venue-ogden-123',
    )
  })
})

describe('sendEventCountDropEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      ADMIN_EMAIL: 'admin@example.com',
      SENTRY_ENVIRONMENT: 'production',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends "went dark" copy when eventsFound is 0', async () => {
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Bluebird Theater',
      venueId: 'venue-1',
      crawlRunId: 'run-1',
      eventsFound: 0,
      baselineCount: 70,
      dropPercent: 100,
    })

    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('went dark')
    expect(call.subject).toContain('Bluebird Theater')
    expect(call.html).toContain('Bluebird Theater')
    expect(call.html).toContain('70')
    expect(call.html).toContain('100%')
  })

  it('sends "dropped sharply" copy when eventsFound > 0', async () => {
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Mission Ballroom',
      venueId: 'venue-2',
      crawlRunId: 'run-2',
      eventsFound: 5,
      baselineCount: 40,
      dropPercent: 87,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('dropped sharply')
    expect(call.html).toContain('87%')
  })

  it('skips sending + logs warning when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { sendEventCountDropEmail } = await import('./email.js')
      await sendEventCountDropEmail({
        venueName: 'Bluebird Theater',
        venueId: 'venue-1',
        crawlRunId: 'run-1',
        eventsFound: 0,
        baselineCount: 70,
        dropPercent: 100,
      })

      expect(mockSend).not.toHaveBeenCalled()
      const warning = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('email.skipped'))
      expect(warning).toBeDefined()
      expect(warning).toContain('RESEND_API_KEY')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('deep-links the dashboard with ?venueId= so the admin lands on the alerted row', async () => {
    process.env.ADMIN_URL = 'https://concertcrawl.app'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Cervantes',
      venueId: 'venue-cervantes-abc',
      crawlRunId: 'run-9',
      eventsFound: 0,
      baselineCount: 137.7,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain(
      'https://concertcrawl.app/admin/crawl?venueId=venue-cervantes-abc',
    )
  })

  it('URL-encodes venueId to defend against future non-uuid id formats', async () => {
    process.env.ADMIN_URL = 'https://concertcrawl.app'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Test',
      venueId: 'has spaces & ampersand',
      crawlRunId: 'run-x',
      eventsFound: 0,
      baselineCount: 50,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('venueId=has%20spaces%20%26%20ampersand')
  })
})

// Pinning the cross-cutting environment qualification on both alert types
// so a future caller can't accidentally remove the [Staging] prefix +
// banner and start spamming admins with prod-shaped emails from staging.
describe('environment qualification on alert emails (admin-UI feedback)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      ADMIN_EMAIL: 'admin@example.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('production: subject has no prefix and body has no banner', async () => {
    process.env.SENTRY_ENVIRONMENT = 'production'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v1',
      crawlRunId: 'r1',
      eventsFound: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[')).toBe(false)
    expect(call.html).not.toContain('Sent from')
  })

  it('staging: subject prefixed with [Staging] and body has banner', async () => {
    process.env.SENTRY_ENVIRONMENT = 'staging'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v1',
      crawlRunId: 'r1',
      eventsFound: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[Staging] ')).toBe(true)
    expect(call.html).toContain('Sent from <strong>staging</strong>')
  })

  it('local: subject prefixed with [Local] and body has banner', async () => {
    process.env.SENTRY_ENVIRONMENT = 'local'
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail({
      venueName: 'Ogden',
      venueId: 'v1',
      consecutiveFailures: 3,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[Local] ')).toBe(true)
    expect(call.html).toContain('Sent from <strong>local</strong>')
  })

  // Default behavior: when SENTRY_ENVIRONMENT is unset, treat as 'local' so
  // a forgotten env var on a new service doesn't masquerade as production.
  it('defaults to local-qualification when SENTRY_ENVIRONMENT is unset', async () => {
    delete process.env.SENTRY_ENVIRONMENT
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v1',
      crawlRunId: 'r1',
      eventsFound: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[Local] ')).toBe(true)
  })
})
