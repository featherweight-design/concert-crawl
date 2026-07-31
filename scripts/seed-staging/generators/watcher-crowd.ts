/**
 * Concert Crawl — synthetic staging generator: "Who else is watching" crowd.
 *
 * GET /v1/events/:id/watchers returns a `total` count plus a `named` roster
 * capped at 25 and restricted to watchers who have a handle. None of those
 * boundaries are reachable with five fixture users, so this generator stands up
 * a pool of profile-only accounts and concentrates them on three showcase
 * events — one per interesting shape:
 *
 *   deep   — 34 watchers, so `named` hits the 25 cap and the roster overflows
 *   mixed  — 12 watchers, 5 of them handle-less, so `total` exceeds `named`
 *   single — 1 watcher, the minimum non-empty roster
 *
 * The owner also watches all three, because the endpoint excludes the viewer:
 * signed in as Hugh, each count reads one lower than the number seeded here.
 *
 * Showcase events are drawn from upcoming events where possible — a roster on a
 * show that already happened isn't a surface anyone visits.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import {
  userEvents,
  userProfiles,
} from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type WatcherCrowdDeps = {
  staging: DrizzleWriteDb
  crowdUserIds: readonly string[]
  ownerUserId: string
  eventIds: readonly string[]
  pastEventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type WatcherCrowdResult = {
  insertedProfiles: number
  insertedUserEvents: number
  showcaseEventIds: readonly string[]
}

/** Watchers per showcase event, in showcase order: deep, mixed, single. */
export const SHOWCASE_WATCHER_COUNTS = [34, 12, 1] as const

/**
 * How many of the `mixed` showcase's watchers have no handle. They are counted
 * in `total` and omitted from `named` — the privacy opt-out, which is a cleared
 * handle rather than a flag.
 */
export const MIXED_SHOWCASE_HANDLELESS = 5

const HANDLE_WORDS = [
  'reverb',
  'floorfill',
  'encore',
  'setlist',
  'bassbin',
  'frontrow',
  'houselights',
  'soundcheck',
  'tapedeck',
  'lastcall',
] as const

const CITIES = [
  'Denver, CO',
  'Boulder, CO',
  'Aurora, CO',
  'Fort Collins, CO',
  'Colorado Springs, CO',
] as const

const AVATAR_COLORS = ['signal', 'accent', 'success', 'warning'] as const

/** PATCH /v1/users/me caps handles here, so seeded ones must fit too. */
const MAX_HANDLE_LENGTH = 20

/**
 * Readable handles, deliberately unlike the layout-hostile ones in
 * user-profiles.ts — a roster of forty 53-character handles tests wrapping and
 * nothing else. Every fourth handle is padded to exactly MAX_HANDLE_LENGTH so
 * the roster still has near-cap entries without inventing widths no real user
 * could ever set.
 *
 * `user_profiles.handle` is globally UNIQUE and a collision aborts the whole
 * seeder run on the insert, so handles are guarded twice: the `sc_` prefix
 * keeps them out of the space a real staging user would pick, and the `idx`
 * suffix keeps them apart from each other (two rng-drawn words out of ten
 * collide readily across forty members).
 */
const HANDLE_PREFIX = 'sc_'

const buildHandle = (
  rng: ReturnType<typeof createRng>,
  idx: number,
): string => {
  const suffix = String(idx)
  const bodyLength = MAX_HANDLE_LENGTH - HANDLE_PREFIX.length - suffix.length
  const body = `${rng.pick(HANDLE_WORDS)}_${rng.pick(HANDLE_WORDS)}`.slice(
    0,
    bodyLength,
  )
  return idx % 4 === 3
    ? `${HANDLE_PREFIX}${body.padEnd(bodyLength, 'x')}${suffix}`
    : `${HANDLE_PREFIX}${body}${suffix}`
}

export const generateWatcherCrowd = async (
  deps: WatcherCrowdDeps,
): Promise<WatcherCrowdResult> => {
  const { staging, crowdUserIds, ownerUserId, eventIds, pastEventIds, rng } =
    deps

  if (crowdUserIds.length === 0 || eventIds.length === 0) {
    return { insertedProfiles: 0, insertedUserEvents: 0, showcaseEventIds: [] }
  }

  // Prefer upcoming events; fall back to the full list so a staging DB with
  // only past events still produces rosters instead of silently skipping.
  const pastEventIdSet = new Set(pastEventIds)
  const upcoming = eventIds.filter((eventId) => !pastEventIdSet.has(eventId))
  const pool =
    upcoming.length >= SHOWCASE_WATCHER_COUNTS.length ? upcoming : eventIds

  const showcaseEventIds: string[] = []
  for (const eventId of pool) {
    if (showcaseEventIds.length >= SHOWCASE_WATCHER_COUNTS.length) break
    showcaseEventIds.push(eventId)
  }

  // The mixed showcase needs more handle-less crowd members than it has
  // watchers to spare if the crowd pool is ever shrunk, so clamp rather than
  // producing a roster that silently loses its named entries.
  const handlelessCount = Math.min(
    MIXED_SHOWCASE_HANDLELESS,
    Math.max(0, crowdUserIds.length - 1),
  )

  const profileRows = crowdUserIds.map((userId, idx) => ({
    userId,
    // The first `handlelessCount` crowd members are the privacy opt-outs.
    handle: idx < handlelessCount ? null : buildHandle(rng, idx),
    city: rng.int(0, 9) < 3 ? null : rng.pick(CITIES),
    avatarColor: rng.pick(AVATAR_COLORS),
  }))

  await staging.insert(userProfiles).values(profileRows)

  const watchRows: { userId: string; eventId: string; status: 'watching' }[] =
    []

  showcaseEventIds.forEach((eventId, showcaseIdx) => {
    const requested = SHOWCASE_WATCHER_COUNTS[showcaseIdx] ?? 0
    const count = Math.min(requested, crowdUserIds.length)

    // The mixed showcase draws from the head of the pool so it picks up the
    // handle-less members; the others draw from the tail so their rosters are
    // fully named.
    const members =
      showcaseIdx === 1
        ? crowdUserIds.slice(0, count)
        : crowdUserIds.slice(-count)

    for (const userId of members) {
      watchRows.push({ userId, eventId, status: 'watching' })
    }

    // The viewer is excluded from their own roster — without this the owner
    // never sees the counts at all.
    watchRows.push({ userId: ownerUserId, eventId, status: 'watching' })
  })

  if (watchRows.length > 0) {
    await staging.insert(userEvents).values(
      watchRows.map(({ userId, eventId, status }) => ({
        userId,
        eventId,
        status,
        attendingAt: null,
      })),
    )
  }

  return {
    insertedProfiles: profileRows.length,
    insertedUserEvents: watchRows.length,
    showcaseEventIds,
  }
}
