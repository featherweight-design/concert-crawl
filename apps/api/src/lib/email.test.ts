import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the resend SDK before importing the module under test
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(
    class {
      emails = { send: mockSend }
    },
  ),
}))

describe('sendAdminAlertEmail', () => {
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

  it('sends an email with the provided subject + html and returns sent: true + resend id', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'email-123' }, error: null })
    const { sendAdminAlertEmail } = await import('./email.js')

    const result = await sendAdminAlertEmail({
      subject: 'Test alert',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({ sent: true, resendId: 'email-123' })
    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0]![0]
    expect(call.to).toBe('admin@example.com')
    expect(call.subject).toBe('Test alert')
    expect(call.html).toBe('<p>Hello</p>')
    expect(call.from).toContain('alerts@concertcrawl.app')
  })

  it('passes through optional text body when provided', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'email-456' }, error: null })
    const { sendAdminAlertEmail } = await import('./email.js')

    await sendAdminAlertEmail({
      subject: 'Test',
      html: '<p>html</p>',
      text: 'plain text',
    })

    const call = mockSend.mock.calls[0]![0]
    expect(call.text).toBe('plain text')
  })

  it('returns missing_api_key without calling resend when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY
    const { sendAdminAlertEmail } = await import('./email.js')

    const result = await sendAdminAlertEmail({ subject: 's', html: 'h' })

    expect(result).toEqual({ sent: false, reason: 'missing_api_key' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns missing_admin_email without calling resend when ADMIN_EMAIL is unset', async () => {
    delete process.env.ADMIN_EMAIL
    const { sendAdminAlertEmail } = await import('./email.js')

    const result = await sendAdminAlertEmail({ subject: 's', html: 'h' })

    expect(result).toEqual({ sent: false, reason: 'missing_admin_email' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns send_failed when Resend returns a structured error', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid sender', name: 'validation_error' },
    })
    const { sendAdminAlertEmail } = await import('./email.js')

    const result = await sendAdminAlertEmail({ subject: 's', html: 'h' })

    expect(result.sent).toBe(false)
    if (!result.sent) {
      expect(result.reason).toBe('send_failed')
      expect(result.error).toEqual({
        message: 'Invalid sender',
        name: 'validation_error',
      })
    }
  })

  it('returns send_failed when Resend throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('network timeout'))
    const { sendAdminAlertEmail } = await import('./email.js')

    const result = await sendAdminAlertEmail({ subject: 's', html: 'h' })

    expect(result.sent).toBe(false)
    if (!result.sent) {
      expect(result.reason).toBe('send_failed')
      expect((result.error as Error).message).toBe('network timeout')
    }
  })
})
