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

  it('sends the derived bill rather than an event-shaped display string', async () => {
    // The ladder found a real act behind a title that names nobody. Sending
    // `artist` here would ask the model to genre-tag "Jazz Series presents".
    const venueId = await seedVenue()
    await db.insert(events).values({
      venueId,
      artist: 'Jazz Series presents',
      canonicalArtist: 'jazz series presents',
      title: 'Jazz Series presents',
      date: futureDate(13),
      sourceUrl: 'https://genre.example.com',
      status: 'upcoming',
      headliners: ['Kokoroko'],
      canonicalHeadliners: ['kokoroko'],
    })

    await tagEventsWithGenres(venueId)

    // Without the fix the bill never reaches the model at all, so the name is
    // absent from the payload entirely.
    const prompt = JSON.stringify(mockCreate.mock.calls[0]?.[0])
    expect(prompt).toContain('Kokoroko')
  })

  it('falls back to the display string when headliners is an empty array', async () => {
    // Only canonical_headliners gates the skip, so an empty `headliners` beside
    // a NULL canonical verdict still reaches the model. `[].join()` is a
    // string, so a `??` fallback would send an empty artist field and the model
    // would genre-tag nothing.
    const venueId = await seedVenue()
    await db.insert(events).values({
      venueId,
      artist: 'Big Thief',
      canonicalArtist: 'big thief',
      // Deliberately unlike the artist, so the assertion below can only be
      // satisfied by the artist field and not by the title beside it.
      title: 'An Evening With',
      date: futureDate(14),
      sourceUrl: 'https://genre.example.com',
      status: 'upcoming',
      headliners: [],
    })

    await tagEventsWithGenres(venueId)

    const prompt = JSON.stringify(mockCreate.mock.calls[0]?.[0])
    expect(prompt).toContain('Big Thief')
  })
})
