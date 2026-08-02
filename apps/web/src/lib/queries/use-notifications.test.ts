import { describe, it, expect, vi } from 'vitest'
import type { InfiniteData } from '@tanstack/react-query'
import type {
  ConsumerNotification,
  NotificationListResult,
} from '@/lib/notifications'

// The module imports Clerk's browser hook at load time; the selectors under
// test are pure, so a stub keeps this a node-environment unit test.
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({}) }))

const {
  notificationsQueryKey,
  flattenNotifications,
  unreadCountOf,
  seenAtOf,
  stampRead,
  nextPageParamOf,
} = await import('./use-notifications')

const item = (id: string): ConsumerNotification => ({
  id,
  category: 'watch.pricedrop',
  title: 'The price dropped.',
  body: 'Cheapest since the on-sale.',
  actionUrl: null,
  readAt: null,
  createdAt: '2026-07-24T18:10:00-06:00',
  metadata: null,
})

const page = (
  over: Partial<NotificationListResult> = {},
): NotificationListResult => ({
  items: [item('a')],
  unreadCount: 3,
  hasMore: false,
  nextCursor: null,
  seenAt: null,
  ...over,
})

const pages = (
  list: NotificationListResult[],
): InfiniteData<NotificationListResult, string | null> => ({
  pages: list,
  pageParams: list.map((_, i) => (i === 0 ? null : `cursor-${i}`)),
})

describe('notificationsQueryKey', () => {
  it('scopes the cache to the signed-in account', () => {
    expect(notificationsQueryKey('user_1')).toEqual(['notifications', 'user_1'])
  })

  it('collapses a missing user to a single null key rather than two', () => {
    expect(notificationsQueryKey(undefined)).toEqual(
      notificationsQueryKey(null),
    )
  })
})

describe('flattenNotifications', () => {
  it('returns an empty list before the first page lands', () => {
    expect(flattenNotifications(undefined)).toEqual([])
  })

  it('concatenates pages in fetch order', () => {
    const data = pages([
      page({ items: [item('a'), item('bb')] }),
      page({ items: [item('cc')] }),
    ])
    expect(flattenNotifications(data).map((row) => row.id)).toEqual([
      'a',
      'bb',
      'cc',
    ])
  })
})

describe('unreadCountOf', () => {
  it('reads the window-wide count from the first page, not the last', () => {
    const data = pages([page({ unreadCount: 41 }), page({ unreadCount: 41 })])
    expect(unreadCountOf(data)).toBe(41)
  })

  it('reports zero before anything has loaded', () => {
    expect(unreadCountOf(undefined)).toBe(0)
  })
})

describe('seenAtOf', () => {
  it('passes a null watermark through — "nothing seen yet" is a real value', () => {
    expect(seenAtOf(pages([page({ seenAt: null })]))).toBeNull()
  })

  it('returns the watermark when the panel has been opened before', () => {
    expect(seenAtOf(pages([page({ seenAt: '2026-07-24T02:00:00Z' })]))).toBe(
      '2026-07-24T02:00:00Z',
    )
  })

  it('is null before any page has loaded, indistinguishable by design', () => {
    expect(seenAtOf(undefined)).toBeNull()
  })
})

describe('nextPageParamOf', () => {
  it('returns the cursor when there is a real next page', () => {
    expect(nextPageParamOf(page({ hasMore: true, nextCursor: 'cur' }))).toBe(
      'cur',
    )
  })

  it('stops at the end of the list', () => {
    expect(nextPageParamOf(page({ hasMore: false }))).toBeUndefined()
  })

  it('returns undefined, never null, when hasMore has no cursor', () => {
    // null is also the FIRST-page param, so handing it back would refetch
    // page 1 forever and duplicate every row.
    const param = nextPageParamOf(page({ hasMore: true, nextCursor: null }))
    expect(param).toBeUndefined()
    expect(param).not.toBeNull()
  })
})

describe('stampRead', () => {
  const READ_AT = '2026-08-02T06:30:00-06:00'

  it('moves the header count when the marked row lives on a later page', () => {
    // The header reads page 0 (`unreadCountOf`). Decrementing each page by its
    // own matches would leave page 0 untouched here, so the count would sit
    // still until the refetch landed.
    const data = pages([
      page({ items: [item('a')], unreadCount: 5 }),
      page({ items: [item('b')], unreadCount: 5 }),
    ])
    const next = stampRead(data, READ_AT, (row) => row.id === 'b')

    expect(unreadCountOf(next)).toBe(4)
    expect(next.pages[1]?.items[0]?.readAt).toBe(READ_AT)
    expect(next.pages[0]?.items[0]?.readAt).toBeNull()
  })

  it('writes one window-wide count to every page, never a per-page one', () => {
    const data = pages([
      page({ items: [item('a'), item('b')], unreadCount: 5 }),
      page({ items: [item('c')], unreadCount: 5 }),
    ])
    const next = stampRead(data, READ_AT, () => true)

    expect(next.pages.map((each) => each.unreadCount)).toEqual([2, 2])
  })

  it('never counts an already-read row twice', () => {
    const data = pages([
      page({ items: [{ ...item('a'), readAt: READ_AT }], unreadCount: 1 }),
    ])
    const next = stampRead(data, '2026-08-02T07:00:00-06:00', () => true)

    expect(unreadCountOf(next)).toBe(1)
    expect(next.pages[0]?.items[0]?.readAt).toBe(READ_AT)
  })

  it('floors the count at zero', () => {
    const data = pages([
      page({ items: [item('a'), item('b')], unreadCount: 1 }),
    ])
    expect(unreadCountOf(stampRead(data, READ_AT, () => true))).toBe(0)
  })

  it('honours a forced count when the window is wider than the loaded pages', () => {
    // The read-all case. Only one page is loaded but the server marks all 9;
    // deriving the count would leave the header at 8 after "Mark all read".
    const data = pages([page({ items: [item('a')], unreadCount: 9 })])
    const next = stampRead(data, READ_AT, () => true, 0)

    expect(unreadCountOf(next)).toBe(0)
    expect(next.pages[0]?.items[0]?.readAt).toBe(READ_AT)
  })
})
