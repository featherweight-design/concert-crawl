import { db } from './src/client.js'
import { venues, type NewVenue } from './src/schema/index.js'

export const SEED_VENUES: NewVenue[] = [
  {
    name: 'Red Rocks Amphitheatre',
    slug: 'red-rocks-amphitheatre',
    websiteUrl: 'https://www.redrocksonline.com/events/',
    city: 'Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Ogden Theatre',
    slug: 'ogden-theatre',
    websiteUrl: 'https://www.ogdentheatre.com/calendar/',
    city: 'Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    websiteUrl: 'https://missionballroom.com/events/',
    city: 'Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
    websiteUrl: 'https://www.bluebirdtheater.net/calendar/',
    city: 'Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
  {
    name: 'Gothic Theatre',
    slug: 'gothic-theatre',
    websiteUrl: 'https://www.gothictheatre.com/events/',
    city: 'Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
  },
]

async function seed() {
  console.warn('Seeding database...')

  await db.insert(venues).values(SEED_VENUES).onConflictDoNothing({ target: venues.slug })

  console.warn(`Inserted ${SEED_VENUES.length} venues.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
