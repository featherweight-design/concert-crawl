import { sql } from 'drizzle-orm'
import { db } from './src/client.js'
import {
  venues,
  events as eventsTable,
  priceRetrievalLog,
  userProfiles,
  userRoles,
  inviteCodes,
  userEvents,
  priceSubmissions,
  submissionConfirms,
  feedback,
  notifications,
  waitlistEntries,
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

const FAKE_USER_IDS = {
  hugh: 'user_3CoSI01LtxRAvremTpL0yDfuEJ6',
  jess: 'user_fake_jess_0001',
  marco: 'user_fake_marco_0002',
  amy: 'user_fake_amy_0003',
  ghost: 'user_fake_ghost_0004',
} as const

export const FAKE_USER_PROFILES = [
  {
    userId: FAKE_USER_IDS.hugh,
    handle: 'hugh',
    theme: 'electric' as const,
    avatarColor: 'signal' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.jess,
    handle: 'jess_r',
    theme: 'pulse' as const,
    avatarColor: 'accent' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.marco,
    handle: 'marco_d',
    theme: 'forge' as const,
    avatarColor: 'warning' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.amy,
    handle: 'amy_k',
    theme: 'jade' as const,
    avatarColor: 'success' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.ghost,
    handle: null,
    theme: 'cedar' as const,
    avatarColor: null,
    city: null,
  },
]

export const FAKE_USER_ROLES = [
  {
    userId: FAKE_USER_IDS.hugh,
    role: 'admin' as const,
    priceCredScore: 15,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.amy,
    role: 'sub_admin' as const,
    priceCredScore: 5,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.jess,
    role: 'user' as const,
    priceCredScore: 8,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.marco,
    role: 'user' as const,
    priceCredScore: 3,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.ghost,
    role: 'user' as const,
    priceCredScore: 0,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
]

const now = new Date()

export const SEED_INVITE_CODES = [
  { code: 'BETA-OPEN-01', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-02', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-03', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-04', createdBy: FAKE_USER_IDS.hugh },
  { code: 'BETA-OPEN-05', createdBy: FAKE_USER_IDS.hugh },
  {
    code: 'BETA-USED-J1',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.jess,
    usedAt: new Date(now.getTime() - 7 * 86_400_000),
  },
  {
    code: 'BETA-USED-M2',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.marco,
    usedAt: new Date(now.getTime() - 3 * 86_400_000),
  },
]

export const SEED_FEEDBACK = [
  {
    userId: FAKE_USER_IDS.jess,
    pageUrl: '/browse',
    category: 'bug' as const,
    message: 'Filter chips disappear on mobile when scrolled down.',
  },
  {
    userId: FAKE_USER_IDS.marco,
    pageUrl: '/browse',
    category: 'bug' as const,
    message:
      'Calendar view shows wrong month when switching back from list view.',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    pageUrl: '/admin/venues',
    category: 'idea' as const,
    message: 'Would be great to bulk-trigger crawls from the venues table.',
  },
  {
    userId: FAKE_USER_IDS.jess,
    pageUrl: '/browse',
    category: 'idea' as const,
    message: "Can we add a 'shows this weekend' quick filter?",
  },
  {
    userId: FAKE_USER_IDS.marco,
    pageUrl: '/',
    category: 'praise' as const,
    message: 'The generative art for each venue is such a nice touch.',
  },
  {
    userId: FAKE_USER_IDS.amy,
    pageUrl: '/admin',
    category: 'praise' as const,
    message: 'Admin crawl health view is super useful.',
  },
]

export const SEED_NOTIFICATIONS = [
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.failed',
    title: 'Crawl failed: Bluebird Theater',
    body: '3 consecutive failures. Venue paused automatically.',
    actionUrl: '/admin/venues/bluebird-theater',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.blocked',
    title: 'Venue blocked: Gothic Theatre',
    body: 'Received 403 response. Venue flagged as blocked.',
    actionUrl: '/admin/venues/gothic-theatre',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.low_confidence',
    title: 'Low-confidence events: Ogden Theatre',
    body: '4 events extracted with confidence score below 0.7.',
    actionUrl: '/admin/events?venueSlug=ogden-theatre&confidence=low',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.low_confidence',
    title: 'Low-confidence events: Mission Ballroom',
    body: '2 events extracted with confidence score below 0.7.',
    actionUrl: '/admin/events?venueSlug=mission-ballroom&confidence=low',
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

  // --- Synthetic user data ---

  await db
    .insert(userProfiles)
    .values(FAKE_USER_PROFILES)
    .onConflictDoNothing({ target: userProfiles.userId })
  console.warn(`Inserted ${FAKE_USER_PROFILES.length} user profiles.`)

  const existingRolesCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userRoles)
  const hasRoles = (existingRolesCount[0]?.count ?? 0) > 0
  if (!hasRoles) {
    await db.insert(userRoles).values(FAKE_USER_ROLES).onConflictDoNothing()
    console.warn(`Inserted ${FAKE_USER_ROLES.length} user roles.`)
  } else {
    console.warn('User roles already seeded, skipping.')
  }

  await db
    .insert(inviteCodes)
    .values(SEED_INVITE_CODES)
    .onConflictDoNothing({ target: inviteCodes.code })
  console.warn(`Inserted ${SEED_INVITE_CODES.length} invite codes.`)

  await db
    .insert(waitlistEntries)
    .values(
      Array.from({ length: 8 }, (_unused, idx) => ({
        email: `test+${idx + 1}@example.com`,
      })),
    )
    .onConflictDoNothing({ target: waitlistEntries.email })
  console.warn('Inserted 8 waitlist entries.')

  const existingFeedbackCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback)
  const hasFeedback = (existingFeedbackCount[0]?.count ?? 0) > 0
  if (!hasFeedback) {
    await db.insert(feedback).values(SEED_FEEDBACK).onConflictDoNothing()
    console.warn(`Inserted ${SEED_FEEDBACK.length} feedback entries.`)
  } else {
    console.warn('Feedback already seeded, skipping.')
  }

  const existingNotifCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
  const hasNotifications = (existingNotifCount[0]?.count ?? 0) > 0
  if (!hasNotifications) {
    await db
      .insert(notifications)
      .values(SEED_NOTIFICATIONS)
      .onConflictDoNothing()
    console.warn(`Inserted ${SEED_NOTIFICATIONS.length} notifications.`)
  } else {
    console.warn('Notifications already seeded, skipping.')
  }

  // --- Event-linked synthetic data ---
  const recentEvents = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .limit(50)

  if (recentEvents.length === 0) {
    console.warn(
      'No events found — skipping user_events, price_submissions, submission_confirms.',
    )
  } else {
    const eventIds = recentEvents.map((evt) => evt.id)

    const userEventRows = [
      // Hugh watches 6 events — some with saved prices
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[0]!,
        status: 'watching' as const,
        savedPrice: '35.00',
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[1]!,
        status: 'going' as const,
        savedPrice: '45.00',
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[2]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[3]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[4]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[5]!,
        status: 'going' as const,
      },
      // jess_r watches 5 events — some with saved prices
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[6]!,
        status: 'watching' as const,
        savedPrice: '22.00',
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[7]!,
        status: 'going' as const,
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[8]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[9]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[10]!,
        status: 'going' as const,
      },
      // marco_d watches 3 events
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[11]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[12]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[13]!,
        status: 'watching' as const,
      },
      // amy_k watches 2 events
      {
        userId: FAKE_USER_IDS.amy,
        eventId: eventIds[14]!,
        status: 'going' as const,
      },
      {
        userId: FAKE_USER_IDS.amy,
        eventId: eventIds[15 % eventIds.length]!,
        status: 'watching' as const,
      },
    ].filter((row) => row.eventId !== undefined)

    const existingUserEventsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userEvents)
    const hasUserEvents = (existingUserEventsCount[0]?.count ?? 0) > 0
    if (!hasUserEvents) {
      await db.insert(userEvents).values(userEventRows).onConflictDoNothing()
      console.warn(`Inserted ${userEventRows.length} user_events.`)
    } else {
      console.warn('User events already seeded, skipping.')
    }

    const submissionEventIds = eventIds.slice(0, 10)
    const submissionRows = [
      {
        eventId: submissionEventIds[0]!,
        userId: FAKE_USER_IDS.jess,
        priceMin: '35.00',
        priceMax: '55.00',
        tier: 'GA' as const,
        vendor: 'AXS' as const,
        howFound: 'bought_myself' as const,
        status: 'corroborated' as const,
        corroborationCount: 2,
      },
      {
        eventId: submissionEventIds[1]!,
        userId: FAKE_USER_IDS.marco,
        priceMin: '45.00',
        priceMax: '75.00',
        tier: 'GA' as const,
        vendor: 'Ticketmaster' as const,
        howFound: 'saw_listing' as const,
        status: 'corroborated' as const,
        corroborationCount: 1,
      },
      {
        eventId: submissionEventIds[2]!,
        userId: FAKE_USER_IDS.jess,
        priceMin: '120.00',
        priceMax: '200.00',
        tier: 'VIP' as const,
        vendor: 'AXS' as const,
        howFound: 'bought_myself' as const,
        status: 'pending' as const,
        corroborationCount: 0,
      },
      {
        eventId: submissionEventIds[3]!,
        userId: FAKE_USER_IDS.marco,
        priceMin: '25.00',
        tier: 'GA' as const,
        vendor: 'SeatGeek' as const,
        howFound: 'saw_listing' as const,
        status: 'pending' as const,
        corroborationCount: 0,
      },
      {
        eventId: submissionEventIds[4]!,
        userId: FAKE_USER_IDS.hugh,
        priceMin: '30.00',
        priceMax: '45.00',
        tier: 'GA' as const,
        vendor: 'Ticketmaster' as const,
        howFound: 'bought_myself' as const,
        status: 'disputed' as const,
        corroborationCount: 0,
      },
      {
        eventId: submissionEventIds[5]!,
        userId: FAKE_USER_IDS.jess,
        priceMin: '50.00',
        priceMax: '80.00',
        tier: 'Reserved' as const,
        vendor: 'AXS' as const,
        howFound: 'saw_listing' as const,
        status: 'pending' as const,
        corroborationCount: 0,
      },
      {
        eventId: submissionEventIds[6]!,
        userId: FAKE_USER_IDS.marco,
        priceMin: '22.00',
        tier: 'GA' as const,
        vendor: 'DICE' as const,
        howFound: 'at_the_venue' as const,
        status: 'pending' as const,
        corroborationCount: 0,
      },
      {
        eventId: submissionEventIds[7]!,
        userId: FAKE_USER_IDS.hugh,
        priceMin: '65.00',
        priceMax: '120.00',
        tier: 'VIP' as const,
        vendor: 'Ticketmaster' as const,
        howFound: 'bought_myself' as const,
        status: 'corroborated' as const,
        corroborationCount: 1,
      },
      {
        eventId: submissionEventIds[8]!,
        userId: FAKE_USER_IDS.jess,
        priceMin: '18.00',
        tier: 'GA' as const,
        vendor: 'Eventbrite' as const,
        howFound: 'saw_listing' as const,
        status: 'pending' as const,
        corroborationCount: 0,
      },
      {
        eventId: submissionEventIds[9]!,
        userId: FAKE_USER_IDS.marco,
        priceMin: '40.00',
        priceMax: '60.00',
        tier: 'GA' as const,
        vendor: 'SeatGeek' as const,
        howFound: 'saw_listing' as const,
        status: 'pending' as const,
        corroborationCount: 0,
      },
    ]

    const existingSubmissionsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceSubmissions)
    const hasSubmissions = (existingSubmissionsCount[0]?.count ?? 0) > 0
    if (!hasSubmissions) {
      const insertedSubmissions = await db
        .insert(priceSubmissions)
        .values(submissionRows)
        .returning()
      console.warn(`Inserted ${insertedSubmissions.length} price submissions.`)

      // Corroboration rows for the 3 corroborated submissions
      const corroboratedSubmissions = insertedSubmissions.filter(
        (sub) => sub.status === 'corroborated',
      )
      const confirmRows = corroboratedSubmissions
        .flatMap((sub) => [
          { submissionId: sub.id, userId: FAKE_USER_IDS.amy },
          { submissionId: sub.id, userId: FAKE_USER_IDS.ghost },
        ])
        .slice(0, 4)

      if (confirmRows.length > 0) {
        await db
          .insert(submissionConfirms)
          .values(confirmRows)
          .onConflictDoNothing()
        console.warn(`Inserted ${confirmRows.length} submission confirms.`)
      }
    } else {
      console.warn('Price submissions already seeded, skipping.')
    }
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
