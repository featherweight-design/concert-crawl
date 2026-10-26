import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { db, events, venues } from '@concert-crawl/db'
import { crawlVenue } from './crawl.js'

// #1203 — the crawler persists the headliner set as a first-class array, and
// `canonical_headliners` is its element-wise canonicalization.
//
// The set now comes from `deriveArtists()` reading what the extractor OBSERVED,
// not from `artist`. Two consequences the cases below pin down:
//
//   - `headliners[0] === artist` is NO LONGER an invariant. `artist` is the
//     event's display string; an extraction that observed nobody persists an
//     empty headliner set while `artist` still holds the title.
//   - The crawler still never derives multiple headliners by splitting a
//     string, so a band name containing '&' stays one act.
//
// Same IO-layer mocking as crawl-artists.integration.test.ts: real Postgres,
// mocked fetcher / robots / LLM.

vi.mock('./lib/fetcher.js', () => ({
  fetchPage: vi.fn(),
  fetchPageHttp: vi.fn(),
  CrawlFetchError: class CrawlFetchError extends Error {
    constructor(
      public httpStatus: number,
      message: string,
    ) {
      super(message)
    }
  },
  // crawl.ts narrows on this with `instanceof`, so an absent constructor makes
  // the catch path throw rather than classify (#1404).
  CrawlSelectorTimeoutError: class CrawlSelectorTimeoutError extends Error {
    constructor(
      public selector: string,
      public html: string | null,
      public finalUrl: string,
      public httpStatus: number,
      message: string,
    ) {
      super(message)
      this.name = 'CrawlSelectorTimeoutError'
    }
  },
}))
vi.mock('./lib/robots.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/robots.js')>()),
  isAllowed: vi.fn().mockResolvedValue(true),
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  isAiUseAllowed: vi.fn().mockResolvedValue(true),
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
}))
vi.mock('./lib/extractors/llm.js', () => ({
  extractWithLlm: vi.fn(),
  // Fixtures here report their performers, so the derivation ladder settles
  // on step 1 without escalating. Rejecting makes an unexpected escalation
  // loud rather than silently spending an adjudication call.
  adjudicateEvent: vi
    .fn()
    .mockRejectedValue(
      new Error('adjudicateEvent is not stubbed for this test'),
    ),
}))
vi.mock('./lib/email.js', () => ({
  sendCrawlFailureEmail: vi.fn().mockResolvedValue(undefined),
  sendEventCountDropEmail: vi.fn().mockResolvedValue(undefined),
}))

import { fetchPage, fetchPageHttp } from './lib/fetcher.js'
import { adjudicateEvent, extractWithLlm } from './lib/extractors/llm.js'

const mockBrowser = {} as Browser
const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
const mockExtractWithLlm = vi.mocked(extractWithLlm)
const mockAdjudicateEvent = vi.mocked(adjudicateEvent)

const SOURCE_URL = 'https://headliners.example.com'
const HTML_BASE = '<html><body><p>Headliner listing</p></body></html>'

