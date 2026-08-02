import { describe, it, expect } from 'vitest'
import type { ConsumerNotification } from '@/lib/notifications'
import {
  relTime,
  relTimeLong,
  dayKey,
  groupByDay,
  itemLabel,
  unreadCount,
} from './format-time'
import { NOTIFICATIONS_COPY } from '../definitions/copy'

// The handoff's frozen reference clock: 2026-07-24, 20:10 Mountain.
const NOW = new Date('2026-07-24T20:10:00-06:00')
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const before = (ms: number): string =>
  new Date(NOW.getTime() - ms).toISOString()

const notification = (
  over: Partial<ConsumerNotification> = {},
): ConsumerNotification => ({
  id: 'n1',
  category: 'watch.pricedrop',
  title: 'The price for Geese at Bluebird Theater dropped from $41 to $28.',
  body: "Cheapest it's been since the on-sale.",
  actionUrl: '/events/e1',
  readAt: null,
  createdAt: before(30 * MIN),
  metadata: null,
  ...over,
})

describe('relTime', () => {
  it('never renders "0m" — anything under a minute floors to 1m', () => {
    expect(relTime(before(4_000), NOW)).toBe('1m')
    expect(relTime(before(30_000), NOW)).toBe('1m')
  })

  it('renders minutes up to the 55-minute boundary', () => {
    expect(relTime(before(54 * MIN), NOW)).toBe('54m')
  })

  it('crosses to hours at exactly 55 minutes', () => {
    expect(relTime(before(55 * MIN), NOW)).toBe('1h')
  })

  it('renders hours up to the 22-hour boundary', () => {
    expect(relTime(before(21 * HOUR), NOW)).toBe('21h')
  })

  it('crosses to days at exactly 22 hours', () => {
    expect(relTime(before(22 * HOUR), NOW)).toBe('1d')
  })

  it('renders days up to the 7-day boundary', () => {
    expect(relTime(before(6 * DAY), NOW)).toBe('6d')
  })

  it('crosses to an absolute short date at exactly 7 days', () => {
    expect(relTime(before(7 * DAY), NOW)).toBe('Jul 17')
    expect(relTime(before(21 * DAY), NOW)).toBe('Jul 3')
  })

  it('treats a future timestamp as one minute old rather than negative', () => {
    expect(relTime(new Date(NOW.getTime() + 5 * MIN).toISOString(), NOW)).toBe(
      '1m',
    )
  })
})

describe('relTimeLong (the screen-reader form)', () => {
  it('uses the same three thresholds as relTime', () => {
    expect(relTimeLong(before(54 * MIN), NOW)).toBe('54 minutes ago')
    expect(relTimeLong(before(55 * MIN), NOW)).toBe('1 hour ago')
    expect(relTimeLong(before(22 * HOUR), NOW)).toBe('1 day ago')
  })

  it('pluralises through the shared copy helper, so one minute is singular', () => {
    expect(relTimeLong(before(MIN), NOW)).toBe('1 minute ago')
  })

  it('switches to a long absolute date at 7 days', () => {
    expect(relTimeLong(before(7 * DAY), NOW)).toBe('July 17')
  })
})

describe('dayKey', () => {
  it('labels the current Mountain calendar day "Today"', () => {
    expect(dayKey('2026-07-24T00:30:00-06:00', NOW)).toBe(
      NOTIFICATIONS_COPY.today,
    )
  })

  it('compares calendar-day starts, not elapsed hours', () => {
    // 21 hours before NOW, but a different Mountain calendar day.
    expect(dayKey('2026-07-23T23:10:00-06:00', NOW)).toBe(
      NOTIFICATIONS_COPY.yesterday,
    )
  })

  it('labels older days with a weekday-qualified short date', () => {
    expect(dayKey('2026-07-19T15:22:00-06:00', NOW)).toBe('Sun, Jul 19')
  })

  it('folds a future-dated row into Today', () => {
    expect(dayKey('2026-07-26T09:00:00-06:00', NOW)).toBe(
      NOTIFICATIONS_COPY.today,
    )
  })
})

