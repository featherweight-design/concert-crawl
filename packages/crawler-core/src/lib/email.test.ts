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
