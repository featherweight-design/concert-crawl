import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fanoutWatchNotification,
  WATCH_CATEGORY_FROM_REPORT_STATUS,
} from './watch-fanout.js'
import type { WatchFanoutDeps } from './watch-fanout.js'

// Minimal fakes for the drizzle chained builder. Each call returns the same
// self-thenable so awaits resolve to the queued row set. The test drives
// which query returns which rows via a queue.
type QueuedResult = unknown[] | Error
const buildDbFake = () => {
  const selectQueue: QueuedResult[] = []
  const insertCalls: Array<{ table: unknown; rows: unknown }> = []
  let insertShouldThrow: Error | null = null

  const pushSelect = (rows: QueuedResult) => selectQueue.push(rows)
  const setInsertThrow = (err: Error | null) => {
    insertShouldThrow = err
  }

  const chain = () => {
    const resolveNext = () => {
      const next = selectQueue.shift()
      if (next === undefined) return Promise.resolve([])
      if (next instanceof Error) return Promise.reject(next)
      return Promise.resolve(next)
    }
    const self: Record<string, unknown> = {}
    for (const method of ['from', 'leftJoin', 'where', 'limit', 'groupBy']) {
      self[method] = () => self
    }
    self['then'] = (
      onFulfilled: (rows: unknown) => unknown,
      onRejected?: (err: unknown) => unknown,
    ) => resolveNext().then(onFulfilled, onRejected)
    self['catch'] = (onRejected: (err: unknown) => unknown) =>
      resolveNext().catch(onRejected)
    return self
  }

  const db = {
    select: () => chain(),
    insert: (table: unknown) => ({
      values: (rows: unknown) => {
        insertCalls.push({ table, rows })
        if (insertShouldThrow) return Promise.reject(insertShouldThrow)
        return Promise.resolve()
      },
    }),
  } as unknown as WatchFanoutDeps['db']

  return { db, pushSelect, setInsertThrow, insertCalls }
}

const tableStub = {} as unknown as WatchFanoutDeps['notifications']

