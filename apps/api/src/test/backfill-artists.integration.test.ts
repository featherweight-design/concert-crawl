import { beforeEach, describe, expect, it } from 'vitest'
import { asc } from 'drizzle-orm'
import { artists } from '@concert-crawl/db'
import { backfillArtists } from '@concert-crawl/db/scripts/backfill-artists'
import { testDb } from './helpers/db.js'
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js'

// The backfill projects every distinct canonical artist — headliner AND
// supporting — out of `events` and into the `artists` table so /artists/{slug}
// has something to resolve on day one. It must be idempotent: it runs from
// `pnpm db:seed` and can be re-run against staging or prod at any time.
describe('backfill-artists integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  const listArtists = async () =>
    testDb.select().from(artists).orderBy(asc(artists.canonicalName))

  it('creates one row per distinct canonical artist, headliner and support alike', async () => {
    const venue = await seedVenue({ slug: `backfill-venue-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Sigur Rós',
      canonicalArtist: 'sigur ros',
      supportingArtists: ['Julianna Barwick', 'Amiina'],
      canonicalSupporting: ['amiina', 'julianna barwick'],
      date: '2026-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'AC/DC',
      canonicalArtist: 'ac/dc',
      supportingArtists: ['Amiina'],
      canonicalSupporting: ['amiina'],
      date: '2026-06-02',
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    expect(rows.map((row) => row.canonicalName)).toEqual([
      'ac/dc',
      'amiina',
      'julianna barwick',
      'sigur ros',
    ])
  })

  it('includes an artist that only ever appears as support', async () => {
    const venue = await seedVenue({ slug: `support-only-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Headliner',
      canonicalArtist: 'headliner',
      supportingArtists: ['Support Only'],
      canonicalSupporting: ['support only'],
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    const supportRow = rows.find((row) => row.canonicalName === 'support only')
    expect(supportRow).toBeDefined()
    expect(supportRow?.slug).toBe('support-only')
    expect(supportRow?.matchStatus).toBe('unmatched')
  })

  it('picks the most-frequent raw spelling as the display name', async () => {
    const venue = await seedVenue({ slug: `spelling-${Date.now()}` })
    // Three events, one canonical name, two raw spellings — "SIGUR ROS" twice
    // beats "Sigur Ros" once.
    await seedEvent(venue.id, {
      artist: 'SIGUR ROS',
      canonicalArtist: 'sigur ros',
      date: '2026-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'SIGUR ROS',
      canonicalArtist: 'sigur ros',
      date: '2026-06-02',
    })
    await seedEvent(venue.id, {
      artist: 'Sigur Ros',
      canonicalArtist: 'sigur ros',
      date: '2026-06-03',
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('SIGUR ROS')
  })

  it('de-collides slugs across distinct canonical names', async () => {
    const venue = await seedVenue({ slug: `collision-${Date.now()}` })
    // "m.i.a." and "mia" are DISTINCT canonical names that both slug to "mia".
    await seedEvent(venue.id, {
      artist: 'M.I.A.',
      canonicalArtist: 'm.i.a.',
      date: '2026-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Mia',
      canonicalArtist: 'mia',
      date: '2026-06-02',
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    expect(rows).toHaveLength(2)
    const slugs = rows.map((row) => row.slug).sort()
    expect(slugs).toEqual(['mia', 'mia-2'])
    expect(new Set(slugs).size).toBe(2)
  })

  it('gives a degenerate canonical name an addressable fallback slug', async () => {
    const venue = await seedVenue({ slug: `degenerate-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: '!!!',
      canonicalArtist: '!!!',
      date: '2026-06-01',
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.slug).not.toBe('')
    expect(rows[0]?.slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('drops empty canonical names', async () => {
    const venue = await seedVenue({ slug: `empty-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Real Artist',
      canonicalArtist: 'real artist',
      supportingArtists: [],
      canonicalSupporting: [],
    })
    // canonical_supporting can legitimately be null on legacy rows.
    await seedEvent(venue.id, {
      artist: 'Another Artist',
      canonicalArtist: 'another artist',
      canonicalSupporting: null,
      date: '2026-06-02',
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    expect(rows.map((row) => row.canonicalName)).toEqual([
      'another artist',
      'real artist',
    ])
  })

  it('is idempotent — a second run inserts nothing and changes no slug', async () => {
    const venue = await seedVenue({ slug: `idempotent-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'M.I.A.',
      canonicalArtist: 'm.i.a.',
      supportingArtists: ['Mia'],
      canonicalSupporting: ['mia'],
      date: '2026-06-01',
    })

    const first = await backfillArtists(testDb)
    const before = await listArtists()

    const second = await backfillArtists(testDb)
    const after = await listArtists()

    expect(first.inserted).toBe(2)
    expect(second.inserted).toBe(0)
    expect(after.map((row) => row.slug)).toEqual(before.map((row) => row.slug))
    expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id))
  })

  it('resolves a new slug against slugs already stored', async () => {
    const venue = await seedVenue({ slug: `existing-${Date.now()}` })
    // Pre-existing row occupies "mia" under a DIFFERENT canonical name.
    await testDb
      .insert(artists)
      .values({ name: 'M.I.A.', canonicalName: 'm.i.a.', slug: 'mia' })
    await seedEvent(venue.id, {
      artist: 'Mia',
      canonicalArtist: 'mia',
      date: '2026-06-01',
    })

    await backfillArtists(testDb)

    const rows = await listArtists()
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.canonicalName === 'mia')?.slug).toBe('mia-2')
  })
})
