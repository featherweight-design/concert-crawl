import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  safeParseNotificationList,
  isNotificationCategory,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markPanelSeen,
  NOTIFICATION_PAGE_SIZE,
} from './notifications'
import { ApiError } from './api'

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  category: 'watch.pricedrop',
  title: 'The price for Geese at Bluebird Theater dropped from $41 to $28.',
  body: "Cheapest it's been since the on-sale.",
  actionUrl: '/events/e1',
  readAt: null,
  createdAt: '2026-07-24T18:35:00.000Z',
  metadata: { eventId: 'e1' },
}

const payload = {
  items: [row],
  unreadCount: 1,
  hasMore: false,
  nextCursor: null,
  seenAt: null,
}

describe('safeParseNotificationList', () => {
  it('accepts the shipped response shape', () => {
    const result = safeParseNotificationList(payload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0]?.metadata).toEqual({ eventId: 'e1' })
    expect(result.data.unreadCount).toBe(1)
    expect(result.data.seenAt).toBeNull()
  })

  it.each([
    ['https://evil.example/steal', 'an absolute cross-origin URL'],
    ['//evil.example/steal', 'a protocol-relative URL'],
    ['javascript:alert(1)', 'a javascript: URL'],
    ['events/e1', 'a relative path with no leading slash'],
  ])(
    'degrades %s to null (%s) rather than dropping the notification',
    (actionUrl) => {
      const result = safeParseNotificationList({
        ...payload,
        items: [{ ...row, actionUrl }],
      })
      expect(result.success).toBe(true)
      if (!result.success) return
      // The row still renders — it just does not navigate.
      expect(result.data.items).toHaveLength(1)
      expect(result.data.items[0]?.actionUrl).toBeNull()
    },
  )

  it('keeps a same-origin path with a query string intact', () => {
    const result = safeParseNotificationList({
      ...payload,
      items: [{ ...row, actionUrl: '/events/e1?from=notifications' }],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.items[0]?.actionUrl).toBe(
      '/events/e1?from=notifications',
    )
  })

  it('accepts a null actionUrl, a null metadata and an ISO readAt', () => {
    const result = safeParseNotificationList({
      ...payload,
      items: [
        {
          ...row,
          actionUrl: null,
          metadata: null,
          readAt: '2026-07-24T19:00:00.000Z',
        },
      ],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.items[0]?.actionUrl).toBeNull()
    expect(result.data.items[0]?.metadata).toBeNull()
    expect(result.data.items[0]?.readAt).toBe('2026-07-24T19:00:00.000Z')
  })

  it('keeps an unknown category as a raw string rather than dropping the row', () => {
    const result = safeParseNotificationList({
      ...payload,
      items: [{ ...row, category: 'venue.went_dark' }],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.items[0]?.category).toBe('venue.went_dark')
    expect(isNotificationCategory('venue.went_dark')).toBe(false)
  })

  it('keeps duplicate rows with distinct ids — the writers are not exactly-once', () => {
    const result = safeParseNotificationList({
      ...payload,
      items: [row, { ...row, id: '22222222-2222-4222-8222-222222222222' }],
      unreadCount: 2,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.items).toHaveLength(2)
    expect(result.data.items[0]?.id).not.toBe(result.data.items[1]?.id)
  })

  it('drops hasMore when nextCursor is null, so paging cannot loop', () => {
    // null is also the first-page param, so honouring this contradiction would
    // refetch page 1 forever. The rows still render; only the button goes.
    const result = safeParseNotificationList({
      ...payload,
      hasMore: true,
      nextCursor: null,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.hasMore).toBe(false)
    expect(result.data.items).toHaveLength(1)
  })

  it('carries an opaque nextCursor through verbatim', () => {
    const cursor = 'MjAyNi0wOC0wMSAxMjowMDowMCswMHxhYmM'
    const result = safeParseNotificationList({
      ...payload,
      hasMore: true,
      nextCursor: cursor,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.nextCursor).toBe(cursor)
  })

  it.each([
    ['a non-object payload', null],
    ['a missing items array', { ...payload, items: undefined }],
    ['items that is not an array', { ...payload, items: {} }],
    ['a non-numeric unreadCount', { ...payload, unreadCount: '3' }],
    ['a negative unreadCount', { ...payload, unreadCount: -1 }],
    ['a fractional unreadCount', { ...payload, unreadCount: 2.5 }],
    ['a NaN unreadCount', { ...payload, unreadCount: Number.NaN }],
    ['a non-boolean hasMore', { ...payload, hasMore: 'yes' }],
    ['a non-string nextCursor', { ...payload, nextCursor: 12 }],
    ['a non-string seenAt', { ...payload, seenAt: 0 }],
    [
      'a seenAt that is a string but not a parseable date',
      { ...payload, seenAt: 'last tuesday' },
    ],
    ['a row missing an id', { ...payload, items: [{ ...row, id: undefined }] }],
    [
      'a row with a numeric title',
      { ...payload, items: [{ ...row, title: 7 }] },
    ],
    [
      'a row with a missing createdAt',
      { ...payload, items: [{ ...row, createdAt: undefined }] },
    ],
    [
      'a row whose createdAt is a string but not a parseable date',
      { ...payload, items: [{ ...row, createdAt: 'not a date' }] },
    ],
    [
      'a row whose readAt is a string but not a parseable date',
      { ...payload, items: [{ ...row, readAt: 'whenever' }] },
    ],
    [
      'a row with array metadata',
      { ...payload, items: [{ ...row, metadata: [1, 2] }] },
    ],
  ])('rejects %s', (_label, value) => {
    expect(safeParseNotificationList(value).success).toBe(false)
  })
})

const okResponse = (data: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchNotifications', () => {
  it('requests the shipped page size and no cursor on the first page', async () => {
    const fetchMock = vi.fn((_url: unknown, _init?: unknown) =>
      okResponse(payload),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchNotifications('tok')

    expect(result.items).toHaveLength(1)
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(
      `/v1/notifications?limit=${NOTIFICATION_PAGE_SIZE}`,
    )
    expect(String(url)).not.toContain('cursor=')
  })

  it('echoes the opaque cursor back verbatim, url-encoded', async () => {
    const fetchMock = vi.fn((_url: unknown, _init?: unknown) =>
      okResponse(payload),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchNotifications('tok', 'abc+/=def')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(`cursor=${encodeURIComponent('abc+/=def')}`)
  })

  it('throws an ApiError when the payload does not match the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => okResponse({ items: 'nope' })),
    )
    await expect(fetchNotifications('tok')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('the write endpoints', () => {
  it('marks one notification read with a POST', async () => {
    const fetchMock = vi.fn((_url: unknown, _init?: unknown) =>
      okResponse(null),
    )
    vi.stubGlobal('fetch', fetchMock)

    await markNotificationRead('tok', 'abc-123')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/v1/notifications/abc-123/read')
    expect(init).toMatchObject({ method: 'POST' })
  })

  it('returns the updated count from read-all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => okResponse({ updated: 4 })),
    )
    await expect(markAllNotificationsRead('tok')).resolves.toBe(4)
  })

  it('throws an ApiError when read-all returns an unusable count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => okResponse({ updated: 'four' })),
    )
    await expect(markAllNotificationsRead('tok')).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it.each([-1, 2.5, Number.NaN])(
    'throws an ApiError when read-all returns %s',
    async (updated) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => okResponse({ updated })),
      )
      await expect(markAllNotificationsRead('tok')).rejects.toBeInstanceOf(
        ApiError,
      )
    },
  )

  it('posts the panel-seen watermark', async () => {
    const fetchMock = vi.fn((_url: unknown, _init?: unknown) =>
      okResponse({ seenAt: null }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await markPanelSeen('tok')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/v1/notifications/mark-panel-seen')
    expect(init).toMatchObject({ method: 'POST' })
  })

  it('throws an ApiError when the watermark is not a parseable date', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => okResponse({ seenAt: 'just now' })),
    )
    await expect(markPanelSeen('tok')).rejects.toBeInstanceOf(ApiError)
  })
})
