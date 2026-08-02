import {
  and,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  like,
  ne,
  sql,
} from 'drizzle-orm'
import {
  canonicalizeArtist,
  deriveSourceCategory,
  type GuideChipKey,
} from '@concert-crawl/types'
import { db } from './src/client.js'
import { backfillArtists } from './src/scripts/backfill-artists.js'
import {
  venues,
  venueGuideChips,
  events as eventsTable,
  eventStatusEnum,
  priceRetrievalLog,
  userCred,
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
  type NewPriceSubmission,
} from './src/schema/index.js'

type EventStatus = (typeof eventStatusEnum.enumValues)[number]

function isEventStatus(value: string | undefined): value is EventStatus {
  return (
    value !== undefined &&
    eventStatusEnum.enumValues.some((status) => status === value)
  )
}

// Narrow seed data's optional `status` to a valid event_status, defaulting to
// 'upcoming'. Runtime-validated rather than cast, so drifting seed data can't
// smuggle an invalid enum value past the type checker.
function toEventStatus(value: string | undefined): EventStatus {
  return isEventStatus(value) ? value : 'upcoming'
}

/**
 * Stamps `canonicalArtist` onto seed event rows using the same helper the
 * crawler applies on every upsert.
 *
 * `events.canonical_artist` defaults to `''`, and the artists backfill selects
 * `WHERE canonical_artist <> ''` — so a seed that omits it reports
 * "0 inserted of 0 discovered", leaves the `artists` table empty, and makes
 * every `/artists/<slug>` route 404 in every seeded environment.
 *
 * Applied at each `insert(eventsTable)` boundary rather than on the individual
 * row literals so new seed rows inherit it automatically and cannot silently
 * reintroduce the blank column.
 */
