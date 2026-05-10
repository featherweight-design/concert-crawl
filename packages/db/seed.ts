import { sql } from 'drizzle-orm'
import { db } from './src/client.js'
import {
  venues,
  events as eventsTable,
  priceRetrievalLog,
  type NewVenue,
} from './src/schema/index.js'

export const SEED_VENUES: NewVenue[] = [
  {
    name: 'Red Rocks Amphitheatre',
    slug: 'red-rocks-amphitheatre',
    websiteUrl: 'https://www.redrocksonline.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Ogden Theatre',
    slug: 'ogden-theatre',
    websiteUrl: 'https://www.ogdentheatre.com/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    websiteUrl: 'https://missionballroom.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
    websiteUrl: 'https://www.bluebirdtheater.net/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlWaitUntil: 'load' as const,
  },
  {
    name: 'Gothic Theatre',
    slug: 'gothic-theatre',
    websiteUrl: 'https://www.gothictheatre.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
]

async function seed() {
  console.warn('Seeding database...')

  await db
    .insert(venues)
    .values(SEED_VENUES)
    .onConflictDoNothing({ target: venues.slug })

  console.warn(`Inserted ${SEED_VENUES.length} venues.`)

  // Fetch all venues to get their IDs
  const insertedVenues = await db.select().from(venues)

  // Only seed events if there are none (idempotent re-runs)
  const existingEventsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
  const hasEvents = (existingEventsCount[0]?.count ?? 0) > 0

  if (!hasEvents) {
    const SAMPLE_ARTISTS = [
      'Khruangbin',
      'Explosions in the Sky',
      'Modest Mouse',
      'Soccer Mommy',
      'Phoebe Bridgers',
      'Big Thief',
    ]

    const sampleEvents = insertedVenues.flatMap((venue, venueIdx) =>
      SAMPLE_ARTISTS.slice(0, 3).map((artist, artistIdx) => ({
        venueId: venue.id,
        title: `${artist} at ${venue.name}`,
        artist,
        date: new Date(2026, 5 + artistIdx, 10 + venueIdx * 3)
          .toISOString()
          .slice(0, 10),
        status: 'upcoming' as const,
        ticketUrl: venue.websiteUrl,
        ticketPriceMin:
          artistIdx % 2 === 0 ? String(25 + artistIdx * 10) : null,
        ticketPriceMax:
          artistIdx % 2 === 0 ? String(55 + artistIdx * 10) : null,
        priceSource: artistIdx % 2 === 0 ? ('structured_data' as const) : null,
      })),
    )

    const insertedEvents = await db
      .insert(eventsTable)
      .values(sampleEvents)
      .returning()
    console.warn(`Inserted ${insertedEvents.length} events.`)

    // Insert price retrieval log entries
    const OUTCOMES = ['hit', 'miss', 'error'] as const
    const SOURCES = ['structured_data', 'ticketmaster', 'seatgeek'] as const
    const LATENCIES_MS = [120, 340, 85]

    const logEntries = insertedEvents.flatMap((event) =>
      Array.from({ length: 3 }, (_unused, attemptIdx) => ({
        eventId: event.id,
        venueId: event.venueId,
        source: SOURCES[attemptIdx % SOURCES.length],
        outcome: OUTCOMES[attemptIdx % OUTCOMES.length],
        latencyMs: LATENCIES_MS[attemptIdx % LATENCIES_MS.length],
        attemptedAt: new Date(Date.now() - attemptIdx * 3_600_000),
      })),
    )

    await db.insert(priceRetrievalLog).values(logEntries)
    console.warn(`Inserted ${logEntries.length} price retrieval log entries.`)
  } else {
    console.warn('Events already seeded, skipping.')
  }

  process.exit(0)
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
}
