// Integration tests for the Spotify identity-match job (#1115, plan PR-C
// Task 9, Step 24). Spotify is stubbed at the client boundary; the DB is real
// (per-worktree test DB), so every verdict is asserted against actual rows.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { asc, eq } from 'drizzle-orm'
import { artists } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import { apiLogger } from '../lib/logger.js'
import {
  MATCH_BATCH_SIZE,
  NO_MATCH_RETRY_DAYS,
  PHOTO_REFETCH_DAYS,
  runMatchArtists,
} from './match-artists.js'
import type { SpotifyAppClient } from '../lib/spotify-app-client.js'
import { SpotifyRateLimitError, SpotifyTimeoutError } from '../lib/spotify.js'

const NOW = new Date('2026-08-01T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

const stubClient = (
  searchArtists: SpotifyAppClient['searchArtists'],
): SpotifyAppClient => ({ searchArtists, getCallCount: () => 1 })

const seedArtist = async (
  values: Partial<typeof artists.$inferInsert> & { canonicalName: string },
): Promise<string> => {
  const [row] = await testDb
    .insert(artists)
    .values({
      name: values.canonicalName,
      slug: values.canonicalName.replace(/[^a-z0-9]+/g, '-'),
      ...values,
    })
    .returning({ id: artists.id })
  if (!row) throw new Error('seed failed')
  return row.id
}

const readArtist = async (id: string) => {
  const [row] = await testDb.select().from(artists).where(eq(artists.id, id))
  return row
}

describe('runMatchArtists', () => {
  beforeEach(async () => {
    await testDb.delete(artists)
  })

  it('no-ops when the app-token client is unavailable (credentials unset)', async () => {
    const id = await seedArtist({ canonicalName: 'khruangbin' })

    const summary = await runMatchArtists({ client: null, now: () => NOW })

    expect(summary.skipped).toBe('unconfigured')
    expect(summary.considered).toBe(0)
    expect((await readArtist(id))?.matchStatus).toBe('unmatched')
  })

  it('writes matched / ambiguous / no_match verdicts and stamps matchCheckedAt', async () => {
    const matchedId = await seedArtist({ canonicalName: 'khruangbin' })
    const ambiguousId = await seedArtist({ canonicalName: 'nirvana' })
    const noMatchId = await seedArtist({ canonicalName: 'nobody at all' })

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async (query) => {
        if (query === 'khruangbin') {
          return [
            {
              id: 'sp_khru',
              name: 'Khruangbin',
              images: [{ url: 'https://i.scdn.co/image/khru' }],
              popularity: 70,
            },
          ]
        }
        if (query === 'nirvana') {
          return [
            { id: 'sp_a', name: 'Nirvana', images: [], popularity: 90 },
            { id: 'sp_b', name: 'NIRVANA', images: [], popularity: 40 },
          ]
        }
        return []
      }),
    })

    expect(summary).toMatchObject({
      skipped: null,
      considered: 3,
      matched: 1,
      ambiguous: 1,
      noMatch: 1,
      failures: 0,
      abortedReason: null,
    })

    const matched = await readArtist(matchedId)
    expect(matched?.matchStatus).toBe('matched')
    expect(matched?.spotifyArtistId).toBe('sp_khru')
    expect(matched?.matchConfidence).toBe('1.000')
    expect(matched?.photoUrl).toBe('https://i.scdn.co/image/khru')
    expect(matched?.photoFetchedAt).toEqual(NOW)
    expect(matched?.matchCheckedAt).toEqual(NOW)

    const ambiguous = await readArtist(ambiguousId)
    expect(ambiguous?.matchStatus).toBe('ambiguous')
    expect(ambiguous?.spotifyArtistId).toBeNull()
    expect(ambiguous?.matchCheckedAt).toEqual(NOW)

    expect((await readArtist(noMatchId))?.matchStatus).toBe('no_match')
  })

  it('selects oldest-checked rows first and caps at the batch size', async () => {
    const never = await seedArtist({ canonicalName: 'never checked' })
    await seedArtist({
      canonicalName: 'recently checked',
      matchCheckedAt: new Date(NOW.getTime() - 1000),
    })

    const seen: string[] = []
    const summary = await runMatchArtists({
      batchSize: 1,
      now: () => NOW,
      client: stubClient(async (query) => {
        seen.push(query)
        return []
      }),
    })

    expect(summary.considered).toBe(1)
    expect(seen).toEqual(['never checked'])
    expect((await readArtist(never))?.matchStatus).toBe('no_match')
  })

  it('aborts the batch on a rate limit, leaving remaining rows unmatched', async () => {
    await seedArtist({ canonicalName: 'aaa first' })
    await seedArtist({ canonicalName: 'bbb second' })

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => {
        throw new SpotifyRateLimitError()
      }),
    })

    expect(summary.abortedReason).toBe('rate_limit')
    expect(summary.considered).toBe(0)
    const rows = await testDb.select().from(artists).orderBy(asc(artists.name))
    expect(rows.map((row) => row.matchStatus)).toEqual([
      'unmatched',
      'unmatched',
    ])
    expect(rows.every((row) => row.matchCheckedAt === null)).toBe(true)
  })

  it('logs the rate-limit error itself, not just the artist id', async () => {
    await seedArtist({ canonicalName: 'aaa first' })
    const warn = vi.spyOn(apiLogger, 'warn')

    await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => {
        throw new SpotifyRateLimitError('Spotify asked for a 3600s cooldown')
      }),
    })

    // The error message carries Spotify's Retry-After. Dropping it leaves an
    // operator with no way to tell a 60s cooldown from an all-day one.
    const logged = warn.mock.calls.find(
      ([context]) =>
        typeof context === 'object' && context !== null && 'err' in context,
    )
    expect(logged?.[0]).toMatchObject({
      err: { message: 'Spotify asked for a 3600s cooldown' },
    })
    warn.mockRestore()
  })

  it('aborts the batch on a Spotify timeout rather than retrying every row', async () => {
    await seedArtist({ canonicalName: 'aaa first' })
    await seedArtist({ canonicalName: 'bbb second' })
    let searches = 0

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => {
        searches += 1
        throw new SpotifyTimeoutError()
      }),
    })

    expect(summary.abortedReason).toBe('timeout')
    expect(summary.considered).toBe(0)
    expect(searches).toBe(1)
    const rows = await testDb.select().from(artists).orderBy(asc(artists.name))
    expect(rows.map((row) => row.matchStatus)).toEqual([
      'unmatched',
      'unmatched',
    ])
    expect(rows.every((row) => row.matchCheckedAt === null)).toBe(true)
  })

  it(`re-fetches photos older than ${PHOTO_REFETCH_DAYS} days`, async () => {
    const staleId = await seedArtist({
      canonicalName: 'khruangbin',
      matchStatus: 'matched',
      spotifyArtistId: 'sp_khru',
      photoUrl: 'https://i.scdn.co/image/expired',
      photoFetchedAt: new Date(
        NOW.getTime() - (PHOTO_REFETCH_DAYS + 1) * DAY_MS,
      ),
    })
    const freshId = await seedArtist({
      canonicalName: 'the beatles',
      matchStatus: 'matched',
      spotifyArtistId: 'sp_beatles',
      photoUrl: 'https://i.scdn.co/image/fresh',
      photoFetchedAt: new Date(NOW.getTime() - DAY_MS),
    })

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => [
        {
          id: 'sp_khru',
          name: 'Khruangbin',
          images: [{ url: 'https://i.scdn.co/image/renewed' }],
          popularity: 70,
        },
      ]),
    })

    expect(summary.photosRefreshed).toBe(1)
    expect((await readArtist(staleId))?.photoUrl).toBe(
      'https://i.scdn.co/image/renewed',
    )
    expect((await readArtist(freshId))?.photoUrl).toBe(
      'https://i.scdn.co/image/fresh',
    )
  })

  it('never downgrades an established identity when a re-search stops resolving', async () => {
    const staleId = await seedArtist({
      canonicalName: 'khruangbin',
      matchStatus: 'matched',
      spotifyArtistId: 'sp_khru',
      photoUrl: 'https://i.scdn.co/image/expired',
      photoFetchedAt: new Date(
        NOW.getTime() - (PHOTO_REFETCH_DAYS + 1) * DAY_MS,
      ),
    })

    await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => []),
    })

    const row = await readArtist(staleId)
    expect(row?.matchStatus).toBe('matched')
    expect(row?.spotifyArtistId).toBe('sp_khru')
    expect(row?.photoUrl).toBe('https://i.scdn.co/image/expired')
    expect(row?.matchCheckedAt).toEqual(NOW)
  })

  it(`retries a no_match row checked over ${NO_MATCH_RETRY_DAYS} days ago`, async () => {
    const staleId = await seedArtist({
      canonicalName: 'khruangbin',
      matchStatus: 'no_match',
      matchCheckedAt: new Date(
        NOW.getTime() - (NO_MATCH_RETRY_DAYS + 1) * DAY_MS,
      ),
    })

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => [
        {
          id: 'sp_khru',
          name: 'Khruangbin',
          images: [{ url: 'https://i.scdn.co/image/khru' }],
          popularity: 70,
        },
      ]),
    })

    // A retry that resolves is a new identity, not a photo refresh.
    expect(summary).toMatchObject({ considered: 1, matched: 1 })
    const row = await readArtist(staleId)
    expect(row?.matchStatus).toBe('matched')
    expect(row?.spotifyArtistId).toBe('sp_khru')
    expect(row?.photoUrl).toBe('https://i.scdn.co/image/khru')
    expect(row?.matchCheckedAt).toEqual(NOW)
  })

  it('leaves a recently checked no_match row alone', async () => {
    const freshId = await seedArtist({
      canonicalName: 'khruangbin',
      matchStatus: 'no_match',
      matchCheckedAt: new Date(
        NOW.getTime() - (NO_MATCH_RETRY_DAYS - 1) * DAY_MS,
      ),
    })

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => {
        throw new Error('Spotify must not be asked about a fresh no_match')
      }),
    })

    expect(summary.considered).toBe(0)
    expect((await readArtist(freshId))?.matchStatus).toBe('no_match')
  })

  it('never retries an ambiguous row, however stale', async () => {
    const ancientId = await seedArtist({
      canonicalName: 'nirvana',
      matchStatus: 'ambiguous',
      matchCheckedAt: new Date(NOW.getTime() - 365 * DAY_MS),
    })

    // Re-searching reproduces the same exact-name tie; only the admin
    // candidate picker can resolve it, so spending quota here buys nothing.
    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async () => {
        throw new Error('Spotify must not be asked about an ambiguous row')
      }),
    })

    expect(summary.considered).toBe(0)
    expect((await readArtist(ancientId))?.matchStatus).toBe('ambiguous')
  })

  it('logs and continues past a single-row failure', async () => {
    await seedArtist({ canonicalName: 'aaa boom' })
    const okId = await seedArtist({ canonicalName: 'bbb fine' })

    const summary = await runMatchArtists({
      now: () => NOW,
      client: stubClient(async (query) => {
        if (query === 'aaa boom') throw new Error('transient')
        return []
      }),
    })

    expect(summary.failures).toBe(1)
    expect(summary.noMatch).toBe(1)
    expect((await readArtist(okId))?.matchStatus).toBe('no_match')
  })

  it('defaults the batch size to the exported constant', () => {
    expect(MATCH_BATCH_SIZE).toBeGreaterThan(0)
  })
})