describe('groupByDay', () => {
  it('walks items in the order given and starts a group when the day changes', () => {
    const groups = groupByDay(
      [
        notification({ id: 'a', createdAt: '2026-07-24T18:35:00-06:00' }),
        notification({ id: 'b', createdAt: '2026-07-24T11:20:00-06:00' }),
        notification({ id: 'c', createdAt: '2026-07-23T21:14:00-06:00' }),
      ],
      NOW,
    )
    expect(groups.map((group) => group.key)).toEqual(['Today', 'Yesterday'])
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['a', 'b'])
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['c'])
  })

  it('does not sort — unsorted input produces a repeated day header', () => {
    const groups = groupByDay(
      [
        notification({ id: 'a', createdAt: '2026-07-24T18:35:00-06:00' }),
        notification({ id: 'b', createdAt: '2026-07-23T21:14:00-06:00' }),
        notification({ id: 'c', createdAt: '2026-07-24T09:00:00-06:00' }),
      ],
      NOW,
    )
    expect(groups.map((group) => group.key)).toEqual([
      'Today',
      'Yesterday',
      'Today',
    ])
  })

  it('opens on the newest real day when there is no "today" row', () => {
    const groups = groupByDay(
      [
        notification({ id: 'a', createdAt: '2026-07-20T18:35:00-06:00' }),
        notification({ id: 'b', createdAt: '2026-07-19T15:22:00-06:00' }),
      ],
      NOW,
    )
    expect(groups[0]?.key).toBe('Mon, Jul 20')
    expect(groups.map((group) => group.key)).not.toContain('Today')
  })

  it('returns no groups for an empty list', () => {
    expect(groupByDay([], NOW)).toEqual([])
  })

  it('keeps duplicate rows with distinct ids — the writers are not exactly-once', () => {
    const groups = groupByDay(
      [
        notification({ id: 'a', createdAt: '2026-07-24T18:35:00-06:00' }),
        notification({ id: 'b', createdAt: '2026-07-24T18:35:00-06:00' }),
      ],
      NOW,
    )
    expect(groups[0]?.items).toHaveLength(2)
  })
})

describe('itemLabel', () => {
  it('leads with the category verb and appends ". Unread" when unread', () => {
    const label = itemLabel(notification({ createdAt: before(2 * HOUR) }), NOW)
    expect(label).toBe(
      'Price drop. The price for Geese at Bluebird Theater dropped from $41 to $28. ' +
        "Cheapest it's been since the on-sale. 2 hours ago. Unread",
    )
  })

  it('omits the unread suffix once the row has been read', () => {
    const label = itemLabel(
      notification({ readAt: '2026-07-24T19:00:00-06:00' }),
      NOW,
    )
    expect(label.endsWith('. Unread')).toBe(false)
    expect(label).toContain('30 minutes ago')
  })

  it('collapses the gap left by an empty body', () => {
    const label = itemLabel(notification({ body: '' }), NOW)
    expect(label).not.toMatch(/ {2}/)
    expect(label).toBe(
      'Price drop. The price for Geese at Bluebird Theater dropped from $41 to $28. 30 minutes ago. Unread',
    )
  })

  it('falls back to a neutral verb for an unknown category', () => {
    const label = itemLabel(notification({ category: 'venue.went_dark' }), NOW)
    expect(label.startsWith('Update.')).toBe(true)
  })
})

describe('unreadCount', () => {
  it('counts rows with no readAt', () => {
    expect(
      unreadCount([
        notification({ id: 'a' }),
        notification({ id: 'b', readAt: '2026-07-24T19:00:00-06:00' }),
        notification({ id: 'c' }),
      ]),
    ).toBe(2)
  })

  it('is zero for an empty list', () => {
    expect(unreadCount([])).toBe(0)
  })
})