export function withCanonicalArtist<TRow extends { artist: string }>(
  rows: TRow[],
): (TRow & { canonicalArtist: string })[] {
  return rows.map((row) => ({
    ...row,
    canonicalArtist: canonicalizeArtist(row.artist),
  }))
}

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
    name: 'Globe Hall',
    slug: 'globe-hall',
    websiteUrl: 'https://globehall.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    // Server-rendered WordPress, same Rock House Presents theme as Larimer
    // Lounge — the listing is in the initial HTML, so no browser is needed and
    // there is nothing to wait on past the document itself.
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    capacity: 250,
    venueType: 'Bar',
    neighborhood: 'Globeville',
    lat: 39.7823,
    lng: -104.9779,
    ticketVendor: 'unknown' as const,
    about:
      'Globeville music hall and Texas-style barbecue joint. Americana, country, and indie bookings in a room small enough that every seat is a good one.',
  },
  {
    name: 'Lost Lake Lounge',
    slug: 'lost-lake-lounge',
    websiteUrl: 'https://lost-lake.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    capacity: 250,
    venueType: 'Bar',
    neighborhood: 'City Park West',
    lat: 39.7402,
    lng: -104.9646,
    ticketVendor: 'unknown' as const,
    about:
      'Colfax dive with a tiki-lounge streak and a stacked calendar of punk, garage, and indie shows. Cheap, loud, and reliably worth the walk.',
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
  {
    name: 'The Oriental Theater',
    slug: 'oriental-theater',
    websiteUrl: 'https://www.theorientaltheater.com/events',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    address: '4335 W 44th Ave, Denver, CO 80212',
    capacity: 700,
    venueType: 'Theater',
    neighborhood: 'Berkeley',
    lat: 39.7757,
    lng: -105.0533,
    ticketVendor: 'unknown' as const,
    about:
      'Restored 1927 movie house on Tennyson Street with a marquee you can spot from blocks away. Books everything from touring indie and metal to comedy and burlesque, and stays refreshingly weird about it.',
  },
  {
    name: 'Meow Wolf Denver',
    slug: 'meow-wolf-denver',
    // The Denver listing lives under /events/denver/, not /denver/ — the
    // latter is the exhibition page and carries no event list.
    websiteUrl: 'https://tickets.meowwolf.com/events/denver/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    // Next.js, but the full event list is server-rendered into __NEXT_DATA__,
    // so a plain fetch sees everything and there is nothing to wait on past
    // the document. Roughly a third of the calendar is burlesque and comedy;
    // the LLM's isConcert=false verdict hides those via hiddenFromConsumer.
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    address: '1338 1st St, Denver, CO 80204',
    capacity: 488,
    venueType: 'Club',
    neighborhood: 'Sun Valley',
    lat: 39.7325,
    lng: -105.008,
    ticketVendor: 'unknown' as const,
    about:
      'Convergence Station books shows inside the art installation, so the room is never just a room. Music leans electronic and experimental, and the crowd is there for both the set and the building.',
  },
  {
    name: 'The Junkyard',
    slug: 'the-junkyard',
    websiteUrl: 'https://www.thejunkyard.com/shows',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    // Every show is published as a MusicEvent JSON-LD block in the static
    // HTML with an explicit-offset startDate, so the free structured-data
    // path covers the whole calendar and no browser is needed.
    //
    // The LLM fallback is effectively unavailable here: cleanHtml strips the
    // scripts and leaves ~84 characters of body text with no anchors. If the
    // site ever drops its JSON-LD the crawl returns zero rather than
    // degrading gracefully, which is what the event-count-drop alert catches.
    crawlMode: 'http',
    crawlWaitUntil: 'domcontentloaded' as const,
    address: '2323 W Mulberry Pl, Denver, CO 80204',
    venueType: 'Amphitheater',
    neighborhood: 'La Alma-Lincoln Park',
    lat: 39.7323,
    lng: -105.0143,
    ticketVendor: 'ticketmaster' as const,
    about:
      'Live Nation’s outdoor room just west of the South Platte, built on a scrapyard lot and named for it. Books arena-scale touring acts under an open sky.',
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
  // Phase 8.6 — additional handles so the price-submissions feed feels like
  // many fans, not three. Used heavily by PR4 seed below and as backfill on
  // popular realistic events (Radiohead, Phish, Big Thief, etc.).
  phishfan42: 'user_fake_phishfan42_0009',
  denvermusic: 'user_fake_denvermusic_0010',
  notyourgf: 'user_fake_notyourgf_0011',
  bouldergrrl: 'user_fake_bouldergrrl_0012',
  mtncreature: 'user_fake_mtncreature_0013',
  lola: 'user_fake_lola_0014',
  jordan_m: 'user_fake_jordan_m_0015',
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
  // Phase 8.6 — additional users-with-handles for richer submitter diversity.
  {
    userId: FAKE_USER_IDS.phishfan42,
    handle: 'phishfan42',
    theme: 'forge' as const,
    avatarColor: 'warning' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.denvermusic,
    handle: 'denvermusic',
    theme: 'bluenote' as const,
    avatarColor: 'signal' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.notyourgf,
    handle: 'notyourgf',
    theme: 'pulse' as const,
    avatarColor: 'accent' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.bouldergrrl,
    handle: 'bouldergrrl',
    theme: 'jade' as const,
    avatarColor: 'success' as const,
    city: 'Boulder',
  },
  {
    userId: FAKE_USER_IDS.mtncreature,
    handle: 'mtncreature',
    theme: 'cedar' as const,
    avatarColor: 'signal' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.lola,
    handle: 'lola_dnvr',
    theme: 'drip' as const,
    avatarColor: 'accent' as const,
    city: 'Denver',
  },
  {
    userId: FAKE_USER_IDS.jordan_m,
    handle: 'jordan_m',
    theme: 'gloss' as const,
    avatarColor: 'warning' as const,
    city: 'Denver',
  },
]

// ---------------------------------------------------------------------------
// Watcher crowd — "Who else is watching" roster fodder
//
// GET /v1/events/:id/watchers returns a `total` plus a `named` roster capped at
// 25 and restricted to watchers who have a handle. Sixteen fixture users — only
// some of whom have a handle — spread thinly across events never reaches either
// boundary, so this pool exists to concentrate watchers on a few showcase
// events (see the `showcases` array below). These profiles are never signed
// into — the endpoint reads user_profiles, not Clerk.
//
// Every fourth member has a null handle: that is the privacy opt-out (a cleared
// handle, not a flag), and it is what makes `total` exceed `named.length`.
// ---------------------------------------------------------------------------
const CROWD_HANDLE_WORDS = [
  'reverb',
  'floorfill',
  'encore',
  'setlist',
  'bassbin',
  'frontrow',
  'houselights',
  'soundcheck',
  'tapedeck',
  'lastcall',
] as const

const CROWD_THEMES = ['electric', 'jade', 'light'] as const
const CROWD_AVATAR_COLORS = ['signal', 'accent', 'success', 'warning'] as const

export const FAKE_CROWD_USER_IDS: readonly string[] = Array.from(
  { length: 40 },
  (_, idx) => `user_fake_crowd_${String(idx).padStart(4, '0')}`,
)

export const FAKE_CROWD_PROFILES = FAKE_CROWD_USER_IDS.map((userId, idx) => {
  const word = CROWD_HANDLE_WORDS[idx % CROWD_HANDLE_WORDS.length]!
  return {
    userId,
    // Namespaced: handle is globally UNIQUE and the insert is
    // onConflictDoNothing, so a clash with a real profile would silently drop
    // the row and quietly shrink the roster below the 25-entry cap.
    handle: idx % 4 === 0 ? null : `sc_${word}${idx}`,
    theme: CROWD_THEMES[idx % CROWD_THEMES.length]!,
    avatarColor: CROWD_AVATAR_COLORS[idx % CROWD_AVATAR_COLORS.length]!,
    city: idx % 3 === 0 ? null : 'Denver',
  }
})

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
  // Phase 8.6 — additional handled users. Cred spread on purpose so the
  // submitter list doesn't all look like the same archetype.
  {
    userId: FAKE_USER_IDS.phishfan42,
    role: 'user' as const,
    priceCredScore: 62,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.denvermusic,
    role: 'user' as const,
    priceCredScore: 41,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.notyourgf,
    role: 'user' as const,
    priceCredScore: 12,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.bouldergrrl,
    role: 'user' as const,
    priceCredScore: 24,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.mtncreature,
    role: 'user' as const,
    priceCredScore: 35,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.lola,
    role: 'user' as const,
    priceCredScore: 7,
    grantedBy: 'seed',
    permissions: [] as string[],
  },
  {
    userId: FAKE_USER_IDS.jordan_m,
    role: 'user' as const,
    priceCredScore: 19,
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
// #764 venue first-timer guide fixtures
//
// Three published shapes so every consumer state is reachable locally without
// hand-editing SQL: populated (insider tip + accessibility + 4 chips), thin
// (accessibility only, no tip) and placeholder (accessibility as the honest
// placeholder). Every other venue is left unpublished so the no-guide path is
// exercised too.
//
// Bodies are the voice-passed ROXY_GUIDE_COPY / ROXY_THIN_COPY samples from
// design/design_handoff_venue_first_timer_guide/guide-data.jsx, verbatim.
// They are sample content, not shipped copy — the shipped strings live in the
// *_COPY maps that PR-2 and PR-3 lift into definitions/copy.ts.
// ---------------------------------------------------------------------------
type SeedGuideChip = {
  // Typed to the v1 union so a fixture typo fails at compile time — chip_type
  // is TEXT in the DB, so a bad key would otherwise persist silently.
  chipType: GuideChipKey
  body: string
  isPlaceholder?: boolean
}

type SeedGuide = {
  venueSlug: string
  insiderTip: string | null
  chips: SeedGuideChip[]
}

const SEED_VENUE_GUIDES: SeedGuide[] = [
  // Populated — insider tip + accessibility + 4 more chips.
  {
    venueSlug: 'ogden-theatre',
    insiderTip:
      "The Ogden runs loud — grab earplugs at the bar if you forgot. The line's rough after 8:30, so come early. Sound's best dead center, about ten feet back off the rail.",
    chips: [
      {
        chipType: 'accessibility',
        body: "Step-free entrance on the north side — ask any staffer to open it. One accessible restroom on the main floor. No elevator to the balcony, so it's floor-only if stairs are a no.",
      },
      {
        chipType: 'parking',
        body: 'Paid lot on Blake, $15 cash. Street usually opens up a block over on Walnut after 7.',
      },
      {
        chipType: 'age_policy',
        body: '18+ to get in, 21+ with a wristband to drink. They check IDs on the sidewalk, so have it out before the line.',
      },
      {
        chipType: 'will_call',
        body: 'Will-call is the right-hand door, bring your ID. Screenshots scan fine; crank your brightness up before you get to the scanner.',
      },
      {
        chipType: 'transit',
        body: 'A-line to 38th & Blake, then a 6-minute walk. Tell your driver to drop on Walnut — the front’s a zoo right at doors.',
      },
    ],
  },
  // Thin — accessibility only, no insider tip.
  {
    venueSlug: 'hi-dive',
    insiderTip: null,
    chips: [
      {
        chipType: 'accessibility',
        body: "Step-free entrance around the side on 13th. Accessible restroom on the main floor. Call ahead about balcony seating — it's stairs-only.",
      },
    ],
  },
  // Placeholder — accessibility marked honestly undocumented.
  {
    venueSlug: 'globe-hall',
    insiderTip: null,
    chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
  },
]

async function seedVenueGuides(
  venueBySlug: Record<string, { id: string } | undefined>,
): Promise<void> {
  for (const guide of SEED_VENUE_GUIDES) {
    const venue = venueBySlug[guide.venueSlug]
    if (!venue) {
      console.warn(
        `Guide seed: venue ${guide.venueSlug} not found, skipping its guide.`,
      )
      continue
    }

    // Replace rather than merge — a chip removed from the fixture above must
    // disappear on the next seed run, exactly like the admin PUT replaces the
    // venue's chip set. All three statements run in one transaction so a
    // constraint failure on insert cannot leave a venue published with its
    // chips already deleted.
    await db.transaction(async (tx) => {
      await tx
        .delete(venueGuideChips)
        .where(eq(venueGuideChips.venueId, venue.id))

      await tx.insert(venueGuideChips).values(
        guide.chips.map((chip) => ({
          venueId: venue.id,
          chipType: chip.chipType,
          body: chip.body,
          isPlaceholder: chip.isPlaceholder ?? false,
        })),
      )

      await tx
        .update(venues)
        .set({ insiderTip: guide.insiderTip, guidePublishedAt: new Date() })
        .where(eq(venues.id, venue.id))
    })
  }

  // On a fresh DB every other venue is left unpublished, so the no-guide
  // consumer path is reachable locally too. Note this only ever publishes the
  // fixture venues — it does not clear `guide_published_at` / `insider_tip` on
  // venues outside SEED_VENUE_GUIDES, so anything published by hand in an
  // existing local DB stays published across a re-seed.
  console.warn(
    `Seeded ${SEED_VENUE_GUIDES.length} venue guides (populated / thin / placeholder).`,
  )
}

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
          // Single-link ticketLinks mirror of ticketUrl during the expand
          // phase. Crawler PR (#641 cycle, PR 2) replaces this with the
          // host/vendor-derived array.
          ticketLinks: ev.ticketUrl
            ? [{ kind: 'primary' as const, vendor: null, url: ev.ticketUrl }]
            : null,
          ticketPriceMin: ev.ticketPriceMin ?? null,
          ticketPriceMax: ev.ticketPriceMax ?? null,
          priceSource: ev.priceSource ?? null,
          genre: ev.genre ?? null,
          status: toEventStatus(ev.status),
          confidenceScore: ev.confidenceScore ?? null,
          verified: ev.verified ?? false,
        },
      ]
    })

    const insertedEvents = await db
      .insert(eventsTable)
      .values(withCanonicalArtist(sampleEventRows))
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
        .values(
          withCanonicalArtist([
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
          ]),
        )
        .onConflictDoNothing()
      console.warn('Inserted 4 test events for UI state coverage.')
    }
  } else {
    console.warn('Events already seeded, skipping.')
  }

  // User profiles
  await db
    .insert(userProfiles)
    .values([...FAKE_USER_PROFILES, ...FAKE_CROWD_PROFILES])
    .onConflictDoNothing()
  console.warn(
    `Inserted ${FAKE_USER_PROFILES.length} user profiles + ${FAKE_CROWD_PROFILES.length} watcher-crowd profiles.`,
  )

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

  // Per-user cred (#1012) — cred now lives in `user_cred`, keyed by user_id.
  // Mirror each seeded user's score so local/dev profiles render real cred.
  const existingCredRows = await db
    .select({ userId: userCred.userId })
    .from(userCred)
  const existingCredUserIds = new Set(existingCredRows.map((row) => row.userId))
  const missingCred = FAKE_USER_ROLES.filter(
    (role) => !existingCredUserIds.has(role.userId),
  )
  if (missingCred.length > 0) {
    await db.insert(userCred).values(
      missingCred.map((role) => ({
        userId: role.userId,
        priceCredScore: role.priceCredScore,
      })),
    )
    console.warn(`Inserted ${missingCred.length} user cred rows.`)
  } else {
    console.warn('All synthetic user cred rows already present, skipping.')
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
    .select({
      id: eventsTable.id,
      venueId: eventsTable.venueId,
      date: eventsTable.date,
    })
    .from(eventsTable)
    .orderBy(desc(eventsTable.date))
    .limit(50)

  if (recentEvents.length === 0) {
    console.warn(
      'No events found — skipping user_events, price_submissions, submission_confirms.',
    )
  } else {
    const eventIds = recentEvents.map((evt) => evt.id)
    const todayIso = new Date().toISOString().slice(0, 10)
    // recentEvents is ordered date DESC, so the low eventIds indices are all
    // upcoming. Concert History only shows nights that already happened, so a
    // separate past-only list is needed or local History would render empty.
    const pastIds = recentEvents
      .filter((evt) => evt.date < todayIso)
      .map((evt) => evt.id)
    const pastEventIds = new Set(pastIds)

    // Attendance shapes (#70). `status: 'going'` is retired — attendance is its
    // own timestamp, and Watching is independent of it. A past show becomes an
    // attending-only row (status null, the shape a user who never watched it
    // produces); an upcoming one keeps Watching alongside the commitment, so
    // local dev exercises both.
    const attending = (
      userId: string,
      eventId: string,
      savedPrice?: string,
    ) => {
      const isPast = pastEventIds.has(eventId)
      return {
        userId,
        eventId,
        status: isPast ? null : ('watching' as const),
        attendingAt: isPast
          ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
          : new Date(),
        ...(savedPrice === undefined ? {} : { savedPrice }),
      }
    }

    const HISTORY_PRICES = ['28.00', '45.00', '65.00', '85.00', '120.00']

    // Showcase events for "Who else is watching". Hugh already watches all
    // three below, which matters because the endpoint excludes the viewer —
    // signed in as Hugh each roster reads one lower than the crowd size here.
    //   deep   — 34 watchers, so `named` hits its 25 cap and overflows
    //   mixed  — 12 watchers, some handle-less, so `total` exceeds `named`
    //   single — 1 watcher, the minimum non-empty roster
    const showcases: { eventId: string | undefined; watchers: number }[] = [
      { eventId: eventIds[0], watchers: 34 },
      { eventId: eventIds[2], watchers: 12 },
      { eventId: eventIds[5], watchers: 1 },
    ]
    const crowdWatchRows = showcases.flatMap(({ eventId, watchers }, idx) =>
      eventId === undefined
        ? []
        : // The mixed showcase draws from the head of the pool so it picks up
          // the handle-less members; the others draw from the tail so their
          // rosters come back fully named.
          (idx === 1
            ? FAKE_CROWD_USER_IDS.slice(0, watchers)
            : FAKE_CROWD_USER_IDS.slice(-watchers)
          ).map((userId) => ({
            userId,
            eventId,
            status: 'watching' as const,
          })),
    )

    // User events
    const userEventRows = [
      ...crowdWatchRows,
      // Hugh
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[0]!,
        status: 'watching' as const,
        savedPrice: '75.00',
      },
      attending(FAKE_USER_IDS.hugh, eventIds[1]!, '65.00'),
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[2]!,
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.hugh,
        eventId: eventIds[5]!,
        status: 'watching' as const,
      },
      // jess
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[3]!,
        status: 'watching' as const,
        savedPrice: '28.00',
      },
      attending(FAKE_USER_IDS.jess, eventIds[4]!),
      {
        userId: FAKE_USER_IDS.jess,
        eventId: eventIds[6]!,
        status: 'watching' as const,
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
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.marco,
        eventId: eventIds[11]!,
        status: 'watching' as const,
      },
      // amy
      attending(FAKE_USER_IDS.amy, eventIds[9]!, '55.00'),
      {
        userId: FAKE_USER_IDS.amy,
        eventId: eventIds[12]!,
        status: 'watching' as const,
      },
      // taylor
      attending(FAKE_USER_IDS.taylor, eventIds[13]!),
      {
        userId: FAKE_USER_IDS.taylor,
        eventId: eventIds[14]!,
        status: 'watching' as const,
        savedPrice: '35.00',
      },
      {
        userId: FAKE_USER_IDS.taylor,
        eventId: eventIds[15]!,
        status: 'watching' as const,
      },
      // riley — power user
      attending(FAKE_USER_IDS.riley, eventIds[0]!, '85.00'),
      attending(FAKE_USER_IDS.riley, eventIds[2]!),
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[3]!,
        status: 'watching' as const,
      },
      attending(FAKE_USER_IDS.riley, eventIds[5]!, '65.00'),
      {
        userId: FAKE_USER_IDS.riley,
        eventId: eventIds[7]!,
        status: 'watching' as const,
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
        status: 'watching' as const,
      },
      {
        userId: FAKE_USER_IDS.sam,
        eventId: eventIds[16]!,
        status: 'watching' as const,
      },
      // Past nights, so Concert History has something to render locally. These
      // are attending-only (status null) — the shape a user who marked "I'm
      // going!" without ever watching the show produces.
      // Hugh gets a deep run of nights, not a token few: the History stats
      // block (nights, venues, artists, topGenre, topVenue, totalSpent) needs
      // enough rows to actually have a *top* anything, and the null savedPrice
      // entries are what prove totalSpent survives a night with no price.
      ...pastIds
        .slice(0, 14)
        .map((pastId, idx) =>
          attending(
            FAKE_USER_IDS.hugh,
            pastId,
            idx % 4 === 3
              ? undefined
              : HISTORY_PRICES[idx % HISTORY_PRICES.length]!,
          ),
        ),
      attending(FAKE_USER_IDS.jess, pastIds[0]!),
      attending(FAKE_USER_IDS.jess, pastIds[3]!, '32.00'),
      attending(FAKE_USER_IDS.riley, pastIds[1]!),
      attending(FAKE_USER_IDS.riley, pastIds[2]!),
      attending(FAKE_USER_IDS.riley, pastIds[4]!, '120.00'),
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
        corroborationCount: 5,
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
        corroborationCount: 3,
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
        corroborationCount: 2,
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
        corroborationCount: 3,
      },
      {
        idx: 1,
        userId: FAKE_USER_IDS.sam,
        priceMin: '30.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'disputed',
        corroborationCount: 1,
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
        corroborationCount: 4,
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
        corroborationCount: 2,
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
        corroborationCount: 1,
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
        corroborationCount: 2,
      },
      {
        idx: 4,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '55.00',
        tier: 'GA',
        vendor: 'SeatGeek',
        howFound: 'saw_listing',
        status: 'pending',
        corroborationCount: 1,
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
        corroborationCount: 3,
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
        corroborationCount: 1,
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
        corroborationCount: 2,
      },
      {
        idx: 6,
        userId: FAKE_USER_IDS.sam,
        priceMin: '18.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'at_the_venue',
        status: 'pending',
        corroborationCount: 1,
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
        corroborationCount: 1,
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
        corroborationCount: 1,
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
        corroborationCount: 1,
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
        corroborationCount: 3,
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
        corroborationCount: 2,
      },
      {
        idx: 11,
        userId: FAKE_USER_IDS.riley,
        priceMin: '42.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        status: 'disputed',
        corroborationCount: 1,
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
        corroborationCount: 1,
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
        corroborationCount: 4,
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
        corroborationCount: 3,
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
        corroborationCount: 1,
      },
      {
        idx: 14,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '25.00',
        tier: 'GA',
        vendor: 'DICE',
        howFound: 'at_the_venue',
        status: 'pending',
        corroborationCount: 1,
      },
    ]

    // Derive source_category from existing (vendor, how_found) via the
    // shared helper. corroborationCount values in submissionTemplates already
    // reflect the post-migration-0040 semantics (submitter counts as
    // observation #1; corroborationCount = total observations including
    // submitter), so no extra +1 here — same convention as the Phase 8.5
    // inserts below.
    //
    // Single flatMap keeps the type narrowing honest — when eventIds[idx] is
    // missing we emit nothing, otherwise we have a guaranteed string. Avoids
    // the `as string` cast (per CLAUDE.md's "casts are a last resort" rule).
    const submissionRows = submissionTemplates.flatMap(
      ({ idx, vendor, howFound, ...rest }) => {
        const eventId = eventIds[idx]
        if (eventId === undefined) return []
        return [
          {
            ...rest,
            vendor,
            howFound,
            sourceCategory: deriveSourceCategory(vendor, howFound),
            eventId,
          },
        ]
      },
    )

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
        // corroborationCount stores total observations (submitter + non-
        // submitter confirms) under the 1/2 model. submission_confirms only
        // tracks non-submitter confirms, so insert (count - 1) rows.
        // Filter the submitter out FIRST, then slice — otherwise a submitter
        // who happens to land in the first N entries would shrink the
        // resulting confirm count below desiredConfirms.
        const desiredConfirms = Math.max(0, sub.corroborationCount - 1)
        const eligibleConfirmers = CONFIRMING_USERS.filter(
          (uid) => uid !== sub.userId,
        )
        const count = Math.min(desiredConfirms, eligibleConfirmers.length)
        return eligibleConfirmers
          .slice(0, count)
          .map((uid) => ({ submissionId: sub.id, userId: uid }))
      })

      if (confirmRows.length > 0) {
        await db
          .insert(submissionConfirms)
          .values(confirmRows)
          .onConflictDoNothing()
        console.warn(`Inserted ${confirmRows.length} submission confirms.`)
      }

      // (Popularity backfill lifted out of this if-branch — see "Popularity
      // backfill" block below. It needs to run even when the main submissions
      // block was skipped, otherwise devs who already have submissions from a
      // prior seed never get the marquee multi-source coverage when they pull
      // a branch that adds new popularity targets.)
    } else {
      console.warn('Price submissions already seeded, skipping.')
    }

    // -----------------------------------------------------------------------
    // Popularity backfill — add multi-source price submissions to a few of
    // the marquee realistic events so multi-tier cards show the "N reports"
    // social-proof caption naturally. Targeted (not blanket) per CLAUDE.md
    // KISS guidance. Each block queries by event title so the work is
    // independent of the recentEvents idx mapping above.
    //
    // Runs INDEPENDENTLY of the `!hasSubmissions` guard above so a developer
    // who already had price_submissions from a prior seed still gets this
    // coverage when pulling a branch that extends the targets list. Marker
    // user `phishfan42` is unique to this block — its absence means the
    // backfill hasn't run yet.
    // -----------------------------------------------------------------------
    {
      const popularityMarker = await db
        .select({ id: priceSubmissions.id })
        .from(priceSubmissions)
        .where(eq(priceSubmissions.userId, FAKE_USER_IDS.phishfan42))
        .limit(1)
      if (popularityMarker.length > 0) {
        console.warn(
          'Popularity backfill already applied (phishfan42 marker present), skipping.',
        )
      } else {
        const popularityDayMs = 86_400_000
        const popularityOlder = new Date(Date.now() - 18 * popularityDayMs)
        const popularityOlderish = new Date(Date.now() - 7 * popularityDayMs)
        const popularityFresh = new Date(Date.now() - 1 * popularityDayMs)

        // Templates omit `eventId` because it's resolved per-target after the
        // events lookup below. Typing the template as Omit<…, 'eventId'>
        // prevents a future refactor from accidentally pushing the templates
        // straight to `db.insert(priceSubmissions)` and inserting a row with
        // `eventId === ''` (would violate the FK to events.id).
        const popularityTargets: ReadonlyArray<{
          title: string
          submissions: ReadonlyArray<Omit<NewPriceSubmission, 'eventId'>>
        }> = [
          {
            title: 'Radiohead at Red Rocks',
            submissions: [
              {
                userId: FAKE_USER_IDS.phishfan42,
                priceMin: '78.00',
                priceMax: '155.00',
                tier: 'GA',
                vendor: 'AXS',
                howFound: 'bought_myself',
                sourceCategory: 'standard',
                status: 'corroborated',
                corroborationCount: 3,
                note: 'AXS pre-sale code worked — $78 GA, $155 reserved.',
                createdAt: popularityOlder,
                updatedAt: popularityOlder,
              },
              {
                userId: FAKE_USER_IDS.denvermusic,
                priceMin: '95.00',
                priceMax: '220.00',
                tier: 'GA',
                vendor: 'SeatGeek',
                howFound: 'saw_listing',
                sourceCategory: 'resale',
                status: 'corroborated',
                corroborationCount: 2,
                note: 'SeatGeek resale was already 25% over face the day after on-sale.',
                createdAt: popularityOlderish,
                updatedAt: popularityOlderish,
              },
              {
                userId: FAKE_USER_IDS.bouldergrrl,
                priceMin: '80.00',
                tier: 'GA',
                vendor: 'AXS',
                howFound: 'saw_listing',
                sourceCategory: 'standard',
                status: 'pending',
                corroborationCount: 1,
                note: 'Drop just popped on AXS at $80 — looked legit, not a flip.',
                createdAt: popularityFresh,
                updatedAt: popularityFresh,
              },
            ],
          },
          {
            title: 'Phish at Red Rocks',
            submissions: [
              {
                userId: FAKE_USER_IDS.phishfan42,
                priceMin: '90.00',
                priceMax: '180.00',
                tier: 'GA',
                vendor: 'Ticketmaster',
                howFound: 'bought_myself',
                sourceCategory: 'standard',
                status: 'corroborated',
                corroborationCount: 4,
                note: 'Phish ticketing lottery hit — GA was $90, reserved up to $180.',
                createdAt: popularityOlder,
                updatedAt: popularityOlder,
              },
              {
                userId: FAKE_USER_IDS.mtncreature,
                priceMin: '100.00',
                priceMax: '210.00',
                tier: 'GA',
                vendor: 'SeatGeek',
                howFound: 'saw_listing',
                sourceCategory: 'resale',
                status: 'corroborated',
                corroborationCount: 2,
                note: 'SeatGeek floor was $100 day-of, climbed all afternoon.',
                createdAt: popularityOlderish,
                updatedAt: popularityOlderish,
              },
            ],
          },
          {
            title: 'Big Thief',
            submissions: [
              {
                userId: FAKE_USER_IDS.notyourgf,
                priceMin: '35.00',
                priceMax: '52.00',
                tier: 'GA',
                vendor: 'AXS',
                howFound: 'bought_myself',
                sourceCategory: 'standard',
                status: 'corroborated',
                corroborationCount: 3,
                note: 'GA was $35 even, $52 with the AXS fees stacked.',
                createdAt: popularityOlder,
                updatedAt: popularityOlder,
              },
              {
                userId: FAKE_USER_IDS.lola,
                priceMin: '40.00',
                tier: 'GA',
                vendor: 'SeatGeek',
                howFound: 'saw_listing',
                sourceCategory: 'resale',
                status: 'pending',
                corroborationCount: 1,
                note: 'Resale was already up to $40 a couple weeks out.',
                createdAt: popularityFresh,
                updatedAt: popularityFresh,
              },
            ],
          },
          {
            title: 'Bon Iver',
            submissions: [
              {
                userId: FAKE_USER_IDS.denvermusic,
                priceMin: '60.00',
                priceMax: '98.00',
                tier: 'GA',
                vendor: 'AXS',
                howFound: 'bought_myself',
                sourceCategory: 'standard',
                status: 'corroborated',
                corroborationCount: 2,
                note: 'AXS GA was $60. Pit went up to $98 reserved.',
                createdAt: popularityOlderish,
                updatedAt: popularityOlderish,
              },
              {
                userId: FAKE_USER_IDS.jordan_m,
                priceMin: '70.00',
                priceMax: '110.00',
                tier: 'GA',
                vendor: 'Ticketmaster',
                howFound: 'saw_listing',
                sourceCategory: 'resale',
                status: 'pending',
                corroborationCount: 1,
                createdAt: popularityFresh,
                updatedAt: popularityFresh,
              },
            ],
          },
          {
            title: 'Khruangbin at Red Rocks',
            submissions: [
              {
                userId: FAKE_USER_IDS.bouldergrrl,
                priceMin: '68.00',
                priceMax: '125.00',
                tier: 'GA',
                vendor: 'AXS',
                howFound: 'bought_myself',
                sourceCategory: 'standard',
                status: 'corroborated',
                corroborationCount: 2,
                note: 'Pulled GA at $68 — locking in feels like a steal already.',
                createdAt: popularityOlderish,
                updatedAt: popularityOlderish,
              },
            ],
          },
        ]

        // Wrap submissions + confirms in a transaction so a crash between
        // the two inserts rolls back the marker row (phishfan42) as well.
        // Without the transaction, the marker could land but the confirms
        // could fail, leaving corroborationCount > 1 rows with 0 confirm
        // rows on the next run (which would skip this block because the
        // marker is present). The transaction restores all-or-nothing
        // idempotency across re-runs.
        await db.transaction(async (tx) => {
          const popularityInsertRows: NewPriceSubmission[] = []
          for (const target of popularityTargets) {
            const row = await tx
              .select({ id: eventsTable.id })
              .from(eventsTable)
              .where(eq(eventsTable.title, target.title))
              .limit(1)
            const targetId = row[0]?.id
            if (!targetId) {
              console.warn(
                `Popularity backfill: target event "${target.title}" not found — skipping (title drift?).`,
              )
              continue
            }
            for (const sub of target.submissions) {
              popularityInsertRows.push({ ...sub, eventId: targetId })
            }
          }

          if (popularityInsertRows.length > 0) {
            const insertedPopularity = await tx
              .insert(priceSubmissions)
              .values(popularityInsertRows)
              .returning()

            // Confirms for the corroborated rows — same convention as above
            // (corroborationCount = total observations including submitter).
            const popularityConfirmers = [
              FAKE_USER_IDS.amy,
              FAKE_USER_IDS.taylor,
              FAKE_USER_IDS.jess,
              FAKE_USER_IDS.marco,
              FAKE_USER_IDS.riley,
              FAKE_USER_IDS.notyourgf,
            ]
            const popularityConfirmRows = insertedPopularity.flatMap((sub) => {
              if (sub.status !== 'corroborated') return []
              const desired = Math.max(0, sub.corroborationCount - 1)
              const eligible = popularityConfirmers.filter(
                (uid) => uid !== sub.userId,
              )
              return eligible
                .slice(0, Math.min(desired, eligible.length))
                .map((uid) => ({
                  submissionId: sub.id,
                  userId: uid,
                  method: 'same-vendor' as const,
                }))
            })

            if (popularityConfirmRows.length > 0) {
              await tx
                .insert(submissionConfirms)
                .values(popularityConfirmRows)
                .onConflictDoNothing()
            }

            console.warn(
              `Popularity backfill: inserted ${insertedPopularity.length} submissions + ${popularityConfirmRows.length} confirms across ${popularityTargets.length} marquee events.`,
            )
          }
        })
      }
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

    const redRocks = allVenues.find(
      (vn) => vn.slug === 'red-rocks-amphitheatre',
    )

    const venueA = ogden ?? allVenues[0]
    const venueB = mission ?? allVenues[0]
    const venueC = bluebird ?? allVenues[0]
    const venueD = gothic ?? allVenues[0]
    const venueE = summit ?? allVenues[0]
    const venueF = marquis ?? allVenues[0]
    const venueG = hiDive ?? allVenues[0]
    const venueH = larimer ?? allVenues[0]
    const venueI = fillmore ?? allVenues[0]
    const venueJ = redRocks ?? allVenues[0]

    if (
      !venueA ||
      !venueB ||
      !venueC ||
      !venueD ||
      !venueE ||
      !venueF ||
      !venueG ||
      !venueH ||
      !venueI ||
      !venueJ
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
          ticketPriceMin: '45.00',
          ticketPriceMax: '55.00',
          priceSource: 'community' as const,
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
          ticketPriceMin: '40.00',
          priceSource: 'community' as const,
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
          ticketPriceMin: '30.00',
          ticketPriceMax: '45.00',
          priceSource: 'community' as const,
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
          ticketPriceMin: '35.00',
          priceSource: 'community' as const,
        },
        // G — Live sold-out (promoted report + corroborated price)
        {
          venueId: venueG.id,
          title: '[P8.5] Sold Out Live',
          artist: '[P8.5] Sold Out Live Artist',
          date: '2026-08-12',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          ticketPriceMin: '50.00',
          ticketPriceMax: '65.00',
          priceSource: 'community' as const,
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
        // J — Already-postponed live event (tests LiveReportBanner with postponed status)
        {
          venueId: venueJ.id,
          title: '[P8.5] Postponed Live',
          artist: '[P8.5] Postponed Live Artist',
          date: '2026-08-26',
          showTime: '20:00',
          status: 'postponed' as const,
          verified: false,
          ticketPriceMin: '30.00',
          ticketPriceMax: '45.00',
          priceSource: 'ticketmaster' as const,
        },
      ]

      const insertedPhase85Events = await db
        .insert(eventsTable)
        .values(withCanonicalArtist(phase85EventRows))
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
      const eventJ = p85Event('Postponed Live')

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
              corroborationCount: 1,
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
              corroborationCount: 1,
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
              sourceCategory: 'standard' as const,
              status: 'corroborated' as const,
              corroborationCount: 3,
              note: 'Checked the AXS app day of sale. GA was $45 + $10 fees showed at checkout.',
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

      // Event B — second corroborated submission (AXS, different price) to enable MultiTierLiveCard
      if (eventB) {
        const phase85SubmissionBAlt = await db
          .insert(priceSubmissions)
          .values({
            eventId: eventB.id,
            userId: FAKE_USER_IDS.kai,
            priceMin: '48.00',
            priceMax: '60.00',
            tier: 'GA' as const,
            vendor: 'AXS' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'corroborated' as const,
            corroborationCount: 3,
          })
          .returning()

        if (phase85SubmissionBAlt.length > 0) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: phase85SubmissionBAlt[0]!.id,
                userId: FAKE_USER_IDS.marco,
                method: 'same-vendor' as const,
              },
              {
                submissionId: phase85SubmissionBAlt[0]!.id,
                userId: FAKE_USER_IDS.jess,
                method: 'same-vendor' as const,
              },
            ])
            .onConflictDoNothing()
        }
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
                corroborationCount: 1,
                disputedSubmissionId: phase85SubmissionBLive[0]!.id,
                note: 'Saw it listed at $65 on SeatGeek resale. Might be different tier.',
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
              sourceCategory: 'standard' as const,
              status: 'pending' as const,
              corroborationCount: 2,
              note: 'Walked up to the Bluebird box office. GA face value, no fees.',
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
              corroborationCount: 2,
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
              corroborationCount: 2,
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
              corroborationCount: 2,
            }
          : null,
      ].filter((row): row is NonNullable<typeof row> => row !== null)

      // Batch insert all remaining price submissions
      // Derive sourceCategory at insert time via the shared helper so every
      // batch row lands with a non-null source_category (matches the consumer
      // route + dispute/admin insert behavior + the migration backfill).
      const remainingSubmissions = [
        ...phase85SubmissionsA,
        ...phase85SubmissionsB,
        ...phase85SubmissionsDEF,
      ].map((row) => ({
        ...row,
        sourceCategory: deriveSourceCategory(row.vendor, row.howFound),
      }))

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

  // ─── Phase 8.5 full data patch (idempotent — runs every seed) ──────────────
  // Backfills ticketPriceMin/priceSource on event rows, inserts missing price
  // submissions, event reports, and report confirms for already-seeded DBs.
  {
    // --- Step 1: fetch all P8.5 events ---
    const p85Events = await db
      .select({ id: eventsTable.id, title: eventsTable.title })
      .from(eventsTable)
      .where(sql`title LIKE '[P8.5]%'`)

    const p85 = (suffix: string) =>
      p85Events.find((ev) => ev.title === `[P8.5] ${suffix}`)

    const ev = {
      A: p85('Two Tiers Pending'),
      B: p85('Counter Submission'),
      C: p85('Gold Pending'),
      D: p85('Sold Out Report'),
      E: p85('Cancelled Report'),
      F: p85('Postponed Report'),
      G: p85('Sold Out Live'),
      H: p85('Cancelled Live'),
      I: p85('Imminent Cancelled'),
    }

    // --- Step 2: patch event price fields ---
    const pricePatch: Array<{
      id: string | undefined
      priceMin: string
      priceMax?: string
      src: 'community' | 'ticketmaster'
    }> = [
      { id: ev.B?.id, priceMin: '45.00', priceMax: '55.00', src: 'community' },
      { id: ev.D?.id, priceMin: '40.00', src: 'community' },
      {
        id: ev.E?.id,
        priceMin: '30.00',
        priceMax: '45.00',
        src: 'community',
      },
      { id: ev.F?.id, priceMin: '35.00', src: 'community' },
      {
        id: ev.G?.id,
        priceMin: '50.00',
        priceMax: '65.00',
        src: 'community',
      },
    ]

    for (const patch of pricePatch) {
      if (!patch.id) continue
      await db
        .update(eventsTable)
        .set({
          ticketPriceMin: patch.priceMin,
          ticketPriceMax: patch.priceMax ?? null,
          priceSource: patch.src,
        })
        .where(
          and(eq(eventsTable.id, patch.id), isNull(eventsTable.ticketPriceMin)),
        )
    }

    // --- Step 3: ensure price submissions exist ---

    // Helper: returns true if ≥ 1 submission with given status exists for eventId
    const hasSubmission = async (
      eventId: string,
      status: 'pending' | 'corroborated',
    ) => {
      const [row] = await db
        .select({ total: count() })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.eventId, eventId),
            eq(priceSubmissions.status, status),
          ),
        )
      return (row?.total ?? 0) > 0
    }

    // Event A — two pending community submissions
    if (ev.A && !(await hasSubmission(ev.A.id, 'pending'))) {
      await db
        .insert(priceSubmissions)
        .values([
          {
            eventId: ev.A.id,
            userId: FAKE_USER_IDS.jess,
            priceMin: '25.00',
            priceMax: '35.00',
            tier: 'GA' as const,
            vendor: 'Ticketmaster' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
          },
          {
            eventId: ev.A.id,
            userId: FAKE_USER_IDS.marco,
            priceMin: '55.00',
            priceMax: '75.00',
            tier: 'Reserved' as const,
            vendor: 'AXS' as const,
            howFound: 'bought_myself' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
          },
        ])
        .onConflictDoNothing()
      console.warn('Patched Event A: inserted 2 pending submissions.')
    }

    // Event B — primary corroborated (Ticketmaster) + counter-submission
    if (ev.B && !(await hasSubmission(ev.B.id, 'corroborated'))) {
      const primarySub = await db
        .insert(priceSubmissions)
        .values({
          eventId: ev.B.id,
          userId: FAKE_USER_IDS.riley,
          priceMin: '45.00',
          priceMax: '55.00',
          tier: 'GA' as const,
          vendor: 'Ticketmaster' as const,
          howFound: 'bought_myself' as const,
          sourceCategory: 'standard' as const,
          status: 'corroborated' as const,
          corroborationCount: 3,
          note: 'Checked the AXS app day of sale. GA was $45 + $10 fees showed at checkout.',
        })
        .returning()

      if (primarySub[0]) {
        await db
          .insert(submissionConfirms)
          .values([
            {
              submissionId: primarySub[0].id,
              userId: FAKE_USER_IDS.amy,
              method: 'same-vendor' as const,
            },
            {
              submissionId: primarySub[0].id,
              userId: FAKE_USER_IDS.taylor,
              method: 'same-vendor' as const,
            },
          ])
          .onConflictDoNothing()

        // Counter-submission disputing the primary
        await db
          .insert(priceSubmissions)
          .values({
            eventId: ev.B.id,
            userId: FAKE_USER_IDS.sam,
            priceMin: '60.00',
            priceMax: '70.00',
            tier: 'GA' as const,
            vendor: 'Ticketmaster' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            disputedSubmissionId: primarySub[0].id,
            note: 'Saw it listed at $65 on SeatGeek resale. Might be different tier.',
          })
          .onConflictDoNothing()

        console.warn(
          'Patched Event B: inserted Ticketmaster primary + counter-submission.',
        )
      }
    }

    // Event B — second corroborated (AXS alternate) for MultiTierLiveCard
    const [bCorrobCount] = ev.B
      ? await db
          .select({ total: count() })
          .from(priceSubmissions)
          .where(
            and(
              eq(priceSubmissions.eventId, ev.B.id),
              eq(priceSubmissions.status, 'corroborated'),
            ),
          )
      : [{ total: 2 }]

    if (ev.B && (bCorrobCount?.total ?? 0) < 2) {
      const altSub = await db
        .insert(priceSubmissions)
        .values({
          eventId: ev.B.id,
          userId: FAKE_USER_IDS.kai,
          priceMin: '48.00',
          priceMax: '60.00',
          tier: 'GA' as const,
          vendor: 'AXS' as const,
          howFound: 'saw_listing' as const,
          sourceCategory: 'standard' as const,
          status: 'corroborated' as const,
          corroborationCount: 3,
        })
        .returning()

      if (altSub[0]) {
        await db
          .insert(submissionConfirms)
          .values([
            {
              submissionId: altSub[0].id,
              userId: FAKE_USER_IDS.marco,
              method: 'same-vendor' as const,
            },
            {
              submissionId: altSub[0].id,
              userId: FAKE_USER_IDS.jess,
              method: 'same-vendor' as const,
            },
          ])
          .onConflictDoNothing()
        console.warn('Patched Event B: inserted AXS alternate submission.')
      }
    }

    // Event B — ensure a pending counter-submission exists (for dispute UI)
    if (ev.B && !(await hasSubmission(ev.B.id, 'pending'))) {
      // Get any corroborated submission to dispute against
      const [targetSub] = await db
        .select({ id: priceSubmissions.id })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.eventId, ev.B.id),
            eq(priceSubmissions.status, 'corroborated'),
          ),
        )
        .limit(1)

      if (targetSub) {
        await db
          .insert(priceSubmissions)
          .values({
            eventId: ev.B.id,
            userId: FAKE_USER_IDS.sam,
            priceMin: '60.00',
            priceMax: '70.00',
            tier: 'GA' as const,
            vendor: 'Ticketmaster' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            disputedSubmissionId: targetSub.id,
            note: 'Saw it listed at $65 on SeatGeek resale. Might be different tier.',
          })
          .onConflictDoNothing()
        console.warn(
          'Patched Event B: inserted counter-submission (pending dispute).',
        )
      }
    }

    // Event C — pending VIP submission with 1 confirm
    if (ev.C && !(await hasSubmission(ev.C.id, 'pending'))) {
      const cSub = await db
        .insert(priceSubmissions)
        .values({
          eventId: ev.C.id,
          userId: FAKE_USER_IDS.riley,
          priceMin: '85.00',
          priceMax: '110.00',
          tier: 'VIP' as const,
          vendor: 'AXS' as const,
          howFound: 'bought_myself' as const,
          sourceCategory: 'standard' as const,
          status: 'pending' as const,
          corroborationCount: 2,
          note: 'Walked up to the Bluebird box office. GA face value, no fees.',
        })
        .returning()

      if (cSub[0]) {
        await db
          .insert(submissionConfirms)
          .values({
            submissionId: cSub[0].id,
            userId: FAKE_USER_IDS.marco,
            method: 'box-office' as const,
          })
          .onConflictDoNothing()
        console.warn('Patched Event C: inserted VIP pending submission.')
      }
    }

    // Events D, E, F, G — each need 1 corroborated submission
    const defgPatches: Array<{
      event: (typeof ev)[keyof typeof ev]
      userId: string
      priceMin: string
      priceMax?: string
      vendor: 'AXS' | 'Ticketmaster'
      howFound: 'bought_myself' | 'saw_listing'
      label: string
    }> = [
      {
        event: ev.D,
        userId: FAKE_USER_IDS.jess,
        priceMin: '40.00',
        vendor: 'AXS',
        howFound: 'bought_myself',
        label: 'D',
      },
      {
        event: ev.E,
        userId: FAKE_USER_IDS.marco,
        priceMin: '30.00',
        priceMax: '45.00',
        vendor: 'Ticketmaster',
        howFound: 'saw_listing',
        label: 'E',
      },
      {
        event: ev.F,
        userId: FAKE_USER_IDS.taylor,
        priceMin: '35.00',
        vendor: 'AXS',
        howFound: 'bought_myself',
        label: 'F',
      },
      {
        event: ev.G,
        userId: FAKE_USER_IDS.amy,
        priceMin: '50.00',
        priceMax: '65.00',
        vendor: 'Ticketmaster',
        howFound: 'saw_listing',
        label: 'G',
      },
    ]

    for (const patch of defgPatches) {
      if (!patch.event) continue
      if (await hasSubmission(patch.event.id, 'corroborated')) continue

      await db
        .insert(priceSubmissions)
        .values({
          eventId: patch.event.id,
          userId: patch.userId,
          priceMin: patch.priceMin,
          priceMax: patch.priceMax ?? null,
          tier: 'GA' as const,
          vendor: patch.vendor as 'AXS' | 'Ticketmaster',
          howFound: patch.howFound as 'bought_myself' | 'saw_listing',
          sourceCategory: deriveSourceCategory(patch.vendor, patch.howFound),
          status: 'corroborated' as const,
          corroborationCount: 2,
        })
        .onConflictDoNothing()
      console.warn(
        `Patched Event ${patch.label}: inserted corroborated submission.`,
      )
    }

    // --- Step 4: ensure event reports and confirms exist ---

    const hasReport = async (eventId: string) => {
      const [row] = await db
        .select({ total: count() })
        .from(eventReports)
        .where(eq(eventReports.eventId, eventId))
      return (row?.total ?? 0) > 0
    }

    const pastDate = new Date(Date.now() - 2 * 86_400_000)

    // D — pending sold-out report
    if (ev.D && !(await hasReport(ev.D.id))) {
      await db.insert(eventReports).values({
        eventId: ev.D.id,
        reporterId: FAKE_USER_IDS.riley,
        status: 'sold-out' as const,
        evidenceMethod: 'venue_site' as const,
        resolvedAt: null,
        resolution: null,
      })
      console.warn('Patched Event D: inserted sold-out report.')
    }

    // E — pending cancelled report
    if (ev.E && !(await hasReport(ev.E.id))) {
      await db.insert(eventReports).values({
        eventId: ev.E.id,
        reporterId: FAKE_USER_IDS.sam,
        status: 'cancelled' as const,
        evidenceMethod: 'saw_listing' as const,
        resolvedAt: null,
        resolution: null,
      })
      console.warn('Patched Event E: inserted cancelled report.')
    }

    // F — pending postponed report
    if (ev.F && !(await hasReport(ev.F.id))) {
      await db.insert(eventReports).values({
        eventId: ev.F.id,
        reporterId: FAKE_USER_IDS.jess,
        status: 'postponed' as const,
        evidenceMethod: 'other' as const,
        resolvedAt: null,
        resolution: null,
      })
      console.warn('Patched Event F: inserted postponed report.')
    }

    // G — promoted sold-out report (resolved)
    if (ev.G && !(await hasReport(ev.G.id))) {
      const reportG = await db
        .insert(eventReports)
        .values({
          eventId: ev.G.id,
          reporterId: FAKE_USER_IDS.marco,
          status: 'sold-out' as const,
          evidenceMethod: 'bought_myself' as const,
          resolvedAt: pastDate,
          resolution: 'promoted' as const,
        })
        .returning()

      if (reportG[0]) {
        await db
          .insert(eventReportConfirms)
          .values([
            { reportId: reportG[0].id, userId: FAKE_USER_IDS.amy },
            { reportId: reportG[0].id, userId: FAKE_USER_IDS.riley },
            { reportId: reportG[0].id, userId: FAKE_USER_IDS.jess },
          ])
          .onConflictDoNothing()
        console.warn(
          'Patched Event G: inserted promoted sold-out report + 3 confirms.',
        )
      }
    }

    // H — promoted cancelled report (resolved); event.status already 'cancelled'
    if (ev.H && !(await hasReport(ev.H.id))) {
      await db.insert(eventReports).values({
        eventId: ev.H.id,
        reporterId: FAKE_USER_IDS.taylor,
        status: 'cancelled' as const,
        evidenceMethod: 'saw_listing' as const,
        resolvedAt: pastDate,
        resolution: 'promoted' as const,
      })
      console.warn('Patched Event H: inserted promoted cancelled report.')
    }

    // I — pending cancelled report (imminent show, tests 3-confirm threshold)
    if (ev.I && !(await hasReport(ev.I.id))) {
      await db.insert(eventReports).values({
        eventId: ev.I.id,
        reporterId: FAKE_USER_IDS.kai,
        status: 'cancelled' as const,
        evidenceMethod: 'venue_site' as const,
        resolvedAt: null,
        resolution: null,
      })
      console.warn('Patched Event I: inserted imminent cancelled report.')
    }

    console.warn('Phase 8.5 full data patch complete.')
  }

  // -----------------------------------------------------------------------
  // P8.5 events K–P: price confirmation UI test states
  // -----------------------------------------------------------------------
  const phase85KPCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
    .where(sql`title LIKE '[P8.5] Community Confirm%'`)
  const hasPhase85KP = (phase85KPCount[0]?.count ?? 0) > 0

  if (!hasPhase85KP) {
    const allVenuesKP = await db.select().from(venues)
    const ogdenKP = allVenuesKP.find((vn) => vn.slug === 'ogden-theatre')
    const missionKP = allVenuesKP.find((vn) => vn.slug === 'mission-ballroom')
    const bluebirdKP = allVenuesKP.find((vn) => vn.slug === 'bluebird-theater')
    const gothicKP = allVenuesKP.find((vn) => vn.slug === 'gothic-theatre')
    const summitKP = allVenuesKP.find((vn) => vn.slug === 'summit-music-hall')
    const marquisKP = allVenuesKP.find((vn) => vn.slug === 'marquis-theater')

    const venueKP_A = ogdenKP ?? allVenuesKP[0]
    const venueKP_B = missionKP ?? allVenuesKP[0]
    const venueKP_C = bluebirdKP ?? allVenuesKP[0]
    const venueKP_D = gothicKP ?? allVenuesKP[0]
    const venueKP_E = summitKP ?? allVenuesKP[0]
    const venueKP_F = marquisKP ?? allVenuesKP[0]

    if (
      !venueKP_A ||
      !venueKP_B ||
      !venueKP_C ||
      !venueKP_D ||
      !venueKP_E ||
      !venueKP_F
    ) {
      console.warn('Phase 8.5 K–P: no venues found — skipping.')
    } else {
      const phase85KPRows = [
        // K — Community price submitted by another fan (user sees "Confirm price")
        {
          venueId: venueKP_A.id,
          title: '[P8.5] Community Confirm',
          artist: '[P8.5] Community Confirm Artist',
          date: '2026-09-02',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // L — Community price, no submission yet (user submits themselves to test self-view)
        {
          venueId: venueKP_B.id,
          title: '[P8.5] Community Self',
          artist: '[P8.5] Community Self Artist',
          date: '2026-09-09',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // M — Community price submitted by another fan (user confirms to test confirmed state)
        {
          venueId: venueKP_C.id,
          title: '[P8.5] Community Confirmed',
          artist: '[P8.5] Community Confirmed Artist',
          date: '2026-09-16',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // N — Box office price submitted by another fan (user sees "Confirm price")
        {
          venueId: venueKP_D.id,
          title: '[P8.5] Box Office Confirm',
          artist: '[P8.5] Box Office Confirm Artist',
          date: '2026-09-23',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // O — Box office price, no submission yet (user submits themselves to test self-view)
        {
          venueId: venueKP_E.id,
          title: '[P8.5] Box Office Self',
          artist: '[P8.5] Box Office Self Artist',
          date: '2026-09-30',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
        // P — Box office price submitted by another fan (user confirms to test confirmed state)
        {
          venueId: venueKP_F.id,
          title: '[P8.5] Box Office Confirmed',
          artist: '[P8.5] Box Office Confirmed Artist',
          date: '2026-10-07',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
        },
      ]

      const insertedKP = await db
        .insert(eventsTable)
        .values(withCanonicalArtist(phase85KPRows))
        .returning()
      console.warn(`Inserted ${insertedKP.length} Phase 8.5 K–P test events.`)

      const kpEvent = (suffix: string) =>
        insertedKP.find((ev) => ev.title === `[P8.5] ${suffix}`)

      const eventK = kpEvent('Community Confirm')
      const eventL = kpEvent('Community Self') // intentionally no submission seeded
      const eventM = kpEvent('Community Confirmed')
      const eventN = kpEvent('Box Office Confirm')
      const eventO = kpEvent('Box Office Self') // intentionally no submission seeded
      const eventP = kpEvent('Box Office Confirmed')

      void eventL // no submission needed
      void eventO // no submission needed

      const kpSubmissions = [
        // K — community GA, submitted by another fake user, with note
        ...(eventK
          ? [
              {
                eventId: eventK.id,
                userId: FAKE_USER_IDS.marco,
                priceMin: '48.00',
                priceMax: '58.00',
                tier: 'GA' as const,
                vendor: 'AXS' as const,
                howFound: 'saw_listing' as const,
                status: 'pending' as const,
                corroborationCount: 1,
                note: 'GA standing — checked the cart on AXS. Showed $48 face, $58 with fees.',
              },
            ]
          : []),
        // M — community GA, submitted by another fake user, with note (user confirms via UI)
        ...(eventM
          ? [
              {
                eventId: eventM.id,
                userId: FAKE_USER_IDS.jess,
                priceMin: '48.00',
                priceMax: '58.00',
                tier: 'GA' as const,
                vendor: 'AXS' as const,
                howFound: 'bought_myself' as const,
                status: 'pending' as const,
                corroborationCount: 1,
                note: 'GA standing — checked the cart on AXS. Showed $48 face, $58 with fees.',
              },
            ]
          : []),
        // N — box office GA, submitted by another fake user, with note
        ...(eventN
          ? [
              {
                eventId: eventN.id,
                userId: FAKE_USER_IDS.riley,
                priceMin: '42.00',
                priceMax: null,
                tier: 'GA' as const,
                vendor: 'VenueBoxOffice' as const,
                howFound: 'at_the_venue' as const,
                status: 'pending' as const,
                corroborationCount: 1,
                note: 'Walked up to the Mission window, bought GA face. No fees.',
              },
            ]
          : []),
        // P — box office GA, submitted by another fake user, with note (user confirms via UI)
        ...(eventP
          ? [
              {
                eventId: eventP.id,
                userId: FAKE_USER_IDS.taylor,
                priceMin: '42.00',
                priceMax: null,
                tier: 'GA' as const,
                vendor: 'VenueBoxOffice' as const,
                howFound: 'at_the_venue' as const,
                status: 'pending' as const,
                corroborationCount: 1,
                note: 'Walked up to the Mission window, bought GA face. No fees.',
              },
            ]
          : []),
      ]

      if (kpSubmissions.length > 0) {
        await db
          .insert(priceSubmissions)
          .values(
            kpSubmissions.map((row) => ({
              ...row,
              sourceCategory: deriveSourceCategory(row.vendor, row.howFound),
            })),
          )
          .onConflictDoNothing()
        console.warn(`Inserted ${kpSubmissions.length} K–P price submissions.`)
      }
    }
  } else {
    console.warn('Phase 8.5 K–P test events already seeded, skipping.')
  }

  // -----------------------------------------------------------------------
  // PR4 events Q–Y: consumer UI states from PR #788 (price-source-consumer-ui).
  // Each event lights up at least one branch of
  // apps/web/src/components/consumer/price-region/lib/decision-tree.ts so a
  // dev can run `pnpm db:seed` and click through every new component + state.
  // -----------------------------------------------------------------------
  // Guard re-trigger requires BOTH (a) the FULL expected event count and
  // (b) the end-of-block marker — the Admin Defer counter submission. A
  // previous run that inserted all 9 events but crashed before the
  // downstream submissions block would otherwise leave the seed declaring
  // "PR4 done" with no submissions on those events. The end-of-block
  // marker forces a re-run in that case; the per-event idempotency guard
  // (`pr4EventCompletedByUser` / `pr4EventCompletedByCounter` below) skips
  // events that already finished.
  // The expected title set is checked here (not just a >= 9 count) so a
  // dev with stray [PR4] events (manual experiments, leftover branches)
  // can't accidentally satisfy the count while an official event is
  // missing. Each title MUST match exactly one row in pr4EventRows
  // below.
  const PR4_EXPECTED_TITLES = [
    '[PR4] Sold Out Resale',
    '[PR4] Sold Out Contribute',
    '[PR4] No Price Resale',
    '[PR4] No Price Empty',
    '[PR4] Resale Headline',
    '[PR4] Multi Source Mixed',
    '[PR4] Mixed Tier',
    '[PR4] Reports Caption',
    '[PR4] Admin Defer',
  ] as const
  const pr4ExistingTitles = await db
    .select({ title: eventsTable.title })
    .from(eventsTable)
    .where(like(eventsTable.title, '[PR4]%'))
  const pr4ExistingTitleSet = new Set(pr4ExistingTitles.map((ev) => ev.title))
  // Marker mirrors the full state #18 requirement: pending counter +
  // admin defer action. If a dev resolves the counter (status != pending),
  // clears the defer (lastAdminActionKind != defer), or removes the
  // dispute link, the seed re-triggers and recreates the row.
  const pr4AdminDeferMarker = await db
    .select({ id: priceSubmissions.id })
    .from(priceSubmissions)
    .innerJoin(eventsTable, eq(eventsTable.id, priceSubmissions.eventId))
    .where(
      and(
        eq(eventsTable.title, '[PR4] Admin Defer'),
        eq(priceSubmissions.status, 'pending'),
        isNotNull(priceSubmissions.disputedSubmissionId),
        eq(priceSubmissions.lastAdminActionKind, 'defer'),
        // The defer handler writes (kind, at) together; a row with kind
        // set but at NULL is half-populated and won't render state #18.
        isNotNull(priceSubmissions.lastAdminActionAt),
      ),
    )
    .limit(1)
  const hasPr4Events = PR4_EXPECTED_TITLES.every((title) =>
    pr4ExistingTitleSet.has(title),
  )
  const hasPr4EndMarker = pr4AdminDeferMarker.length > 0
  const hasPr4 = hasPr4Events && hasPr4EndMarker

  if (!hasPr4) {
    const allVenuesPr4 = await db.select().from(venues)
    // Return undefined when a slug isn't found so the guard below can catch
    // the missing-venue case explicitly. The previous fallback to
    // allVenuesPr4[0] silently assigned PR4 events to an unrelated venue,
    // producing misleading UI states (e.g. "[PR4] Sold Out Resale" landing
    // at Mission Ballroom because Bluebird wasn't seeded).
    const findVenue = (slug: string) =>
      allVenuesPr4.find((vn) => vn.slug === slug)

    const venueBluebird = findVenue('bluebird-theater')
    const venueHiDive = findVenue('hi-dive')
    const venueLarimer = findVenue('larimer-lounge')
    const venueMarquis = findVenue('marquis-theater')
    const venueGothic = findVenue('gothic-theatre')
    const venueMission = findVenue('mission-ballroom')
    const venueFillmore = findVenue('fillmore-auditorium')
    const venueOgden = findVenue('ogden-theatre')
    const venueRedRocks = findVenue('red-rocks-amphitheatre')

    if (
      !venueBluebird ||
      !venueHiDive ||
      !venueLarimer ||
      !venueMarquis ||
      !venueGothic ||
      !venueMission ||
      !venueFillmore ||
      !venueOgden ||
      !venueRedRocks
    ) {
      console.warn(
        'PR4: one or more expected venues missing — skipping. Re-run after the venues block populates the standard Denver venue set.',
      )
    } else {
      const pr4EventRows = [
        // Q — Sold out with resale ticketLink (decision-tree: sold-out-resale).
        // Lights up SoldOutPriceCard + FaceValueCard + resale ProvenanceCTA.
        {
          venueId: venueBluebird.id,
          title: '[PR4] Sold Out Resale',
          artist: '[PR4] Sold Out Resale Artist',
          date: '2026-08-15',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          ticketLinks: [
            {
              kind: 'resale' as const,
              vendor: 'StubHub',
              url: 'https://www.stubhub.com/example-resale',
            },
          ],
        },
        // R — Sold out with no ticketLinks (decision-tree: sold-out-contribute,
        // §9 Q1 lock). Lights up SoldOutPriceCard variant='no-listing' +
        // ContributeFaceValueCard.
        {
          venueId: venueHiDive.id,
          title: '[PR4] Sold Out Contribute',
          artist: '[PR4] Sold Out Contribute Artist',
          date: '2026-10-14',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          ticketLinks: null,
        },
        // S — No priceByTier + resale ticketLink (decision-tree: no-price-resale).
        // Lights up PriceDisplay no-price + FaceValueCard variant='no-price' +
        // ProvenanceCTA outline.
        {
          venueId: venueLarimer.id,
          title: '[PR4] No Price Resale',
          artist: '[PR4] No Price Resale Artist',
          date: '2026-11-07',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          ticketLinks: [
            {
              kind: 'resale' as const,
              vendor: 'SeatGeek',
              url: 'https://seatgeek.com/example-resale',
            },
          ],
        },
        // T — No priceByTier + no ticketLinks (decision-tree: no-price-empty,
        // §9 Q2-eng lock). Falls through to legacy NoPriceCard only.
        {
          venueId: venueMarquis.id,
          title: '[PR4] No Price Empty',
          artist: '[PR4] No Price Empty Artist',
          date: '2026-12-03',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          ticketLinks: null,
        },
        // U — Resale-only headline (decision-tree: resale-headline, state #3).
        // Single tier with sourceCategory='resale' and NO boxoffice/standard
        // alternate anywhere. Routes to MultiTierLiveCard kind='resale' +
        // show-level FaceValueCard.
        {
          venueId: venueGothic.id,
          title: '[PR4] Resale Headline',
          artist: '[PR4] Resale Headline Artist',
          date: '2026-09-26',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          ticketLinks: [
            {
              kind: 'resale' as const,
              vendor: 'StubHub',
              url: 'https://www.stubhub.com/example-resale-headline',
            },
          ],
        },
        // V — Multi-source mixed (decision-tree: multi-source-mixed, state #5).
        // GA tier has BOTH a boxoffice headline AND a resale alternate (same
        // tier). VIP tier adds a second tier so priceByTier.length > 1.
        {
          venueId: venueMission.id,
          title: '[PR4] Multi Source Mixed',
          artist: '[PR4] Multi Source Mixed Artist',
          date: '2027-01-22',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          priceSource: 'community' as const,
          ticketLinks: [
            {
              kind: 'primary' as const,
              vendor: 'AXS',
              url: 'https://www.axs.com/example-primary',
            },
          ],
        },
        // W — Mixed-tier (decision-tree: mixed-tier, state #6). GA has a
        // corroborated headline; Reserved has only pending submissions.
        {
          venueId: venueFillmore.id,
          title: '[PR4] Mixed Tier',
          artist: '[PR4] Mixed Tier Artist',
          date: '2027-02-19',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          priceSource: 'community' as const,
        },
        // X — Multi-tier reports caption (state #19). GA tier has 3+ total
        // submissions (corroborated + pending) so reports > 1 → meta line shows
        // "· N reports".
        {
          venueId: venueOgden.id,
          title: '[PR4] Reports Caption',
          artist: '[PR4] Reports Caption Artist',
          date: '2027-03-04',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          priceSource: 'community' as const,
        },
        // Y — Admin defer engagement pill (state #18). GA has a corroborated
        // headline + a counter submission whose lastAdminActionKind='defer' →
        // PendingCardB shows "Admin requested more info" pill.
        {
          venueId: venueRedRocks.id,
          title: '[PR4] Admin Defer',
          artist: '[PR4] Admin Defer Artist',
          date: '2027-04-25',
          showTime: '20:00',
          status: 'upcoming' as const,
          verified: false,
          priceSource: 'community' as const,
        },
      ]

      // Pre-filter against existing PR4 titles so a previous run that
      // inserted some-but-not-all PR4 events (crashed mid-block) can
      // re-attempt to fill in the missing ones without hitting the
      // (venue_id, date, artist) unique index or creating duplicates.
      const existingPr4 = await db
        .select()
        .from(eventsTable)
        .where(like(eventsTable.title, '[PR4]%'))
      const existingPr4Titles = new Set(existingPr4.map((ev) => ev.title))
      const newPr4EventRows = pr4EventRows.filter(
        (row) => !existingPr4Titles.has(row.title),
      )

      const insertedPr4 =
        newPr4EventRows.length > 0
          ? await db
              .insert(eventsTable)
              .values(withCanonicalArtist(newPr4EventRows))
              .returning()
          : []
      console.warn(
        `Inserted ${insertedPr4.length} PR4 test events (${existingPr4.length} already present).`,
      )

      // Lookup considers BOTH newly-inserted + previously-existing rows so
      // partial prior runs can still wire up their submissions/reports below.
      const allPr4Events = [...existingPr4, ...insertedPr4]
      const pr4Event = (suffix: string) =>
        allPr4Events.find((ev) => ev.title === `[PR4] ${suffix}`)

      const evQ = pr4Event('Sold Out Resale')
      const evR = pr4Event('Sold Out Contribute')
      const evU = pr4Event('Resale Headline')
      const evV = pr4Event('Multi Source Mixed')
      const evW = pr4Event('Mixed Tier')
      const evX = pr4Event('Reports Caption')
      const evY = pr4Event('Admin Defer')
      // Events S, T intentionally have no price submissions (no-price states).

      // Per-event idempotency: price_submissions DOES have some partial
      // unique indexes (migration 0040: one corroborated boxoffice row per
      // (event,tier,source_category); 0041: one pending counter per
      // disputed_submission_id), but neither of those covers the full set
      // of (event,user,tier,vendor) combos this seed inserts. So
      // `.onConflictDoNothing()` cannot dedupe arbitrary partial re-runs
      // on its own.
      //
      // Strategy: each event's insert block has a designated END-OF-BLOCK
      // marker — the last submission it writes — and we skip the block
      // when that marker is present. This is narrower than "any
      // submissions exist": if a previous run inserted the headline but
      // crashed before the counter for evY, the marker (the counter) is
      // absent, so the block re-runs. Inside Y's block (the case most
      // likely to crash partially — only 2 rows), each insert uses
      // pr4UpsertSubmission for true per-row idempotency on (eventId,
      // userId). U/V/W/X's marker is the last submitter on that event;
      // tighter per-row idempotency for those blocks could land in a
      // follow-up if partial crashes turn out to be an issue in practice.
      const pr4EventCompletedByUser = async (
        eventId: string,
        finalUserId: string,
      ): Promise<boolean> => {
        const rows = await db
          .select({ id: priceSubmissions.id })
          .from(priceSubmissions)
          .where(
            and(
              eq(priceSubmissions.eventId, eventId),
              eq(priceSubmissions.userId, finalUserId),
            ),
          )
          .limit(1)
        return rows.length > 0
      }
      // Treats an event as completed only when a pending counter with an
      // admin defer action exists. State #18 needs all four: pending
      // status, dispute link, lastAdminActionKind='defer', AND
      // lastAdminActionAt set (the API pair-narrows kind+at, so kind
      // without timestamp is half-populated). Missing any means the
      // test state is unreachable and the block should re-seed.
      const pr4EventCompletedByCounter = async (
        eventId: string,
      ): Promise<boolean> => {
        const rows = await db
          .select({ id: priceSubmissions.id })
          .from(priceSubmissions)
          .where(
            and(
              eq(priceSubmissions.eventId, eventId),
              eq(priceSubmissions.status, 'pending'),
              isNotNull(priceSubmissions.disputedSubmissionId),
              eq(priceSubmissions.lastAdminActionKind, 'defer'),
              isNotNull(priceSubmissions.lastAdminActionAt),
            ),
          )
          .limit(1)
        return rows.length > 0
      }

      // Per-row idempotent insert — used inside each event's submission
      // block so re-running the block (after the outer marker said "redo")
      // doesn't duplicate rows that already landed. The seed uses each
      // (eventId, userId) combo at most once per event, so the pair is a
      // safe natural key. Returns the existing row when present, or the
      // newly-inserted row otherwise.
      const pr4UpsertSubmission = async (
        row: NewPriceSubmission,
      ): Promise<{ id: string } | null> => {
        if (!row.eventId || !row.userId) return null
        const existing = await db
          .select({ id: priceSubmissions.id })
          .from(priceSubmissions)
          .where(
            and(
              eq(priceSubmissions.eventId, row.eventId),
              eq(priceSubmissions.userId, row.userId),
            ),
          )
          .limit(1)
        if (existing.length > 0) return existing[0] ?? null
        const inserted = await db
          .insert(priceSubmissions)
          .values(row)
          .returning({ id: priceSubmissions.id })
        return inserted[0] ?? null
      }

      // --- Sold-out reports for Q + R (drives priceStatus='soldout' in API) ---
      // Time offsets in ms — used throughout to scatter submittedAt so feeds
      // don't all look like one batch insert. "older" = ~weeks before show,
      // "fresh" = within last few days.
      const dayMs = 86_400_000
      const pastDatePr4 = new Date(Date.now() - 2 * dayMs)
      const olderDatePr4 = new Date(Date.now() - 21 * dayMs)
      const olderishDatePr4 = new Date(Date.now() - 10 * dayMs)
      const veryRecentDatePr4 = new Date(Date.now() - 1 * dayMs)
      const soldOutReportTargets = [
        { event: evQ, reporter: FAKE_USER_IDS.marco, label: 'Q' },
        { event: evR, reporter: FAKE_USER_IDS.taylor, label: 'R' },
      ]
      for (const target of soldOutReportTargets) {
        if (!target.event) continue
        // Idempotency: event_reports has a partial-unique index on
        // (event_id) WHERE status='sold-out' AND resolved_at IS NOT NULL
        // AND resolution='promoted' (see migration 0032) — one "active
        // promoted" sold-out report per event. We insert with
        // resolved_at = pastDatePr4 + resolution = 'promoted', so a
        // re-run without this guard hits the unique index. Skip if the
        // active-promoted row already exists.
        // Match the unique-index predicate EXACTLY — status='sold-out' AND
        // resolved_at IS NOT NULL AND resolution='promoted'. A narrower
        // check is intentional: an unresolved (resolved_at=NULL) or
        // non-promoted sold-out report should NOT cause us to skip
        // inserting the promoted row that drives PR4 sold-out UI states.
        const existingReport = await db
          .select({ id: eventReports.id })
          .from(eventReports)
          .where(
            and(
              eq(eventReports.eventId, target.event.id),
              eq(eventReports.status, 'sold-out'),
              isNotNull(eventReports.resolvedAt),
              eq(eventReports.resolution, 'promoted'),
            ),
          )
          .limit(1)
        if (existingReport.length > 0) {
          console.warn(
            `PR4 Event ${target.label}: promoted sold-out report already present, skipping.`,
          )
          continue
        }
        const insertedReport = await db
          .insert(eventReports)
          .values({
            eventId: target.event.id,
            reporterId: target.reporter,
            status: 'sold-out' as const,
            evidenceMethod: 'venue_site' as const,
            resolvedAt: pastDatePr4,
            resolution: 'promoted' as const,
          })
          .returning()
        if (insertedReport[0]) {
          await db
            .insert(eventReportConfirms)
            .values([
              { reportId: insertedReport[0].id, userId: FAKE_USER_IDS.amy },
              { reportId: insertedReport[0].id, userId: FAKE_USER_IDS.riley },
              { reportId: insertedReport[0].id, userId: FAKE_USER_IDS.jess },
            ])
            .onConflictDoNothing()
        }
        console.warn(
          `PR4 Event ${target.label}: inserted promoted sold-out report + 3 confirms.`,
        )
      }

      // --- U: resale-only single-tier headline -------------------------------
      // End-of-block marker: notyourgf's fresh pending (last insert in block).
      if (
        evU &&
        !(await pr4EventCompletedByUser(evU.id, FAKE_USER_IDS.notyourgf))
      ) {
        const resaleHeadline = await pr4UpsertSubmission({
          eventId: evU.id,
          userId: FAKE_USER_IDS.sam,
          priceMin: '95.00',
          priceMax: '140.00',
          tier: 'GA' as const,
          vendor: 'SeatGeek' as const,
          howFound: 'saw_listing' as const,
          sourceCategory: 'resale' as const,
          status: 'corroborated' as const,
          corroborationCount: 3,
          note: 'SeatGeek listings ranged from $95 to $140 face. No box office number yet.',
          createdAt: olderDatePr4,
          updatedAt: olderDatePr4,
        })
        if (resaleHeadline) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: resaleHeadline.id,
                userId: FAKE_USER_IDS.kai,
                method: 'same-vendor' as const,
              },
              {
                submissionId: resaleHeadline.id,
                userId: FAKE_USER_IDS.phishfan42,
                method: 'same-vendor' as const,
              },
            ])
            .onConflictDoNothing()
        }

        // Second resale submission at the same tier from a different fan —
        // drives multi-report social proof on the resale-only headline.
        const uSecondResale = await pr4UpsertSubmission({
          eventId: evU.id,
          userId: FAKE_USER_IDS.denvermusic,
          priceMin: '105.00',
          priceMax: '160.00',
          tier: 'GA' as const,
          vendor: 'SeatGeek' as const,
          howFound: 'saw_listing' as const,
          sourceCategory: 'resale' as const,
          status: 'corroborated' as const,
          corroborationCount: 2,
          note: 'SeatGeek crept up to $160 over the weekend — supply tightening.',
          createdAt: olderishDatePr4,
          updatedAt: olderishDatePr4,
        })
        if (uSecondResale) {
          // corroborationCount=2 means submitter + 1 confirmer; insert the
          // matching submission_confirms row so the API-derived confirm
          // count stays consistent with the status.
          await db
            .insert(submissionConfirms)
            .values({
              submissionId: uSecondResale.id,
              userId: FAKE_USER_IDS.bouldergrrl,
              method: 'same-vendor' as const,
            })
            .onConflictDoNothing()
        }

        // Fresh pending — last 24h, one fan, drives "live, just submitted" feel.
        await db
          .insert(priceSubmissions)
          .values({
            eventId: evU.id,
            userId: FAKE_USER_IDS.notyourgf,
            priceMin: '88.00',
            priceMax: '120.00',
            tier: 'GA' as const,
            vendor: 'SeatGeek' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'resale' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            note: 'SeatGeek listing, no fees yet.',
            createdAt: veryRecentDatePr4,
            updatedAt: veryRecentDatePr4,
          })
          .onConflictDoNothing()

        console.warn(
          'PR4 Event U: inserted resale headline + corroborated alt + fresh pending.',
        )
      }

      // --- V: multi-source mixed (GA boxoffice + GA resale alt + VIP boxoffice)
      // End-of-block marker: lola's fresh pending GA (last insert in block).
      if (evV && !(await pr4EventCompletedByUser(evV.id, FAKE_USER_IDS.lola))) {
        const vGaBoxoffice = await pr4UpsertSubmission({
          eventId: evV.id,
          userId: FAKE_USER_IDS.riley,
          priceMin: '32.00',
          priceMax: null,
          tier: 'GA' as const,
          vendor: 'VenueBoxOffice' as const,
          howFound: 'at_the_venue' as const,
          sourceCategory: 'boxoffice' as const,
          status: 'corroborated' as const,
          corroborationCount: 4,
          note: 'Walked up to Mission box office — GA was $32 even, no fees.',
          createdAt: olderDatePr4,
          updatedAt: olderDatePr4,
        })
        if (vGaBoxoffice) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: vGaBoxoffice.id,
                userId: FAKE_USER_IDS.amy,
                method: 'box-office' as const,
              },
              {
                submissionId: vGaBoxoffice.id,
                userId: FAKE_USER_IDS.bouldergrrl,
                method: 'box-office' as const,
              },
              {
                submissionId: vGaBoxoffice.id,
                userId: FAKE_USER_IDS.mtncreature,
                method: 'box-office' as const,
              },
            ])
            .onConflictDoNothing()
        }

        // Same tier (GA), resale alternate — surfaces as TierAlternate in
        // the same block under "Or pay for convenience".
        const vGaResale = await pr4UpsertSubmission({
          eventId: evV.id,
          userId: FAKE_USER_IDS.sam,
          priceMin: '52.00',
          priceMax: '78.00',
          tier: 'GA' as const,
          vendor: 'Ticketmaster' as const,
          howFound: 'saw_listing' as const,
          sourceCategory: 'resale' as const,
          status: 'corroborated' as const,
          corroborationCount: 2,
          note: 'Ticketmaster Verified Resale showed $52-78. Useful if you do not want to wait for the line.',
          createdAt: olderishDatePr4,
          updatedAt: olderishDatePr4,
        })
        if (vGaResale) {
          await db
            .insert(submissionConfirms)
            .values({
              submissionId: vGaResale.id,
              userId: FAKE_USER_IDS.taylor,
              method: 'same-vendor' as const,
            })
            .onConflictDoNothing()
        }

        // VIP tier — separate boxoffice headline so priceByTier.length > 1.
        const vVipBoxoffice = await pr4UpsertSubmission({
          eventId: evV.id,
          userId: FAKE_USER_IDS.jess,
          priceMin: '85.00',
          priceMax: null,
          tier: 'VIP' as const,
          vendor: 'VenueBoxOffice' as const,
          howFound: 'at_the_venue' as const,
          sourceCategory: 'boxoffice' as const,
          status: 'corroborated' as const,
          corroborationCount: 3,
          createdAt: olderDatePr4,
          updatedAt: olderDatePr4,
        })
        if (vVipBoxoffice) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: vVipBoxoffice.id,
                userId: FAKE_USER_IDS.marco,
                method: 'box-office' as const,
              },
              {
                submissionId: vVipBoxoffice.id,
                userId: FAKE_USER_IDS.jordan_m,
                method: 'box-office' as const,
              },
            ])
            .onConflictDoNothing()
        }

        // Fresh pending GA submission from a separate fan — drives "active
        // submissions on a corroborated event" without changing decision tree.
        await db
          .insert(priceSubmissions)
          .values({
            eventId: evV.id,
            userId: FAKE_USER_IDS.lola,
            priceMin: '34.00',
            priceMax: null,
            tier: 'GA' as const,
            vendor: 'AXS' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            note: 'AXS listing was holding tier at $34 last night — quick screenshot.',
            createdAt: veryRecentDatePr4,
            updatedAt: veryRecentDatePr4,
          })
          .onConflictDoNothing()

        console.warn(
          'PR4 Event V: inserted GA boxoffice + GA resale alt + VIP boxoffice + fresh pending GA.',
        )
      }

      // --- W: mixed-tier (GA corroborated headline, Reserved pending-only) ---
      // End-of-block marker: jess's Reserved pending (last insert in block).
      if (evW && !(await pr4EventCompletedByUser(evW.id, FAKE_USER_IDS.jess))) {
        const wGaHeadline = await pr4UpsertSubmission({
          eventId: evW.id,
          userId: FAKE_USER_IDS.marco,
          priceMin: '42.00',
          priceMax: '52.00',
          tier: 'GA' as const,
          vendor: 'AXS' as const,
          howFound: 'bought_myself' as const,
          sourceCategory: 'standard' as const,
          status: 'corroborated' as const,
          corroborationCount: 4,
          note: 'AXS GA pre-sale opened at $42 face.',
          createdAt: olderDatePr4,
          updatedAt: olderDatePr4,
        })
        if (wGaHeadline) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: wGaHeadline.id,
                userId: FAKE_USER_IDS.taylor,
                method: 'same-vendor' as const,
              },
              {
                submissionId: wGaHeadline.id,
                userId: FAKE_USER_IDS.phishfan42,
                method: 'same-vendor' as const,
              },
              {
                submissionId: wGaHeadline.id,
                userId: FAKE_USER_IDS.denvermusic,
                method: 'same-vendor' as const,
              },
            ])
            .onConflictDoNothing()
        }

        // Second corroborated GA submission — same tier, different submitter +
        // vendor. Drives the "· N reports" caption naturally on the GA tier.
        const wGaSecond = await pr4UpsertSubmission({
          eventId: evW.id,
          userId: FAKE_USER_IDS.bouldergrrl,
          priceMin: '44.00',
          priceMax: '58.00',
          tier: 'GA' as const,
          vendor: 'Ticketmaster' as const,
          howFound: 'bought_myself' as const,
          sourceCategory: 'standard' as const,
          status: 'corroborated' as const,
          corroborationCount: 2,
          note: 'Same GA, slightly higher on TM after fees rolled in.',
          createdAt: olderishDatePr4,
          updatedAt: olderishDatePr4,
        })
        if (wGaSecond) {
          await db
            .insert(submissionConfirms)
            .values({
              submissionId: wGaSecond.id,
              userId: FAKE_USER_IDS.amy,
              method: 'same-vendor' as const,
            })
            .onConflictDoNothing()
        }

        // Reserved tier — pending-only, no headline. Drives the per-tier
        // "pending · N/2" tell on MixedTierCard's Reserved row.
        await db
          .insert(priceSubmissions)
          .values({
            eventId: evW.id,
            userId: FAKE_USER_IDS.jess,
            priceMin: '78.00',
            priceMax: '95.00',
            tier: 'Reserved' as const,
            vendor: 'Ticketmaster' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            note: 'Reserved seating showed $78-95 on Ticketmaster — one more fan needs to confirm.',
            createdAt: veryRecentDatePr4,
            updatedAt: veryRecentDatePr4,
          })
          .onConflictDoNothing()
        console.warn(
          'PR4 Event W: inserted GA corroborated (x2) + Reserved pending.',
        )
      }

      // --- X: multi-tier reports caption (GA tier with N > 1 reports) --------
      // End-of-block marker: lola's 4th additional GA report (last insert).
      if (evX && !(await pr4EventCompletedByUser(evX.id, FAKE_USER_IDS.lola))) {
        const xGaHeadline = await pr4UpsertSubmission({
          eventId: evX.id,
          userId: FAKE_USER_IDS.riley,
          priceMin: '38.00',
          priceMax: '46.00',
          tier: 'GA' as const,
          vendor: 'AXS' as const,
          howFound: 'bought_myself' as const,
          sourceCategory: 'standard' as const,
          status: 'corroborated' as const,
          corroborationCount: 5,
          note: 'GA opened at $38 on AXS, capped at $46 with fees.',
          createdAt: olderDatePr4,
          updatedAt: olderDatePr4,
        })
        if (xGaHeadline) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: xGaHeadline.id,
                userId: FAKE_USER_IDS.amy,
                method: 'same-vendor' as const,
              },
              {
                submissionId: xGaHeadline.id,
                userId: FAKE_USER_IDS.taylor,
                method: 'same-vendor' as const,
              },
              {
                submissionId: xGaHeadline.id,
                userId: FAKE_USER_IDS.phishfan42,
                method: 'same-vendor' as const,
              },
              {
                submissionId: xGaHeadline.id,
                userId: FAKE_USER_IDS.notyourgf,
                method: 'same-vendor' as const,
              },
            ])
            .onConflictDoNothing()
        }

        // Several additional GA submissions — different submitters, mix of
        // pending + corroborated. Drives reportsByTier well above 1 so the
        // caption shows "· N reports" and the feed feels populated.
        // Routed through pr4UpsertSubmission individually (instead of one
        // batch insert) so a partial-rerun crash doesn't duplicate rows —
        // .onConflictDoNothing() is a no-op here because price_submissions
        // has no (event_id, user_id) unique constraint covering these.
        const xAdditionalSubmissions: NewPriceSubmission[] = [
          {
            eventId: evX.id,
            userId: FAKE_USER_IDS.jess,
            priceMin: '38.00',
            priceMax: '48.00',
            tier: 'GA' as const,
            vendor: 'Ticketmaster' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            note: 'Same GA tier, slightly higher with fees on Ticketmaster.',
            createdAt: olderishDatePr4,
            updatedAt: olderishDatePr4,
          },
          {
            eventId: evX.id,
            userId: FAKE_USER_IDS.sam,
            priceMin: '40.00',
            priceMax: null,
            tier: 'GA' as const,
            vendor: 'AXS' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'standard' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            createdAt: olderishDatePr4,
            updatedAt: olderishDatePr4,
          },
          {
            eventId: evX.id,
            userId: FAKE_USER_IDS.mtncreature,
            priceMin: '38.00',
            priceMax: '44.00',
            tier: 'GA' as const,
            vendor: 'AXS' as const,
            howFound: 'bought_myself' as const,
            sourceCategory: 'standard' as const,
            // Kept as pending here (instead of corroborated) so the row
            // stays consistent without splitting to wire a confirm. The
            // "· N reports" caption counts ALL submissions for the tier
            // regardless of status, so this still feeds the
            // reports-caption test target.
            status: 'pending' as const,
            corroborationCount: 1,
            note: 'Bought two for $38 each — same AXS GA tier.',
            createdAt: olderishDatePr4,
            updatedAt: olderishDatePr4,
          },
          // Fresh pending — last 24h, drives the live-feel. lola is the
          // end-of-block marker (last natural-key check at top of block).
          {
            eventId: evX.id,
            userId: FAKE_USER_IDS.lola,
            priceMin: '42.00',
            priceMax: null,
            tier: 'GA' as const,
            vendor: 'SeatGeek' as const,
            howFound: 'saw_listing' as const,
            sourceCategory: 'resale' as const,
            status: 'pending' as const,
            corroborationCount: 1,
            note: 'SeatGeek showed $42 just now — could be a flip.',
            createdAt: veryRecentDatePr4,
            updatedAt: veryRecentDatePr4,
          },
        ]
        for (const submission of xAdditionalSubmissions) {
          await pr4UpsertSubmission(submission)
        }
        console.warn(
          'PR4 Event X: inserted GA corroborated headline + 4 additional GA reports (mix of pending + corroborated).',
        )
      }

      // --- Y: admin defer engagement pill ------------------------------------
      // Corroborated headline + counter submission whose
      // lastAdminActionKind='defer' → PendingCardB renders "Admin requested
      // more info" pill, and the dispute-affordance hiding rule kicks in.
      // End-of-block marker: the counter (disputedSubmissionId IS NOT NULL).
      // Sub-inserts use pr4UpsertSubmission so a previous run that inserted
      // the headline but crashed before the counter doesn't duplicate the
      // headline on re-run (Copilot R5 specifically called this case out).
      if (evY && !(await pr4EventCompletedByCounter(evY.id))) {
        const yHeadline = await pr4UpsertSubmission({
          eventId: evY.id,
          userId: FAKE_USER_IDS.riley,
          priceMin: '125.00',
          priceMax: '165.00',
          tier: 'GA' as const,
          vendor: 'AXS' as const,
          howFound: 'bought_myself' as const,
          sourceCategory: 'standard' as const,
          status: 'corroborated' as const,
          corroborationCount: 5,
          note: 'Bought on AXS day-of-sale. GA was $125 face + $40 fees.',
          createdAt: olderDatePr4,
          updatedAt: olderDatePr4,
        })
        if (yHeadline) {
          await db
            .insert(submissionConfirms)
            .values([
              {
                submissionId: yHeadline.id,
                userId: FAKE_USER_IDS.amy,
                method: 'same-vendor' as const,
              },
              {
                submissionId: yHeadline.id,
                userId: FAKE_USER_IDS.marco,
                method: 'same-vendor' as const,
              },
              {
                submissionId: yHeadline.id,
                userId: FAKE_USER_IDS.denvermusic,
                method: 'same-vendor' as const,
              },
              {
                submissionId: yHeadline.id,
                userId: FAKE_USER_IDS.bouldergrrl,
                method: 'same-vendor' as const,
              },
            ])
            .onConflictDoNothing()

          // Counter submission against the headline — admin has deferred for
          // more info (lastAdminActionKind='defer', lastAdminActionAt=past).
          // Counter comes from jordan_m (different from the headline submitter
          // and the confirmers) so the dispute reads like a real disagreement.
          //
          // Restore-or-insert (NOT pr4UpsertSubmission): if a previous run
          // resolved/archived the counter (status != 'pending'), the outer
          // pr4EventCompletedByCounter marker correctly reports incomplete
          // and re-triggers this block — but a plain upsert helper would
          // find the existing (eventId, userId) row and short-circuit
          // without restoring it to pending+defer. Pre-clear stranger
          // pending counters → UPDATE jordan_m's row → INSERT if missing.
          //
          // Migration 0041 enforces a partial UNIQUE on
          // (disputed_submission_id) WHERE status='pending'. Both the
          // UPDATE-to-pending and the INSERT-when-missing can violate it
          // if a pending counter from a *different* user (e.g. left over
          // from a stale seed run or admin test) exists for this
          // headline. Clear those rows first; the `ne(userId, jordan_m)`
          // guard preserves jordan_m's row for the UPDATE branch.
          await db
            .delete(priceSubmissions)
            .where(
              and(
                eq(priceSubmissions.disputedSubmissionId, yHeadline.id),
                eq(priceSubmissions.status, 'pending'),
                ne(priceSubmissions.userId, FAKE_USER_IDS.jordan_m),
              ),
            )
          const counterUpdated = await db
            .update(priceSubmissions)
            .set({
              priceMin: '155.00',
              priceMax: '195.00',
              tier: 'GA' as const,
              vendor: 'AXS' as const,
              howFound: 'saw_listing' as const,
              sourceCategory: 'standard' as const,
              status: 'pending' as const,
              corroborationCount: 1,
              disputedSubmissionId: yHeadline.id,
              lastAdminActionAt: pastDatePr4,
              lastAdminActionKind: 'defer' as const,
              note: 'GA showed $155+ later in the week — might be a different tier or pricing tier change.',
              // The real defer handler bumps updatedAt to now() alongside
              // the admin action, so updatedAt mirrors the defer time.
              updatedAt: pastDatePr4,
            })
            .where(
              and(
                eq(priceSubmissions.eventId, evY.id),
                eq(priceSubmissions.userId, FAKE_USER_IDS.jordan_m),
              ),
            )
            .returning({ id: priceSubmissions.id })
          if (counterUpdated.length === 0) {
            await db.insert(priceSubmissions).values({
              eventId: evY.id,
              userId: FAKE_USER_IDS.jordan_m,
              priceMin: '155.00',
              priceMax: '195.00',
              tier: 'GA' as const,
              vendor: 'AXS' as const,
              howFound: 'saw_listing' as const,
              sourceCategory: 'standard' as const,
              status: 'pending' as const,
              corroborationCount: 1,
              disputedSubmissionId: yHeadline.id,
              lastAdminActionAt: pastDatePr4,
              lastAdminActionKind: 'defer' as const,
              note: 'GA showed $155+ later in the week — might be a different tier or pricing tier change.',
              createdAt: olderishDatePr4,
              // The defer handler bumps updatedAt to now() alongside the
              // admin action, so updatedAt mirrors lastAdminActionAt and
              // doesn't appear stale relative to the defer event.
              updatedAt: pastDatePr4,
            })
          }
        }
        console.warn(
          'PR4 Event Y: inserted GA headline + counter (jordan_m) with admin defer.',
        )
      }
    }
  } else {
    console.warn('PR4 test events already seeded, skipping.')
  }

  // -------------------------------------------------------------------------
  // #764 venue first-timer guide fixtures
  // -------------------------------------------------------------------------
  await seedVenueGuides(venueBySlug)
  // Project every seeded artist — headliner and support — into the `artists`
  // table so /artists/{slug} resolves locally and on staging with no manual
  // step (#1115). Idempotent, so it runs unconditionally at the end of the
  // seed, after every event insert above.
  const artistBackfill = await backfillArtists(db)
  console.warn(
    `Artists projection: ${artistBackfill.inserted} inserted of ${artistBackfill.discovered} discovered.`,
  )

  process.exit(0)
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
}
