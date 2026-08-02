import { describe, it, expect, vi } from 'vitest'
import type { InfiniteData } from '@tanstack/react-query'
import type {
  ConsumerNotification,
  NotificationListResult,
} from '@/lib/notifications'

// The module imports Clerk's browser hook at load time; the selectors under
// test are pure, so a stub keeps this a node-environment unit test.
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({}) }))

const { notificationsQueryKey, flattenNotifications, unreadCountOf, seenAtOf } =
  await import('./use-notifications')

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
