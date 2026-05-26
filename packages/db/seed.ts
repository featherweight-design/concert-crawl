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
  eventReports,
  eventReportConfirms,
  feedback,
  notifications,
  waitlistEntries,
  auditLog,
  type NewVenue,
} from './src/schema/index.js'

// ---------------------------------------------------------------------------
// Venues — synced from staging 2026-05-21, 13 total
// ---------------------------------------------------------------------------
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
    crawlMode: 'browser',
    crawlWaitUntil: 'load' as const,
    address: '18300 W Alameda Pkwy, Morrison, CO 80465',
    capacity: 9525,
    venueType: 'Amphitheater',
    neighborhood: 'Morrison',
    featured: true,
    lat: 39.6654,
    lng: -105.2057,
    ticketVendor: 'axs' as const,
    about:
      "Red Rocks is the real deal—natural acoustics carved into 300-million-year-old rock formations. Every show here hits different. If you're seeing something at Red Rocks, you're not just going to a concert.",
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
    crawlMode: 'browser',
    crawlWaitUntil: 'networkidle' as const,
    address: '935 E Colfax Ave, Denver, CO 80218',
    capacity: 1600,
    venueType: 'Theater',
    neighborhood: 'Capitol Hill',
    lat: 39.7319,
    lng: -104.98,
    ticketVendor: 'axs' as const,
    about:
      "Historic 1917 theater with killer acoustics and a real stage. The room that made Denver's mid-size show scene what it is.",
  },
  {
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    websiteUrl: 'https://missionballroom.com/upcoming-events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'browser',
    crawlWaitUntil: 'networkidle' as const,
    address: '4242 Wynkoop St, Denver, CO 80211',
    capacity: 4000,
    venueType: 'Ballroom',
    neighborhood: 'RiNo',
    lat: 39.7639,
    lng: -104.9728,
    ticketVendor: 'axs' as const,
    about:
      'Mid-size room in the Source Market Hall complex that books solid mid-tier acts. Good sightlines, decent sound. Where bands go between Red Rocks and smaller clubs.',
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
    crawlMode: 'browser',
    crawlWaitUntil: 'load' as const,
    address: '3317 E Colfax Ave, Denver, CO 80206',
    capacity: 400,
    venueType: 'Theater',
    neighborhood: 'Capitol Hill',
    lat: 39.7313,
    lng: -104.9719,
    ticketVendor: 'axs' as const,
    about:
      "Intimate mid-size room on Colfax with solid sound and real history. Where Denver's indie and alt acts actually want to play.",
  },
  {
    name: 'Gothic Theatre',
    slug: 'gothic-theatre',
    websiteUrl: 'https://www.gothictheatre.com/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 6000,
    crawlMode: 'browser',
    crawlWaitUntil: 'load' as const,
    crawlWaitForSelector: '.c-axs-event-card__wrapper',
    address: '3263 S Broadway, Englewood, CO 80113',
    capacity: 1650,
    venueType: 'Theater',
    neighborhood: 'South Broadway',
    lat: 39.6491,
    lng: -104.9885,
    ticketVendor: 'axs' as const,
    about:
      'Historic 1923 theater with ornate balcony and killer sightlines. Mid-sized room that books solid touring acts and local heavyweights—intimate enough to feel real, big enough to matter.',
  },
  {
    name: "Cervantes' Masterpiece Ballroom",
    slug: 'cervantes-masterpiece-ballroom',
    websiteUrl: 'https://cervantesmasterpiece.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    address: '2637 Welton St, Denver, CO 80205',
    capacity: 1200,
    venueType: 'Ballroom',
    neighborhood: 'Five Points',
    lat: 39.7606,
    lng: -104.9818,
    ticketVendor: 'unknown' as const,
    about:
      "Two-room setup that's hosted everything from punk to funk since the '90s. The kind of place where you actually see the band instead of squinting at a screen.",
  },
  {
    name: 'Summit Music Hall',
    slug: 'summit-music-hall',
    websiteUrl: 'https://www.summitdenver.com/shows',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'networkidle' as const,
    address: '1902 Blake St, Denver, CO 80202',
    capacity: 1200,
    venueType: 'Music Hall',
    neighborhood: 'LoDo',
    lat: 39.7531,
    lng: -104.9971,
    ticketVendor: 'ticketmaster' as const,
    about:
      "Two-stage venue where mid-tier acts actually breathe. The main room's got real sound; the upstairs books what's about to blow up. Denver's reliable workhorse for the in-between shows.",
  },
  {
    name: 'The Fillmore Auditorium',
    slug: 'fillmore-auditorium',
    websiteUrl: 'https://www.fillmoredenver.com/shows',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'networkidle' as const,
    address: '1510 Clarkson St, Denver, CO 80218',
    capacity: 3800,
    venueType: 'Auditorium',
    neighborhood: 'Capitol Hill',
    lat: 39.7333,
    lng: -104.9789,
    ticketVendor: 'ticketmaster' as const,
    about:
      "Mid-size room that books solid mid-tier acts and the occasional arena-level name. Historic space that's been hosting Denver shows since forever. Not too big, not too small.",
  },
  {
    name: 'Marquis Theater',
    slug: 'marquis-theater',
    websiteUrl: 'https://www.marquisdenver.com/shows',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'networkidle' as const,
    address: '2009 Larimer St, Denver, CO 80205',
    capacity: 1200,
    venueType: 'Theater',
    neighborhood: 'LoDo',
    lat: 39.7502,
    lng: -104.9967,
    ticketVendor: 'ticketmaster' as const,
    about:
      'Historic theater on Larimer with decent sound and sightlines. Books mid-tier touring acts and local favorites. The kind of room where you can actually hear the band.',
  },
  {
    name: "Fiddler's Green Amphitheatre",
    slug: 'fiddlers-green-amphitheatre',
    websiteUrl: 'https://www.fiddlersgreenamp.com/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'browser',
    crawlWaitUntil: 'load' as const,
    address: '6350 Greenwood Plaza Blvd, Greenwood Village, CO 80111',
    capacity: 18000,
    venueType: 'Amphitheater',
    neighborhood: 'Greenwood Village',
    lat: 39.5934,
    lng: -104.8915,
    ticketVendor: 'axs' as const,
    about:
      "Massive outdoor shed in the south suburbs. Books the acts that need real capacity—think mid-to-major touring bands. Weather-dependent, but the sound's solid and parking doesn't suck.",
  },
  {
    name: 'Hi-Dive',
    slug: 'hi-dive',
    websiteUrl: 'https://hi-dive.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'browser',
    crawlWaitUntil: 'networkidle' as const,
    capacity: 200,
    venueType: 'Bar',
    neighborhood: 'South Broadway',
    lat: 39.7025,
    lng: -104.9885,
    ticketVendor: 'dice' as const,
    about:
      'Tiny dive with a killer sound system and zero pretension. Where local bands and touring acts actually want to play because the crowd gets it.',
  },
  {
    name: 'Larimer Lounge',
    slug: 'larimer-lounge',
    websiteUrl: 'https://larimerlounge.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'browser',
    crawlWaitUntil: 'networkidle' as const,
    capacity: 300,
    venueType: 'Bar',
    neighborhood: 'RiNo',
    lat: 39.7561,
    lng: -104.981,
    ticketVendor: 'unknown' as const,
    about:
      'Intimate, historic bar on Larimer Street. Known for indie rock, punk, and alt bookings. Raw, no-frills atmosphere with a strong commitment to local and touring artists.',
  },
  {
    name: 'Levitt Pavilion',
    slug: 'levitt-pavilion',
    websiteUrl: 'https://www.levittdenver.org/free-concert-series#/events',
    city: 'Denver',
    timezone: 'America/Denver',
    active: false,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    capacity: 1200,
    venueType: 'Outdoor Pavilion',
    neighborhood: 'Washington Park',
    lat: 39.6888,
    lng: -105.0197,
    ticketVendor: 'eventbrite' as const,
    about:
      'Free outdoor concerts under the sky. Levitt books solid local and touring acts without gouging your wallet. Summer staple for people who actually want to hear music, not just be seen.',
  },
]

