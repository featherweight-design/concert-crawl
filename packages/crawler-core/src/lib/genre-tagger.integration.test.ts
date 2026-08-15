import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'

// The genre tagger reads `events.artist`, which is the event's DISPLAY string
// and is populated even for a bingo night. The derivation ladder's verdict is
// what says whether anybody is actually billed, so the tagger has to gate on
// it or it hands the model a title in an "artist" field and gets a genre back.

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const { tagEventsWithGenres } = await import('./genre-tagger.js')

async function seedVenue(): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Genre Venue ${crypto.randomUUID()}`,
      slug: `genre-venue-${crypto.randomUUID()}`,
      websiteUrl: 'https://genre.example.com',
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'browser',
    })
    .returning()
  if (!venue) throw new Error('venue insert returned no row')
  return venue.id
}

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE events, artists, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
  mockCreate.mockReset()
  mockCreate.mockResolvedValue({
    content: [{ type: 'tool_use', name: 'tag_genres', input: { results: [] } }],
    usage: { input_tokens: 0, output_tokens: 0 },
  })
})

describe('tagEventsWithGenres — ladder gating', () => {
  it('skips an event the ladder ruled has nobody billed', async () => {
    const venueId = await seedVenue()
    await db.insert(events).values({
      venueId,
      artist: 'Drag Bingo',
      canonicalArtist: 'drag bingo',
      title: 'Drag Bingo',
      date: futureDate(10),
      sourceUrl: 'https://genre.example.com',
      status: 'upcoming',
      // The ladder ruled: nobody is billed. `artist` is still populated
      // because it is the display string.
      headliners: [],
      canonicalHeadliners: [],
    })

    await tagEventsWithGenres(venueId)

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('still tags a row the ladder has never seen', async () => {
    // NULL is not empty. A row predating the derivation stage has no verdict
    // either way, and dropping it would silently stop tagging the back
    // catalogue until a re-crawl reached every one of them.
    const venueId = await seedVenue()
    await db.insert(events).values({
      venueId,
      artist: 'Khruangbin',
      canonicalArtist: 'khruangbin',
      title: 'Khruangbin',
      date: futureDate(11),
      sourceUrl: 'https://genre.example.com',
      status: 'upcoming',
    })

    await tagEventsWithGenres(venueId)

    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('tags an event with a derived bill', async () => {
    const venueId = await seedVenue()
    await db.insert(events).values({
      venueId,
      artist: 'Sigur Rós',
      canonicalArtist: 'sigur ros',
      title: 'Sigur Rós Live',
      date: futureDate(12),
      sourceUrl: 'https://genre.example.com',
      status: 'upcoming',
      headliners: ['Sigur Rós'],
      canonicalHeadliners: ['sigur ros'],
    })

    await tagEventsWithGenres(venueId)

    expect(mockCreate).toHaveBeenCalledOnce()
  })
})