const makeDeps = (
  overrides: Partial<WatchFanoutDeps> = {},
): WatchFanoutDeps & {
  sendPush: ReturnType<typeof vi.fn>
  logWarn: ReturnType<typeof vi.fn>
  pushSelect: (rows: QueuedResult) => void
  setInsertThrow: (err: Error | null) => void
  insertCalls: Array<{ table: unknown; rows: unknown }>
} => {
  const { db, pushSelect, setInsertThrow, insertCalls } = buildDbFake()
  return {
    db,
    notifications: tableStub,
    userEvents: tableStub as unknown as WatchFanoutDeps['userEvents'],
    events: tableStub as unknown as WatchFanoutDeps['events'],
    venues: tableStub as unknown as WatchFanoutDeps['venues'],
    sendPush: vi.fn(),
    logWarn: vi.fn(),
    pushSelect,
    setInsertThrow,
    insertCalls,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fanoutWatchNotification', () => {
  it('returns zero counts when the event row is missing', async () => {
    const deps = makeDeps()
    deps.pushSelect([]) // loadEventContext returns nothing
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_missing',
      category: 'watch.cancelled',
    })
    expect(result).toEqual({ watchersNotified: 0, pushDelivered: 0 })
    expect(deps.sendPush).not.toHaveBeenCalled()
  })

  it('returns zero counts and does not write when there are no watchers', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([]) // no watchers
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.cancelled',
    })
    expect(result).toEqual({ watchersNotified: 0, pushDelivered: 0 })
    expect(deps.insertCalls).toHaveLength(0)
    expect(deps.sendPush).not.toHaveBeenCalled()
  })

  it('writes bell rows and fires push for every watcher on cancelled', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }, { userId: 'user_b' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.cancelled',
    })
    expect(result.watchersNotified).toBe(2)
    expect(result.pushDelivered).toBe(2)
    expect(deps.insertCalls).toHaveLength(1)
    const rows = deps.insertCalls[0]?.rows as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      userId: 'user_a',
      type: 'user_notification',
      category: 'watch.cancelled',
      actionUrl: '/events/evt_1',
    })
    expect(rows[0]?.['title']).toContain('cancelled')
    expect(deps.sendPush).toHaveBeenCalledTimes(2)
    expect(deps.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_a',
        category: 'watch.cancelled',
        tag: 'watch-evt_1-watch.cancelled',
      }),
    )
  })

  it('formats a short date for postponed', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.postponed',
    })
    const rows = deps.insertCalls[0]?.rows as Array<Record<string, unknown>>
    expect(rows[0]?.['title']).toBe('Band at The Fillmore moved to Aug 14.')
  })

  // A relocation must not reuse the "<artist> at <venue>" template: the
  // fan-out reads the TARGET event, whose venue is already the new room, so
  // that template renders "Band at The Fillmore moved to The Fillmore".
  it('names the old room in the title and the new room in the body on a relocation', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'Globe Hall',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.postponed',
      relocated: { fromVenueName: 'Larimer Lounge' },
    })
    const rows = deps.insertCalls[0]?.rows as Array<Record<string, unknown>>
    expect(rows[0]?.['title']).toBe('Band at Larimer Lounge moved.')
    expect(rows[0]?.['body']).toBe(
      'Your ticket still works. New room: Globe Hall.',
    )
  })

  it('promises no refund information it cannot deliver', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.cancelled',
    })
    const rows = deps.insertCalls[0]?.rows as Array<Record<string, unknown>>
    // We hold no refund record and the event page has none, so the body must
    // point at the seller rather than at us.
    expect(rows[0]?.['body']).toBe(
      "The show's off. Contact your ticket vendor for refund details.",
    )
  })

  // An empty restriction means "nobody", not "no filter". Letting it fall
  // through to an unfiltered query would fan a merge out to every watcher of
  // the target, which is the opposite of what the caller asked for.
  it('notifies nobody when the restriction is empty', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.postponed',
      restrictToUserIds: [],
    })
    expect(result).toEqual({ watchersNotified: 0, pushDelivered: 0 })
    expect(deps.insertCalls).toHaveLength(0)
  })

  it('falls back to naming no old room when the source venue is gone', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'Globe Hall',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.postponed',
      relocated: { fromVenueName: null },
    })
    const rows = deps.insertCalls[0]?.rows as Array<Record<string, unknown>>
    // Still the relocation copy: the date template would claim the night
    // changed when only the room did.
    expect(rows[0]?.['title']).toBe('Band: new venue.')
    expect(rows[0]?.['body']).toBe(
      'Your ticket still works. New room: Globe Hall.',
    )
  })

  it('composes a back-on-sale title', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.backonsale',
    })
    const rows = deps.insertCalls[0]?.rows as Array<Record<string, unknown>>
    expect(rows[0]?.['title']).toContain('back on sale')
  })

  it('composes a rich pricedrop title with concrete prices when context is provided', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Amyl',
        venueName: 'The Roxy',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.pricedrop',
      pricedrop: { newPriceMin: '32.00', oldPriceMin: '48.00' },
    })
    expect(deps.insertCalls[0]?.rows).toMatchObject([
      {
        title: '$32 tickets for Amyl at The Roxy just went on sale.',
        body: "Down from $48. Cheapest we've seen for this one.",
      },
    ])
  })

  it('falls back to a generic pricedrop line when no price context is supplied', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Amyl',
        venueName: 'The Roxy',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.sendPush.mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.pricedrop',
    })
    expect(deps.insertCalls[0]?.rows).toMatchObject([
      {
        title: expect.stringContaining('just dropped'),
        body: expect.stringContaining('Cheaper'),
      },
    ])
  })

  it('skips fan-out for categories that this helper does not own', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    // No watchers query issued because composeMessage returns empty title.
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'artist.new_show',
    })
    expect(result).toEqual({ watchersNotified: 0, pushDelivered: 0 })
    expect(deps.insertCalls).toHaveLength(0)
    expect(deps.sendPush).not.toHaveBeenCalled()
  })

  it('swallows push errors and continues delivery to other watchers', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }, { userId: 'user_b' }])
    deps.sendPush
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ delivered: 1 })
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.cancelled',
    })
    expect(result.watchersNotified).toBe(2)
    expect(result.pushDelivered).toBe(1)
    expect(deps.logWarn).toHaveBeenCalledWith(
      expect.stringContaining('push send failed'),
      expect.objectContaining({ userId: 'user_a' }),
    )
  })

  it('returns zero pushDelivered when the bell insert fails', async () => {
    const deps = makeDeps()
    deps.pushSelect([
      {
        title: 'The Show',
        artist: 'Band',
        venueName: 'The Fillmore',
        date: '2026-08-14',
      },
    ])
    deps.pushSelect([{ userId: 'user_a' }])
    deps.setInsertThrow(new Error('insert boom'))
    const result = await fanoutWatchNotification(deps, {
      eventId: 'evt_1',
      category: 'watch.cancelled',
    })
    expect(result).toEqual({ watchersNotified: 0, pushDelivered: 0 })
    expect(deps.sendPush).not.toHaveBeenCalled()
    expect(deps.logWarn).toHaveBeenCalledWith(
      expect.stringContaining('notifications insert failed'),
      expect.objectContaining({ eventId: 'evt_1' }),
    )
  })
})

describe('WATCH_CATEGORY_FROM_REPORT_STATUS', () => {
  it('maps every event_reports.status the API produces', () => {
    expect(WATCH_CATEGORY_FROM_REPORT_STATUS.cancelled).toBe('watch.cancelled')
    expect(WATCH_CATEGORY_FROM_REPORT_STATUS.postponed).toBe('watch.postponed')
    expect(WATCH_CATEGORY_FROM_REPORT_STATUS['sold-out']).toBe('watch.soldout')
  })
})
