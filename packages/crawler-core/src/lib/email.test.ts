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
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends an email with venue name and failure count', async () => {
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail('Ogden Theatre', 3)

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
      await sendCrawlFailureEmail('Ogden Theatre', 3)

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
      await sendCrawlFailureEmail('Ogden Theatre', 3)

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
})