// ---------------------------------------------------------------------------
// Users — 9 users covering all roles and cred tiers
// ---------------------------------------------------------------------------
const FAKE_USER_IDS = {
  hugh: 'user_3CoSI01LtxRAvremTpL0yDfuEJ6',
  jess: 'user_fake_jess_0001',
  marco: 'user_fake_marco_0002',
  amy: 'user_fake_amy_0003',
  ghost: 'user_fake_ghost_0004',
  taylor: 'user_fake_taylor_0005',
  riley: 'user_fake_riley_0006',
  sam: 'user_fake_sam_0007',
  kai: 'user_fake_kai_0008',
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
  {
    userId: FAKE_USER_IDS.taylor,
    handle: 'taylor_w',
    theme: 'bluenote' as const,
    avatarColor: 'signal' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.riley,
    handle: 'riley_v',
    theme: 'drip' as const,
    avatarColor: 'accent' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.sam,
    handle: 'sam_b',
    theme: 'gloss' as const,
    avatarColor: 'warning' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.kai,
    handle: null,
    theme: 'electric' as const,
    avatarColor: null,
    city: null,
  },
]

export const FAKE_USER_ROLES = [
  // admin
  {
    userId: FAKE_USER_IDS.hugh,
    role: 'admin' as const,
    priceCredScore: 150,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  // sub_admins
  {
    userId: FAKE_USER_IDS.amy,
    role: 'sub_admin' as const,
    priceCredScore: 45,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.taylor,
    role: 'sub_admin' as const,
    priceCredScore: 28,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  // power user (high cred)
  {
    userId: FAKE_USER_IDS.riley,
    role: 'user' as const,
    priceCredScore: 75,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  // regular users
  {
    userId: FAKE_USER_IDS.jess,
    role: 'user' as const,
    priceCredScore: 18,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.marco,
    role: 'user' as const,
    priceCredScore: 8,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.sam,
    role: 'user' as const,
    priceCredScore: 3,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  // zero-cred / incomplete profile
  {
    userId: FAKE_USER_IDS.ghost,
    role: 'user' as const,
    priceCredScore: 0,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.kai,
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
  { code: 'BETA-OPEN-AMY', createdBy: FAKE_USER_IDS.amy },
  { code: 'BETA-OPEN-TAY', createdBy: FAKE_USER_IDS.taylor },
  {
    code: 'BETA-USED-J1',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.jess,
    usedAt: new Date(now.getTime() - 14 * 86_400_000),
  },
  {
    code: 'BETA-USED-M2',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.marco,
    usedAt: new Date(now.getTime() - 10 * 86_400_000),
  },
  {
    code: 'BETA-USED-T3',
    createdBy: FAKE_USER_IDS.hugh,
    usedBy: FAKE_USER_IDS.taylor,
    usedAt: new Date(now.getTime() - 7 * 86_400_000),
  },
  {
    code: 'BETA-USED-R4',
    createdBy: FAKE_USER_IDS.amy,
    usedBy: FAKE_USER_IDS.riley,
    usedAt: new Date(now.getTime() - 5 * 86_400_000),
  },
  {
    code: 'BETA-USED-S5',
    createdBy: FAKE_USER_IDS.amy,
    usedBy: FAKE_USER_IDS.sam,
    usedAt: new Date(now.getTime() - 2 * 86_400_000),
  },
]

// ---------------------------------------------------------------------------
// Feedback — all 6 statuses × all 4 categories, some with adminNotes/issueUrl
// ---------------------------------------------------------------------------
export const SEED_FEEDBACK = [
  // unread
  {
    userId: FAKE_USER_IDS.riley,
    pageUrl: '/browse',
    category: 'bug' as const,
    message: 'Price tag shows "$null" for some shows in the list view.',
    status: 'unread' as const,
  },
  {
    userId: FAKE_USER_IDS.sam,
    pageUrl: '/events/[slug]',
    category: 'bug' as const,
    message:
      "Tapping 'I'm going' on mobile does nothing — button never toggles state.",
    status: 'unread' as const,
  },
  {
    userId: FAKE_USER_IDS.kai,
    pageUrl: '/browse',
    category: 'idea' as const,
    message: "Would love a 'Near me this weekend' quick filter.",
    status: 'unread' as const,
  },
  // read
  {
    userId: FAKE_USER_IDS.jess,
    pageUrl: '/browse',
    category: 'bug' as const,
    message: 'Filter chips disappear on mobile when scrolled down.',
    status: 'read' as const,
  },
  {
    userId: FAKE_USER_IDS.marco,
    pageUrl: '/browse',
    category: 'bug' as const,
    message:
      'Calendar view shows wrong month when switching back from list view.',
    status: 'read' as const,
  },
  {
    userId: FAKE_USER_IDS.taylor,
    pageUrl: '/admin/prices',
    category: 'idea' as const,
    message:
      'Bulk-approve corroborated submissions from the price table would save a lot of time.',
    status: 'read' as const,
  },
  // flagged
  {
    userId: FAKE_USER_IDS.riley,
    pageUrl: '/submit-price',
    category: 'bug' as const,
    message:
      'Submitted a price for Gothic Theatre show and got a 500. Had to retry 3 times.',
    status: 'flagged' as const,
    adminNotes:
      'Reproduced locally — priceMax validation rejects undefined. Fix before beta opens.',
  },
  {
    userId: FAKE_USER_IDS.jess,
    pageUrl: '/browse',
    category: 'idea' as const,
    message: "Can we add a 'shows this weekend' quick filter?",
    status: 'flagged' as const,
    adminNotes: 'Good idea — punt to Phase 5b polish.',
  },
  // issue_opened
  {
    userId: FAKE_USER_IDS.marco,
    pageUrl: '/',
    category: 'bug' as const,
    message:
      'Homepage hero image overlaps the nav bar on 13" MacBook at 125% zoom.',
    status: 'issue_opened' as const,
    adminNotes: 'Filed as #361.',
    issueUrl: 'https://github.com/HartiganHM/concert-crawl/issues/361',
  },
  {
    userId: FAKE_USER_IDS.taylor,
    pageUrl: '/admin/venues',
    category: 'idea' as const,
    message: 'Would be great to bulk-trigger crawls from the venues table.',
    status: 'issue_opened' as const,
    adminNotes: 'Filed as #362 for Phase 6 admin polish.',
    issueUrl: 'https://github.com/HartiganHM/concert-crawl/issues/362',
  },
  // resolved
  {
    userId: FAKE_USER_IDS.marco,
    pageUrl: '/',
    category: 'praise' as const,
    message: 'The generative art for each venue is such a nice touch.',
    status: 'resolved' as const,
    adminNotes: 'Noted for the design archive.',
  },
  {
    userId: FAKE_USER_IDS.riley,
    pageUrl: '/events/[slug]',
    category: 'bug' as const,
    message: "Setlist wasn't showing on the event detail page for Khruangbin.",
    status: 'resolved' as const,
    adminNotes: 'Fixed in PR #412 — JSON-LD missing setlist key.',
  },
  // archived
  {
    userId: FAKE_USER_IDS.amy,
    pageUrl: '/admin',
    category: 'praise' as const,
    message: 'Admin crawl health view is super useful.',
    status: 'archived' as const,
  },
  {
    userId: FAKE_USER_IDS.ghost,
    pageUrl: '/browse',
    category: 'other' as const,
    message: "Why can't I see Levitt shows?",
    status: 'archived' as const,
    adminNotes: 'Levitt is inactive for winter — explained in FAQ. Archived.',
  },
]

// ---------------------------------------------------------------------------
// Notifications — unread + read, all admin_alert categories
// ---------------------------------------------------------------------------
export const SEED_NOTIFICATIONS = [
  // Unread (actionable)
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
    category: 'crawl.failed',
    title: 'Crawl failed: Larimer Lounge',
    body: '3 consecutive failures. Venue paused automatically.',
    actionUrl: '/admin/venues/larimer-lounge',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.low_confidence',
    title: "Low-confidence events: Cervantes' Masterpiece Ballroom",
    body: '6 events extracted with confidence score below 0.7.',
    actionUrl:
      '/admin/events?venueSlug=cervantes-masterpiece-ballroom&confidence=low',
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'price.disputed',
    title: 'Price disputed: Mission Ballroom',
    body: 'A community submission was flagged as inaccurate by 2 users.',
    actionUrl: '/admin/prices',
  },
  // Read
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.low_confidence',
    title: 'Low-confidence events: Ogden Theatre',
    body: '4 events extracted with confidence score below 0.7.',
    actionUrl: '/admin/events?venueSlug=ogden-theatre&confidence=low',
    readAt: new Date(now.getTime() - 86_400_000),
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.low_confidence',
    title: 'Low-confidence events: Mission Ballroom',
    body: '2 events extracted with confidence score below 0.7.',
    actionUrl: '/admin/events?venueSlug=mission-ballroom&confidence=low',
    readAt: new Date(now.getTime() - 2 * 86_400_000),
  },
  {
    userId: FAKE_USER_IDS.hugh,
    type: 'admin_alert' as const,
    category: 'crawl.restored',
    title: 'Venue restored: Bluebird Theater',
    body: 'Crawl succeeded after previous failures. Venue is active again.',
    actionUrl: '/admin/venues/bluebird-theater',
    readAt: new Date(now.getTime() - 3 * 86_400_000),
  },
  {
    userId: FAKE_USER_IDS.amy,
    type: 'admin_alert' as const,
    category: 'crawl.failed',
    title: 'Crawl failed: Bluebird Theater',
    body: '3 consecutive failures. Venue paused automatically.',
    actionUrl: '/admin/venues/bluebird-theater',
    readAt: new Date(now.getTime() - 4 * 86_400_000),
  },
]

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.warn('Seeding database...')

  // Venues — upsert so re-runs pick up data changes
  await db
    .insert(venues)
    .values(SEED_VENUES)
    .onConflictDoUpdate({
      target: venues.slug,
      set: {
        name: sql`excluded.name`,
        websiteUrl: sql`excluded.website_url`,
        address: sql`COALESCE(venues.address, excluded.address)`,
        capacity: sql`excluded.capacity`,
        venueType: sql`excluded.venue_type`,
        neighborhood: sql`excluded.neighborhood`,
        about: sql`excluded.about`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        ticketVendor: sql`excluded.ticket_vendor`,
        crawlMode: sql`excluded.crawl_mode`,
        crawlWaitUntil: sql`excluded.crawl_wait_until`,
        crawlWaitForSelector: sql`excluded.crawl_wait_for_selector`,
        crawlDelayMs: sql`excluded.crawl_delay_ms`,
        featured: sql`excluded.featured`,
        active: sql`excluded.active`,
        verified: sql`excluded.verified`,
      },
    })

  console.warn(`Upserted ${SEED_VENUES.length} venues.`)

  const insertedVenues = await db.select().from(venues)
  const venueBySlug = Object.fromEntries(
    insertedVenues.map((vn) => [vn.slug, vn]),
  )

  // Events — only seed if none exist
  const existingEventsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
  const hasEvents = (existingEventsCount[0]?.count ?? 0) > 0

  if (!hasEvents) {
    type EventRow = {
      venueSlug: string
      title: string
      artist: string
      date: string
      showTime?: string
      ticketUrl?: string
      ticketPriceMin?: string
      ticketPriceMax?: string
      priceSource?:
        | 'structured_data'
        | 'ticketmaster'
        | 'eventbrite'
        | 'dice'
        | 'songkick'
        | 'bandsintown'
        | 'seatgeek'
        | 'community'
      genre?: string[]
      status?: 'upcoming' | 'cancelled' | 'postponed'
      confidenceScore?: string
      verified?: boolean
    }

    // Representative real events from staging, 3–5 per venue
    const SAMPLE_EVENTS: EventRow[] = [
      // --- Red Rocks ---
      {
        venueSlug: 'red-rocks-amphitheatre',
        title: 'Radiohead at Red Rocks',
        artist: 'Radiohead',
        date: '2026-06-12',
        showTime: '19:30',
        ticketPriceMin: '75.00',
        ticketPriceMax: '150.00',
        priceSource: 'structured_data',
        genre: ['alternative', 'rock'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'red-rocks-amphitheatre',
        title: 'Khruangbin at Red Rocks',
        artist: 'Khruangbin',
        date: '2026-07-04',
        showTime: '20:00',
        ticketPriceMin: '65.00',
        ticketPriceMax: '120.00',
        priceSource: 'structured_data',
        genre: ['indie', 'psychedelic'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'red-rocks-amphitheatre',
        title: 'Phish at Red Rocks',
        artist: 'Phish',
        date: '2026-08-10',
        showTime: '19:00',
        ticketPriceMin: '85.00',
        ticketPriceMax: '175.00',
        priceSource: 'structured_data',
        genre: ['jam', 'rock'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'red-rocks-amphitheatre',
        title: 'Tame Impala at Red Rocks',
        artist: 'Tame Impala',
        date: '2026-09-05',
        showTime: '19:30',
        genre: ['psychedelic', 'indie'],
        confidenceScore: '0.90',
        verified: false,
      },
      {
        venueSlug: 'red-rocks-amphitheatre',
        title: 'LCD Soundsystem at Red Rocks',
        artist: 'LCD Soundsystem',
        date: '2026-10-01',
        showTime: '19:00',
        genre: ['electronic', 'indie'],
        confidenceScore: '0.88',
        verified: false,
      },
      // --- Ogden Theatre ---
      {
        venueSlug: 'ogden-theatre',
        title: 'Soccer Mommy',
        artist: 'Soccer Mommy',
        date: '2026-06-05',
        showTime: '20:00',
        ticketPriceMin: '28.00',
        ticketPriceMax: '38.00',
        priceSource: 'structured_data',
        genre: ['indie', 'alternative'],
        confidenceScore: '0.92',
        verified: true,
      },
      {
        venueSlug: 'ogden-theatre',
        title: 'Big Thief',
        artist: 'Big Thief',
        date: '2026-07-15',
        showTime: '20:00',
        ticketPriceMin: '35.00',
        ticketPriceMax: '50.00',
        priceSource: 'structured_data',
        genre: ['indie', 'folk'],
        confidenceScore: '0.92',
        verified: true,
      },
      {
        venueSlug: 'ogden-theatre',
        title: 'Phoebe Bridgers',
        artist: 'Phoebe Bridgers',
        date: '2026-08-20',
        showTime: '20:00',
        genre: ['indie', 'folk'],
        confidenceScore: '0.68',
        verified: false,
      },
      {
        venueSlug: 'ogden-theatre',
        title: 'Snail Mail',
        artist: 'Snail Mail',
        date: '2026-09-18',
        showTime: '20:00',
        ticketPriceMin: '30.00',
        priceSource: 'structured_data',
        genre: ['indie', 'alternative'],
        confidenceScore: '0.90',
        verified: true,
      },
      // --- Mission Ballroom ---
      {
        venueSlug: 'mission-ballroom',
        title: 'Bon Iver',
        artist: 'Bon Iver',
        date: '2026-06-18',
        showTime: '19:30',
        ticketPriceMin: '55.00',
        ticketPriceMax: '95.00',
        priceSource: 'structured_data',
        genre: ['indie', 'folk'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'mission-ballroom',
        title: 'St. Vincent',
        artist: 'St. Vincent',
        date: '2026-07-25',
        showTime: '20:00',
        ticketPriceMin: '48.00',
        ticketPriceMax: '80.00',
        priceSource: 'structured_data',
        genre: ['indie', 'rock'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'mission-ballroom',
        title: 'Japanese Breakfast',
        artist: 'Japanese Breakfast',
        date: '2026-08-14',
        showTime: '20:00',
        genre: ['indie', 'pop'],
        confidenceScore: '0.88',
        verified: false,
      },
      {
        venueSlug: 'mission-ballroom',
        title: 'Fleet Foxes',
        artist: 'Fleet Foxes',
        date: '2026-09-12',
        showTime: '19:30',
        ticketPriceMin: '60.00',
        ticketPriceMax: '100.00',
        priceSource: 'structured_data',
        genre: ['folk', 'indie'],
        confidenceScore: '0.93',
        verified: true,
      },
      // --- Bluebird Theater ---
      {
        venueSlug: 'bluebird-theater',
        title: 'hemlocke springs the apple tree under the sea tour',
        artist: 'hemlocke springs',
        date: '2026-05-26',
        showTime: '20:00',
        genre: ['indie', 'alternative'],
        confidenceScore: '0.90',
        verified: false,
      },
      {
        venueSlug: 'bluebird-theater',
        title: 'Swervedriver',
        artist: 'Swervedriver',
        date: '2026-05-27',
        showTime: '20:00',
        genre: ['rock', 'alternative'],
        confidenceScore: '0.90',
        verified: false,
      },
      {
        venueSlug: 'bluebird-theater',
        title: 'The Slackers',
        artist: 'The Slackers',
        date: '2026-06-07',
        showTime: '20:00',
        genre: ['ska', 'reggae'],
        confidenceScore: '0.90',
        verified: false,
      },
      {
        venueSlug: 'bluebird-theater',
        title: 'of Montreal',
        artist: 'of Montreal',
        date: '2026-07-24',
        showTime: '20:00',
        genre: ['indie', 'pop'],
        confidenceScore: '0.90',
        verified: false,
      },
      {
        venueSlug: 'bluebird-theater',
        title: 'Wunderhorse North America 2026',
        artist: 'Wunderhorse',
        date: '2026-08-04',
        showTime: '20:30',
        genre: ['rock', 'indie'],
        confidenceScore: '0.90',
        verified: false,
      },
      // --- Gothic Theatre ---
      {
        venueSlug: 'gothic-theatre',
        title: 'Seven Lions OFFICIAL RED ROCKS AFTER PARTY',
        artist: 'Seven Lions',
        date: '2026-05-22',
        showTime: '23:45',
        ticketUrl: 'https://www.gothictheatre.com/calendar/',
        genre: ['electronic'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'gothic-theatre',
        title: 'Clara La San Chosen Silences Tour 2026',
        artist: 'Clara La San',
        date: '2026-05-27',
        showTime: '20:00',
        ticketUrl: 'https://www.gothictheatre.com/calendar/',
        genre: ['indie'],
        confidenceScore: '0.90',
        verified: true,
      },
      {
        venueSlug: 'gothic-theatre',
        title: 'Tigers Jaw',
        artist: 'Tigers Jaw',
        date: '2026-06-16',
        showTime: '20:00',
        ticketUrl: 'https://www.gothictheatre.com/calendar/',
        genre: ['indie'],
        confidenceScore: '0.90',
        verified: true,
      },
      {
        venueSlug: 'gothic-theatre',
        title: 'POND TERRESTRIALS TOUR - NORTH AMERICA 2026',
        artist: 'POND',
        date: '2026-09-12',
        showTime: '20:00',
        ticketUrl: 'https://www.gothictheatre.com/calendar/',
        genre: ['indie', 'psychedelic'],
        confidenceScore: '0.85',
        verified: true,
      },
      // --- Cervantes' ---
      {
        venueSlug: 'cervantes-masterpiece-ballroom',
        title: 'Wooden Wisdom Ft. Elijah Wood & Zach Cowie',
        artist: 'Wooden Wisdom',
        date: '2026-05-31',
        showTime: '20:00',
        genre: ['indie', 'folk'],
        confidenceScore: '0.90',
        verified: true,
      },
      {
        venueSlug: 'cervantes-masterpiece-ballroom',
        title: 'Bronwyn Keith-Hynes ft. special guest Andy Hall',
        artist: 'Bronwyn Keith-Hynes',
        date: '2026-06-04',
        showTime: '19:00',
        genre: ['bluegrass', 'folk'],
        confidenceScore: '0.90',
        verified: false,
      },
      // --- Fiddler's Green ---
      {
        venueSlug: 'fiddlers-green-amphitheatre',
        title: 'Tyler Childers - Snipe Hunt with Jon Batiste',
        artist: 'Tyler Childers',
        date: '2026-07-18',
        showTime: '18:30',
        ticketUrl: 'https://www.fiddlersgreenamp.com/calendar/',
        ticketPriceMin: '65.00',
        ticketPriceMax: '125.00',
        priceSource: 'structured_data',
        genre: ['country', 'folk'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'fiddlers-green-amphitheatre',
        title: 'Muse - The Wow! Signal Tour',
        artist: 'Muse',
        date: '2026-08-18',
        showTime: '19:30',
        ticketUrl: 'https://www.fiddlersgreenamp.com/calendar/',
        ticketPriceMin: '55.00',
        ticketPriceMax: '180.00',
        priceSource: 'structured_data',
        genre: ['rock', 'alternative'],
        confidenceScore: '0.95',
        verified: true,
      },
      {
        venueSlug: 'fiddlers-green-amphitheatre',
        title: 'Dave Matthews Band',
        artist: 'Dave Matthews Band',
        date: '2026-08-28',
        showTime: '19:30',
        genre: ['rock', 'funk'],
        confidenceScore: '0.95',
        verified: false,
      },
      // --- Fillmore Auditorium ---
      {
        venueSlug: 'fillmore-auditorium',
        title:
          'ALL THE FEELINGS TOUR with METRIC, BROKEN SOCIAL SCENE, AND STARS',
        artist: 'Metric',
        date: '2026-06-11',
        showTime: '17:30',
        ticketUrl:
          'https://www.ticketmaster.com/all-the-feelings-tour-with-metric-denver-colorado-06-11-2026/event/1E00643CD10B9AC7',
        genre: ['indie', 'rock'],
        confidenceScore: '1.00',
        verified: true,
      },
      {
        venueSlug: 'fillmore-auditorium',
        title: 'Chance The Rapper - Coloring Book 10 Year Anniversary Tour',
        artist: 'Chance The Rapper',
        date: '2026-10-01',
        showTime: '19:00',
        ticketUrl:
          'https://www.ticketmaster.com/chance-the-rapper-coloring-book-10-denver-colorado-10-01-2026/event/1E0064AC16123FA7',
        genre: ['hip-hop', 'rap'],
        confidenceScore: '1.00',
        verified: true,
      },
      {
        venueSlug: 'fillmore-auditorium',
        title: 'Beartooth: Pure Ecstasy World Tour',
        artist: 'Beartooth',
        date: '2026-12-12',
        showTime: '17:00',
        ticketUrl:
          'https://www.ticketmaster.com/beartooth-pure-ecstasy-world-tour-denver-colorado-12-12-2026/event/1E0064ACE8D5E3F3',
        genre: ['metal'],
        confidenceScore: '1.00',
        verified: true,
      },
      // --- Marquis Theater ---
      {
        venueSlug: 'marquis-theater',
        title: 'Modest Mouse',
        artist: 'Modest Mouse',
        date: '2026-06-20',
        showTime: '20:00',
        ticketPriceMin: '32.00',
        ticketPriceMax: '45.00',
        priceSource: 'ticketmaster',
        genre: ['indie', 'alternative'],
        confidenceScore: '0.92',
        verified: true,
      },
      {
        venueSlug: 'marquis-theater',
        title: 'Explosions in the Sky',
        artist: 'Explosions in the Sky',
        date: '2026-07-10',
        showTime: '20:00',
        genre: ['post-rock', 'instrumental'],
        confidenceScore: '0.88',
        verified: false,
      },
      // --- Summit Music Hall ---
      {
        venueSlug: 'summit-music-hall',
        title: 'Turnstile',
        artist: 'Turnstile',
        date: '2026-06-25',
        showTime: '20:00',
        ticketPriceMin: '30.00',
        ticketPriceMax: '45.00',
        priceSource: 'ticketmaster',
        genre: ['hardcore', 'punk'],
        confidenceScore: '0.92',
        verified: true,
      },
      {
        venueSlug: 'summit-music-hall',
        title: 'Alvvays',
        artist: 'Alvvays',
        date: '2026-08-06',
        showTime: '20:00',
        genre: ['indie', 'dream-pop'],
        confidenceScore: '0.88',
        verified: false,
      },
      // --- Hi-Dive ---
      {
        venueSlug: 'hi-dive',
        title: 'Wet Leg',
        artist: 'Wet Leg',
        date: '2026-05-28',
        showTime: '20:00',
        ticketPriceMin: '18.00',
        ticketPriceMax: '22.00',
        priceSource: 'dice',
        genre: ['indie', 'rock'],
        confidenceScore: '0.88',
        verified: true,
      },
      {
        venueSlug: 'hi-dive',
        title: 'Amyl and the Sniffers',
        artist: 'Amyl and the Sniffers',
        date: '2026-06-14',
        showTime: '20:00',
        genre: ['punk', 'rock'],
        confidenceScore: '0.85',
        verified: false,
      },
      // --- Larimer Lounge ---
      {
        venueSlug: 'larimer-lounge',
        title: 'Wednesday',
        artist: 'Wednesday',
        date: '2026-05-30',
        showTime: '21:00',
        genre: ['country', 'noise'],
        confidenceScore: '0.85',
        verified: false,
      },
      {
        venueSlug: 'larimer-lounge',
        title: 'Julia Jacklin',
        artist: 'Julia Jacklin',
        date: '2026-06-22',
        showTime: '21:00',
        genre: ['indie', 'folk'],
        confidenceScore: '0.82',
        verified: false,
      },
    ]

    const sampleEventRows = SAMPLE_EVENTS.flatMap((ev) => {
      const venue = venueBySlug[ev.venueSlug]
      if (!venue) return []
      return [
        {
          venueId: venue.id,
          title: ev.title,
          artist: ev.artist,
          date: ev.date,
          showTime: ev.showTime ?? null,
          ticketUrl: ev.ticketUrl ?? null,
          ticketPriceMin: ev.ticketPriceMin ?? null,
          ticketPriceMax: ev.ticketPriceMax ?? null,
          priceSource: ev.priceSource ?? null,
          genre: ev.genre ?? null,
          status: (ev.status ?? 'upcoming') as
            | 'upcoming'
            | 'cancelled'
            | 'postponed',
          confidenceScore: ev.confidenceScore ?? null,
          verified: ev.verified ?? false,
        },
      ]
    })

    const insertedEvents = await db
      .insert(eventsTable)
      .values(sampleEventRows)
      .returning()
    console.warn(`Inserted ${insertedEvents.length} events.`)

    // Price retrieval log
    const OUTCOMES = ['hit', 'miss', 'error'] as const
    const SOURCES = ['structured_data', 'ticketmaster', 'seatgeek'] as const
    const LATENCIES_MS = [120, 340, 85]

    const logEntries = insertedEvents.flatMap((event) =>
      Array.from({ length: 3 }, (_unused, attemptIdx) => ({
        eventId: event.id,
        venueId: event.venueId as string,
        source: SOURCES[attemptIdx % SOURCES.length],
        outcome: OUTCOMES[attemptIdx % OUTCOMES.length],
        latencyMs: LATENCIES_MS[attemptIdx % LATENCIES_MS.length],
        attemptedAt: new Date(Date.now() - attemptIdx * 3_600_000),
      })),
    )

    await db.insert(priceRetrievalLog).values(logEntries)
    console.warn(`Inserted ${logEntries.length} price retrieval log entries.`)

    // Test events for UI state coverage
    const venueForTests = venueBySlug['red-rocks-amphitheatre']
    if (venueForTests) {
      await db
        .insert(eventsTable)
        .values([
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
        ])
        .onConflictDoNothing()
      console.warn('Inserted 4 test events for UI state coverage.')
    }
  } else {
    console.warn('Events already seeded, skipping.')
  }

  // User profiles
  await db.insert(userProfiles).values(FAKE_USER_PROFILES).onConflictDoNothing()
  console.warn(`Inserted ${FAKE_USER_PROFILES.length} user profiles.`)

  // User roles — only insert missing
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

  // Invite codes
  await db
    .insert(inviteCodes)
    .values(SEED_INVITE_CODES)
    .onConflictDoNothing({ target: inviteCodes.code })
  console.warn(`Inserted ${SEED_INVITE_CODES.length} invite codes.`)

  // Waitlist
  await db
    .insert(waitlistEntries)
    .values(
      Array.from({ length: 12 }, (_unused, idx) => ({
        email: `test+${idx + 1}@example.com`,
      })),
    )
    .onConflictDoNothing({ target: waitlistEntries.email })
  console.warn('Inserted 12 waitlist entries.')

  // Feedback
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

  // Notifications
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

  // -------------------------------------------------------------------------
  // Event-linked data
  // -------------------------------------------------------------------------
  const recentEvents = await db
    .select({ id: eventsTable.id, venueId: eventsTable.venueId })
    .from(eventsTable)
    .orderBy(desc(eventsTable.date))
    .limit(50)

  if (recentEvents.length === 0) {
    console.warn(
      'No events found — skipping user_events, price_submissions, submission_confirms.',
    )
  } else {
    const eventIds = recentEvents.map((evt) => evt.id)

    // User events
    const userEventRows = [
      // Hugh
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[0]!,
        status: 'watching' as const,
        savedPrice: '75.00',
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[1]!,
        status: 'going' as const,
        savedPrice: '65.00',
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[2]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[5]!,
        status: 'interested' as const,
      },
      // jess
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[3]!,
        status: 'watching' as const,
        savedPrice: '28.00',
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[4]!,
        status: 'going' as const,
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[6]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[10]!,
        status: 'watching' as const,
      },
      // marco
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[7]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[8]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[11]!,
        status: 'watching' as const,
      },
      // amy
      {
        userId: FAKE_USER_IDS.amy,
        eventId: eventIds[9]!,
        status: 'going' as const,
        savedPrice: '55.00',
      },
      {
        userId: FAKE_USER_IDS.amy,
        eventId: eventIds[12]!,
        status: 'watching' as const,
      },
      // taylor
      {
        userId: FAKE_USER_IDS.taylor,
        eventId: eventIds[13]!,
        status: 'going' as const,
      },
      {
        userId: FAKE_USER_IDS.taylor,
        eventId: eventIds[14]!,
        status: 'watching' as const,
        savedPrice: '35.00',
      },
      {
        userId: FAKE_USER_IDS.taylor,
        eventId: eventIds[15]!,
        status: 'interested' as const,
      },
      // riley — power user
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[0]!,
        status: 'going' as const,
        savedPrice: '85.00',
      },
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[2]!,
        status: 'going' as const,
      },
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[3]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[5]!,
        status: 'going' as const,
        savedPrice: '65.00',
      },
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[7]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[9]!,
        status: 'watching' as const,
      },
      // sam
      {
        userId: FAKE_USER_IDS.sam,
        eventId: eventIds[4]!,
        status: 'interested' as const,
      },
      {
        userId: FAKE_USER_IDS.sam,
        eventId: eventIds[16]!,
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

    // -----------------------------------------------------------------------
    // Price submissions — comprehensive coverage
    //   Tiers:    GA ✓  Reserved ✓  VIP ✓  Pit ✓  Lawn ✓
    //   Vendors:  AXS ✓  Ticketmaster ✓  SeatGeek ✓  DICE ✓  Eventbrite ✓  VenueBoxOffice ✓
    //   HowFound: bought_myself ✓  saw_listing ✓  at_the_venue ✓
    //   Status:   corroborated (high/low count) ✓  pending ✓  disputed ✓  stale ✓
    //   Extras:   multiple submissions same event ✓  priceMin-only ✓  priceMin+priceMax ✓
    // -----------------------------------------------------------------------
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
      // Event 0 — three submissions, corroboration chain
      {
        idx: 0,
        userId: FAKE_USER_IDS.jess,
        priceMin: '75.00',
        priceMax: '150.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 4,
      },
      {
        idx: 0,
        userId: FAKE_USER_IDS.riley,
        priceMin: '75.00',
        priceMax: '150.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'corroborated',
        corroborationCount: 2,
      },
      {
        idx: 0,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '220.00',
        priceMax: '350.00',
        tier: 'VIP',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 1,
      },
      // Event 1 — Pit tier + disputed
      {
        idx: 1,
        userId: FAKE_USER_IDS.marco,
        priceMin: '65.00',
        priceMax: '120.00',
        tier: 'Pit',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 2,
      },
      {
        idx: 1,
        userId: FAKE_USER_IDS.sam,
        priceMin: '30.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'disputed',
        corroborationCount: 0,
      },
      // Event 2 — Lawn (outdoor) + VIP
      {
        idx: 2,
        userId: FAKE_USER_IDS.jess,
        priceMin: '45.00',
        priceMax: '85.00',
        tier: 'Lawn',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 3,
      },
      {
        idx: 2,
        userId: FAKE_USER_IDS.riley,
        priceMin: '85.00',
        priceMax: '175.00',
        tier: 'VIP',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 1,
      },
      // Event 3 — pending, low cred submitter
      {
        idx: 3,
        userId: FAKE_USER_IDS.sam,
        priceMin: '28.00',
        priceMax: '38.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 4 — SeatGeek + at_the_venue
      {
        idx: 4,
        userId: FAKE_USER_IDS.marco,
        priceMin: '55.00',
        priceMax: '95.00',
        tier: 'GA',
        vendor: 'SeatGeek',
        howFound: 'at_the_venue',
        status: 'corroborated',
        corroborationCount: 1,
      },
      {
        idx: 4,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '55.00',
        tier: 'GA',
        vendor: 'SeatGeek',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 5 — Ticketmaster + Reserved
      {
        idx: 5,
        userId: FAKE_USER_IDS.jess,
        priceMin: '48.00',
        priceMax: '80.00',
        tier: 'Reserved',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 2,
      },
      {
        idx: 5,
        userId: FAKE_USER_IDS.riley,
        priceMin: '75.00',
        priceMax: '130.00',
        tier: 'VIP',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 6 — DICE (small venue)
      {
        idx: 6,
        userId: FAKE_USER_IDS.marco,
        priceMin: '18.00',
        priceMax: '22.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'saw_listing',
        status: 'corroborated',
        corroborationCount: 1,
      },
      {
        idx: 6,
        userId: FAKE_USER_IDS.sam,
        priceMin: '18.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'at_the_venue',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 7 — Eventbrite
      {
        idx: 7,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '32.00',
        priceMax: '45.00',
        tier: 'GA',
        vendor: 'Eventbrite',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 8 — VenueBoxOffice + at_the_venue
      {
        idx: 8,
        userId: FAKE_USER_IDS.riley,
        priceMin: '30.00',
        priceMax: '45.00',
        tier: 'Reserved',
        vendor: 'VenueBoxOffice',
        howFound: 'at_the_venue',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 9 — stale (old price from before announcement)
      {
        idx: 9,
        userId: FAKE_USER_IDS.jess,
        priceMin: '25.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'stale',
        corroborationCount: 0,
      },
      // Event 10 — Pit at large amphitheater
      {
        idx: 10,
        userId: FAKE_USER_IDS.marco,
        priceMin: '65.00',
        priceMax: '125.00',
        tier: 'Pit',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 2,
      },
      // Event 11 — corroborated + disputed pair (same event)
      {
        idx: 11,
        userId: FAKE_USER_IDS.sam,
        priceMin: '60.00',
        priceMax: '100.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 1,
      },
      {
        idx: 11,
        userId: FAKE_USER_IDS.riley,
        priceMin: '42.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'disputed',
        corroborationCount: 0,
      },
      // Event 12 — brand new, all pending
      {
        idx: 12,
        userId: FAKE_USER_IDS.kai,
        priceMin: '22.00',
        priceMax: '30.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 0,
      },
      // Event 13 — high cred, highly corroborated
      {
        idx: 13,
        userId: FAKE_USER_IDS.riley,
        priceMin: '30.00',
        priceMax: '45.00',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        status: 'corroborated',
        corroborationCount: 3,
      },
      {
        idx: 13,
        userId: FAKE_USER_IDS.jess,
        priceMin: '30.00',
        priceMax: '45.00',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'saw_listing',
        status: 'corroborated',
        corroborationCount: 2,
      },
      // Event 14 — stale old price + new pending (price changed)
      {
        idx: 14,
        userId: FAKE_USER_IDS.marco,
        priceMin: '20.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'saw_listing',
        status: 'stale',
        corroborationCount: 0,
      },
      {
        idx: 14,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '25.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'at_the_venue',
        status: 'pending',
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

      // Wire disputed submissions to the first corroborated one for the same event
      const disputedSubs = insertedSubmissions.filter(
        (sub) => sub.status === 'disputed',
      )
      for (const disputedSub of disputedSubs) {
        const targetSub = insertedSubmissions.find(
          (sub) =>
            sub.status === 'corroborated' &&
            sub.eventId === disputedSub.eventId &&
            sub.id !== disputedSub.id,
        )
        if (targetSub) {
          await db
            .update(priceSubmissions)
            .set({ disputedSubmissionId: targetSub.id })
            .where(eq(priceSubmissions.id, disputedSub.id))
        }
      }

      // Corroboration confirms — spread across multiple users
      const CONFIRMING_USERS = [
        FAKE_USER_IDS.amy,
        FAKE_USER_IDS.ghost,
        FAKE_USER_IDS.taylor,
        FAKE_USER_IDS.riley,
        FAKE_USER_IDS.marco,
      ]

      const corroboratedSubmissions = insertedSubmissions.filter(
        (sub) => sub.status === 'corroborated',
      )
      const confirmRows = corroboratedSubmissions.flatMap((sub) => {
        const count = Math.min(sub.corroborationCount, CONFIRMING_USERS.length)
        return CONFIRMING_USERS.slice(0, count)
          .filter((uid) => uid !== sub.userId)
          .map((uid) => ({ submissionId: sub.id, userId: uid }))
      })

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

    // Audit log
    const existingAuditCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
    const hasAuditLog = (existingAuditCount[0]?.count ?? 0) > 0
    if (!hasAuditLog) {
      const redRocks = venueBySlug['red-rocks-amphitheatre']
      const larimer = venueBySlug['larimer-lounge']

      await db.insert(auditLog).values([
        {
          actorId: FAKE_USER_IDS.hugh,
          action: 'user.role.grant',
          targetId: FAKE_USER_IDS.taylor,
          metadata: { role: 'sub_admin', previousRole: 'user' },
          createdAt: new Date(now.getTime() - 7 * 86_400_000),
        },
        {
          actorId: FAKE_USER_IDS.hugh,
          action: 'user.role.grant',
          targetId: FAKE_USER_IDS.amy,
          metadata: { role: 'sub_admin', previousRole: 'user' },
          createdAt: new Date(now.getTime() - 14 * 86_400_000),
        },
        {
          actorId: FAKE_USER_IDS.hugh,
          action: 'venue.update',
          targetId: redRocks?.id ?? null,
          metadata: { field: 'featured', oldValue: false, newValue: true },
          createdAt: new Date(now.getTime() - 3 * 86_400_000),
        },
        {
          actorId: FAKE_USER_IDS.amy,
          action: 'venue.crawl.trigger',
          targetId: larimer?.id ?? null,
          metadata: { manual: true },
          createdAt: new Date(now.getTime() - 1 * 86_400_000),
        },
        {
          actorId: FAKE_USER_IDS.amy,
          action: 'price_submission.approve',
          targetId: null,
          metadata: { count: 3, eventIds: eventIds.slice(0, 3) },
          createdAt: new Date(now.getTime() - 2 * 86_400_000),
        },
      ])
      console.warn('Inserted 5 audit log entries.')
    } else {
      console.warn('Audit log already seeded, skipping.')
    }
  }

  // -------------------------------------------------------------------------
  // Phase 8.5 — test events for price corroboration & event report flows
  // -------------------------------------------------------------------------
  const phase85EventsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
    .where(sql`title LIKE '[P8.5]%'`)
  const hasPhase85Events = (phase85EventsCount[0]?.count ?? 0) > 0

  if (!hasPhase85Events) {
    // Use the first active venue for all Phase 8.5 test events
    const allVenues = await db.select().from(venues)
    const ogden = allVenues.find((vn) => vn.slug === 'ogden-theatre')
    const mission = allVenues.find((vn) => vn.slug === 'mission-ballroom')
    const bluebird = allVenues.find((vn) => vn.slug === 'bluebird-theater')
    const gothic = allVenues.find((vn) => vn.slug === 'gothic-theatre')
    const summit = allVenues.find((vn) => vn.slug === 'summit-music-hall')
    const marquis = allVenues.find((vn) => vn.slug === 'marquis-theater')
    const hiDive = allVenues.find((vn) => vn.slug === 'hi-dive')
    const larimer = allVenues.find((vn) => vn.slug === 'larimer-lounge')
    const fillmore = allVenues.find((vn) => vn.slug === 'fillmore-auditorium')

    const venueA = ogden ?? allVenues[0]
    const venueB = mission ?? allVenues[0]
    const venueC = bluebird ?? allVenues[0]
    const venueD = gothic ?? allVenues[0]
    const venueE = summit ?? allVenues[0]
    const venueF = marquis ?? allVenues[0]
    const venueG = hiDive ?? allVenues[0]
    const venueH = larimer ?? allVenues[0]
    const venueI = fillmore ?? allVenues[0]

    if (
      !venueA ||
      !venueB ||
      !venueC ||
      !venueD ||
      !venueE ||
      !venueF ||
      !venueG ||
      !venueH ||
      !venueI
    ) {
      console.warn('Phase 8.5: no venues found — skipping.')
    } else {
      const phase85EventRows = [
        // A — TwoPendingStack: two pending community submissions at different tiers
        {
          venueId: venueA.id,
          title: '[P8.5] Two Tiers Pending',
          artist: '[P8.5] Dual Tier Artist',
          date: '2026-07-01',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // B — DisputedPriceCard: live submission + counter-submission
        {
          venueId: venueB.id,
          title: '[P8.5] Counter Submission',
          artist: '[P8.5] Counter Artist',
          date: '2026-07-08',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // C — Gold card: pending box-office VIP submission
        {
          venueId: venueC.id,
          title: '[P8.5] Gold Pending',
          artist: '[P8.5] Gold Artist',
          date: '2026-07-15',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // D — Pending sold-out report
        {
          venueId: venueD.id,
          title: '[P8.5] Sold Out Report',
          artist: '[P8.5] Sold Out Artist',
          date: '2026-07-22',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // E — Pending cancelled report (price should be hidden)
        {
          venueId: venueE.id,
          title: '[P8.5] Cancelled Report',
          artist: '[P8.5] Cancelled Artist',
          date: '2026-07-29',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // F — Pending postponed report (price visible)
        {
          venueId: venueF.id,
          title: '[P8.5] Postponed Report',
          artist: '[P8.5] Postponed Artist',
          date: '2026-08-05',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // G — Live sold-out (promoted report)
        {
          venueId: venueG.id,
          title: '[P8.5] Sold Out Live',
          artist: '[P8.5] Sold Out Live Artist',
          date: '2026-08-12',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // H — Live cancelled (promoted report)
        {
          venueId: venueH.id,
          title: '[P8.5] Cancelled Live',
          artist: '[P8.5] Cancelled Live Artist',
          date: '2026-08-19',
          showTime: '20:00',
          status: 'cancelled' as const,
          verified: false,
        },
        // I — Imminent show (within 6 days) + pending cancelled report
        {
          venueId: venueI.id,
          title: '[P8.5] Imminent Cancelled',
          artist: '[P8.5] Imminent Artist',
          date: '2026-05-31',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
      ]

      const insertedPhase85Events = await db
        .insert(eventsTable)
        .values(phase85EventRows)
        .returning()
      console.warn(
        `Inserted ${insertedPhase85Events.length} Phase 8.5 test events.`,
      )

      // Helper to find event by title suffix
      const p85Event = (suffix: string) =>
        insertedPhase85Events.find((ev) => ev.title === `[P8.5] ${suffix}`)

      const eventA = p85Event('Two Tiers Pending')
      const eventB = p85Event('Counter Submission')
      const eventC = p85Event('Gold Pending')
      const eventD = p85Event('Sold Out Report')
      const eventE = p85Event('Cancelled Report')
      const eventF = p85Event('Postponed Report')
      const eventG = p85Event('Sold Out Live')
      const eventH = p85Event('Cancelled Live')
      const eventI = p85Event('Imminent Cancelled')

      // -----------------------------------------------------------------------
      // Price submissions for Phase 8.5 events
      // -----------------------------------------------------------------------

      // Event A — two pending community submissions (GA + Reserved), no live
      const phase85SubmissionsA = eventA
        ? [
            {
              eventId: eventA.id,
              userId: FAKE_USER_IDS.jess,
              priceMin: '25.00',
              priceMax: '35.00',
              tier: 'GA' as const,
              vendor: 'Ticketmaster' as const,
              howFound: 'saw_listing' as const,
              status: 'pending' as const,
              corroborationCount: 0,
            },
            {
              eventId: eventA.id,
              userId: FAKE_USER_IDS.marco,
              priceMin: '55.00',
              priceMax: '75.00',
              tier: 'Reserved' as const,
              vendor: 'Ticketmaster' as const,
              howFound: 'saw_listing' as const,
              status: 'pending' as const,
              corroborationCount: 0,
            },
          ]
        : []

      // Event B — one live/corroborated submission + one pending counter-submission
      // Insert the live one first so we can reference its id for disputedSubmissionId
      const phase85SubmissionBLive = eventB
        ? await db
            .insert(priceSubmissions)
            .values({
              eventId: eventB.id,
              userId: FAKE_USER_IDS.riley,
              priceMin: '45.00',
              priceMax: '55.00',
              tier: 'GA' as const,
              vendor: 'Ticketmaster' as const,
              howFound: 'bought_myself' as const,
              status: 'corroborated' as const,
              corroborationCount: 2,
            })
            .returning()
        : null

      // Submission confirms for the live B submission (2 confirms)
      if (phase85SubmissionBLive && phase85SubmissionBLive.length > 0) {
        const liveSub = phase85SubmissionBLive[0]!
        await db
          .insert(submissionConfirms)
          .values([
            {
              submissionId: liveSub.id,
              userId: FAKE_USER_IDS.amy,
              method: 'same-vendor' as const,
            },
            {
              submissionId: liveSub.id,
              userId: FAKE_USER_IDS.taylor,
              method: 'same-vendor' as const,
            },
          ])
          .onConflictDoNothing()
      }

      // Counter-submission for Event B
      const phase85SubmissionsB =
        eventB && phase85SubmissionBLive && phase85SubmissionBLive.length > 0
          ? [
              {
                eventId: eventB.id,
                userId: FAKE_USER_IDS.sam,
                priceMin: '60.00',
                priceMax: '70.00',
                tier: 'GA' as const,
                vendor: 'Ticketmaster' as const,
                howFound: 'saw_listing' as const,
                status: 'pending' as const,
                corroborationCount: 0,
                disputedSubmissionId: phase85SubmissionBLive[0]!.id,
              },
            ]
          : []

      // Event C — pending box-office VIP submission with 1 confirm
      const phase85SubmissionCInserted = eventC
        ? await db
            .insert(priceSubmissions)
            .values({
              eventId: eventC.id,
              userId: FAKE_USER_IDS.riley,
              priceMin: '85.00',
              priceMax: '110.00',
              tier: 'VIP' as const,
              vendor: 'AXS' as const,
              howFound: 'bought_myself' as const,
              status: 'pending' as const,
              corroborationCount: 1,
            })
            .returning()
        : null

      if (phase85SubmissionCInserted && phase85SubmissionCInserted.length > 0) {
        await db
          .insert(submissionConfirms)
          .values({
            submissionId: phase85SubmissionCInserted[0]!.id,
            userId: FAKE_USER_IDS.marco,
            method: 'box-office' as const,
          })
          .onConflictDoNothing()
      }

      // Events D, E, F — each get one live price submission
      const phase85SubmissionsDEF = [
        eventD
          ? {
              eventId: eventD.id,
              userId: FAKE_USER_IDS.jess,
              priceMin: '40.00',
              tier: 'GA' as const,
              vendor: 'AXS' as const,
              howFound: 'bought_myself' as const,
              status: 'corroborated' as const,
              corroborationCount: 1,
            }
          : null,
        eventE
          ? {
              eventId: eventE.id,
              userId: FAKE_USER_IDS.marco,
              priceMin: '30.00',
              priceMax: '45.00',
              tier: 'GA' as const,
              vendor: 'Ticketmaster' as const,
              howFound: 'saw_listing' as const,
              status: 'corroborated' as const,
              corroborationCount: 1,
            }
          : null,
        eventF
          ? {
              eventId: eventF.id,
              userId: FAKE_USER_IDS.taylor,
              priceMin: '35.00',
              tier: 'GA' as const,
              vendor: 'AXS' as const,
              howFound: 'bought_myself' as const,
              status: 'corroborated' as const,
              corroborationCount: 1,
            }
          : null,
      ].filter((row): row is NonNullable<typeof row> => row !== null)

      // Batch insert all remaining price submissions
      const remainingSubmissions = [
        ...phase85SubmissionsA,
        ...phase85SubmissionsB,
        ...phase85SubmissionsDEF,
      ]

      if (remainingSubmissions.length > 0) {
        await db
          .insert(priceSubmissions)
          .values(remainingSubmissions)
          .onConflictDoNothing()
        console.warn(
          `Inserted ${remainingSubmissions.length} Phase 8.5 price submissions.`,
        )
      }

      // -----------------------------------------------------------------------
      // Event reports for Phase 8.5 events
      // -----------------------------------------------------------------------
      const pastDate = new Date(now.getTime() - 2 * 86_400_000)

      const phase85ReportRows = [
        // D — pending sold-out report
        eventD
          ? {
              eventId: eventD.id,
              reporterId: FAKE_USER_IDS.riley,
              status: 'sold-out' as const,
              evidenceMethod: 'venue_site' as const,
              resolvedAt: null,
              resolution: undefined,
            }
          : null,
        // E — pending cancelled report
        eventE
          ? {
              eventId: eventE.id,
              reporterId: FAKE_USER_IDS.sam,
              status: 'cancelled' as const,
              evidenceMethod: 'saw_listing' as const,
              resolvedAt: null,
              resolution: undefined,
            }
          : null,
        // F — pending postponed report
        eventF
          ? {
              eventId: eventF.id,
              reporterId: FAKE_USER_IDS.jess,
              status: 'postponed' as const,
              evidenceMethod: 'other' as const,
              resolvedAt: null,
              resolution: undefined,
            }
          : null,
        // G — promoted sold-out (resolved)
        eventG
          ? {
              eventId: eventG.id,
              reporterId: FAKE_USER_IDS.marco,
              status: 'sold-out' as const,
              evidenceMethod: 'bought_myself' as const,
              resolvedAt: pastDate,
              resolution: 'promoted' as const,
            }
          : null,
        // H — promoted cancelled (resolved)
        eventH
          ? {
              eventId: eventH.id,
              reporterId: FAKE_USER_IDS.taylor,
              status: 'cancelled' as const,
              evidenceMethod: 'saw_listing' as const,
              resolvedAt: pastDate,
              resolution: 'promoted' as const,
            }
          : null,
        // I — pending cancelled report (imminent show, tests 3-confirm threshold)
        eventI
          ? {
              eventId: eventI.id,
              reporterId: FAKE_USER_IDS.kai,
              status: 'cancelled' as const,
              evidenceMethod: 'venue_site' as const,
              resolvedAt: null,
              resolution: undefined,
            }
          : null,
      ].filter((row): row is NonNullable<typeof row> => row !== null)

      if (phase85ReportRows.length > 0) {
        const insertedReports = await db
          .insert(eventReports)
          .values(phase85ReportRows)
          .returning()
        console.warn(
          `Inserted ${insertedReports.length} Phase 8.5 event reports.`,
        )

        // Event G — promoted sold-out gets 3 confirms
        const reportG = insertedReports.find(
          (rpt) => eventG && rpt.eventId === eventG.id,
        )
        if (reportG) {
          await db
            .insert(eventReportConfirms)
            .values([
              { reportId: reportG.id, userId: FAKE_USER_IDS.amy },
              { reportId: reportG.id, userId: FAKE_USER_IDS.riley },
              { reportId: reportG.id, userId: FAKE_USER_IDS.jess },
            ])
            .onConflictDoNothing()
          console.warn('Inserted 3 confirms for Event G sold-out report.')
        }
      }
    }
  } else {
    console.warn('Phase 8.5 test events already seeded, skipping.')
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
