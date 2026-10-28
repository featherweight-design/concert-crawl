import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
import { rederiveEventArtists } from './rederive-event-artists.js'
import type { Adjudicator } from './lib/derive-artists.js'

// The one-off pass that runs the derivation ladder over rows crawled before the
// ladder existed. Its whole risk surface is the write: `canonical_artist` backs
// the partial UNIQUE index the crawler's ON CONFLICT targets, so a pass that
// moved it would split every affected show into a duplicate on its next crawl.
describe('rederive-event-artists integration', () => {
  const seedVenue = async () => {
    const [venue] = await db
      .insert(venues)
      .values({
        name: 'Rederive Venue',
        slug: `rederive-venue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        websiteUrl: 'https://example.com/rederive-venue',
        city: 'Denver',
      })
      .returning()
    return venue!
  }

  const seedEvent = async (
    venueId: string,
    values: {
      title: string
      artist: string
      canonicalArtist: string
      canonicalTitle: string
      date: string
      supportingArtists?: string[]
      hiddenFromConsumer?: boolean
      canonicalHeadliners?: string[] | null
    },
  ) => {
    const [event] = await db
      .insert(events)
      .values({
        venueId,
        title: values.title,
        artist: values.artist,
        canonicalArtist: values.canonicalArtist,
        canonicalTitle: values.canonicalTitle,
        date: values.date,
        supportingArtists: values.supportingArtists ?? null,
        hiddenFromConsumer: values.hiddenFromConsumer ?? false,
        canonicalHeadliners: values.canonicalHeadliners ?? null,
      })
      .returning()
    return event!
  }

  const readEvent = async (id: string) => {
    const [row] = await db.select().from(events).where(eq(events.id, id))
    return row!
  }

  // Rules "not a concert" on anything that looks like a listing title, which is
  // the only case the ladder ever reaches it on here.
  const stubAdjudicator = (): Adjudicator =>
    vi.fn(async () => ({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    }))

  const run = (
    adjudicate: Adjudicator,
    dryRun: boolean,
    aiUseAllowed: (url: string) => Promise<boolean> = async () => true,
  ) =>
    rederiveEventArtists({
      dryRun,
      adjudicate,
      adjudicationIntervalMs: 0,
      aiUseAllowed,
    })

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE TABLE events, venues RESTART IDENTITY CASCADE`,
    )
  })

  it('keeps the bill of an event whose artist is a real performer', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'Sigur Rós with Julianna Barwick',
      artist: 'Sigur Rós',
      canonicalArtist: 'sigur ros',
      canonicalTitle: 'sigur ros with julianna barwick',
      date: '2026-09-01',
      supportingArtists: ['Julianna Barwick'],
    })

    const adjudicate = stubAdjudicator()
    const result = await run(adjudicate, false)

    const after = await readEvent(event.id)
    expect(after.headliners).toEqual(['Sigur Rós'])
    expect(after.canonicalHeadliners).toEqual(['sigur ros'])
    expect(after.supportingArtists).toEqual(['Julianna Barwick'])
    expect(after.canonicalSupporting).toEqual(['julianna barwick'])
    expect(after.hiddenFromConsumer).toBe(false)
    // Step 1 answered it, so no call was spent.
    expect(adjudicate).not.toHaveBeenCalled()
    expect(result.strategies.observed).toBe(1)
  })

  it('hides an event whose artist echoes its title and the adjudicator rejects', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-02',
    })

    const adjudicate = stubAdjudicator()
    const result = await run(adjudicate, false)

    const after = await readEvent(event.id)
    expect(after.canonicalHeadliners).toEqual([])
    expect(after.headliners).toEqual([])
    expect(after.hiddenFromConsumer).toBe(true)
    expect(adjudicate).toHaveBeenCalledTimes(1)
    expect(result.hidden).toBe(1)
    expect(result.strategies.adjudicated).toBe(1)
  })

  // The safety assertion of the whole phase. `canonical_artist` is the live
  // dedup key; `artist` is what it is derived from. Neither may move.
  it('leaves artist and canonical_artist byte-identical', async () => {
    const venue = await seedVenue()
    const performer = await seedEvent(venue.id, {
      title: 'Jazz Series presents Kokoroko',
      artist: 'Jazz Series presents Kokoroko',
      canonicalArtist: 'jazz series presents kokoroko',
      canonicalTitle: 'jazz series presents kokoroko',
      date: '2026-09-03',
    })
    const observed = await seedEvent(venue.id, {
      title: 'AC/DC — Power Up Tour',
      artist: 'AC/DC',
      canonicalArtist: 'ac/dc',
      canonicalTitle: 'ac dc power up tour',
      date: '2026-09-04',
    })

    const before = [await readEvent(performer.id), await readEvent(observed.id)]

    await run(
      vi.fn(async () => ({
        isConcert: true,
        headliners: ['Kokoroko'],
        supportingArtists: [],
      })),
      false,
    )

    const after = [await readEvent(performer.id), await readEvent(observed.id)]
    expect(after.map((row) => row.artist)).toEqual(
      before.map((row) => row.artist),
    )
    expect(after.map((row) => row.canonicalArtist)).toEqual(
      before.map((row) => row.canonicalArtist),
    )
    expect(after.map((row) => row.canonicalTitle)).toEqual(
      before.map((row) => row.canonicalTitle),
    )
    // And the point of the pass: the title-shaped row now bills the real act.
    expect(after[0]?.headliners).toEqual(['Kokoroko'])
  })

  it('writes nothing on a dry run', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'Trivia Night at the Bar',
      artist: 'Trivia Night at the Bar',
      canonicalArtist: 'trivia night at the bar',
      canonicalTitle: 'trivia night at the bar',
      date: '2026-09-05',
    })

    const result = await run(stubAdjudicator(), true)

    const after = await readEvent(event.id)
    expect(after.canonicalHeadliners).toBeNull()
    expect(after.hiddenFromConsumer).toBe(false)
    // The dry run still reports what it would have done, `updated` included —
    // that count is what the decision to apply turns on.
    expect(result.updated).toBe(1)
    expect(result.derived).toBe(1)
    expect(result.hidden).toBe(1)
    expect(result.sample[0]?.hides).toBe(true)
  })

  it('is idempotent — a second run leaves the same rows', async () => {
    const venue = await seedVenue()
    const bingo = await seedEvent(venue.id, {
      title: 'BINGO BASH',
      artist: 'BINGO BASH',
      canonicalArtist: 'bingo bash',
      canonicalTitle: 'bingo bash',
      date: '2026-09-06',
    })
    const band = await seedEvent(venue.id, {
      title: 'Kokoroko live',
      artist: 'Kokoroko',
      canonicalArtist: 'kokoroko',
      canonicalTitle: 'kokoroko live',
      date: '2026-09-07',
    })

    await run(stubAdjudicator(), false)
    const first = [await readEvent(bingo.id), await readEvent(band.id)]

    const secondAdjudicator = stubAdjudicator()
    const second = await run(secondAdjudicator, false)
    const after = [await readEvent(bingo.id), await readEvent(band.id)]

    expect(after.map((row) => row.headliners)).toEqual(
      first.map((row) => row.headliners),
    )
    expect(after.map((row) => row.canonicalHeadliners)).toEqual(
      first.map((row) => row.canonicalHeadliners),
    )
    expect(after.map((row) => row.hiddenFromConsumer)).toEqual(
      first.map((row) => row.hiddenFromConsumer),
    )
    // The settled row is not re-adjudicated, so a re-run does not re-spend the
    // LLM bill on rows the previous run already closed out.
    expect(secondAdjudicator).not.toHaveBeenCalled()
    expect(second.strategies.settled).toBe(1)
    expect(second.hidden).toBe(0)
    // The band row IS re-derived — step 1 is free — but it derives to what it
    // already stores, so nothing is written and `updated_at` does not move.
    // Surfaces that read `updated_at` as "this show changed" must not see the
    // whole table go stale-dated the day this pass runs.
    expect(second.updated).toBe(0)
    expect(after.map((row) => row.updatedAt)).toEqual(
      first.map((row) => row.updatedAt),
    )
  })

  it('leaves a row untouched when the adjudicator is unreachable', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'Open Mic Night',
      artist: 'Open Mic Night',
      canonicalArtist: 'open mic night',
      canonicalTitle: 'open mic night',
      date: '2026-09-08',
    })

    const result = await run(
      vi.fn(async () => {
        throw new Error('haiku down')
      }),
      false,
    )

    const after = await readEvent(event.id)
    // NULL still means "never derived" rather than "nobody is billed", so the
    // next run picks the row up again.
    expect(after.canonicalHeadliners).toBeNull()
    expect(after.hiddenFromConsumer).toBe(false)
    expect(result.updated).toBe(0)
    expect(result.strategies['adjudicator-unavailable']).toBe(1)
  })

  // The crawl never sends a page to the model when robots.txt refuses AI use;
  // this admin pass must not either. The row keeps its stored bill.
  it('does not adjudicate a row whose venue refuses AI use', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-09',
    })

    const adjudicate = stubAdjudicator()
    const result = await run(adjudicate, false, async () => false)

    expect(adjudicate).not.toHaveBeenCalled()
    expect(result.strategies['ai-use-refused']).toBe(1)
    const after = await readEvent(event.id)
    expect(after.canonicalHeadliners).toBeNull()
    expect(after.hiddenFromConsumer).toBe(false)
  })

  // A VenuePilot venue's rows come from VenuePilot's endpoint, so its verdict
  // counts even when the venue's own site allows AI use.
  it('does not adjudicate a platform row whose payload host refuses AI use', async () => {
    const venue = await seedVenue()
    await db
      .update(venues)
      .set({ apiProvider: 'venuepilot', apiAccountId: '1105' })
      .where(eq(venues.id, venue.id))
    await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-10',
    })

    const adjudicate = stubAdjudicator()
    const result = await run(
      adjudicate,
      false,
      async (url) => !url.startsWith('https://www.venuepilot.co/'),
    )

    expect(adjudicate).not.toHaveBeenCalled()
    expect(result.strategies['ai-use-refused']).toBe(1)
  })
})
