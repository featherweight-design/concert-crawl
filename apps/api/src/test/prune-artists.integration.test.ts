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
// Two safety properties are under test. The first is symmetry with
// `backfillArtists`: the reaper must only ever remove a row the backfill
// would decline to create. The second exists because symmetry alone let a
// production dry run condemn bands with upcoming Denver dates — the backfill
// cannot see a co-headliner billed only in an event title, so the reaper
// spares any name a live upcoming show still prints.
describe('prune-artists integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  const listArtists = async () =>
    testDb.select().from(artists).orderBy(asc(artists.canonicalName))

  /** The title spare is bounded by today's Denver date, so it needs a real one. */
  const futureDate = () =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  /** What the reaper's `DENVER_TODAY` resolves to, computed independently. */
  const denverToday = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

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

  it('keeps a co-headliner the derived headliner set bills', async () => {
    // The backfill projects every element of canonical_headliners, so the
    // reaper has to read the same column. Reading only canonical_artist would
    // delete the second act on every run and the backfill would put it straight
    // back on the next — the exact churn symmetry exists to prevent.
    const venue = await seedVenue({ slug: `prune-co-headline-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Desert Dwellers',
      canonicalArtist: 'desert dwellers',
      // A title that cannot rescue the co-headliner, so the assertion is about
      // the headliner set and not the BILLED_IN_LIVE_TITLE widening.
      title: 'Desert Dwellers Live',
      canonicalTitle: 'desert dwellers live',
      headliners: ['Desert Dwellers', 'Great Dane'],
      canonicalHeadliners: ['desert dwellers', 'great dane'],
      date: '2026-06-04',
    })
    await backfillArtists(testDb)

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    const rows = await listArtists()
    expect(rows.map((row) => row.canonicalName)).toEqual([
      'desert dwellers',
      'great dane',
    ])
  })

  it('reaps a title-derived artist once the ladder rules the event artistless', async () => {
    // canonical_artist still holds the title for dedup, so a reaper that read
    // it unconditionally would protect this row forever. An EMPTY headliner
    // set is the ladder saying nobody is billed, and the projection must go.
    const venue = await seedVenue({ slug: `prune-artistless-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'HUMP! Film Festival',
      canonicalArtist: 'hump! film festival',
      title: 'HUMP! Film Festival',
      canonicalTitle: 'hump film festival',
      headliners: [],
      canonicalHeadliners: [],
      date: '2020-01-02',
    })
    await testDb.insert(artists).values({
      name: 'HUMP! Film Festival',
      canonicalName: 'hump! film festival',
      slug: 'hump-film-festival',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(1)
    expect(await listArtists()).toEqual([])
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

  it('keeps a co-headliner billed only in the title of a live show', async () => {
    // Canonicalisation records one headliner, so the other act in an "A & B"
    // billing is in neither `canonical_artist` nor `canonical_supporting` and
    // the backfill cannot see it. Production had 50 of these, including bands
    // with upcoming Denver dates.
    const venue = await seedVenue({ slug: `prune-cohead-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Knocked Loose',
      canonicalArtist: 'knocked loose',
      title: 'Knocked Loose & Denzel Curry',
      canonicalTitle: 'knocked loose & denzel curry',
      date: futureDate(),
    })
    await testDb.insert(artists).values({
      name: 'Denzel Curry',
      canonicalName: 'denzel curry',
      slug: 'denzel-curry',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'denzel curry',
    ])
  })

  it("keeps a co-headliner billed on tonight's show", async () => {
    // The boundary case, and the one a UTC `CURRENT_DATE` gets wrong: every
    // Denver evening falls on the next UTC day, so a show playing tonight
    // reads as past for those hours and its co-headliner gets reaped.
    const venue = await seedVenue({ slug: `prune-tonight-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Knocked Loose',
      canonicalArtist: 'knocked loose',
      title: 'Knocked Loose & Denzel Curry',
      canonicalTitle: 'knocked loose & denzel curry',
      date: denverToday(),
    })
    await testDb.insert(artists).values({
      name: 'Denzel Curry',
      canonicalName: 'denzel curry',
      slug: 'denzel-curry',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'denzel curry',
    ])
  })

  it('still reaps a name billed only in the title of a past show', async () => {
    // The spare is for acts someone can still go and see. Without the date
    // bound every name ever printed on a title would be permanently immune.
    const venue = await seedVenue({ slug: `prune-past-title-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Knocked Loose',
      canonicalArtist: 'knocked loose',
      title: 'Knocked Loose & Denzel Curry',
      canonicalTitle: 'knocked loose & denzel curry',
      date: '2020-01-01',
    })
    await testDb.insert(artists).values({
      name: 'Denzel Curry',
      canonicalName: 'denzel curry',
      slug: 'denzel-curry',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(1)
    expect(await listArtists()).toEqual([])
  })

  it('still reaps a name billed only in the title of a hidden show', async () => {
    const venue = await seedVenue({ slug: `prune-hidden-title-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Colorado Avalanche',
      canonicalArtist: 'colorado avalanche',
      title: 'Colorado Avalanche vs. Calgary Flames',
      canonicalTitle: 'colorado avalanche vs. calgary flames',
      hiddenFromConsumer: true,
      date: futureDate(),
    })
    await testDb.insert(artists).values({
      name: 'Calgary Flames',
      canonicalName: 'calgary flames',
      slug: 'calgary-flames',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(1)
    expect(await listArtists()).toEqual([])
  })

  it('does not spare a name too short to be evidence of a booking', async () => {
    // A three-character name is a substring of a large share of any title, so
    // matching one says nothing about whether the act is booked.
    const venue = await seedVenue({ slug: `prune-short-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Real Headliner',
      canonicalArtist: 'real headliner',
      title: 'Real Headliner: The Emo Revival Tour',
      canonicalTitle: 'real headliner: the emo revival tour',
      date: futureDate(),
    })
    await backfillArtists(testDb)
    await testDb.insert(artists).values({
      name: 'Emo',
      canonicalName: 'emo',
      slug: 'emo',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(1)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'real headliner',
    ])
  })

  it('spares a name carrying LIKE and regex metacharacters', async () => {
    // Canonical names are raw billing strings. `strpos` is what makes this
    // safe; a LIKE pattern would read the underscore as a wildcard and a
    // regex would choke on the dollar signs.
    const venue = await seedVenue({ slug: `prune-meta-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Night Lovell',
      canonicalArtist: 'night lovell',
      title: 'Night Lovell w/ $uicideboy$ and Just_Graham',
      canonicalTitle: 'night lovell w/ $uicideboy$ and just_graham',
      date: futureDate(),
    })
    await testDb.insert(artists).values([
      { name: '$uicideboy$', canonicalName: '$uicideboy$', slug: 'uicideboy' },
      {
        name: 'Just_Graham',
        canonicalName: 'just_graham',
        slug: 'just-graham',
      },
    ])

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    // Sorted in JS rather than trusting the query's ORDER BY, because the
    // database collation's handling of leading punctuation is not the thing
    // under test here.
    const names = (await listArtists()).map((row) => row.canonicalName)
    expect([...names].sort()).toEqual(['$uicideboy$', 'just_graham'])
  })

  it('spares a name whose title billing carries diacritics', async () => {
    // `canonical_name` is diacritic-stripped and the raw title is not, so a
    // substring search across the two could never match. Both canonical
    // columns come from the same pipeline, which is why the match reads
    // `canonical_title`.
    const venue = await seedVenue({ slug: `prune-diacritic-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Jónsi',
      canonicalArtist: 'jonsi',
      title: 'Jónsi & Sigur Rós',
      canonicalTitle: 'jonsi & sigur ros',
      date: futureDate(),
    })
    await testDb.insert(artists).values({
      name: 'Sigur Rós',
      canonicalName: 'sigur ros',
      slug: 'sigur-ros',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      'sigur ros',
    ])
  })

  it('spares a name whose apostrophe the title canonicaliser dropped', async () => {
    // The one rule the two canonicalisers disagree on: titles strip every
    // apostrophe variant, artist names keep theirs.
    const venue = await seedVenue({ slug: `prune-apostrophe-${Date.now()}` })
    await seedEvent(venue.id, {
      artist: 'Subtronics',
      canonicalArtist: 'subtronics',
      title: "Subtronics & Zed's Dead",
      canonicalTitle: 'subtronics & zeds dead',
      date: futureDate(),
    })
    await testDb.insert(artists).values({
      name: "Zed's Dead",
      canonicalName: "zed's dead",
      slug: 'zeds-dead',
    })

    const result = await pruneArtists(testDb, { dryRun: false })

    expect(result.deleted).toBe(0)
    expect((await listArtists()).map((row) => row.canonicalName)).toEqual([
      "zed's dead",
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
