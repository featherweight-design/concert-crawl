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

  it('sends "went dark" copy when eventsUsable is 0', async () => {
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Bluebird Theater',
      venueId: 'venue-1',
      crawlRunId: 'run-1',
      eventsFound: 0,
      eventsUsable: 0,
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

  it('sends "dropped sharply" copy when eventsUsable > 0', async () => {
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Mission Ballroom',
      venueId: 'venue-2',
      crawlRunId: 'run-2',
      eventsFound: 5,
      eventsUsable: 5,
      baselineCount: 40,
      dropPercent: 87,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('dropped sharply')
    expect(call.html).toContain('87%')
  })

  it('blames the downstream guards when extraction found rows but none were usable (#1167)', async () => {
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Cervantes',
      venueId: 'venue-3',
      crawlRunId: 'run-3',
      eventsFound: 10,
      eventsUsable: 0,
      baselineCount: 30,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('went dark')
    expect(call.html).toContain('all 10 rows were rejected downstream')
    expect(call.html).not.toContain("venue's site changed shape")
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
        eventsUsable: 0,
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
      eventsUsable: 0,
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
      eventsUsable: 0,
      baselineCount: 50,
      dropPercent: 100,
    })

    // URLSearchParams uses form-urlencoded (spaces → '+', '&' → '%26').
    // Both '+' and '%20' are valid query-string space encodings per RFC 1738.
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('venueId=has+spaces+%26+ampersand')
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
    // ADMIN_URL set here so the env-label assertions aren't drowned out by
    // the unrelated "ADMIN_URL missing in non-prod" warning from
    // adminCrawlUrl. The missing-ADMIN_URL behaviour is exercised by its
    // own test in the URL-construction suite below.
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_URL: 'https://concertcrawl.app',
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
      eventsUsable: 0,
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
      eventsUsable: 0,
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
      eventsUsable: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[Local] ')).toBe(true)
  })

  // Misconfiguration defense: a value like 'Production' or 'production '
  // (capitalisation / whitespace) should still suppress the prefix/banner
  // — otherwise prod alerts would acquire `[Production] ` and look like
  // a staging email in the inbox.
  it('treats "Production" / "production " as production (case + whitespace tolerant)', async () => {
    process.env.SENTRY_ENVIRONMENT = '  Production  '
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v1',
      crawlRunId: 'r1',
      eventsFound: 0,
      eventsUsable: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[')).toBe(false)
    expect(call.html).not.toContain('Sent from')
  })

  it('treats empty SENTRY_ENVIRONMENT as local (safe default)', async () => {
    process.env.SENTRY_ENVIRONMENT = ''
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v1',
      crawlRunId: 'r1',
      eventsFound: 0,
      eventsUsable: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject.startsWith('[Local] ')).toBe(true)
  })
})

// Pins URL construction so a future change can't reintroduce trailing-slash
// or encoding bugs. The URL constructor handles both consistently.
describe('admin crawl URL construction', () => {
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

  it('handles ADMIN_URL with a trailing slash without double-slashing the path', async () => {
    process.env.ADMIN_URL = 'https://concertcrawl.app/'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v-1',
      crawlRunId: 'r-1',
      eventsFound: 0,
      eventsUsable: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain(
      'https://concertcrawl.app/admin/crawl?venueId=v-1',
    )
    expect(call.html).not.toContain('//admin/crawl')
  })

  // ADMIN_URL malformed → the email should still send (don't break the
  // alert pipeline over a misconfig); fall back to the prod default + log
  // a diagnostic so the operator can fix it.
  it('falls back to prod default + logs when ADMIN_URL is malformed', async () => {
    process.env.ADMIN_URL = 'not a url'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { sendEventCountDropEmail } = await import('./email.js')
      await sendEventCountDropEmail({
        venueName: 'Ogden',
        venueId: 'v-1',
        crawlRunId: 'r-1',
        eventsFound: 0,
        baselineCount: 100,
        dropPercent: 100,
      })

      expect(mockSend).toHaveBeenCalledOnce()
      const call = mockSend.mock.calls[0][0]
      expect(call.html).toContain(
        'https://concertcrawl.app/admin/crawl?venueId=v-1',
      )

      const warning = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('email.misconfigured'))
      expect(warning).toBeDefined()
    } finally {
      warnSpy.mockRestore()
    }
  })

  // ADMIN_URL unset in non-prod → admin would be sent to the prod domain
  // even though the email is qualified as [Staging]. Log a warning so the
  // misconfig is visible; the email still sends.
  it('warns when ADMIN_URL is unset in a non-prod env', async () => {
    process.env.SENTRY_ENVIRONMENT = 'staging'
    delete process.env.ADMIN_URL
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { sendEventCountDropEmail } = await import('./email.js')
      await sendEventCountDropEmail({
        venueName: 'Ogden',
        venueId: 'v-1',
        crawlRunId: 'r-1',
        eventsFound: 0,
        baselineCount: 100,
        dropPercent: 100,
      })

      expect(mockSend).toHaveBeenCalledOnce()
      const warning = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('ADMIN_URL'))
      expect(warning).toBeDefined()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('does NOT warn when ADMIN_URL is unset in production (default is correct)', async () => {
    process.env.SENTRY_ENVIRONMENT = 'production'
    delete process.env.ADMIN_URL
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { sendEventCountDropEmail } = await import('./email.js')
      await sendEventCountDropEmail({
        venueName: 'Ogden',
        venueId: 'v-1',
        crawlRunId: 'r-1',
        eventsFound: 0,
        baselineCount: 100,
        dropPercent: 100,
      })

      const adminUrlWarning = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('ADMIN_URL'))
      expect(adminUrlWarning).toBeUndefined()
    } finally {
      warnSpy.mockRestore()
    }
  })
})

// CR/LF defense for the env label: a value with embedded \r or \n would
// otherwise flow into the email subject header, where Resend would reject
// the message or — on a less strict transport — open a header-injection
// seam. Strip at normalization time.
describe('SENTRY_ENVIRONMENT CR/LF stripping', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // ADMIN_URL set here so the CR/LF assertion isn't drowned out by the
    // unrelated "ADMIN_URL missing in non-prod" warning.
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_URL: 'https://concertcrawl.app',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('strips embedded \\r and \\n from the env label', async () => {
    process.env.SENTRY_ENVIRONMENT = 'stag\r\ning'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Ogden',
      venueId: 'v-1',
      crawlRunId: 'r-1',
      eventsFound: 0,
      eventsUsable: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    // Normalised to plain 'staging' — no \r or \n leaking into the header.
    expect(call.subject.startsWith('[Staging] ')).toBe(true)
    expect(call.subject).not.toMatch(/[\r\n]/)
  })

  // Defense-in-depth for caller-supplied subject content (venueName et al)
  // — anything reaching sendAdminAlert's input.subject is sanitised at the
  // choke point so a venue name with embedded \r\n can't open a header-
  // injection seam.
  it('strips CR/LF from venueName (which flows into the subject header)', async () => {
    process.env.SENTRY_ENVIRONMENT = 'production'
    const { sendEventCountDropEmail } = await import('./email.js')
    await sendEventCountDropEmail({
      venueName: 'Bad\r\nVenue: Subject Injection',
      venueId: 'v-1',
      crawlRunId: 'r-1',
      eventsFound: 0,
      eventsUsable: 0,
      baselineCount: 100,
      dropPercent: 100,
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.subject).not.toMatch(/[\r\n]/)
    // Sanity: the venue name characters are still present (just no newlines).
    expect(call.subject).toContain('Bad')
    expect(call.subject).toContain('Venue')
  })
})
