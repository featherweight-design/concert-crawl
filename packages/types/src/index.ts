// Stripe decline_code → 5-category mapping (spec Part 2 §1.6) — shared by
// the API webhook handler and the web tier-picker failure surfaces.
export * from './decline-category.js';

// Web analytics share-event contract (posthog-js) and the tier picker's entry
// type.
export * from './analytics-events.js';

// #764 venue first-timer guide — chip pool, chip-state / publish-state /
// viewer-mode / density derivation. One implementation, imported by both apps.
export * from './venue-guide.js';
// Re-exported above; imported explicitly because `export *` does not bring
// the name into this module's scope for use in VenuePublic below.
import type { VenueGuide } from './venue-guide.js';
// URL-safe artist slug derivation (#1115) — shared by the crawler
// write-through and the packages/db backfill. Lives here because it is the
// only package both can depend on without a workspace build cycle.
export * from './artist-slug.js';

// Artist canonicalization (#608/#763) lives here rather than in crawler-core
// so packages/db can canonicalize at seed/backfill time: crawler-core depends
// on db, so db importing from crawler-core would be a workspace build cycle.
// crawler-core re-exports both from './lib/canonical-artist.js', keeping the
// `@concert-crawl/crawler-core/canonical` subpath and every call site intact.
export * from './canonical-artist.js';
export * from './best-effort-artist-pick.js';
export * from './night-match.js';

// Shared by canonicalizeArtist here and canonicalizeTitle in crawler-core —
// the precomposed Latin Extended letters that NFD will not split into base +
// combining mark (#648: Ø/ø, Ł/ł, Æ/æ, ß/ẞ, Þ/þ, Ð/ð, Œ/œ, Đ/đ). See
// latin-extended-map.ts for the SQL parity contract the map carries.
export * from './latin-extended-map.js';

// The single user agent every outbound request carries (#1228). Lives here so
// the fetchers that send it, the robots.txt checker that asks about it, and the
// /bot page that publishes it all read one string.
export * from './crawler-identity.js';

// Concert Crews (#1226) — /v1/crews and invite-resolution response contracts,
// shared by the API handlers and every web crew surface.
export * from './crew.js';

// #1115 artist page — GET /v1/artists/:slug response contract, shared by the
// API handler and the web route shell.
export * from './artist.js';

// Invite code shapes (generated BETA- and custom), shared by the API and the
// web code-entry page.
export * from './invite-code.js';

// User roles — mirrors Clerk publicMetadata.role
// Role always takes precedence over plan in access checks:
//   admin/promoter/beta/sub_admin get full premium access regardless of subscription.
export type Role = 'admin' | 'promoter' | 'beta' | 'sub_admin' | 'user';

// Ordered lowest → highest privilege. Used for role comparison across API and web.
export const ROLE_HIERARCHY: readonly Role[] = [
  'user',
  'beta',
  'promoter',
  'sub_admin',
  'admin',
];

// Roles that grant full premium access independent of subscription plan
export const PREMIUM_ROLES: readonly Role[] = [
  'admin',
  'sub_admin',
  'promoter',
  'beta',
];

// Type guard — use instead of casting when reading role from external sources (e.g. Clerk metadata)
export function isRole(value: unknown): value is Role {
  return ROLE_HIERARCHY.includes(value as Role);
}

// Badge displayed in ProfileHero / settings for privileged role-holders; null for regular users
// sub_admin maps to 'admin' badge; 'user' maps to null (no badge)
export type RoleBadge = 'admin' | 'promoter' | 'beta';

// Standard API response envelope
export type ApiResponse<T> =
  { success: true; data: T } | { success: false; error: string; code?: string };

// Paginated list response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Clerk user shape (subset we use in the app)
export interface AuthUser {
  id: string; // Clerk user ID
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
}

// Extraction strategies used by the crawler
export type ExtractionStrategy = 'structured_data' | 'llm' | 'manual';

// Crawl run status. 'skipped' = page-hash dedup matched the last successful
// run, so extraction was bypassed (cost-saving). Treat as healthy alongside
// 'success' in dashboards; surface visually distinct so it doesn't conflate
// with 'success + eventsFound: 0' (which would indicate a real failure).
export type CrawlStatus = 'success' | 'failed' | 'partial' | 'skipped';

// Vibe filter bucket taxonomy. Lives here rather than in apps/api because the
// row's genre pair needs bucket membership client-side to decide which of two
// genres leads under an active filter — the web app only ever holds the bare
// filterVibe string from the URL.
export * from './genre-buckets.js';

// GET /v1/events query contract: the known keys and the multi-select list
// parser, shared by the API and the web mapper.
export * from './events-query.js';

// Event status
export * from './event-status.js';
export * from './records-start.js';
import type { EventStatus } from './event-status.js';

/**
 * Why an event landed on the admin "missing from crawl" list.
 * - removed: crawl reaches past this date but stopped returning this show (venue de-listed it)
 * - crawl_gap: event is beyond the furthest date the crawl currently reaches (likely pagination/depth)
 * - duplicate: a live sibling row for the same show is still being crawled
 * - moved: a newly-created row looks like this same show rescheduled to another
 *   date, or relocated to another venue. Suggestion only — never auto-applied.
 */
export type MissingClassification =
  'removed' | 'crawl_gap' | 'duplicate' | 'moved';

/**
 * Which predicate the moved-candidate matcher relaxed to find the suggestion.
 * - date: same venue, different date
 * - venue: same date (+/- 1 day), different venue
 */
export type MovedReason = 'date' | 'venue';

// Price source — identifies where ticket price data originated
export type PriceSource =
  | 'structured_data'
  | 'ticketmaster'
  | 'eventbrite'
  | 'dice'
  | 'songkick'
  | 'bandsintown'
  | 'seatgeek'
  | 'community';

// Ticket tier
export type Tier = 'GA' | 'Reserved' | 'VIP' | 'Pit' | 'Lawn';

// Ticket vendor. Single source of truth — `z.enum(VENDOR_VALUES)` at every API
// boundary rather than a hand-written list per route, which is how the six
// pre-#1193 copies drifted apart.
export const VENDOR_VALUES = [
  'AXS',
  'Ticketmaster',
  'SeatGeek',
  'DICE',
  'Eventbrite',
  'VenueBoxOffice',
  'Etix',
  'StubHub',
  'VividSeats',
  'Viagogo',
  'TicketNetwork',
  'Other',
] as const;

export type Vendor = (typeof VENDOR_VALUES)[number];

// Vendor picker taxonomy (#1193). Pinned vendors render as always-visible
// chips; the rest live behind the "More…" disclosure, grouped so a fan can tell
// a face-value seller from a resale marketplace without reading a legend.
//
// Primary ordering is frequency-first from prod ticket links (Etix 237,
// Eventbrite 2, DICE 0). Resale ordering has no prod frequency behind it and is
// provisional until submissions land.
//
// SeatGeek sits under Resale, not Primary: `kindFromVendor` and
// `resolveSourceKind` both return 'resale' for it, so the other placement would
// put the picker in contradiction with the price-kind logic behind it. Link
// classification disagrees — `host-rules.ts` files seatgeek.com under
// KNOWN_VENDOR_HOSTS — but the picker follows the price-kind side, because
// that's the axis a fan reads a trust mark from.
export type VendorGroupId = 'primary' | 'resale';

export const VENDOR_PINNED: readonly Vendor[] = [
  'VenueBoxOffice',
  'AXS',
  'Ticketmaster',
];

export const VENDOR_GROUPS: readonly {
  id: VendorGroupId;
  items: readonly Vendor[];
}[] = [
  { id: 'primary', items: ['Etix', 'Eventbrite', 'DICE'] },
  {
    id: 'resale',
    items: ['StubHub', 'SeatGeek', 'VividSeats', 'Viagogo', 'TicketNetwork'],
  },
];

export const VENDOR_CATCHALL: Vendor = 'Other';

// Derived from the resale group rather than listed again: the price-trust
// ordering in events.ts / venues-public.ts previously hardcoded SeatGeek as
// the only resale vendor, so expanding the enum silently let StubHub and
// friends outrank a primary-market seller.
export const RESALE_VENDOR_VALUES: readonly Vendor[] =
  VENDOR_GROUPS.find((group) => group.id === 'resale')?.items ?? [];

const RESALE_VENDORS = new Set<string>(RESALE_VENDOR_VALUES);

export const isResaleVendor = (vendor: string | null | undefined): boolean =>
  vendor !== null && vendor !== undefined && RESALE_VENDORS.has(vendor);

// Ordering weight for "which corroborated price leads" — box office first,
// then primary-market sellers, then resale. Shared so the in-memory sort and
// the SQL CASE expressions can't drift apart.
export const vendorTrustRank = (vendor: string): number => {
  if (vendor === 'VenueBoxOffice') return 0;
  return isResaleVendor(vendor) ? 2 : 1;
};

// Ticket vendor — lower-cased for pipeline
export type TicketVendor =
  | 'axs'
  | 'ticketmaster'
  | 'seatgeek'
  | 'dice'
  | 'eventbrite'
  | 'venue_box_office'
  | 'unknown';

// API provider for API-backed venue crawling (#506). When set, the crawler
// bypasses the HTML → JSON-LD → LLM cascade and pulls events from the provider.
export type ApiProvider = 'venuepilot';

// How the submitter found the price
export type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue';

// Source-category for community-submitted prices (issue #641). Distinct from
// PriceSource (which identifies the upstream data origin for events.priceSource).
// Captured directly from the submit form; legacy rows backfilled from
// (vendor, how_found) heuristics in migration 0040.
export type SourceCategory = 'boxoffice' | 'standard' | 'resale';

// Typed entry in events.ticketLinks (issue #641). Populated by the crawler
// (PR 2) and consumed by the Consumer UI (PR 4) for source-category disclosure.
export interface TicketLink {
  kind: 'boxoffice' | 'primary' | 'resale';
  vendor: string | null;
  url: string;
}

