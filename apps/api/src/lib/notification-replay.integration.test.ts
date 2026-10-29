// #1311: replay protection for the watch and contest notification writers,
// against a real Postgres so the unique index on notifications.dedupe_key and
// ON CONFLICT DO NOTHING are what is actually under test.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { events, notifications, userEvents, venues } from '@concert-crawl/db'
import { fanoutWatchNotification } from '@concert-crawl/push'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js'
import {
  writeContestNotifications,
  type ContestNotificationInput,
} from './contest-notifications.js'

const WATCHER_A = 'user_replay_watcher_a'
const WATCHER_B = 'user_replay_watcher_b'

const rowsFor = async (category: string) =>
  testDb
    .select({ userId: notifications.userId, key: notifications.dedupeKey })
    .from(notifications)
    .where(eq(notifications.category, category))

const fanoutDeps = (sendPush: ReturnType<typeof vi.fn>) => ({
  db: testDb,
  notifications,
  userEvents,
  events,
  venues,
  sendPush,
  logWarn: vi.fn(),
})

describe('watch fan-out replay protection', () => {
  let eventId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-09-12' })
    eventId = event.id
    await seedUserEvent(WATCHER_A, eventId, { status: 'watching' })
    await seedUserEvent(WATCHER_B, eventId, { status: 'watching' })
  })

  it('writes one row and sends one push per watcher when one transition is replayed, sequentially and concurrently', async () => {
    const sendPush = vi.fn().mockResolvedValue({ delivered: 1 })
    const input = {
      eventId,
      category: 'watch.cancelled' as const,
      transition: 'report:11111111-1111-1111-1111-111111111111',
    }

    const first = await fanoutWatchNotification(fanoutDeps(sendPush), input)
    const racing = await Promise.all([
      fanoutWatchNotification(fanoutDeps(sendPush), input),
      fanoutWatchNotification(fanoutDeps(sendPush), input),
    ])

    expect(first).toEqual({ watchersNotified: 2, pushDelivered: 2 })
    expect(racing).toEqual([
      { watchersNotified: 0, pushDelivered: 0 },
      { watchersNotified: 0, pushDelivered: 0 },
    ])
    const rows = await rowsFor('watch.cancelled')
    expect(rows.map((row) => row.userId).sort()).toEqual([WATCHER_A, WATCHER_B])
    expect(sendPush).toHaveBeenCalledTimes(2)
  })

  it('lets exactly one of several concurrent first fan-outs win', async () => {
    const sendPush = vi.fn().mockResolvedValue({ delivered: 1 })
    const input = {
      eventId,
      category: 'watch.soldout' as const,
      transition: 'report:22222222-2222-2222-2222-222222222222',
    }

    const results = await Promise.all(
      [1, 2, 3].map(() => fanoutWatchNotification(fanoutDeps(sendPush), input)),
    )

    const total = results.reduce((sum, res) => sum + res.watchersNotified, 0)
    expect(total).toBe(2)
    expect(await rowsFor('watch.soldout')).toHaveLength(2)
    expect(sendPush).toHaveBeenCalledTimes(2)
  })

  it('notifies twice for cancelled -> upcoming -> cancelled (distinct markers)', async () => {
    const sendPush = vi.fn().mockResolvedValue({ delivered: 1 })
    await fanoutWatchNotification(fanoutDeps(sendPush), {
      eventId,
      category: 'watch.cancelled',
      transition: 'patch:2026-10-01T00:00:00.000Z',
    })
    await fanoutWatchNotification(fanoutDeps(sendPush), {
      eventId,
      category: 'watch.cancelled',
      transition: 'patch:2026-10-03T00:00:00.000Z',
    })

    const rows = await rowsFor('watch.cancelled')
    expect(rows.filter((row) => row.userId === WATCHER_A)).toHaveLength(2)
    expect(rows.filter((row) => row.userId === WATCHER_B)).toHaveLength(2)
    expect(sendPush).toHaveBeenCalledTimes(4)
  })
})

describe('contest notification replay protection', () => {
  const PARENT_USER = 'user_replay_parent'
  const CHALLENGER_USER = 'user_replay_challenger'
  let base: Omit<ContestNotificationInput, 'action' | 'resolution'>

  beforeEach(async () => {
    await clearTables()
    base = {
      contestId: randomUUID(),
      parentSubmissionId: randomUUID(),
      challengerSubmissionId: randomUUID(),
      parentUserId: PARENT_USER,
      challengerUserId: CHALLENGER_USER,
      eventId: randomUUID(),
      reason: 'Checked the vendor page: the GA floor is $45.',
    }
  })

  it('writes one row per submitter when a resolve is retried, sequentially and concurrently', async () => {
    const input: ContestNotificationInput = {
      ...base,
      action: 'resolve',
      resolution: 'parent_wins',
    }

    const first = await writeContestNotifications(input)
    const retries = await Promise.all([
      writeContestNotifications(input),
      writeContestNotifications(input),
    ])

    expect(first).toEqual({ written: 2 })
    expect(retries).toEqual([{ written: 0 }, { written: 0 }])
    const rows = await rowsFor('contest.resolved')
    expect(rows.map((row) => row.userId).sort()).toEqual([
      CHALLENGER_USER,
      PARENT_USER,
    ])
  })

  it('notifies again when the same parent is resolved against a new counter', async () => {
    await writeContestNotifications({
      ...base,
      action: 'resolve',
      resolution: 'parent_wins',
    })
    await writeContestNotifications({
      ...base,
      challengerSubmissionId: randomUUID(),
      action: 'resolve',
      resolution: 'parent_wins',
    })

    const rows = await testDb
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.category, 'contest.resolved'),
          eq(notifications.userId, PARENT_USER),
        ),
      )
    expect(rows).toHaveLength(2)
  })

  it('dedupes a replayed defer but notifies a second, later defer', async () => {
    const firstDefer: ContestNotificationInput = {
      ...base,
      action: 'defer',
      deferredAt: new Date('2026-10-01T12:00:00.000Z'),
    }
    await writeContestNotifications(firstDefer)
    await writeContestNotifications(firstDefer)
    expect(await rowsFor('contest.needs_info')).toHaveLength(2)

    await writeContestNotifications({
      ...firstDefer,
      deferredAt: new Date('2026-10-04T12:00:00.000Z'),
    })
    expect(await rowsFor('contest.needs_info')).toHaveLength(4)
  })
})
