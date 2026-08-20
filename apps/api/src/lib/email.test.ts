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

const mockGetUser = vi.fn()
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(() => ({ users: { getUser: mockGetUser } })),
}))

const mockGetTemplateRenderer = vi.fn()
vi.mock('../emails/registry.js', () => ({
  getTemplateRenderer: mockGetTemplateRenderer,
}))

// Chainable Drizzle mocks — each terminal step is a named mock so tests can
// steer results per scenario. Tables/types come from the real module.
const mockSelectLimit = vi.fn()
const mockInsertValues = vi.fn()
const mockInsertReturning = vi.fn()
const mockUpdateSet = vi.fn()
const mockUpdateWhere = vi.fn()
const mockInsertOnConflictDoUpdate = vi.fn()
vi.mock('@concert-crawl/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@concert-crawl/db')>()
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({ where: () => ({ limit: mockSelectLimit }) }),
      }),
      insert: () => ({ values: mockInsertValues }),
      update: () => ({ set: mockUpdateSet }),
    },
  }
})

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

describe('sendTransactionalEmail', () => {
  const originalEnv = process.env

  const sendParams = {
    templateKey: 'welcome_paid',
    userId: 'user_1',
    dedupeKey: 'sub:sub_123',
    vars: { tier: 'premium' },
  } as const

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      CLERK_SECRET_KEY: 'sk_test_key',
    }
    delete process.env.SENTRY_ENVIRONMENT

    mockGetTemplateRenderer.mockReturnValue(() => ({
      subject: 'Test subject',
      preheader: 'Test preheader',
      html: '<p>hi</p>',
      text: 'hi',
    }))
    mockSelectLimit.mockResolvedValue([{ enabled: true }])
    mockInsertValues.mockImplementation(() => ({
      onConflictDoNothing: () => ({
        returning: mockInsertReturning,
        then: (onFulfilled?: (value: unknown) => unknown) =>
          Promise.resolve(undefined).then(onFulfilled),
      }),
      onConflictDoUpdate: mockInsertOnConflictDoUpdate,
    }))
    mockInsertOnConflictDoUpdate.mockResolvedValue(undefined)
    mockInsertReturning.mockResolvedValue([{ id: 'log-row-1' }])
    mockUpdateSet.mockImplementation(() => ({ where: mockUpdateWhere }))
    mockUpdateWhere.mockResolvedValue(undefined)
    mockGetUser.mockResolvedValue({
      primaryEmailAddressId: 'idn_primary',
      emailAddresses: [
        { id: 'idn_other', emailAddress: 'other@example.com' },
        { id: 'idn_primary', emailAddress: 'primary@example.com' },
      ],
    })
    mockSend.mockResolvedValue({ data: { id: 're_email_1' }, error: null })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Staging crons run the same schedule against their own database, so without
  // this gate a user present in both environments gets every email twice.
  it.each(['staging', 'STAGING', ' preview '])(
    'suppresses the send in a non-production environment (%s)',
    async (environment) => {
      process.env.SENTRY_ENVIRONMENT = environment
      const { sendTransactionalEmail } = await import('./email.js')

      await expect(sendTransactionalEmail(sendParams)).resolves.toBe(
        'suppressed',
      )

      expect(mockSend).not.toHaveBeenCalled()
      // The dedupe key belongs to production's database — staging must not
      // record a claim against it.
      expect(mockInsertValues).not.toHaveBeenCalled()
    },
  )

  it.each(['production', '', '   '])(
    'still sends when the environment reads as production (%s)',
    async (environment) => {
      process.env.SENTRY_ENVIRONMENT = environment
      const { sendTransactionalEmail } = await import('./email.js')

      await expect(sendTransactionalEmail(sendParams)).resolves.toBe('sent')
      expect(mockSend).toHaveBeenCalledOnce()
    },
  )

  it('skips an unregistered template without writing a send-log row', async () => {
    mockGetTemplateRenderer.mockReturnValue(null)
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe(
      'not-registered',
    )

    expect(mockInsertValues).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('records a suppressed row and skips the send when the kill switch is off', async () => {
    mockSelectLimit.mockResolvedValue([{ enabled: false }])
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('suppressed')

    expect(mockInsertValues).toHaveBeenCalledOnce()
    expect(mockInsertValues.mock.calls[0]![0]).toMatchObject({
      templateKey: 'welcome_paid',
      userId: 'user_1',
      dedupeKey: 'sub:sub_123',
      status: 'suppressed',
    })
    // A pre-existing 'failed' claim flips to 'suppressed' on conflict.
    expect(mockInsertOnConflictDoUpdate).toHaveBeenCalledOnce()
    expect(mockInsertOnConflictDoUpdate.mock.calls[0]![0]).toMatchObject({
      set: { status: 'suppressed' },
    })
    expect(mockSend).not.toHaveBeenCalled()
  })

  // #967. The gate lives in sendTransactionalEmail rather than at each call
  // site, so a product template added later cannot ship without it.
  const winbackParams = {
    templateKey: 'winback',
    userId: 'user_1',
    dedupeKey: 'winback:2026-08',
    vars: { tierName: 'Premium', unsubscribeUrl: null },
  } as const

  it('suppresses a product-family send when the user opted out', async () => {
    mockSelectLimit.mockResolvedValueOnce([{ enabled: false }])
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(winbackParams)).resolves.toBe(
      'suppressed',
    )

    expect(mockInsertValues.mock.calls[0]![0]).toMatchObject({
      templateKey: 'winback',
      status: 'suppressed',
    })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sends a product-family email when no preferences row exists', async () => {
    mockSelectLimit.mockResolvedValueOnce([])
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(winbackParams)).resolves.toBe('sent')
    expect(mockSend).toHaveBeenCalledOnce()
  })

  it('does not read the product preference for a billing template', async () => {
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('sent')
    // One select only: the per-template kill switch.
    expect(mockSelectLimit).toHaveBeenCalledOnce()
  })

  it('skips the send when the dedupe key is already consumed', async () => {
    mockInsertReturning.mockResolvedValue([])
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('deduped')

    expect(mockSend).not.toHaveBeenCalled()
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })

  it('claims the row as failed, sends to the primary Clerk email, and flips the row to sent', async () => {
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('sent')

    expect(mockInsertValues.mock.calls[0]![0]).toMatchObject({
      templateKey: 'welcome_paid',
      dedupeKey: 'sub:sub_123',
      status: 'failed',
    })
    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0]![0]
    expect(call.from).toBe('Concert Crawl <billing@concertcrawl.app>')
    expect(call.replyTo).toBe('support@concertcrawl.app')
    expect(call.to).toBe('primary@example.com')
    expect(call.subject).toBe('Test subject')
    expect(mockUpdateSet).toHaveBeenCalledOnce()
    expect(mockUpdateSet.mock.calls[0]![0]).toMatchObject({
      status: 'sent',
      resendId: 're_email_1',
    })
  })

  it('falls back to the first Clerk email address when no primary is set', async () => {
    mockGetUser.mockResolvedValue({
      primaryEmailAddressId: null,
      emailAddresses: [{ id: 'idn_only', emailAddress: 'only@example.com' }],
    })
    const { sendTransactionalEmail } = await import('./email.js')

    await sendTransactionalEmail(sendParams)

    expect(mockSend.mock.calls[0]![0].to).toBe('only@example.com')
  })

  it('leaves the row failed and does not throw when Resend throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('network down'))
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('failed')
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })

  it('leaves the row failed when Resend returns a structured error', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid sender', name: 'validation_error' },
    })
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('failed')

    expect(mockUpdateSet).not.toHaveBeenCalled()
  })

  it('leaves the row failed and does not throw when the Clerk user has no email', async () => {
    mockGetUser.mockResolvedValue({
      primaryEmailAddressId: null,
      emailAddresses: [],
    })
    const { sendTransactionalEmail } = await import('./email.js')

    await expect(sendTransactionalEmail(sendParams)).resolves.toBe('failed')
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })
})
