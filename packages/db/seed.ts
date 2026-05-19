import { desc, eq, sql } from 'drizzle-orm'
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
    address: '18300 W Alameda Pkwy, Morrison, CO 80465',
    capacity: 9525,
    venueType: 'Amphitheater',
    about:
      'Carved into the foothills west of Denver, Red Rocks is a natural sandstone amphitheater renowned for its acoustics and panoramic views. At 6,450 feet elevation, it hosts world-class acts against one of the most iconic backdrops in live music.',
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
    address: '935 E Colfax Ave, Denver, CO 80218',
    capacity: 1600,
    venueType: 'Theater',
    about:
      "A historic 1917 theater on Colfax Avenue, the Ogden has been a cornerstone of Denver's live music scene for over a century. Its ornate interior and intimate sightlines make it a favorite for mid-sized acts across rock, indie, and electronic.",
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
    address: '4242 Wynkoop St, Denver, CO 80211',
    capacity: 3900,
    venueType: 'Concert Hall',
    about:
      "Opened in 2018 in the RiNo Arts District, Mission Ballroom is Denver's premier mid-size venue with a state-of-the-art sound system and flexible standing floor. It bridges the gap between club shows and arena tours.",
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
    address: '3317 E Colfax Ave, Denver, CO 80206',
    capacity: 550,
    venueType: 'Theater',
    about:
      'A beloved neighborhood theater on East Colfax, the Bluebird has been hosting intimate shows since 1913. Its close-to-the-stage feel and eclectic booking make it an essential stop for emerging artists and underground acts.',
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
    address: '3263 S Broadway, Englewood, CO 80113',
    capacity: 1100,
    venueType: 'Theater',
    about:
      'A landmark on South Broadway since 1926, the Gothic Theatre blends historic architecture with a gritty, no-frills energy that draws a devoted crowd. Its slightly off-center location in Englewood gives it a character all its own.',
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
    readAt: new Date(now.getTime() - 3_600_000), // read 1 hour ago
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

  // onConflictDoNothing() without target covers both userId and handle unique constraints
  await db.insert(userProfiles).values(FAKE_USER_PROFILES).onConflictDoNothing()
  console.warn(`Inserted ${FAKE_USER_PROFILES.length} user profiles.`)

  // Insert only roles for userIds not already present, to handle partial local state
  const existingRoleRows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
  const existingRoleUserIds = new Set(existingRoleRows.map((row) => row.userId))
  const missingRoles = FAKE_USER_ROLES.filter(
    (role) => !existingRoleUserIds.has(role.userId),
  )
  if (missingRoles.length > 0) {
    await db.insert(userRoles).values(missingRoles)
    console.warn(`Inserted ${missingRoles.length} user roles.`)
  } else {
    console.warn('All synthetic user roles already present, skipping.')
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
    .orderBy(desc(eventsTable.date))
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

    // Build submission rows defensively — only include entries where the eventId exists
    type SubmissionTemplate = {
      idx: number
      userId: string
      priceMin: string
      priceMax?: string
      tier: 'GA' | 'Reserved' | 'VIP' | 'Pit' | 'Lawn'
      vendor:
        | 'AXS'
        | 'Ticketmaster'
        | 'SeatGeek'
        | 'DICE'
        | 'Eventbrite'
        | 'VenueBoxOffice'
      howFound: 'bought_myself' | 'saw_listing' | 'at_the_venue'
      status: 'pending' | 'corroborated' | 'disputed' | 'stale'
      corroborationCount: number
    }
    const submissionTemplates: SubmissionTemplate[] = [
      {
        idx: 0,
        userId: FAKE_USER_IDS.jess,
        priceMin: '35.00',
        priceMax: '55.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 2,
      },
      {
        idx: 1,
        userId: FAKE_USER_IDS.marco,
        priceMin: '45.00',
        priceMax: '75.00',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'saw_listing',
        status: 'corroborated',
        corroborationCount: 1,
      },
      {
        idx: 2,
        userId: FAKE_USER_IDS.jess,
        priceMin: '120.00',
        priceMax: '200.00',
        tier: 'VIP',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'pending',
        corroborationCount: 0,
      },
      {
        idx: 3,
        userId: FAKE_USER_IDS.marco,
        priceMin: '25.00',
        tier: 'GA',
        vendor: 'SeatGeek',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      {
        idx: 4,
        userId: FAKE_USER_IDS.hugh,
        priceMin: '30.00',
        priceMax: '45.00',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        status: 'disputed',
        corroborationCount: 0,
      },
      {
        idx: 5,
        userId: FAKE_USER_IDS.jess,
        priceMin: '50.00',
        priceMax: '80.00',
        tier: 'Reserved',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      {
        idx: 6,
        userId: FAKE_USER_IDS.marco,
        priceMin: '22.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'at_the_venue',
        status: 'pending',
        corroborationCount: 0,
      },
      {
        idx: 7,
        userId: FAKE_USER_IDS.hugh,
        priceMin: '65.00',
        priceMax: '120.00',
        tier: 'VIP',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 1,
      },
      {
        idx: 8,
        userId: FAKE_USER_IDS.jess,
        priceMin: '18.00',
        tier: 'GA',
        vendor: 'Eventbrite',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      {
        idx: 9,
        userId: FAKE_USER_IDS.marco,
        priceMin: '40.00',
        priceMax: '60.00',
        tier: 'GA',
        vendor: 'SeatGeek',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      // Stale submission — tests the stale status display in admin
      {
        idx: 0,
        userId: FAKE_USER_IDS.jess,
        priceMin: '28.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'stale',
        corroborationCount: 0,
      },
    ]
    const submissionRows = submissionTemplates
      .filter(({ idx }) => eventIds[idx] !== undefined)
      .map(({ idx, ...rest }) => ({
        ...rest,
        eventId: eventIds[idx] as string,
      }))

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

      // Link the disputed submission to the first corroborated submission
      const disputedSub = insertedSubmissions.find(
        (sub) => sub.status === 'disputed',
      )
      const targetSub = insertedSubmissions.find(
        (sub) => sub.status === 'corroborated',
      )
      if (disputedSub && targetSub) {
        await db
          .update(priceSubmissions)
          .set({ disputedSubmissionId: targetSub.id })
          .where(eq(priceSubmissions.id, disputedSub.id))
      }

      // Corroboration rows for the corroborated submissions
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

    // --- Test events for UI state coverage ---
    // These use [Test] prefix to avoid collisions with real staging events
    const venueForTests = insertedVenues[0]
    if (venueForTests) {
      const testEventRows = [
        {
          venueId: venueForTests.id,
          title: '[Test] Cancelled Show',
          artist: '[Test] Cancelled Artist',
          date: '2026-09-10',
          status: 'cancelled' as const,
        },
        {
          venueId: venueForTests.id,
          title: '[Test] Postponed Show',
          artist: '[Test] Postponed Artist',
          date: '2026-09-15',
          status: 'postponed' as const,
        },
        {
          venueId: venueForTests.id,
          title: '[Test] Show With Setlist',
          artist: '[Test] Setlist Artist',
          date: '2026-09-20',
          status: 'upcoming' as const,
          confidenceScore: '0.92',
          setlist: {
            songs: [
              'Opening Track',
              'Second Song',
              'Fan Favorite',
              'Deep Cut',
              'Popular Hit',
              'Slow Ballad',
            ],
            encore: ['Classic Closer', 'Surprise Cover'],
            source: 'Setlist.fm',
            when: 'last tour',
          },
        },
        {
          venueId: venueForTests.id,
          title: '[Test] Low Confidence Event',
          artist: '[Test] Low Confidence Artist',
          date: '2026-09-25',
          status: 'upcoming' as const,
          confidenceScore: '0.45',
        },
      ]
      await db.insert(eventsTable).values(testEventRows).onConflictDoNothing()
      console.warn(
        `Inserted ${testEventRows.length} test events for UI state coverage.`,
      )
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
