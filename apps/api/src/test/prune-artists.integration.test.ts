import { beforeEach, describe, expect, it } from 'vitest'
import { asc } from 'drizzle-orm'
import { artists } from '@concert-crawl/db'
import { backfillArtists } from '@concert-crawl/db/scripts/backfill-artists'
import { pruneArtists } from '@concert-crawl/db/scripts/prune-artists'
import { testDb } from './helpers/db.js'
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js'

// The projection has never had a reaper, so ~10% of the production artist
// pool is rows no live event references: orphans left by a deleted event, and
// non-concerts the crawler write-through projected before it learned to
// filter on the classifier's verdict. Both render an empty artist page and
// both keep spending Spotify match quota.
//
// The safety property under test is symmetry with `backfillArtists`: the
// reaper must only ever remove a row the backfill would decline to create.
describe('prune-artists integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  const listArtists = async () =>
    testDb.select().from(artists).orderBy(asc(artists.canonicalName))

  it('removes an artist no event references any more', async () => {
    const venue = await seedVenue({ slug: `prune-orphan-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Live Act',
      canonicalArtist: 'live act',
      date: '2026-06-01',
    })
    await testDb.insert(artists).values({
      name: 'Deleted Act',
      canonicalName: 'deleted act',
      slug: 'deleted-act',
    })
    await backfillArtists(testDb)

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(1)
    const rows = await listArtists()
    expect(rows.map((row) => row.canonicalName)).toEqual(['live act'])
  })

  it('removes an artist billed only on hidden events', async () => {
    const venue = await seedVenue({ slug: `prune-hidden-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Colorado Avalanche vs. Calgary Flames',
      canonicalArtist: 'colorado avalanche vs. calgary flames',
      hiddenFromConsumer: true,
      date: '2026-06-02',
    })
    await testDb.insert(artists).values({
      name: 'Colorado Avalanche vs. Calgary Flames',
      canonicalName: 'colorado avalanche vs. calgary flames',
      slug: 'colorado-avalanche-vs-calgary-flames',
    })

    await pruneArtists(testDb, { dryRun: false })

    expect(await listArtists()).toEqual([])
  })

  it('keeps an artist billed only as support', async () => {
    // The backfill projects support-only artists, so the reaper must read the
    // supporting array too or it would delete a row on every run and the
    // backfill would recreate it on the next.
    const venue = await seedVenue({ slug: `prune-support-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Headliner',
      canonicalArtist: 'headliner',
      supportingArtists: ['Support Only'],
      canonicalSupporting: ['support only'],
      date: '2026-06-03',
    })
    await backfillArtists(testDb)

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    const rows = await listArtists()
    expect(rows.map((row) => row.canonicalName)).toEqual([
      'headliner',
      'support only',
    ])
  })

  it('keeps an artist whose only show has already happened', async () => {
    // The backfill has no date bound, so neither can this: a past-only artist
    // still has a page worth resolving.
    const venue = await seedVenue({ slug: `prune-past-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Played Once',
      canonicalArtist: 'played once',
      date: '2020-01-01',
    })
    await backfillArtists(testDb)

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'played once',
    ])
  })

  it('deletes nothing on a dry run but reports what it would take', async () => {
    const venue = await seedVenue({ slug: `prune-dry-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Live Act',
      canonicalArtist: 'live act',
      date: '2026-06-04',
    })
    await backfillArtists(testDb)
    await testDb.insert(artists).values({
      name: 'Deleted Act',
      canonicalName: 'deleted act',
      slug: 'deleted-act',
    })

    const result = await pruneArtists(testDb, { dryRun: true })

    expect(result).toMatchObject({ candidates: 1, deleted: 0 })
    expect(result.sample).toEqual([
      { name: 'Deleted Act', slug: 'deleted-act', matchStatus: 'unmatched' },
    ])
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'deleted act',
      'live act',
    ])
  })

  it('leaves a freshly backfilled table untouched', async () => {
    // Symmetry check: whatever the backfill just created, the reaper keeps.
    const venue = await seedVenue({ slug: `prune-symmetry-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Sigur Rós',
      canonicalArtist: 'sigur ros',
      supportingArtists: ['Amiina'],
      canonicalSupporting: ['amiina'],
      date: '2026-06-05',
    })
    await seedEvent(venue.id, {
      artist: 'Bingo Night',
      canonicalArtist: 'bingo night',
      hiddenFromConsumer: true,
      date: '2026-06-06',
    })
    await backfillArtists(testDb)

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'amiina',
      'sigur ros',
    ])
  })
})
