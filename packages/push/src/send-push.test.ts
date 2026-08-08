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
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
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

  // #1226 PR-7. Crew activity is bell-only. The category list already excludes
  // the three from PUSH_ELIGIBLE_CATEGORIES, but this asserts the whole send
  // path with the most favourable conditions possible — VAPID configured,
  // master on, both sub-toggles on, a live subscription waiting — and still no
  // outbound push. A future edit that adds a crew category to the eligible set
  // fails here rather than in someone's lock screen.
  it.each(['crew.going', 'crew.joined', 'crew.left'] as const)(
    'never reaches the send pipeline for %s',
    async (category) => {
      process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
      process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
      process.env['VAPID_SUBJECT'] = 'ops@example.com'
      dbSelectMock.mockResolvedValue([
        {
          masterEnabled: true,
          watchUpdatesEnabled: true,
          priceDropsEnabled: true,
        },
      ])
      const { sendPushForNotification } = await import('./send-push.js')
      const result = await sendPushForNotification({
        userId: 'user_1',
        category,
        title: 't',
        body: 'b',
      })
      expect(result.skipped).toBe('not_eligible')
      expect(result.delivered).toBe(0)
      expect(sendNotificationMock).not.toHaveBeenCalled()
      // Bailed before the prefs read, so nothing about the user's push state
      // can ever make a crew row eligible.
      expect(dbSelectMock).not.toHaveBeenCalled()
    },
  )

  it('skips with not_configured when VAPID env is missing', async () => {
    delete process.env['VAPID_PUBLIC_KEY']
    delete process.env['VAPID_PRIVATE_KEY']
    delete process.env['VAPID_SUBJECT']
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
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
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
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
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

  it('sends spotify.new_show regardless of watch/price sub-toggles (master only)', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
    dbSelectMock
      .mockResolvedValueOnce([
        {
          masterEnabled: true,
          watchUpdatesEnabled: false,
          priceDropsEnabled: false,
        },
      ])
      .mockResolvedValueOnce([
        { id: 'sub-1', endpoint: 'https://x/1', p256dh: 'p1', auth: 'a1' },
      ])
    sendNotificationMock.mockResolvedValue({})
    const { sendPushForNotification } = await import('./send-push.js')
    const result = await sendPushForNotification({
      userId: 'user_1',
      category: 'spotify.new_show',
      title: 't',
      body: 'b',
    })
    expect(result.skipped).toBeNull()
    expect(result.delivered).toBe(1)
  })

  it('skips with no_subscriptions when the user has zero active subscriptions', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
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

  it('delivers to all active subscriptions and passes an already-scoped mailto: subject through untouched', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_SUBJECT'] = 'mailto:ops@example.com'
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

  it('prefixes mailto: on a bare email subject', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
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
    sendNotificationMock.mockResolvedValue({})
    const { sendPushForNotification } = await import('./send-push.js')
    await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(setVapidDetailsMock).toHaveBeenCalledWith(
      'mailto:ops@example.com',
      'BPUB',
      'PRIV',
    )
  })

  it('passes an https:// subject through without a mailto: prefix (RFC 8292 allows either)', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_SUBJECT'] = 'https://concertcrawl.app/contact'
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
    sendNotificationMock.mockResolvedValue({})
    const { sendPushForNotification } = await import('./send-push.js')
    await sendPushForNotification({
      userId: 'user_1',
      category: 'watch.cancelled',
      title: 't',
      body: 'b',
    })
    expect(setVapidDetailsMock).toHaveBeenCalledWith(
      'https://concertcrawl.app/contact',
      'BPUB',
      'PRIV',
    )
  })

  it('soft-disables the subscription on a 404 or 410 response', async () => {
    process.env['VAPID_PUBLIC_KEY'] = 'BPUB'
    process.env['VAPID_PRIVATE_KEY'] = 'PRIV'
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
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
    process.env['VAPID_SUBJECT'] = 'ops@example.com'
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