async function clearCrawlState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, artists, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedTestVenue(): Promise<{ id: string }> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Headliner Venue ${crypto.randomUUID()}`,
      slug: `headliner-venue-${crypto.randomUUID()}`,
      websiteUrl: SOURCE_URL,
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'browser',
    })
    .returning()
  if (!venue) throw new Error('venue insert returned no row')
  return { id: venue.id }
}

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

interface ExtractedEvent {
  title: string
  rawTitle: string
  artist: string
  /**
   * What the extractor SAW. `headliners` is deliberately absent: the derivation
   * stage overwrites it, so a fixture that set it would assert nothing.
   */
  observedPerformers: string[]
  // Required, not optional: every extractor and fetcher populates it, empty
  // when it saw no openers. Making a fixture able to omit it would let a shape
  // production never produces slip into the suite.
  observedSupportingArtists: string[]
  doorsTime?: string
  date: string
  sourceUrl: string
  confidence: number
}

function makeEvent(
  artist: string,
  date: string,
  extra: Partial<ExtractedEvent> = {},
): ExtractedEvent {
  const title = `${artist} Live`
  return {
    title,
    rawTitle: title,
    artist,
    observedPerformers: [artist],
    observedSupportingArtists: [],
    date,
    sourceUrl: SOURCE_URL,
    confidence: 0.9,
    ...extra,
  }
}

function mockExtraction(extracted: ExtractedEvent[], html = HTML_BASE): void {
  mockFetchPage.mockResolvedValue({
    html,
    httpStatus: 200,
    finalUrl: SOURCE_URL,
  })
  mockFetchPageHttp.mockResolvedValue({
    html,
    httpStatus: 200,
    finalUrl: SOURCE_URL,
  })
  mockExtractWithLlm.mockResolvedValue({
    events: extracted,
    usage: { inputTokens: 0, outputTokens: 0 },
  })
}

async function loadEvent(artist: string): Promise<{
  headliners: string[] | null
  canonicalHeadliners: string[] | null
  canonicalArtist: string
  artist: string
  supportingArtists: string[] | null
}> {
  const [row] = await db
    .select({
      headliners: events.headliners,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalArtist: events.canonicalArtist,
      artist: events.artist,
      supportingArtists: events.supportingArtists,
    })
    .from(events)
    .where(eq(events.artist, artist))
  if (!row) throw new Error(`no events row for artist "${artist}"`)
  return row
}

beforeEach(async () => {
  await clearCrawlState()
  mockFetchPage.mockClear()
  mockFetchPageHttp.mockClear()
  mockExtractWithLlm.mockClear()
  mockAdjudicateEvent.mockClear()
  mockAdjudicateEvent.mockRejectedValue(
    new Error('adjudicateEvent is not stubbed for this test'),
  )
})

describe('crawlVenue — headliner set persistence (#1203)', () => {
  it('persists the single act the extractor observed', async () => {
    const venue = await seedTestVenue()
    mockExtraction([makeEvent('Sigur Rós', futureDate(20))])

    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('success')

    const row = await loadEvent('Sigur Rós')
    expect(row.headliners).toEqual(['Sigur Rós'])
    expect(row.canonicalHeadliners).toEqual(['sigur ros'])
  })

  it('persists an EMPTY headliner set when the extractor observed nobody', async () => {
    // The old behavior here was to fall back to [artist]. That fallback is what
    // put 222 event titles in the artists projection, so it is gone: a listing
    // that names no performer keeps its display string and nothing else. The
    // adjudicator rules it a non-concert, which is the honest answer for bingo.
    const venue = await seedTestVenue()
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    })
    mockExtraction([
      makeEvent('Drag Bingo', futureDate(26), { observedPerformers: [] }),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Drag Bingo')
    expect(row.artist).toBe('Drag Bingo')
    expect(row.headliners).toEqual([])
    expect(row.canonicalHeadliners).toEqual([])
  })

  it('persists a multi-headliner array and canonicalizes every entry', async () => {
    const venue = await seedTestVenue()
    mockExtraction([
      makeEvent('Desert Dwellers', futureDate(21), {
        observedPerformers: ['Desert Dwellers', 'Great Dane'],
        observedSupportingArtists: ['Numatik'],
      }),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Desert Dwellers')
    expect(row.headliners).toEqual(['Desert Dwellers', 'Great Dane'])
    // canonicalizeSupporting dedupes and sorts, so assert as a set.
    expect([...(row.canonicalHeadliners ?? [])].sort()).toEqual([
      'desert dwellers',
      'great dane',
    ])
    expect(row.canonicalArtist).toBe('desert dwellers')
    // The opener stays an opener — it never leaks into the headliner set.
    expect(row.supportingArtists).toEqual(['Numatik'])
    expect(row.canonicalHeadliners).not.toContain('numatik')
  })

  it('keeps a band name containing an ampersand as ONE headliner', async () => {
    const venue = await seedTestVenue()
    // The extractor emits the whole name; nothing downstream splits on '&'.
    mockExtraction([
      makeEvent('Iron & Wine', futureDate(22), {
        observedPerformers: ['Iron & Wine'],
      }),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Iron & Wine')
    expect(row.headliners).toEqual(['Iron & Wine'])
    expect(row.canonicalHeadliners).toHaveLength(1)
  })

  it('rewrites the headliner set on re-crawl when the billing changes', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(23)
    mockExtraction([makeEvent('Turnstile', date)])
    await crawlVenue(venue.id, mockBrowser)
    expect((await loadEvent('Turnstile')).headliners).toEqual(['Turnstile'])

    // Same (venue, date, canonical_artist, show_time) → the ON CONFLICT path.
    // The title has to move too: an unchanged source hash short-circuits the
    // upsert entirely, so re-billing alone would never reach the `set` clause.
    mockExtraction(
      [
        makeEvent('Turnstile', date, {
          title: 'Turnstile & Snail Mail Co-Headline',
          rawTitle: 'Turnstile & Snail Mail Co-Headline',
          observedPerformers: ['Turnstile', 'Snail Mail'],
        }),
      ],
      '<html><body><p>Updated listing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Turnstile')
    expect(row.headliners).toEqual(['Turnstile', 'Snail Mail'])
    expect([...(row.canonicalHeadliners ?? [])].sort()).toEqual([
      'snail mail',
      'turnstile',
    ])
  })

  it('collapses back to a single headliner when a co-headline bill is downgraded', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(25)
    mockExtraction([
      makeEvent('Fontaines D.C.', date, {
        title: 'Fontaines D.C. & Just Mustard',
        rawTitle: 'Fontaines D.C. & Just Mustard',
        observedPerformers: ['Fontaines D.C.', 'Just Mustard'],
      }),
    ])
    await crawlVenue(venue.id, mockBrowser)

    // The upsert takes the newly derived array wholesale, so a bill that drops
    // back to one act narrows on re-crawl instead of keeping the stale
    // co-headliner.
    mockExtraction(
      [
        makeEvent('Fontaines D.C.', date, {
          observedPerformers: ['Fontaines D.C.'],
        }),
      ],
      '<html><body><p>Solo billing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Fontaines D.C.')
    expect(row.headliners).toEqual(['Fontaines D.C.'])
    expect(row.canonicalHeadliners).toEqual(['fontaines d.c.'])
  })

  it('keeps the headliner set EMPTY when a re-crawl observes nobody', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(27)
    mockExtraction([makeEvent('Bingo Night', date)])
    await crawlVenue(venue.id, mockBrowser)
    expect((await loadEvent('Bingo Night')).headliners).toEqual(['Bingo Night'])

    // The ON CONFLICT clause prepends the stored artist to excluded[2:], which
    // on an empty set would rebuild [artist] and quietly reinstate
    // title-as-headliner on every nightly crawl — while canonical_headliners,
    // which takes excluded wholesale, went empty. The two columns must agree.
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    })
    // The title has to move too — an unchanged source hash short-circuits the
    // upsert before the `set` clause this test is about.
    mockExtraction(
      [
        makeEvent('Bingo Night', date, {
          title: 'Bingo Night (hosted)',
          rawTitle: 'Bingo Night (hosted)',
          observedPerformers: [],
        }),
      ],
      '<html><body><p>Now billed as a bingo night</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Bingo Night')
    expect(row.artist).toBe('Bingo Night')
    expect(row.headliners).toEqual([])
    expect(row.canonicalHeadliners).toEqual([])
  })

  it('preserves the stored bill when the adjudicator is down on re-crawl', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(28)
    mockExtraction([
      makeEvent('Khruangbin', date, {
        observedPerformers: ['Khruangbin'],
        observedSupportingArtists: ['Nubya Garcia'],
      }),
    ])
    await crawlVenue(venue.id, mockBrowser)

    // An outage leaves the ladder with no verdict. Writing its blank would
    // erase a correct bill and de-project both artists until some later crawl
    // happened to succeed, so the upsert keeps all four columns as stored.
    mockAdjudicateEvent.mockRejectedValue(new Error('haiku 529'))
    mockExtraction(
      [
        makeEvent('Khruangbin', date, {
          title: 'Khruangbin (moved to the main room)',
          rawTitle: 'Khruangbin (moved to the main room)',
          observedPerformers: [],
        }),
      ],
      '<html><body><p>Room change</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Khruangbin')
    expect(row.headliners).toEqual(['Khruangbin'])
    expect(row.canonicalHeadliners).toEqual(['khruangbin'])
    expect(row.supportingArtists).toEqual(['Nubya Garcia'])
  })

  it('reuses the stored verdict instead of re-adjudicating an unchanged listing', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(29)
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })
    mockExtraction([
      makeEvent('@adsfradio presents', date, { observedPerformers: [] }),
    ])
    await crawlVenue(venue.id, mockBrowser)
    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()

    // The page HTML moves so the crawl is not skipped wholesale and the
    // derivation ladder actually runs a second time. The ladder runs before
    // the upsert, so an unchanged source hash does NOT stop it either —
    // without the reuse gate this listing would buy the identical verdict
    // from Haiku every ten minutes, forever. The adjudicator reads only title
    // and description, and both are unchanged here.
    mockExtraction(
      [makeEvent('@adsfradio presents', date, { observedPerformers: [] })],
      '<html><body><p>Unrelated page edit</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)
    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()

    const row = await loadEvent('@adsfradio presents')
    expect(row.headliners).toEqual(['Daedelus'])
    expect(row.canonicalHeadliners).toEqual(['daedelus'])
  })

  it('picks up a new opener while still reusing the stored verdict', async () => {
    // The reuse key is (title, description) — the adjudicator's own inputs — so
    // it cannot see an opener change. Ticketure parses openers out of prose and
    // sets no description at all, so copying the stored list would freeze the
    // support bill for as long as the headline stayed put.
    const venue = await seedTestVenue()
    const date = futureDate(41)
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Dutch Melrose'],
      supportingArtists: [],
    })
    mockExtraction([
      makeEvent('Dutch Melrose presents', date, {
        observedPerformers: [],
        observedSupportingArtists: ['Kiltro'],
      }),
    ])
    await crawlVenue(venue.id, mockBrowser)
    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()

    mockExtraction(
      [
        makeEvent('Dutch Melrose presents', date, {
          observedPerformers: [],
          observedSupportingArtists: ['Kiltro', 'Neighbor Andy'],
        }),
      ],
      '<html><body><p>Unrelated page edit</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)
    // Still one call: the verdict was reused, only the observation re-merged.
    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()

    const row = await loadEvent('Dutch Melrose presents')
    expect(row.headliners).toEqual(['Dutch Melrose'])
    expect(row.supportingArtists).toEqual(['Kiltro', 'Neighbor Andy'])
  })

  it('writes a bill change two joined strings would compare equal', async () => {
    // The bill is not part of sourceHash, so the change-detection escape hatch
    // is the only thing that reaches the upsert here. Comparing the arrays by
    // joining them on a delimiter would call these two bills identical:
    // canonicalizeArtist preserves punctuation, so one name containing the
    // delimiter collides with two names separated by it.
    const venue = await seedTestVenue()
    const date = futureDate(42)
    mockExtraction([
      makeEvent('Winter Showcase', date, {
        observedPerformers: ['Kae Tempest|Loyle Carner'],
      }),
    ])
    await crawlVenue(venue.id, mockBrowser)
    expect((await loadEvent('Winter Showcase')).canonicalHeadliners).toEqual([
      'kae tempest|loyle carner',
    ])

    mockExtraction(
      [
        makeEvent('Winter Showcase', date, {
          observedPerformers: ['Kae Tempest', 'Loyle Carner'],
        }),
      ],
      '<html><body><p>Bill split into two acts</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Winter Showcase')
    expect(row.headliners).toEqual(['Kae Tempest', 'Loyle Carner'])
    expect(row.canonicalHeadliners).toEqual(['kae tempest', 'loyle carner'])
  })

  it('drops the stored verdict once the source starts naming a performer', async () => {
    // A venue that adds JSON-LD performer markup, or an extractor that starts
    // populating the field, gives the ladder a step-1 answer where it
    // previously had none. That outranks a stored LLM verdict, so the reuse
    // gate must not hold the older answer just because the title is unchanged.
    const venue = await seedTestVenue()
    const date = futureDate(32)
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })
    mockExtraction([
      makeEvent('@adsfradio presents', date, { observedPerformers: [] }),
    ])
    await crawlVenue(venue.id, mockBrowser)
    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()

    mockExtraction(
      [
        makeEvent('@adsfradio presents', date, {
          observedPerformers: ['Daedelus', 'Busdriver'],
        }),
      ],
      '<html><body><p>Performers listed</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    // Step 1 is free, so the ladder settles without a second LLM call.
    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()
    const row = await loadEvent('@adsfradio presents')
    expect(row.headliners).toEqual(['Daedelus', 'Busdriver'])
    expect(row.canonicalHeadliners).toEqual(['busdriver', 'daedelus'])
  })

  it('re-adjudicates when the title moves, because the adjudicator reads it', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(30)
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })
    mockExtraction([
      makeEvent('@adsfradio presents', date, { observedPerformers: [] }),
    ])
    await crawlVenue(venue.id, mockBrowser)

    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus', 'Busdriver'],
      supportingArtists: [],
    })
    // The page HTML has to move as well as the title — an unchanged page is
    // skipped before extraction, so the derivation loop never runs at all.
    mockExtraction(
      [
        makeEvent('@adsfradio presents', date, {
          title: '@adsfradio presents: Daedelus + Busdriver',
          rawTitle: '@adsfradio presents: Daedelus + Busdriver',
          observedPerformers: [],
        }),
      ],
      '<html><body><p>Busdriver added to the bill</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    expect(mockAdjudicateEvent).toHaveBeenCalledTimes(2)
  })

  it('takes the freshly billed headliners on re-crawl rather than re-pinning to the stored artist', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(24)
    mockExtraction([makeEvent('Bjork', date)])
    await crawlVenue(venue.id, mockBrowser)

    // `artist` is deliberately never updated on conflict, so the stored
    // spelling survives. headliners is no longer spliced onto it: the ladder
    // owns that array and the upsert takes it whole.
    mockExtraction(
      [
        makeEvent('Björk', date, {
          title: 'Björk & Arca',
          rawTitle: 'Björk & Arca',
          observedPerformers: ['Björk', 'Arca'],
        }),
      ],
      '<html><body><p>Updated listing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Bjork')
    expect(row.artist).toBe('Bjork')
    expect(row.headliners).toEqual(['Björk', 'Arca'])
  })

  it('does not collapse a real bill back to the display title on re-crawl', async () => {
    // When the listing names nobody, the ladder puts the real performer in
    // headliners while `artist` keeps the event-shaped display string. Rebuilding
    // the array as array_prepend(artist, excluded[2:]) on conflict used to turn that
    // into ['Jazz Series presents'] — the exact title-as-headliner junk this
    // stage exists to stop.
    const venue = await seedTestVenue()
    const date = futureDate(31)
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Kokoroko'],
      supportingArtists: [],
    })
    mockExtraction([
      makeEvent('Jazz Series presents', date, { observedPerformers: [] }),
    ])
    await crawlVenue(venue.id, mockBrowser)

    const seeded = await loadEvent('Jazz Series presents')
    expect(seeded.headliners).toEqual(['Kokoroko'])

    // Move the page HTML so the crawl is not skipped wholesale, and the doors
    // time so the source hash changes and the upsert's ON CONFLICT set clause
    // actually runs. Doors time is not part of the dedup key, so this stays
    // the same row.
    mockExtraction(
      [
        makeEvent('Jazz Series presents', date, {
          observedPerformers: [],
          doorsTime: '19:30',
        }),
      ],
      '<html><body><p>Doors moved</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Jazz Series presents')
    expect(row.artist).toBe('Jazz Series presents')
    expect(row.headliners).toEqual(['Kokoroko'])
    expect(row.canonicalHeadliners).toEqual(['kokoroko'])
  })
})