// Shared heuristic for deriving source_category when a caller hasn't picked
// one explicitly. Matches the SQL backfill in migration 0040 and the
// derivation used at submit/dispute/admin-insert time so every price_submissions
// row that lacks an explicit value still lands with a non-null source_category.
// The handler-side derivation only emits boxoffice or standard — legacy resale
// can't be inferred from existing fields; resale enters through the submit
// form (PR 4) when the user picks it directly.
export function deriveSourceCategory(
  vendor: Vendor,
  howFound: HowFound,
): 'boxoffice' | 'standard' {
  return vendor === 'VenueBoxOffice' || howFound === 'at_the_venue'
    ? 'boxoffice'
    : 'standard';
}

/**
 * How old an observation may be before a price reads as stale.
 *
 * Shared rather than duplicated because two sides depend on the same number:
 * the badge that tells a reader a price might be out of date, and the
 * "still accurate" route that refuses to refresh a price which is not stale
 * yet. If those disagree, the route rejects prices the badge calls stale, or
 * accepts ones it does not — a bug with no symptom on either side alone, only
 * in the gap between them.
 */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

// Shared validation policy — server enforces, client mirrors for UX
export const SP_POLICY = {
  floorMin: 1,
  floorMax: 2000,
  ceilingMax: 2000,
  confirmsRequired: 2,
  confirmsRequiredImminent: 3,
  imminentThresholdDays: 6,
  rateLimitHours: 24,
  // Max contribution acts per (user, event) inside the rateLimitHours window
  // (#876). A batch bundle counts as ONE act regardless of how many tier rows
  // it inserts. 3 mirrors the three source categories — enough to cover an
  // event's box office, standard, and resale prices in one day.
  rateLimitMaxSubmissions: 3,
  outlierLowFactor: 0.4,
  outlierHighFactor: 2.5,
} as const;

// Event report policy — server enforces, client mirrors for UX
export const ER_POLICY = {
  confirmsRequired: 2,
  confirmsRequiredImminent: 3,
  imminentThresholdDays: 7,
} as const;

// Notification types
export type NotificationType = 'admin_alert' | 'user_notification';

// Feedback categories
export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other';

// Subscription tiers
export type SubscriptionTier = 'free' | 'premium';

// VenuePlatform — per-platform fetcher dispatch (#623). Widen the list
// as new platform adapters land in packages/crawler-core. Exported as a
// runtime array so the admin Zod schema and the web platform picker read
// the same source rather than each restating the union as a literal.
export const VENUE_PLATFORMS = ['aeg', 'livenation', 'detail-page'] as const;

export type VenuePlatform = (typeof VENUE_PLATFORMS)[number];

// Platforms whose fetcher addresses a venue by an opaque id on the
// platform's own side. `detail-page` (#1295) is not one of them: it follows
// links from the venue's own websiteUrl, so there is no third-party id to
// enter and requiring one would make the platform unselectable.
const PLATFORMS_REQUIRING_VENUE_ID: readonly VenuePlatform[] = [
  'aeg',
  'livenation',
];

// Narrows an untrusted value (a form field, a query param) to a platform
// the dispatcher actually knows about.
export const isVenuePlatform = (value: unknown): value is VenuePlatform =>
  VENUE_PLATFORMS.some((platform) => platform === value);

export const platformRequiresVenueId = (
  platform: VenuePlatform | null | undefined,
): boolean =>
  platform != null && PLATFORMS_REQUIRING_VENUE_ID.includes(platform);

// PlatformProbeResult — dry-run outcome of POST /v1/admin/venues/:id/probe-platform.
// Returned inside the standard { success: true, data } envelope with HTTP 200
// for BOTH ok:true and ok:false — a failed probe is a successful diagnosis.
export type PlatformProbeResult =
  | {
      ok: true;
      eventsFound: number;
      fetchLatencyMs: number;
      sourceUrl: string;
    }
  | {
      ok: false;
      reason: 'missing_config' | 'fetch_error' | 'schema_error';
      error: string;
    };

// Why an admin paused a venue's crawl. Mirrors PAUSE_REASONS in
// apps/api/src/routes/admin/lib/venue-crawl-pause.ts.
export type CrawlPauseReason =
  'waiting_on_permission' | 'site_broken_or_moved' | 'other';

// When a paused crawl resumes by itself: never (an admin resumes it), a whole
// number of days from today (1 to 366), or on a Mountain Time calendar date.
export type CrawlPauseResume =
  | { mode: 'manual' }
  | { mode: 'in_days'; days: number }
  | { mode: 'on'; date: string };

// Body of POST /v1/admin/venues/:id/crawl-pause (pauseBodySchema). `note` is
// at most 500 characters and required when `reason` is 'other'; `resume`
// defaults to manual.
export type CrawlPauseRequest =
  | {
      reason: Exclude<CrawlPauseReason, 'other'>;
      note?: string;
      resume?: CrawlPauseResume;
    }
  | { reason: 'other'; note: string; resume?: CrawlPauseResume };

// Venue — represents the JSON-serialized API response shape.
// Date fields are ISO 8601 strings because fetch().json() cannot revive Date objects.
export interface Venue {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  city: string;
  timezone: string;
  active: boolean;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  lastCrawledAt: string | null;
  crawlNotes: string | null;
  crawlDelayMs: number;
  crawlWaitUntil: 'networkidle' | 'load' | 'domcontentloaded';
  crawlWaitForSelector: string | null;
  robotsTxtAllowed: boolean | null;
  robotsTxtCheckedAt: string | null;
  consecutiveFailures: number;
  blockedAt: string | null;
  crawlPausedAt: string | null;
  // Why an admin paused the crawl and when it resumes by itself (Mountain Time
  // calendar date); null for a pause with no reason or no date, and for a
  // crawler auto-pause. The API always sends them; optional here only so
  // existing fixtures keep compiling.
  crawlPauseReason?: CrawlPauseReason | null;
  crawlPauseNote?: string | null;
  crawlResumeOn?: string | null;
  // Who paused the crawl (an admin's user id; null for a crawler auto-pause) and
  // why, when and by whom the venue was hidden from the site. Explanations only:
  // `crawlPausedAt` and `active` stay the switches. The API always sends them.
  crawlPausedBy?: string | null;
  hiddenAt?: string | null;
  hiddenBy?: string | null;
  hiddenReason?: VenueHideReason | null;
  hiddenNote?: string | null;
  // Set when the venue's data was removed at its request; cleared on activation.
  removedAt: string | null;
  extractionStrategy: ExtractionStrategy | null;
  contactEmail: string | null;
  priceUrl: string | null;
  ticketVendor: TicketVendor | null;
  apiProvider: ApiProvider | null;
  apiAccountId: string | null;
  debugCaptureHtml: boolean;
  crawlMode: 'http' | 'browser' | null;
  platform: VenuePlatform | null;
  platformVenueId: string | null;
  address: string | null;
  capacity: number | null;
  venueType: string | null;
  about: string | null;
  neighborhood: string | null;
  featured: boolean;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
}

export type NewVenue = Omit<
  Venue,
  'id' | 'createdAt' | 'updatedAt' | 'lastCrawledAt' | 'consecutiveFailures'
>;

// VenueWithEventCount — admin list view only, includes upcoming event count
export interface VenueWithEventCount extends Venue {
  eventCount: number;
  // Outcome of the venue's most recent run, null when it has never crawled.
  // The venue's own columns describe whether crawling is enabled, not whether
  // it is producing anything — a venue skipping every night still reads Active.
  lastRunStatus: CrawlStatus | null;
  // The latest run in full (status, reason, time, counts, a cut error), for the
  // list's one-line "Failed: calendar block not found" column. Null with
  // `lastRunStatus` when the venue has never crawled.
  latestRun: VenueLatestRun | null;
  // Who paused the crawl or hid the venue, by name: the admin's handle, or
  // "a former admin" when they have none. Null when nobody did (a crawler
  // auto-pause, a venue not paused or hidden); the user id is `crawlPausedBy`
  // and `hiddenBy` on the venue itself.
  crawlPausedByName: string | null;
  hiddenByName: string | null;
}

// CrawlHealth — 7-day crawl health stats returned by GET /v1/admin/venues/:id
export interface CrawlHealth {
  sevenDayPercent: number;
  sparkline: { date: string; success: boolean; hasRun: boolean }[];
  lastCrawledAt: string | null;
  avgDurationMs: number | null;
  eventsTracked: number;
  consecutiveFails: number;
}

// VenueWithCrawlHealth — admin detail view includes crawl health stats
export interface VenueWithCrawlHealth extends Venue {
  crawlHealth: CrawlHealth;
  // As on VenueWithEventCount: who paused the crawl or hid the venue, by name.
  // The API always sends them; optional here so existing fixtures compile.
  crawlPausedByName?: string | null;
  hiddenByName?: string | null;
  // The detail's delete guard counts, which also give its upcoming show count
  // (shows today or later, Mountain Time). Optional for the same reason.
  deleteBlockers?: VenueDeleteBlockers;
  // The Overview's Shows card (3b): shows today or later, Mountain Time, split
  // by whether fans see them. The two add up to `deleteBlockers.upcomingShows`.
  // Optional for the same reason as above; the API always sends them.
  upcomingShows?: number;
  hiddenUpcomingShows?: number;
  // The latest `success` run, null when the venue has never had one.
  lastFullRun?: VenueLastFullRun | null;
  // The latest run of any status, in the list's shape; null when never crawled.
  latestRun?: VenueLatestRun | null;
  // When the next daily crawl starts (ISO), from the cron; null outside
  // production, which starts no daily crawl. Optional for the same reason.
  nextCrawlAt?: string | null;
}

/** The latest run that read the venue's shows (`success`), for "Found in the last full run". */
export interface VenueLastFullRun {
  at: string;
  eventsFound: number;
}

// VenueRobotsStatus — robots.txt audit row for the admin audit page.
// Reflects the stored crawl-time result on the venues table, not a live fetch.
export interface VenueRobotsStatus {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  robotsTxtAllowed: boolean | null;
  robotsTxtCheckedAt: string | null;
}

// Why a run produced nothing. NULL on a success row, and on every row from
// before reasons were recorded. Mirrors the `crawl_run_reason` DB enum. The
// list is runtime too, so API and web can validate without importing the DB
// package (which API tests mock).
export const CRAWL_RUN_REASONS = [
  'page_unchanged',
  'crawl_paused',
  'robots_unreachable',
  'robots_disallowed',
  'robots_crawl_delay',
  'timeout',
  'blocked_http',
  'no_events_found',
  'calendar_not_found',
  'llm_account',
  'error',
] as const;
export type CrawlRunReason = (typeof CRAWL_RUN_REASONS)[number];

