import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock web-push before importing the module under test — send-push imports
// it at module load and configures on first send.
const sendNotificationMock = vi.fn()
const setVapidDetailsMock = vi.fn()
class WebPushErrorMock extends Error {
  statusCode: number
  constructor(statusCode: number, message = 'web push error') {
    super(message)
    this.statusCode = statusCode
  }
}
vi.mock('web-push', () => ({
  default: {
    sendNotification: sendNotificationMock,
    setVapidDetails: setVapidDetailsMock,
  },
  WebPushError: WebPushErrorMock,
}))

const dbSelectMock = vi.fn()
const dbUpdateMock = vi.fn()
vi.mock('@concert-crawl/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => dbSelectMock(...args),
      }),
    }),
    update: () => ({
      set: () => ({
        where: (...args: unknown[]) => dbUpdateMock(...args),
      }),
    }),
  },
  pushSubscriptions: {
    userId: Symbol('userId'),
    disabledAt: Symbol('disabledAt'),
    id: Symbol('id'),
  },
  userNotificationPreferences: {
    userId: Symbol('prefs.userId'),
  },
}))
vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  isNull: (...args: unknown[]) => args,
}))
vi.mock('../logger.js', () => ({
  apiLogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const originalEnv = process.env
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.env = { ...originalEnv }
})

describe('sendPushForNotification', () => {
  it('skips with not_eligible for non-push categories', async () => {
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'contest.resolved',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBe('not_eligible')
    expect(result.delivered).toBe(0)
  })

  it('skips with not_configured when VAPID env is missing', async () => {
    delete process.env['VAPID_PUBLIC_KEY']
    delete process.env['VAPID_PRIVATE_KEY']
    delete process.env['VAPID_CONTACT_EMAIL']
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBe('not_configured')
  })

  it('skips with master_off when the user has master disabled or never opted in', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_CONTACT_EMAIL'] = 'ops@example.com'
    dbSelectMock.mockResolvedValueOnce([]) // no prefs row → defaults master=false
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBe('master_off')
  })

  it('skips with category_off when the matching sub-toggle is off', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_CONTACT_EMAIL'] = 'ops@example.com'
    dbSelectMock.mockResolvedValueOnce([
      {
        masterEnabled: true,
        watchUpdatesEnabled: false,
        priceDropsEnabled: true,
      },
    ])
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBe('category_off')
  })

  it('skips with no_subscriptions when the user has zero active subscriptions', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_CONTACT_EMAIL'] = 'ops@example.com'
    dbSelectMock
      .mockResolvedValueOnce([
        {
          masterEnabled: true,
          watchUpdatesEnabled: true,
          priceDropsEnabled: true,
        },
      ])
      .mockResolvedValueOnce([])
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBe('no_subscriptions')
  })

  it('delivers to all active subscriptions and normalizes mailto: on either input form', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_CONTACT_EMAIL'] = 'mailto:ops@example.com'
    dbSelectMock
      .mockResolvedValueOnce([
        {
          masterEnabled: true,
          watchUpdatesEnabled: true,
          priceDropsEnabled: true,
        },
      ])
      .mockResolvedValueOnce([
        { id: 'sub-1', endpoint: 'https://x/1', p256dh: 'p1', auth: 'a1' },
        { id: 'sub-2', endpoint: 'https://x/2', p256dh: 'p2', auth: 'a2' },
      ])
    sendNotificationMock.mockResolvedValue({})
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.delivered).toBe(2)
    expect(setVapidDetailsMock).toHaveBeenCalledWith(
      'mailto:ops@example.com', // no double prefix
      'BPUB',
      'PRIV',
    )
  })

  it('soft-disables the subscription on a 404 or 410 response', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_CONTACT_EMAIL'] = 'ops@example.com'
    dbSelectMock
      .mockResolvedValueOnce([
        {
          masterEnabled: true,
          watchUpdatesEnabled: true,
          priceDropsEnabled: true,
        },
      ])
      .mockResolvedValueOnce([
        { id: 'sub-1', endpoint: 'https://x/1', p256dh: 'p1', auth: 'a1' },
      ])
    sendNotificationMock.mockRejectedValueOnce(
      new WebPushErrorMock(410, 'gone'),
    )
    dbUpdateMock.mockResolvedValueOnce([{ id: 'sub-1' }])
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.delivered).toBe(0)
    expect(dbUpdateMock).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the DB read for prefs fails', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_CONTACT_EMAIL'] = 'ops@example.com'
    dbSelectMock.mockRejectedValueOnce(new Error('db down'))
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBe('db_error')
  })
})