// One page a crawl run fetched: metadata only, never the body.
export interface CrawlRunPage {
  id: string;
  crawlRunId: string;
  url: string;
  finalUrl: string | null;
  httpStatus: number | null;
  fetchMode: 'browser' | 'http' | 'api';
  bytes: number | null;
  contentHash: string | null;
  fetchedAt: string;
}

// Crawl runs, grouped into batches for the admin Crawl runs list (1d). A batch
// is derived, never stored: a night's scheduled runs, one burst of by-hand
// triggers, or a night that should have run and did not ("Didn't start").
export type CrawlBatchKind = 'nightly' | 'by_hand';

export interface CrawlBatchRun {
  id: string;
  venueId: string;
  venueName: string | null;
  status: CrawlStatus;
  reason: CrawlRunReason | null;
  eventsFound: number;
  eventsInserted: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface CrawlBatchCounts {
  /** Runs that fetched and read the venue's page. */
  ok: number;
  /** Failed or partial runs, and skips for a reason an admin has to look at. */
  notOk: number;
  /** Runs that left the page alone because it had not changed. */
  unchanged: number;
  /** Runs skipped on purpose: the venue's crawl is paused. */
  skipped: number;
  total: number;
}

export interface CrawlBatch {
  /** `nightly:YYYY-MM-DD` (Mountain Time night) or `by_hand:<actor>:<epoch s>`. */
  key: string;
  kind: CrawlBatchKind;
  /** First and last run (or trigger) time, ISO. Null for a night that never started. */
  startedAt: string | null;
  endedAt: string | null;
  /** Mountain Time date of the night, for nightly batches. */
  night: string | null;
  /** Who queued a by-hand batch (a Clerk user id), null for nightly. */
  actor: string | null;
  venueCount: number;
  counts: CrawlBatchCounts;
  eventsFound: number;
  eventsInserted: number;
  /** Triggers queued but not yet run (by-hand only). */
  pending: number;
  /** A nightly that ran in more than one wave: the scheduled run, then a retry. */
  retried: boolean;
  /** A night with no scheduled run at all, derived, not stored. */
  didntStart: boolean;
}

export interface CrawlBatchDetail extends CrawlBatch {
  runs: CrawlBatchRun[];
}

/** Why Crawl all leaves a venue out (blocked wins, then paused, hidden, unverified). */
export type CrawlAllSkipReason = 'blocked' | 'paused' | 'hidden' | 'unverified';

/** The average span and LLM cost (to the cent) of recent nightly crawls. */
export interface UsualNightly {
  durationMs: number;
  costUsd: number;
  nights: number;
}

/** GET /v1/admin/crawl/estimate: what the Crawl all confirm says first. */
export interface CrawlAllEstimate {
  /** Every venue not removed. */
  total: number;
  /** The venues Crawl all would queue. */
  eligible: number;
  skipped: { venueId: string; name: string; reason: CrawlAllSkipReason }[];
  /**
   * The average of recent nightly crawls, or null with no history (the
   * confirm then drops its time and cost line).
   */
  usual: UsualNightly | null;
  /**
   * The next scheduled daily crawl, ISO (the confirm's "Tonight's 2:07 AM").
   * Null outside production, where this API starts no daily crawl.
   */
  nextCrawlAt: string | null;
}

// CrawlRun — represents the JSON-serialized API response shape.
// 'in_progress' is a virtual status used during async crawl execution (not persisted to DB).
export interface CrawlRun {
  id: string;
  venueId: string;
  status: CrawlStatus | 'in_progress';
  reason: CrawlRunReason | null;
  httpStatusCode: number | null;
  robotsTxtBlocked: string | null;
  extractionStrategyUsed: string | null;
  eventsFound: number;
  eventsInserted: number;
  eventsUpdated: number;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  llmCostUsd?: number | null;
  venueName?: string | null;
  startedAt?: string | null;
  // Surfaces an unread admin_alert notification of category
  // 'crawl.event_count_dropped' (covers both went-dark and sharp-drop)
  // or 'crawl.failed' (any run that brings a venue's consecutive failure
  // count to >=3 — auto-pause is the specific case where the count hits
  // exactly 3 on a non-blocked venue, but the alert fires on every
  // subsequent failure too) that points at this run. The admin UI
  // renders a badge alongside the status pill so a "Success" row that
  // tripped the event-count alert is no longer silent (#804). `severity`
  // lets the badge distinguish "Went dark" from "Dropped sharply"
  // without round-tripping the notification body.
  activeAlert?: ActiveCrawlAlert | null;
}

// CrawlTrigger — JSON-serialized shape of a queued crawl trigger row.
// POST /v1/admin/crawl/:venueId returns { triggerId }; the crawler service
// later stamps the trigger with a terminal `status` and, when a run row was
// created, the resulting `crawlRunId`. Clients poll GET
// /v1/admin/crawl/triggers/:id to learn when the async crawl finished, then
// fetch the linked run for its result.
export type CrawlTriggerStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface CrawlTrigger {
  id: string;
  venueId: string;
  status: CrawlTriggerStatus;
  crawlRunId: string | null;
  triggeredBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCrawlAlert {
  notificationId: string;
  category:
    | 'crawl.event_count_dropped'
    | 'crawl.failed'
    | 'crawl.event_ceiling_suspected'
    | 'crawl.url_coverage_gap';
  // Only present for 'crawl.event_count_dropped' — the event-count alert
  // classifies the drop as 'went_dark' (0 events) or 'dropped_sharply'
  // (non-zero but well below baseline). 'crawl.failed' has no sub-severity.
  severity?: 'went_dark' | 'dropped_sharply' | null;
  // Only present for 'crawl.event_ceiling_suspected' — which of the two
  // capped-catalogue fingerprints tripped (#1185). 'horizon_shrank' means the
  // furthest announced show moved materially closer; 'pinned_count' means the
  // extracted count repeated exactly across consecutive runs.
  ceilingKind?: 'horizon_shrank' | 'pinned_count' | null;
  // Only present for 'crawl.url_coverage_gap' — whether the venue's whole
  // upcoming catalogue lacks per-event ticket links ('no_coverage') or only
  // part of it does ('partial_gap').
  coverageSeverity?: 'no_coverage' | 'partial_gap' | null;
}

// DailyCost — one zero-filled day bucket from GET /v1/admin/costs/daily.
// `date` is a Mountain-Time calendar date (YYYY-MM-DD); `costUsd` is that MT
// day's LLM spend as the monthly budget counts it: crawl_runs.llm_cost_usd
// plus the cost_tracking rows of crawler-core's LLM_SERVICES.
export interface DailyCost {
  date: string;
  costUsd: number;
}

// AdminDailyCosts — GET /v1/admin/costs/daily response payload. `days` is
// contiguous (missing days zero-filled server-side) and ordered oldest→newest.
export interface AdminDailyCosts {
  days: DailyCost[];
  totalUsd: number;
}

// TopSpendVenue — one ranked row from GET /v1/admin/costs/top-venues.
// `venueId` is null for the aggregated "(others)" remainder row; `pct` is
// the venue's rounded share of the window total.
export interface TopSpendVenue {
  venueId: string | null;
  name: string;
  costUsd: number;
  pct: number;
}

// AdminTopSpend — GET /v1/admin/costs/top-venues response payload.
export interface AdminTopSpend {
  venues: TopSpendVenue[];
  totalUsd: number;
}

// Event — represents the JSON-serialized API response shape.
// Date/time fields are strings; date is YYYY-MM-DD, time is HH:MM:SS or null.
export interface Event {
  id: string;
  venueId: string;
  title: string;
  artist: string;
  supportingArtists: string[] | null;
  tourName: string | null;
  date: string;
  doorsTime: string | null;
  showTime: string | null;
  ticketUrl: string | null;
  ticketLinks: TicketLink[] | null;
  // The event's own detail page on the source venue site. Deep-link
  // fallback for "Get tickets" when ticketUrl is null (#1152).
  eventUrl: string | null;
  ticketPriceMin: string | null;
  ticketPriceMax: string | null;
  priceSource: PriceSource | null;
  pipelineExhaustedAt: string | null;
  description: string | null;
  imageUrl: string | null;
  genre: string[] | null;
  status: EventStatus;
  /**
   * B+ A5: set when the stale sweep cancelled the show because the venue
   * stopped listing it. A cancelled show with this set is No longer listed.
   * Optional because web and API deploy separately.
   */
  delistedAt?: string | null;
  confidenceScore: string | null;
  verified: boolean;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// PriceSubmission — community-submitted ticket price for an event
export interface PriceSubmission {
  id: string;
  eventId: string;
  userId: string;
  priceMin: string;
  priceMax: string | null;
  tier: Tier;
  vendor: Vendor;
  howFound: HowFound;
  sourceCategory: SourceCategory | null;
  disputedSubmissionId: string | null;
  status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived';
  corroborationCount: number;
  // Submitter's free-text note (existed in DB but was missing from this
  // shared interface — added during the admin contest-review PR per #697).
  note: string | null;
  // Admin's archive reason. No DB-level length cap; the API enforces
  // min 10 / max 2000 chars at the resolve/defer Zod validators (see
  // apps/api/src/routes/admin/contests.ts resolveBodySchema +
  // deferBodySchema). Also set by migration 0041's pre-unique-index
  // cleanup on rows it retires as status='stale' (the Postgres
  // same-transaction enum restriction prevented using 'archived' inside
  // the migration that adds the enum value — spec §5.2). So
  // archived_reason CAN be non-null on status='stale' rows — do NOT
  // infer status from this field's presence; query by status for
  // behavior, read archived_reason for the explanation.
  archivedReason: string | null;
  // Engagement-signal columns surfaced via priceByTier[].counterSubmission
  // so consumers see a quiet "Admin requested more info" pill on the event
  // detail page after an admin defers the contest.
  lastAdminActionAt: string | null;
  lastAdminActionKind: 'defer' | null;
  createdAt: string;
  updatedAt: string;
}

// SubmissionWithMeta — single submission + peer-confirm metadata.
// `userId` is only populated on the caller's own rows: GET
// /v1/events/:id/price-submissions is public since #794, and a Clerk user id
// has no business reaching anyone but its owner. A signed-in caller sees their
// own id (so the "yours" affordance keeps working) and null everywhere else;
// an anonymous caller sees null throughout.
export interface SubmissionWithMeta extends Omit<PriceSubmission, 'userId'> {
  userId: string | null;
  confirms: number;
  byYou: boolean;
}

// SubmissionListResponse — response for GET /v1/events/:id/price-submissions
export interface SubmissionListResponse {
  submissions: SubmissionWithMeta[];
  alreadySubmitted: boolean;
  // How many contribution acts the caller has left for this event inside the
  // 24h window (#876) — SP_POLICY.rateLimitMaxSubmissions minus acts used.
  // 0 means the next POST would 429. Anonymous callers get the full allowance.
  submissionsRemaining: number;
  userSubmission: SubmissionWithMeta | null;
}

// EventReport status options
export type EventReportStatus =
  'sold-out' | 'cancelled' | 'postponed' | 'available';

// EventReport evidence methods
export type EventReportEvidenceMethod =
  'bought_myself' | 'saw_listing' | 'venue_site' | 'other';

// EventReport — community-filed report about an event's status
export interface EventReport {
  id: string;
  eventId: string;
  /**
   * The reporter's Clerk user id: sent only on the viewer's own report (see
   * `isReporter`), null on everyone else's and for anonymous callers.
   */
  reporterId: string | null;
  status: EventReportStatus;
  evidenceMethod: EventReportEvidenceMethod;
  evidenceUrl: string | null;
  note: string | null;
  createdAt: string;
  confirmsCount: number;
  confirmsNeeded: number;
  isReporter: boolean;
  userHasConfirmed: boolean;
  reporterHandle: string | null;
}

// EventWithVenue — event joined with its venue, returned by the public events API
export interface EventWithVenue extends Event {
  /**
   * A promoted fan sold-out report (isSoldOutSql). Optional because the web
   * and API deploy separately: a payload without it reads as not sold out.
   */
  isSoldOut?: boolean;
  venue: Pick<
    Venue,
    'id' | 'name' | 'slug' | 'city' | 'websiteUrl' | 'timezone'
  >;
  // Vendor from the corroborated community submission — only present for community-priced events
  priceVendor?: string | null;
  // Per-tier price aggregation surfaced on the BROWSE list endpoint so the
  // browse chip can mirror pickTierHeadline / compareTierRows exactly
  // (issue #787).
  //
  // IMPORTANT — the LIST endpoint and the DETAIL endpoint return the same
  // `TierPriceBlock` SHAPE but populate it differently to keep browse
  // cheap:
  //   - `headline`     — populated on both endpoints
  //   - `alternates`   — populated on both endpoints
  //   - `pending`      — populated on the detail endpoint only; ALWAYS an
  //                      empty array on the list endpoint
  //   - `counterSubmission` — populated on the detail endpoint only; ALWAYS
  //                      null on the list endpoint
  //   - `reports`      — populated on the detail endpoint only; ALWAYS 0
  //                      on the list endpoint
  //
  // The list endpoint intentionally skips the secondary side-tables
  // (pending, counter, reports) to keep N+1 cost bounded. The shipped
  // `pickBrowseHeadline` reads only `block.headline`, so the trimmed
  // payload is sufficient for the browse chip. Any consumer that wants
  // those fields populated must use `EventDetailResponse` instead.
  priceByTier?: TierPriceBlock[] | null;
  // Display names of the viewer's Spotify-sourced taste artists (followed +
  // top, per §9.1's canonical set) that match this event's headliner or
  // supporting set (#763 PR 6, eng spec §9.2). Present ONLY for signed-in
  // users with Spotify-sourced follow rows — a possibly empty array per
  // event. Absent entirely for anonymous/unconnected viewers.
  followedArtists?: string[];
  // The headliner's Spotify portrait, from the `artists` projection joined on
  // `canonicalArtist`. Second link in the event-surface chain: `imageUrl` →
  // `artistPhotoUrl` → IdentityArt. Null whenever the event has no canonical
  // headliner, no projection row, or a row without a photo — all ordinary.
  // Never populated from a supporting artist: a wrong face beside the right
  // name is worse than no face.
  artistPhotoUrl?: string | null;
}

// Per-tier price-aggregation building blocks (issue #644). Surfaced inside
// EventDetailResponse.priceByTier. PR 4 (Consumer UI) consumes these; the
// existing flat priceVendor / priceAlternates / priceConfirmsCount fields
// stay alongside for the migration buffer and get dropped in the Contract PR.

export interface TierHeadline {
  submissionId: string;
  priceMin: string;
  priceMax: string | null;
  vendor: Vendor;
  sourceCategory: SourceCategory | null;
  submitterHandle: string | null;
  observedAt: string;
  approvedAt: string;
  approvalKind: 'admin' | 'fan';
  confirmsCount: number;
}

export interface TierAlternate {
  submissionId: string;
  priceMin: string;
  priceMax: string | null;
  vendor: Vendor;
  sourceCategory: SourceCategory | null;
}

export interface TierPending {
  id: string;
  priceMin: string;
  priceMax: string | null;
  vendor: Vendor;
  howFound: HowFound;
  sourceCategory: SourceCategory | null;
  note: string | null;
  submitterHandle: string | null;
  submittedAt: string;
  confirmsCount: number;
  confirmsNeeded: number;
  isSubmitter: boolean;
}

// What the viewer can do on a price under an open price check (B+ B9),
// decided by the server so the UI never guesses:
//   - 'none'          the viewer submitted the price being checked
//   - 'withdraw'      the viewer has a pending update on it (viewerCounterId)
//   - 'submit_update' anyone else, signed-out viewers included (the sheet
//                     asks them to sign in)
export type PriceCheckViewerAction = 'none' | 'withdraw' | 'submit_update';

// Additive price-check fields on both counter shapes (B+ B9). Several fans can
// each have an update pending on one price; the counter a shape describes is
// the LEADING one (most confirmations, then earliest filed), so its
// floor/ceiling is the pending amount the card shows after the current price
// ("$44 → $52?").
export interface PriceCheckFields {
  // Pending updates open against the price, the leading one included. >= 1.
  pendingCount: number;
  viewerAction: PriceCheckViewerAction;
  // The viewer's own pending update on this price, the id to withdraw
  // (DELETE /v1/submissions/:id). Set exactly when viewerAction is
  // 'withdraw'; it need not be the leading counter.
  viewerCounterId: string | null;
}

// How the last price check on the live price ended, for the "after review"
// card (B+ more-st-disputes_board). Present only while the check is recent
// (14 days) and no new check is open:
//   - 'held'    an admin decided the price stands; `previous` is null
//   - 'updated' an update replaced the price (an admin or fan confirms
//               decided it); `previous` is the price it replaced
export interface PriceCheckOutcome {
  // The live price this describes (the event's primary price). A caller shows
  // the outcome only on a price card whose headline carries this id.
  submissionId: string;
  outcome: 'held' | 'updated';
  resolvedAt: string;
  previous: { floor: number; ceiling: number | null } | null;
}

export interface TierCounter extends PriceCheckFields {
  id: string;
  parentSubmissionId: string;
  floor: number;
  ceiling?: number;
  submitter: { handle: string } | null;
  submittedAt: string;
  // Engagement-signal columns surfaced when an admin defers the contest.
  // The consumer event-detail page renders a quiet "Admin requested more
  // info" pill on the counter card when lastAdminActionKind === 'defer'.
  // Both stay null while the contest sits with no admin engagement; resolve
  // clears them on both rows so a prior defer doesn't outlive resolution.
  lastAdminActionAt: string | null;
  lastAdminActionKind: 'defer' | null;
}

export interface TierPriceBlock {
  tier: Tier;
  headline: TierHeadline | null;
  alternates: TierAlternate[];
  pending: TierPending[];
  counterSubmission: TierCounter | null;
  reports: number;
}

// A single other watcher of an event, as exposed on the social-proof surface.
export interface EventWatcher {
  /** Never null — handle-less watchers are never listed by name. */
  handle: string;
  avatarColor: AvatarColor | null;
  /** The avatar pair's second colour. Null means solid. */
  avatarSecondColor: AvatarColor | null;
}

// GET /v1/events/:id/watchers
export interface EventWatchersResponse {
  /** Count of OTHER watchers (excludes the viewer; includes handle-less users). */
  total: number;
  /** Handle-bearing other watchers, most-recent-first, capped at ROSTER_CAP. */
  named: EventWatcher[];
}

// EventDetailResponse — single event detail with computed watch state
/** Who wrote an event's cancelled or postponed status. */
export type EventStatusSource = 'admin' | 'report' | 'sweep';

/** A promoted fan report as the event detail page shows it. */
export interface PromotedReportSummary {
  /**
   * The reporter's public handle. Null for an anonymous caller (the API strips
   * it: a fan's identity is for signed-in viewers) and for a reporter with no
   * handle.
   */
  reporterHandle: string | null;
  confirmsCount: number;
  reportedAt: string;
}

export interface EventDetailResponse extends EventWithVenue {
  // #1115 PR-G — artist-page entry points. The headliner's `artists.slug`, or
  // null when the projection has no row for that canonical name (an unresolved
  // name renders as plain text rather than a dead link).
  artistSlug: string | null;
  // Positionally aligned with `supportingArtists`: index i of one is index i of
  // the other, null where that name has no `artists` row. The UI zips the two
  // arrays, so alignment is the contract. Deliberately NOT derived from
  // `events.canonical_supporting`, which dedupes and sorts (see
  // canonicalizeSupporting) and therefore cannot be zipped against the display
  // names. Null exactly when `supportingArtists` is null (a legacy row).
  supportingArtistSlugs: Array<string | null> | null;
  watching: number;
  isWatching: boolean;
  // ISO when the signed-in user said "I'm going!" (#70). Orthogonal to
  // isWatching — a row can carry either, both, or neither.
  attendingAt: string | null;
  // #764 — whether this event's venue has a published first-timer guide, so the
  // event page can decide whether to show the chip that links to it.
  venueGuidePublished: boolean;
  priceStatus?: 'live' | 'soldout' | null;
  // Price detail fields — not yet in DB schema; null until added via migration
  ticketPriceOpenedAt?: number | null;
  ticketFees?: number | null;
  // Community price enrichment — vendor, submitter handle, and observation timestamp
  priceVendor?: string | null;
  // The submitter's "Where's the price from?" answer. Drives the trust mark;
  // null only for rows predating #641, which fall back to vendor inference.
  priceSourceCategory?: SourceCategory | null;
  priceSubmitterHandle?: string | null;
  priceObservedAt?: string | null;
  // The corroborated submission the flat price fields describe. Populated from
  // the same row as `priceObservedAt` and null whenever that is — the two are
  // read together so a freshness action can name the row it is refreshing.
  // NOT interchangeable with `priceByTier[].headline.submissionId`: the flat
  // shape keeps a legacy vendor-trust ordering that can pick a different row.
  priceSubmissionId?: string | null;
  // Approval metadata — who corroborated and when
  priceApprovalKind?: 'admin' | 'fan' | null;
  priceApprovedAt?: string | null;
  // Alternate corroborated submissions (other vendors/sources beyond the primary)
  priceAlternates?: Array<{
    vendor: string | null;
    priceMin: string;
    priceMax: string | null;
    sourceCategory?: SourceCategory | null;
  }> | null;
  // Confirms count for the primary live community price
  priceConfirmsCount?: number | null;
  // Pending counter-submission against the primary live price (if any).
  // parentSubmissionId is the corroborated submission being disputed — it
  // must be the value passed as disputedSubmissionId when filing a new dispute.
  counterSubmission?:
    | ({
        id: string;
        parentSubmissionId: string;
        floor: number;
        ceiling?: number;
        submitter: { handle: string } | null;
        submittedAt: string;
        // Engagement-signal columns surfaced when an admin defers the contest.
        // Mirrors TierCounter.lastAdminAction* above so the flat shape stays in
        // lock-step with the per-tier shape during the PR 4 migration window
        // (events.ts:666–675 writes both paths off the same counter row). Both
        // stay null while the contest sits with no admin engagement.
        lastAdminActionAt: string | null;
        lastAdminActionKind: 'defer' | null;
      } & PriceCheckFields)
    | null;
  // How the last price check on the primary live price ended (see
  // PriceCheckOutcome). Null when there is none to show, and always null while
  // a check is open (counterSubmission is set).
  priceCheckOutcome?: PriceCheckOutcome | null;
  // Promoted sold-out report — present when a community sold-out report was confirmed
  soldOutReport?: PromotedReportSummary | null;
  // The promoted fan report behind a cancelled or postponed status. Null when
  // no fan report was promoted (an admin edit or the stale sweep set it).
  statusReport?: PromotedReportSummary | null;
  // Where a cancelled or postponed status was written, as far as the data can
  // say: 'sweep' (the stale sweep, delisted), 'report' (a promoted fan report),
  // 'admin' (an admin edit: the only other writer). Null when the show is
  // upcoming. There is no 'crawler': it writes no cancelled or postponed
  // status. 'admin' is inferred by elimination, no column records it.
  statusSource?: EventStatusSource | null;
  // All pending submissions whenever any exist (PR 3 dropped the
  // "only when no corroborated price" gate so multi-tier pending stays
  // visible alongside corroborated tiers). Counter rows that surface via
  // counterSubmission / priceByTier.counterSubmission are excluded so they
  // don't double-appear here. Deprecated — PR 4 migrates consumers to
  // priceByTier; the Contract PR drops this field.
  pendingSubmissions?: Array<{
    id: string;
    priceMin: string;
    priceMax: string | null;
    tier: string;
    vendor: string;
    howFound: string;
    sourceCategory: SourceCategory | null;
    note: string | null;
    submitterHandle: string | null;
    submittedAt: string;
    confirmsCount: number;
    confirmsNeeded: number;
    isSubmitter: boolean;
  }> | null;
  // Per-tier price aggregation (issue #644). Each tier block contains a single
  // corroborated headline (best-of by source-category trust + price), other
  // corroborated rows in the same tier as alternates, every pending submission
  // in the tier, the optional counter-submission against the headline, and a
  // total reports count. Tiers sort by entry price (lowest headline first;
  // pending-only tiers after). The flat priceVendor / priceAlternates / etc.
  // fields above stay for PR 4 migration; the eventual Contract PR drops them
  // once consumers have moved.
  priceByTier?: TierPriceBlock[] | null;
}

// Public events list query params
export interface EventsListParams {
  from?: string;
  to?: string;
  venueSlug?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Public events list response
export interface EventsListResponse {
  data: EventWithVenue[];
  total: number;
  limit: number;
  offset: number;
  /**
   * Whether the API actually narrowed this list to followed artists. Sent on
   * every `/v1/events` response and simply false when the scope wasn't asked
   * for; optional here only for older clients. The UI reads this flag rather
   * than its own request intent, so it can never claim a scope the API
   * didn't apply.
   */
  followingApplied?: boolean;
}

export interface AvailabilityDay {
  /** ISO date `YYYY-MM-DD` (event-local calendar date). */
  date: string;
  /** Number of consumer-visible shows on that date. */
  count: number;
}

export interface EventsAvailabilityResponse {
  data: AvailabilityDay[];
  /** Inclusive window start, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive window end, `YYYY-MM-DD`. */
  to: string;
}

// Related-events response (issue #833). Returned by GET /v1/events/:id/related.
// Slim payload — same shape as EventsListResponse.data but priceByTier is never
// populated (the per-tier batch query is the dominant cost on Red Rocks-sized
// venues, and the related panel doesn't need it). The consumer event detail
// page calls this in parallel with /v1/events/:id and /v1/events/:id/reports
// so the related fetch no longer blocks on resolving the venue slug first.
// The row renders a watching tick, so the related panel needs the caller's own
// watch state per event. It lives here rather than on EventWithVenue because
// that shape is also served anonymously and from surfaces with no auth context;
// only the endpoints that resolve a caller can honestly answer the question.
export interface RelatedEvent extends EventWithVenue {
  isWatching: boolean;
}

export interface EventsRelatedResponse {
  data: RelatedEvent[];
}

// VenuePublic — public-facing venue shape (subset of Venue, no crawl internals)
export interface VenuePublic {
  id: string;
  name: string;
  slug: string;
  city: string;
  timezone: string;
  websiteUrl: string;
  active: boolean;
  verified: boolean;
  address: string | null;
  capacity: number | null;
  venueType: string | null;
  about: string | null;
  neighborhood: string | null;
  featured: boolean;
  lat: number | null;
  lng: number | null;
  upcomingCount: number;
  // #764 first-timer guide. `null` when the venue has no published guide —
  // drafts never leak to the consumer surface.
  guide: VenueGuide | null;
}

// VenueWithEvents — venue profile page response
export interface VenueWithEvents {
  venue: VenuePublic;
  // upcomingEvents carry the same priceVendor + priceByTier enrichment the
  // browse list endpoint adds, so the shared consumer EventCard renders an
  // identical "from" price on both surfaces (#787 parity). Without priceByTier
  // the card falls back to the flat ticketPriceMin scalar, which is clobbered
  // to whichever tier was most recently confirmed. Reuse EventWithVenue's
  // enrichment field types (minus its `venue`, which lives on the parent) so
  // the two surfaces can't drift.
  upcomingEvents: Array<Omit<EventWithVenue, 'venue'>>;
  // #764 first-timer detection. `null` means "we cannot know" — either the
  // request is unauthenticated, or detection is not wired yet. It is always
  // `null` until PR-4 consumes `user_events.attending_at` from #70; the field
  // is declared now so that PR is a data change and not a type churn.
  viewerHasAttended: boolean | null;
}

// InviteCode — represents the JSON-serialized API response shape.
// Date fields are ISO 8601 strings because fetch().json() cannot revive Date objects.
export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  createdAt: string;
  // Multi-use codes (posters): a code admits `maxUses` accounts. `usedBy` and
  // `usedAt` record only the first redemption, so "used up" is
  // `useCount >= maxUses`, never `usedBy !== null`.
  maxUses: number;
  useCount: number;
  label: string | null;
  // Whose code it is: an admin's (posters, personal codes) or a member's own
  // share code. Readers key off this, never off `maxUses`, which is a high
  // finite number on a member code and not a signal.
  kind: 'admin' | 'member';
}

/** One person who joined with the viewer's share code: initial and colors only. */
export interface MeInviteJoiner {
  handle: string | null;
  avatarColor: string | null;
  avatarSecondColor: string | null;
}

/**
 * GET /v1/me/invite: the signed-in person's own share code, made on first read
 * and reused for good. No launch `mode` and no `url`: the web decides whether
 * the app is open and builds the link from its own origin.
 */
export interface MeInviteResponse {
  code: string;
  /** True when an admin turned the code off; it is returned, never replaced. */
  revoked: boolean;
  joined: {
    /** Everyone who joined with it. */
    count: number;
    /** The newest few, for the strip. */
    faces: MeInviteJoiner[];
  };
}

// AdminInviteCode — one row of GET /v1/admin/invite-codes. The maker's handle
// comes from user_profiles (null when the maker has none or is gone), and
// lastUsedAt is the latest redemption, falling back to the legacy used_at.
export interface AdminInviteCode extends InviteCode {
  createdByHandle: string | null;
  lastUsedAt: string | null;
}

// One person who joined with a code (GET /v1/admin/invite-codes/:id/redemptions).
// `role` is read from Clerk and is null when Clerk can't answer.
export interface InviteCodeRedemption {
  userId: string;
  handle: string | null;
  role: Role | null;
  redeemedAt: string;
  /** Their own avatar colours (null: not chosen), for the code panel's joiners. */
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
}

export interface InviteCodeRedemptionsResponse {
  data: InviteCodeRedemption[];
  total: number;
}

// Avatar color token keys — survive theme switches
/** The avatar palette, in one place for the API's validators. */
export const AVATAR_COLORS = [
  'signal',
  'accent',
  'success',
  'warning',
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

// User-selectable theme
export type UserTheme =
  | 'electric'
  | 'jade'
  | 'light'
  | 'pulse'
  | 'forge'
  | 'bluenote'
  | 'drip'
  | 'cedar'
  | 'gloss';

// Six-plan model (eng infra spec Part 1, #781 §6). Mirrors the DB
// subscription_tier enum plus the two non-tier states.
export type UserPlan =
  'logged-out' | 'free' | 'supporter' | 'premium' | 'founder' | 'gifted';

// Mirrors the DB subscription_status enum (Stripe-mirrored statuses).
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

// Derived plan state (eng infra spec Part 1, "derivePlan rewrite").
// 'past-due' is not a plan — it's `status`. 'trial' is not a plan — it's
// `onTrial` (Decision 7). Roles no longer masquerade as the founder plan.
export interface PlanState {
  plan: UserPlan;
  onTrial: boolean; // true ⇒ plan === 'premium' via trial (Decision 7)
  trialEndsAt: string | null; // ISO; non-null while trial is live or recently ended
  status: SubscriptionStatus | null; // Stripe-mirrored status; null when no subscription row
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  roleComped: boolean; // PREMIUM_ROLES holder — full entitlements, picker shows "You're in already"
}

// Founder launch-window state as exposed by GET /v1/billing/founder-window
// (eng infra spec Part 2 §1.4). `seatsRemaining` is omitted pre-launch —
// the scarcity number is not public before the window opens.
export type FounderWindowState = 'pre-launch' | 'open' | 'closed';

export interface FounderWindowView {
  state: FounderWindowState;
  seatsTotal: number;
  seatsRemaining?: number;
  closesAt: string | null; // ISO; null pre-launch
}

// POST /v1/billing/checkout-session success payload (eng infra spec Part 2
// §1.3) — the Payment Element mounts against `clientSecret`.
export interface CheckoutSessionResponse {
  clientSecret: string;
  subscriptionId: string;
  founderSeatNumber: number | null; // null for non-founder tiers
}

// User-facing role — separate from auth Role (admin/sub_admin/user)
export type DisplayRole = 'fan' | 'crew' | 'artist' | 'staff';

// Submission status as shown in the UI (mapped from DB enum)
export type SubmissionDisplayStatus =
  | 'confirmed'
  | 'pending'
  | 'disputed'
  // Stale and archived. Listed under All only, never under a status filter.
  | 'closed';

/** The two stored statuses that read as `closed`, so the page can say why. */
export type SubmissionClosedReason = 'stale' | 'archived';

/**
 * The one definition of how a stored submission status reads to the user
 * (addendum-3 Submitted prices ruling). Live (`confirmed`) is the corroborated
 * status, the only one a price is published under; there is no separate
 * publish flag on a submission. Price checks is `disputed`; stale and archived
 * are `closed`. Anything else is still pending.
 */
export const submissionDisplayStatus = (
  dbStatus: string,
): SubmissionDisplayStatus => {
  if (dbStatus === 'corroborated') return 'confirmed';
  if (dbStatus === 'disputed') return 'disputed';
  if (submissionClosedReason(dbStatus) !== undefined) return 'closed';
  return 'pending';
};

/**
 * Why a stored status reads as `closed`, or undefined when it does not. The
 * one place that decides which statuses close, so `submissionDisplayStatus`
 * and the API's `closedReason` can never disagree: a new closing status is
 * added here and gets both.
 */
export const submissionClosedReason = (
  dbStatus: string,
): SubmissionClosedReason | undefined =>
  dbStatus === 'stale' || dbStatus === 'archived' ? dbStatus : undefined;

/**
 * What every surface that shows a submitted-price count reads: the menu (live),
 * the delete sheet (total, since every row goes), the Settings card (total and
 * live) and the Submitted prices page (total, and each filter's own count).
 */
export interface SubmissionCounts {
  /** Every row, whatever its status. */
  total: number;
  /** Published and corroborated. */
  live: number;
  pending: number;
  /** Disputed. */
  priceChecks: number;
  /** Stale and archived: in `total` and under All, in no filter. */
  closed: number;
}

/** Tallies display statuses (each entry stands for `count` rows, default 1). */
export const tallySubmissionCounts = (
  entries: Iterable<{ status: SubmissionDisplayStatus; count?: number }>,
): SubmissionCounts => {
  const counts: SubmissionCounts = {
    total: 0,
    live: 0,
    pending: 0,
    priceChecks: 0,
    closed: 0,
  };
  for (const { status, count = 1 } of entries) {
    counts.total += count;
    if (status === 'confirmed') counts.live += count;
    else if (status === 'disputed') counts.priceChecks += count;
    else if (status === 'closed') counts.closed += count;
    else counts.pending += count;
  }
  return counts;
};

// Full user profile as returned by GET /v1/users/me
export interface UserProfileResponse {
  id: string; // Clerk user ID
  email: string; // from Clerk
  handle: string | null;
  city: string | null;
  avatarColor: AvatarColor | null;
  /** The avatar pair's second colour. Null means solid. */
  avatarSecondColor: AvatarColor | null;
  theme: UserTheme;
  planState: PlanState;
  displayRole: DisplayRole;
  roleBadge: RoleBadge | null;
  joined: string; // formatted "Apr 2026"
  /** Every submission the account has made. Same as `submissionCounts.total`. */
  submissionCount: number;
  submissionCounts: SubmissionCounts;
  cred: number; // lifetime cumulative confirmed-submission count
  // Founder window snapshot — evaluated server-side so the client never
  // does date math.
  founderWindow: FounderWindowView;
}

// Single submission row as returned by GET /v1/users/me/submissions
export interface UserSubmissionItem {
  id: string;
  eventId: string;
  artist: string;
  venue: string;
  venueSlug: string | null; // for the venue tile; null when the event has no venue
  date: string; // ISO YYYY-MM-DD
  priceMin: number; // cents (integer)
  priceMax: number | null;
  tier: Tier;
  corroborationCount: number; // fans who confirmed this price
  submittedAt: string; // ISO timestamp
  status: SubmissionDisplayStatus;
  /** Why a `closed` row closed (addendum-4 §6). Absent on every other status. */
  closedReason?: SubmissionClosedReason;
}

// Handle availability check response
export interface HandleAvailabilityResponse {
  available: boolean;
  reason?: 'taken' | 'reserved';
}

// WatchingShow — a single upcoming show saved by the user, with price delta context
export interface WatchingShow {
  userEventId: string;
  /** B+ A5: set when the stale sweep removed it (No longer listed). */
  eventDelistedAt?: string | null;
  eventId: string;
  artist: string;
  venueName: string;
  venueSlug: string;
  date: string; // ISO YYYY-MM-DD
  showTime: string | null;
  ticketUrl: string | null;
  ticketLinks: TicketLink[] | null;
  savedAt: string; // ISO — when the user saved the show
  savedPrice: number | null; // dollars (from ticket_price_min at save time)
  // Dollars — the cheapest corroborated tier, falling back to
  // events.ticketPriceMin for events with no corroborated submissions.
  currentPrice: number | null;
  // Where `currentPrice` came from, read off the same headline. Null means a
  // crawled price with no corroborated submission, which renders no chip.
  priceSourceCategory: SourceCategory | null;
  eventStatus: 'upcoming' | 'cancelled' | 'postponed';
  watchStatus: 'live' | 'soldout';
  updatedAt: string; // ISO — last time event row was updated
  // ISO when `currentPrice` was observed, for the staleness marker (#1366).
  // Null for crawler-sourced prices, where `updatedAt` is the best available
  // proxy — a re-crawl is what last confirmed the number.
  priceObservedAt: string | null;
  imageUrl: string | null;
  // Second link in the imagery chain behind `imageUrl`, so a watched show
  // resolves to the same picture Browse gives it. Null when the event has no
  // canonical headliner, or that headliner has no portrait yet.
  artistPhotoUrl: string | null;
  /**
   * The event's genres, so a Watching row carries the genre edge, ring and
   * chip Browse gives the same show (B+ rule 2). An optimistic row has none
   * to report until the server's row replaces it, so it carries `[]`.
   */
  genres: string[];
  // ISO when the user said "I'm going!", independent of watching (#70). The
  // 7-day nudge reads it to decide whether it has already been answered.
  attendingAt: string | null;
}

// WatchingDismissResponse — returned by POST (dismissed: true) and DELETE
// (dismissed: false, the Undo) /v1/watching/:eventId/dismiss: hide a No longer
// listed show from my own Watching list. A 409 carries `code: 'not_delisted'`.
export interface WatchingDismissResponse {
  dismissed: boolean;
}

// WatchToggleResponse — returned by PUT /v1/watching/:eventId
export interface WatchToggleResponse {
  watching: boolean;
  savedPrice: number | null;
  /**
   * The `user_events` row this watch now lives on, or null when the toggle
   * turned watching OFF.
   *
   * ⚠️ The follow nudge keys its one-time dismissal on THIS, never on
   * `eventId`. Un-watching deletes the row (unless the user is also attending),
   * so a re-watch mints a new id and the nudge is legitimately offered again.
   * Keying on the event instead is the #70-class bug where a dismissal taken
   * once silences the surface forever.
   */
  userEventId: string | null;
  /** Headliner display name, for the nudge's copy. Null when watching OFF. */
  artist: string | null;
  /**
   * The headliner's artist-page slug, or null when the artists projection has
   * no row for that name (a normal case, not an error) or watching went OFF.
   * No slug means there is nothing to follow, so there is no nudge.
   */
  artistSlug: string | null;
}

// --- Concert History (#70) ---
// Attendance is its own timestamp on user_events, never derived from watching.

// AttendingToggleResponse — returned by PUT/DELETE /v1/attending/:eventId
export interface AttendingToggleResponse {
  going: boolean;
  attendingAt: string | null; // ISO, null when released
  // DELETE only: a short-lived token that lets the caller put back exactly the
  // attendance it just removed (the Undo toast). Null when nothing was removed
  // or the server cannot sign one, in which case the client shows no Undo.
  restore?: { attendingAt: string; token: string } | null;
}

// One attended night — GET /v1/history. dateLabel and showTime arrive
// pre-formatted in Mountain Time because the row treats date presentation as
// data, not copy.
export interface HistoryShow {
  eventId: string;
  artist: string;
  // The headliner's portrait, or null when the artist row has none and the
  // tile falls through to generated identity art. Non-optional so a surface
  // that forgets the `artists` join fails to typecheck rather than silently
  // rendering every night as generated art.
  artistPhotoUrl: string | null;
  venueName: string;
  venueSlug: string;
  neighborhood: string | null;
  date: string; // YYYY-MM-DD, event local date
  dateLabel: string; // "Mon, Oct 20"
  showTime: string | null; // "8:00 PM"
  priceFinal: number | null; // last observed face price
  genre: string | null; // single word, drives "top genre"
  attendingAt: string; // ISO — non-null by construction on this surface
  // Share-this-night inputs (a PosterSource needs the venue's place and clock).
  venueCity: string;
  venueTimezone: string;
  rawShowTime: string | null; // HH:MM:SS wall-clock, as stored
}

// GET /v1/history/past-shows — the Add-a-show list. Scope narrows the list.
export type PastShowsScope = 'all' | 'venues' | 'follows';

export interface PastShowRow {
  eventId: string;
  artist: string;
  artistPhotoUrl: string | null;
  venueName: string;
  venueSlug: string;
  date: string; // YYYY-MM-DD
  dateLabel: string; // "Mon, Oct 20"
  attendingAt: string | null; // the caller's own stamp, null if not marked
}

export interface PastShowsResponse {
  rows: PastShowRow[];
  total: number;
  nextCursor: string | null;
}

export interface HistoryStats {
  nights: number;
  venues: number;
  artists: number;
  topGenre: string | null;
  topVenue: string | null;
  first: string | null; // YYYY-MM-DD
  last: string | null;
  totalSpent: number | null; // null when no row has priceFinal
}

// Attendance is one list split by time (#1357): `past` and `upcoming` are the
// same `attending_at IS NOT NULL` rows differing only by whether the date has
// gone by. `stats` covers `past` alone — a night that hasn't happened yet can't
// be counted, priced, or ranked.
export interface HistoryResponse {
  past: HistoryShow[];
  upcoming: HistoryShow[];
  stats: HistoryStats;
}

// --- Admin user detail (GET /v1/admin/users/:userId) ---
// Aggregates a single user's identity (Clerk + user_profiles) with their
// feedback history and watchlist so admins can triage a "View @user" jump from
// the feedback inbox. When Clerk has no record for the id (e.g. a deleted
// account still referenced by old feedback rows), Clerk-only fields — email,
// role, joinedAt — go null, but handle/city/theme/avatarColor still fall back
// to the retained user_profiles row when one exists.

// Admin-surface unions — prefixed to avoid colliding with future general
// domain types. AdminUserEventStatus spans the full user_event_status enum, but
// 'going' and 'interested' are legacy read-only since #70 — attendance is
// `attendingAt`, and the only value written today is 'watching'.
export type AdminFeedbackStatus =
  'unread' | 'read' | 'flagged' | 'issue_opened' | 'resolved' | 'archived';
export type AdminUserEventStatus = 'going' | 'interested' | 'watching';

export interface AdminUserFeedbackItem {
  id: string;
  category: FeedbackCategory;
  status: AdminFeedbackStatus;
  message: string;
  pageUrl: string;
  issueUrl: string | null;
  createdAt: string;
}

// Named for the full tracked-event set, not just the watchlist — a row can
// carry attendance with no Watching relationship at all, so "watching" would
// mislead. `status: null` is exactly that case (#70).
export interface AdminUserTrackedEventItem {
  eventId: string;
  eventTitle: string;
  eventDate: string; // ISO YYYY-MM-DD
  venueName: string | null;
  status: AdminUserEventStatus | null;
  attendingAt: string | null; // ISO — set when the user marked "I'm going!"
  createdAt: string;
}

export interface AdminUserDetailStats {
  feedback: number;
  trackedEvents: number;
  priceSubmissions: number;
  artistFollows: number;
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  handle: string | null;
  city: string | null;
  theme: UserTheme | null;
  avatarColor: AvatarColor | null;
  /** The avatar pair's second colour. Null means solid. */
  avatarSecondColor: AvatarColor | null;
  role: Role | null;
  joinedAt: string | null; // Clerk account creation, ISO
  // true when no Clerk record backs this id (deleted account) — identity
  // fields fall back to profile/null and the UI shows a retained-activity note.
  clerkAccountMissing: boolean;
  stats: AdminUserDetailStats;
  feedback: AdminUserFeedbackItem[];
  trackedEvents: AdminUserTrackedEventItem[];
}

// --- Spotify sync (#763) ---
// Connection payload returned by GET/POST/PATCH /v1/spotify/connection and
// POST /v1/spotify/connection/sync (eng spec §6). A user with no connection
// row gets the bare disconnected variant.
export type SpotifyConnectionStatus = 'connected' | 'error' | 'revoked';

export interface SpotifyConnectionView {
  status: SpotifyConnectionStatus;
  displayName: string | null;
  artistCount: number;
  lastSyncedAt: string | null; // ISO
  autoWatch: boolean;
  digestEnabled: boolean;
  pushEnabled: boolean;
  // Denver-match summary (§9.1 canonical match against upcoming events) —
  // additive extension over the spec §6 payload so the connect-success and
  // Connections surfaces can show real "N play Denver" numbers (PR 5).
  denverArtistCount: number;
  denverShowCount: number;
  // Display names of every Denver-matched artist for the "WE RECOGNIZED"
  // chip row on the connect-success screen (folds past 6 behind "+N more").
  matchedArtists: string[];
}

export type SpotifyConnectionResponse =
  SpotifyConnectionView | { status: 'disconnected' };

// GET /v1/spotify/nudge — post-first-watch connect nudge gate (PR 5).
// Eligible = user has no Spotify connection row AND has never seen the nudge
// (user_profiles.spotify_nudge_seen_at IS NULL).
export interface SpotifyNudgeResponse {
  eligible: boolean;
}

// GET /v1/spotify/taste-picks — "Based on your taste" discovery shelf
// (#763 PR 8, eng spec §9.4). Why the event matched, so the UI can render
// the design's reason chips: top-artist matches carry the listening rank
// ("In your top 5" / "You play them a lot"), followed-artist matches render
// "Following". artistName is the display name of the matched artist.
export type SpotifyTastePickReason =
  | { kind: 'top'; rank: number; artistName: string }
  | { kind: 'followed'; artistName: string };

// One shelf card — a lean event projection (the shelf card shows art,
// artist, venue · date, and a single price), not the full EventWithVenue.
export interface SpotifyTastePick {
  eventId: string;
  artist: string;
  title: string;
  imageUrl: string | null;
  // Second source in the imagery chain (#1525) — the headliner's portrait,
  // shown when the event carries no artwork of its own.
  artistPhotoUrl: string | null;
  date: string; // YYYY-MM-DD, event-local (Mountain Time) calendar date
  showTime: string | null; // HH:MM:SS
  ticketPriceMin: string | null; // decimal string, matches events payloads
  venueName: string;
  venueSlug: string;
  reason: SpotifyTastePickReason;
}

// status mirrors the connection row so the shelf can render the design's
// failure ("taste on pause" + Reconnect) state without a second request;
// error/revoked/disconnected responses always carry an empty picks array.
export interface SpotifyTastePicksResponse {
  status: SpotifyConnectionStatus | 'disconnected';
  picks: SpotifyTastePick[];
}

/**
 * What `GET /v1/admin/triage` sends for `sweep.at` when no crawl run exists at
 * all. Shared because the API produces it and the admin triage panel branches
 * on it: matching by value across two apps meant changing the placeholder here
 * would silently revert the panel to rendering "crawled clean at —", claiming a
 * sweep that never ran.
 */
export const TRIAGE_NO_SWEEP = '—';

/**
 * What the API names an admin who has no handle (an account that is gone has
 * no profile row). Shared because the web matches it by value to leave it
 * untagged ("by a former admin", never "by @a former admin").
 */
export const FORMER_ADMIN_NAME = 'a former admin';

// Admin-wide settings (one row). `llmMonthlyBudgetUsd` is null when no budget
// is set; `updatedAt` and `updatedBy` are null until the first save.
export interface AdminSettings {
  llmMonthlyBudgetUsd: number | null;
  // Percent of the monthly budget at which the admin is warned.
  llmBudgetWarnAtPercent: LlmBudgetWarnAtPercent;
  // "If it runs out": on means stop the LLM once the monthly budget is spent
  // and crawl with HTML and JSON-LD only; off (the default) means keep using
  // the LLM and warn.
  llmBudgetFallbackToStructured: boolean;
  approvePricesMyself: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

// The three "Warn me at" choices drawn on the LLM budget panel.
export const LLM_BUDGET_WARN_AT_PERCENTS = [50, 75, 90] as const;
export type LlmBudgetWarnAtPercent =
  (typeof LLM_BUDGET_WARN_AT_PERCENTS)[number];

// What `GET /v1/admin/notifications/delivery` returns for the Health page's
// "The site" tile: transactional email outcomes from `email_send_log` in the
// last `hours` hours. `lastSentAt` is the newest sent row at any age, or null
// when nothing has ever been sent. `failed` leaves out sends still waiting on
// Resend (claimed moments ago, not yet answered).
export interface AdminEmailDelivery {
  lastSentAt: string | null;
  sent: number;
  failed: number;
  suppressed: number;
  // Rows in the window with any status other than the three above, so an
  // unexpected status shows up instead of vanishing from the totals.
  other: number;
  hours: number;
}

// One audit_log row as the admin reads it. `actor` is a handle or a `system:`
// name, never a Clerk id.
export interface AuditLogItem {
  id: string;
  actor: string;
  actorKind: 'system' | 'admin';
  action: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Admin Needs you queue (admin redesign 2a)
// ---------------------------------------------------------------------------

export type NeedsYouKind =
  | 'show-dropped'
  | 'show-moved'
  | 'venue-failing'
  | 'venue-blocked'
  | 'artist'
  | 'event-low-confidence'
  | 'price-check'
  | 'price-batch'
  | 'bug';

// One drawn answer button. `slug` is the drawn label, snake-cased, and is what
// POST /needs-you/items/:key/answer takes. `notifiesFans` answers sit behind a
// confirm dialog and have no Undo; `undoable` ones can be taken back until the
// item's state changes again.
export interface NeedsYouAnswerOption {
  slug: string;
  label: string;
  notifiesFans: boolean;
  undoable: boolean;
  suggested: boolean;
}

// Fields every card carries. `key` is `<kind>:<id>[:<evidenceKey>]`. `fanDate`
// is the earliest date a fan will see the affected show(s), as YYYY-MM-DD, or
// null when the item is not tied to a show (a bug, a blocked venue with no
// upcoming shows). The queue is ordered by it, soonest first.
export interface NeedsYouItemBase {
  key: string;
  kind: NeedsYouKind;
  title: string;
  venueId: string | null;
  venueName: string | null;
  fanDate: string | null;
  watchers: number;
  answers: NeedsYouAnswerOption[];
}

export interface NeedsYouEvidenceLine {
  label: string;
  value: string;
}

/** One stored Spotify candidate for an artist match question. */
export interface NeedsYouArtistCandidate {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[] | null;
  spotifyUrl: string | null;
  /** The artist's current match. */
  current: boolean;
  /** The candidate's name is the artist's own name. */
  exact: boolean;
  /** An artist with this Spotify id has shows in our own events. */
  playsDenver: boolean;
}

/** A crawl run's recorded robots.txt result (`crawl_runs.robots_txt_blocked`). */
export type NeedsYouRobotsResult = 'yes' | 'no' | 'unchecked';

export type NeedsYouItem =
  | (NeedsYouItemBase & {
      kind: 'show-dropped';
      eventId: string;
      /**
       * The show's start time as stored (`HH:MM:SS`, venue-local Mountain wall
       * clock, no zone to convert), or null. The same on the other two kinds.
       */
      showTime: string | null;
      classification: MissingClassification;
      lastSeenAt: string | null;
      /**
       * Other upcoming shows at this venue that the venue's latest successful
       * crawl run still saw (not missing, seen since that run began). Null when
       * the venue has no successful run or the show has no venue.
       */
      otherShowsCrawledFine?: number | null;
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'show-moved';
      eventId: string;
      showTime: string | null;
      moveTo: { eventId: string; title: string; venueName: string | null };
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'venue-failing' | 'venue-blocked';
      cause: string | null;
      lastRuns: {
        at: string;
        status: CrawlStatus;
        /** Why the run produced nothing; the run's chip reads it before the status. */
        reason?: CrawlRunReason | null;
        errorMessage: string | null;
        /** Events the run's extractor found (raw, before the usable guards). */
        eventsFound?: number | null;
        /** HTTP status the run recorded, or null when it recorded none. */
        httpStatus?: number | null;
      }[];
      /** The venue is published (`venues.active`). Pausing the crawl leaves it true. */
      venueLive?: boolean;
      /** When an admin paused crawling (`crawl_paused_at`, ISO), or null. */
      pausedAt?: string | null;
      /** Upcoming, visible, currently-seen published shows at the venue. */
      showCount?: number;
      /**
       * Successful runs in a row immediately before the current failure (or
       * the block), skipped runs ignored; scans the last 100 runs, so it tops
       * out at 100.
       */
      okStreakBefore?: number | null;
      /** venue-blocked only: pages the latest run fetched; null if none recorded. */
      pagesThisRun?: number | null;
      /**
       * venue-blocked only: the latest run's robots.txt result as recorded
       * (`yes` blocked, `no`, `unchecked`), or null.
       */
      robots?: NeedsYouRobotsResult | null;
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'artist';
      artistId: string;
      matchStatus: string;
      reportCount: number;
      /** The venue of the artist's next show (within the queue's window). */
      nextShowVenue?: string | null;
      /** The artist's current Spotify match, if any. */
      spotifyArtistId?: string | null;
      /** The artist's current photo, if any. */
      photoUrl?: string | null;
      /** Reasons on the open reports (`different_artist`, `wrong_photo`, ...). */
      reportReasons?: string[];
      /** The stored Spotify candidates, exact name match first, at most 5. */
      candidates?: NeedsYouArtistCandidate[];
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'event-low-confidence';
      eventId: string;
      showTime: string | null;
      /** The extracted headliner (`events.artist`), or null. */
      artist?: string | null;
      /** The venue's own description of the show, when the crawl kept one. */
      description?: string | null;
      /** The extractor's confidence (0 to 1), or null. */
      confidence?: number | null;
      /** The auto-approve bar the crawler holds extracted events to. */
      autoApproveBar?: number;
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'price-check';
      contestId: string;
      listedPrice: string | null;
      checkedPrice: string | null;
      /** The listed price's top end, or null for an open-ended "from" price. */
      listedMax?: string | null;
      /** The checked price's top end, or null for an open-ended "from" price. */
      checkedMax?: string | null;
      /** The ticket tier the check is for (`ga`, `vip`, ...). */
      tier?: string;
      /** When the listed price was submitted, and when it was checked (ISO). */
      listedAt?: string;
      checkedAt?: string;
      /** Fans backing the checked price (`corroboration_count`). */
      checkedFans?: number;
      /** The show's ticket page, if the event has one. */
      ticketUrl?: string | null;
      /** The checking fan's prices: all, and how many are approved. */
      checkerSubmissions?: number;
      checkerApproved?: number;
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'price-batch';
      submissionIds: string[];
      evidence: NeedsYouEvidenceLine[];
    })
  | (NeedsYouItemBase & {
      kind: 'bug';
      feedbackId: string;
      /** The full report (the title is cut at 80 characters). */
      message?: string;
      /** When it was reported (ISO). */
      createdAt?: string;
      /** The reporter's handle; null once the account is gone. */
      handle?: string | null;
      /** The screenshot the reporter attached, as stored, if any. */
      screenshot?: string | null;
      /** The GitHub issue the report was filed as, if any. */
      issueUrl?: string | null;
      evidence: NeedsYouEvidenceLine[];
    });

// The badge: decisions waiting and nothing else. A batch is one decision.
// `handledToday` is needs_you.answer audit rows since midnight Mountain Time.
export interface NeedsYouCount {
  decisions: number;
  byKind: Record<NeedsYouKind, number>;
  handledToday: number;
}

// What the Needs you All clear card says (`02-needs-you/all-clear`), from
// GET /v1/admin/needs-you/facts. Read only when the queue is empty: the
// sidebar polls /count, which stays cheap.
export interface AllClearFacts {
  /** The latest nightly that started: venues read OK (fetched or unchanged) of all it covered. */
  lastCrawl: { ok: number; total: number; at: string } | null;
  /**
   * The next daily crawl, ISO UTC, from the cron schedule in
   * `apps/api/vercel.json`; null outside production, where none runs.
   */
  nextCrawlAt: string | null;
  /** Items of any kind snoozed right now (a "Not useful" switch is not one). */
  snoozed: number;
  /** When the soonest snoozed item comes back, ISO UTC; null with none. */
  nextBackAt: string | null;
}

// A kind an admin turned off for one venue ("Not useful"), for the venue
// Overview's WARNINGS YOU TURNED OFF. Turn back on is
// DELETE /needs-you/snoozes/:id with its `id`.
export interface NeedsYouNotUsefulSnooze {
  id: string;
  kind: NeedsYouKind;
  venueId: string;
  reason: string | null;
  createdAt: string;
  /** The admin's handle, or "a former admin". */
  createdByName: string;
}

// ── Admin People (redesign 5a) ───────────────────────────────────────────────

/** How a person came in: a personal invite code, a poster code (a multi-use
 * code with a label), the founder window, or a test account. */
export interface PersonJoinSource {
  kind: 'code' | 'poster' | 'member' | 'founder' | 'test';
  /** The invite code string, for `code` and `poster`. */
  code: string | null;
  /** Where a poster was put, e.g. "Hi-Dive bathroom, Nov". */
  label: string | null;
}

/** One line of "Recent": the five newest of a person's reports, prices and feedback. */
export type PersonRecent =
  | {
      kind: 'price';
      at: string;
      priceMin: string;
      priceMax: string | null;
      artist: string;
      venueName: string;
    }
  | { kind: 'feedback'; at: string; message: string }
  | {
      kind: 'report';
      at: string;
      /** `wrong_artist` and friends for an artist report; the show status for an event report. */
      about: 'artist' | 'event';
      reason: string;
      subject: string;
    };

export interface PersonDetail {
  id: string;
  handle: string | null;
  /** Their own avatar colours (null: not chosen). */
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
  role: Role;
  createdAt: string | null;
  lastActiveAt: string | null;
  isTestAccount: boolean;
  founder: boolean;
  emailMasked: string;
  /** "Google", "email", "password" ... from Clerk; empty when none is known. */
  signInMethods: string[];
  joinSource: PersonJoinSource | null;
  /** For a code or poster: how many people joined with it (this person included). */
  codeRedeemerCount: number | null;
  stats: {
    watching: number;
    /** Past shows they marked going. */
    concerts: number;
    submittedPrices: number;
    feedback: number;
  };
  recent: PersonRecent[];
}

// ── Admin venues (redesign 3a) ───────────────────────────────────────────────

/** Why an admin hid a venue from the site. */
export type VenueHideReason = 'venue_closed' | 'not_music_venue' | 'other';

/**
 * The latest crawl run of a venue. One shape, returned by both the admin list
 * (`GET /admin/venues`) and the detail (`GET /admin/venues/:id`).
 */
export interface VenueLatestRun {
  /** The run's id, for Open run. */
  id: string;
  status: CrawlStatus;
  reason: CrawlRunReason | null;
  at: string;
  eventsFound: number;
  eventsInserted: number;
  /** The first 300 characters of the error, for a failed run. */
  errorMessage: string | null;
}

/** What a hard delete of a venue would destroy; any above zero refuses it. */
export interface VenueDeleteBlockers {
  pastShows: number;
  upcomingShows: number;
  watchers: number;
}
