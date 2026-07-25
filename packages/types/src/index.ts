// Stripe decline_code → 5-category mapping (spec Part 2 §1.6) — shared by
// the API webhook handler and the web tier-picker failure surfaces.
export * from './decline-category.js'

// Monetization funnel analytics contract (eng-infra spec Part 2 §8) — shared
// event names + property shapes for web (posthog-js) and API (posthog-node).
export * from './analytics-events.js'

// User roles — mirrors Clerk publicMetadata.role
// Role always takes precedence over plan in access checks:
//   admin/promoter/beta/sub_admin get full premium access regardless of subscription.
export type Role = 'admin' | 'promoter' | 'beta' | 'sub_admin' | 'user'

// Ordered lowest → highest privilege. Used for role comparison across API and web.
export const ROLE_HIERARCHY: readonly Role[] = [
  'user',
  'beta',
  'promoter',
  'sub_admin',
  'admin',
]

// Roles that grant full premium access independent of subscription plan
export const PREMIUM_ROLES: readonly Role[] = [
  'admin',
  'sub_admin',
  'promoter',
  'beta',
]

// Type guard — use instead of casting when reading role from external sources (e.g. Clerk metadata)
export function isRole(value: unknown): value is Role {
  return ROLE_HIERARCHY.includes(value as Role)
}

// Badge displayed in ProfileHero / settings for privileged role-holders; null for regular users
// sub_admin maps to 'admin' badge; 'user' maps to null (no badge)
export type RoleBadge = 'admin' | 'promoter' | 'beta'

// Standard API response envelope
export type ApiResponse<T> =
  { success: true; data: T } | { success: false; error: string; code?: string }

// Paginated list response
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Clerk user shape (subset we use in the app)
export interface AuthUser {
  id: string // Clerk user ID
  email: string
  role: Role
  firstName: string | null
  lastName: string | null
}

// Extraction strategies used by the crawler
export type ExtractionStrategy = 'structured_data' | 'llm' | 'manual'

// Crawl run status. 'skipped' = page-hash dedup matched the last successful
// run, so extraction was bypassed (cost-saving). Treat as healthy alongside
// 'success' in dashboards; surface visually distinct so it doesn't conflate
// with 'success + eventsFound: 0' (which would indicate a real failure).
export type CrawlStatus = 'success' | 'failed' | 'partial' | 'skipped'

// Event status
export type EventStatus = 'upcoming' | 'cancelled' | 'postponed'

/**
 * Why an event landed on the admin "missing from crawl" list.
 * - removed: crawl reaches past this date but stopped returning this show (venue de-listed it)
 * - crawl_gap: event is beyond the furthest date the crawl currently reaches (likely pagination/depth)
 * - duplicate: a live sibling row for the same show is still being crawled
 */
export type MissingClassification = 'removed' | 'crawl_gap' | 'duplicate'

// Price source — identifies where ticket price data originated
export type PriceSource =
  | 'structured_data'
  | 'ticketmaster'
  | 'eventbrite'
  | 'dice'
  | 'songkick'
  | 'bandsintown'
  | 'seatgeek'
  | 'community'

// Ticket tier
export type Tier = 'GA' | 'Reserved' | 'VIP' | 'Pit' | 'Lawn'

// Ticket vendor
export type Vendor =
  'AXS' | 'Ticketmaster' | 'SeatGeek' | 'DICE' | 'Eventbrite' | 'VenueBoxOffice'

// Ticket vendor — lower-cased for pipeline
export type TicketVendor =
  | 'axs'
  | 'ticketmaster'
  | 'seatgeek'
  | 'dice'
  | 'eventbrite'
  | 'venue_box_office'
  | 'unknown'

// API provider for API-backed venue crawling (#506). When set, the crawler
// bypasses the HTML → JSON-LD → LLM cascade and pulls events from the provider.
export type ApiProvider = 'venuepilot'

// How the submitter found the price
export type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue'

// Source-category for community-submitted prices (issue #641). Distinct from
// PriceSource (which identifies the upstream data origin for events.priceSource).
// Captured directly from the submit form; legacy rows backfilled from
// (vendor, how_found) heuristics in migration 0040.
export type SourceCategory = 'boxoffice' | 'standard' | 'resale'

// Typed entry in events.ticketLinks (issue #641). Populated by the crawler
// (PR 2) and consumed by the Consumer UI (PR 4) for source-category disclosure.
export interface TicketLink {
  kind: 'boxoffice' | 'primary' | 'resale'
  vendor: string | null
  url: string
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
    : 'standard'
}

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
} as const

// Event report policy — server enforces, client mirrors for UX
export const ER_POLICY = {
  confirmsRequired: 2,
  confirmsRequiredImminent: 3,
  imminentThresholdDays: 7,
} as const

// Notification types
export type NotificationType = 'admin_alert' | 'user_notification'

// Feedback categories
export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other'

// Subscription tiers
export type SubscriptionTier = 'free' | 'premium'

// VenuePlatform — per-platform fetcher dispatch (#623). Widen the union
// as new platform adapters land in packages/crawler-core.
export type VenuePlatform = 'aeg' | 'livenation'

// PlatformProbeResult — dry-run outcome of POST /v1/admin/venues/:id/probe-platform.
// Returned inside the standard { success: true, data } envelope with HTTP 200
// for BOTH ok:true and ok:false — a failed probe is a successful diagnosis.
export type PlatformProbeResult =
  | {
      ok: true
      eventsFound: number
      fetchLatencyMs: number
      sourceUrl: string
    }
  | {
      ok: false
      reason: 'missing_config' | 'fetch_error' | 'schema_error'
      error: string
    }

// Venue — represents the JSON-serialized API response shape.
// Date fields are ISO 8601 strings because fetch().json() cannot revive Date objects.
export interface Venue {
  id: string
  name: string
  slug: string
  websiteUrl: string
  city: string
  timezone: string
  active: boolean
  verified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
  lastCrawledAt: string | null
  crawlNotes: string | null
  crawlDelayMs: number
  crawlWaitUntil: 'networkidle' | 'load' | 'domcontentloaded'
  crawlWaitForSelector: string | null
  robotsTxtAllowed: boolean | null
  robotsTxtCheckedAt: string | null
  consecutiveFailures: number
  blockedAt: string | null
  extractionStrategy: ExtractionStrategy | null
  contactEmail: string | null
  priceUrl: string | null
  ticketVendor: TicketVendor | null
  apiProvider: ApiProvider | null
  apiAccountId: string | null
  debugCaptureHtml: boolean
  crawlMode: 'http' | 'browser' | null
  platform: VenuePlatform | null
  platformVenueId: string | null
  address: string | null
  capacity: number | null
  venueType: string | null
  about: string | null
  neighborhood: string | null
  featured: boolean
  lat: number | null
  lng: number | null
  createdAt: string
  updatedAt: string
}

export type NewVenue = Omit<
  Venue,
  'id' | 'createdAt' | 'updatedAt' | 'lastCrawledAt' | 'consecutiveFailures'
>

// VenueWithEventCount — admin list view only, includes upcoming event count
export interface VenueWithEventCount extends Venue {
  eventCount: number
}

// CrawlHealth — 7-day crawl health stats returned by GET /v1/admin/venues/:id
export interface CrawlHealth {
  sevenDayPercent: number
  sparkline: { date: string; success: boolean; hasRun: boolean }[]
  lastCrawledAt: string | null
  avgDurationMs: number | null
  eventsTracked: number
  consecutiveFails: number
}

// VenueWithCrawlHealth — admin detail view includes crawl health stats
export interface VenueWithCrawlHealth extends Venue {
  crawlHealth: CrawlHealth
}

// VenueRobotsStatus — robots.txt audit row for the admin audit page.
// Reflects the stored crawl-time result on the venues table, not a live fetch.
export interface VenueRobotsStatus {
  id: string
  name: string
  slug: string
  websiteUrl: string
  robotsTxtAllowed: boolean | null
  robotsTxtCheckedAt: string | null
}

// CrawlRun — represents the JSON-serialized API response shape.
// 'in_progress' is a virtual status used during async crawl execution (not persisted to DB).
export interface CrawlRun {
  id: string
  venueId: string
  status: CrawlStatus | 'in_progress'
  httpStatusCode: number | null
  robotsTxtBlocked: string | null
  extractionStrategyUsed: string | null
  eventsFound: number
  eventsInserted: number
  eventsUpdated: number
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
  llmCostUsd?: number | null
  venueName?: string | null
  startedAt?: string | null
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
  activeAlert?: ActiveCrawlAlert | null
}

// CrawlTrigger — JSON-serialized shape of a queued crawl trigger row.
// POST /v1/admin/crawl/:venueId returns { triggerId }; the crawler service
// later stamps the trigger with a terminal `status` and, when a run row was
// created, the resulting `crawlRunId`. Clients poll GET
// /v1/admin/crawl/triggers/:id to learn when the async crawl finished, then
// fetch the linked run for its result.
export type CrawlTriggerStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface CrawlTrigger {
  id: string
  venueId: string
  status: CrawlTriggerStatus
  crawlRunId: string | null
  triggeredBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ActiveCrawlAlert {
  notificationId: string
  category:
    | 'crawl.event_count_dropped'
    | 'crawl.failed'
    | 'crawl.event_ceiling_suspected'
  // Only present for 'crawl.event_count_dropped' — the event-count alert
  // classifies the drop as 'went_dark' (0 events) or 'dropped_sharply'
  // (non-zero but well below baseline). 'crawl.failed' has no sub-severity.
  severity?: 'went_dark' | 'dropped_sharply' | null
  // Only present for 'crawl.event_ceiling_suspected' — which of the two
  // capped-catalogue fingerprints tripped (#1185). 'horizon_shrank' means the
  // furthest announced show moved materially closer; 'pinned_count' means the
  // extracted count repeated exactly across consecutive runs.
  ceilingKind?: 'horizon_shrank' | 'pinned_count' | null
}

// DailyCost — one zero-filled day bucket from GET /v1/admin/costs/daily.
// `date` is a Mountain-Time calendar date (YYYY-MM-DD); `costUsd` is the
// coalesced sum of crawl_runs.llm_cost_usd for runs on that MT day.
export interface DailyCost {
  date: string
  costUsd: number
}

// AdminDailyCosts — GET /v1/admin/costs/daily response payload. `days` is
// contiguous (missing days zero-filled server-side) and ordered oldest→newest.
export interface AdminDailyCosts {
  days: DailyCost[]
  totalUsd: number
}

// TopSpendVenue — one ranked row from GET /v1/admin/costs/top-venues.
// `venueId` is null for the aggregated "(others)" remainder row; `pct` is
// the venue's rounded share of the window total.
export interface TopSpendVenue {
  venueId: string | null
  name: string
  costUsd: number
  pct: number
}

// AdminTopSpend — GET /v1/admin/costs/top-venues response payload.
export interface AdminTopSpend {
  venues: TopSpendVenue[]
  totalUsd: number
}

// Event — represents the JSON-serialized API response shape.
// Date/time fields are strings; date is YYYY-MM-DD, time is HH:MM:SS or null.
export interface Event {
  id: string
  venueId: string
  title: string
  artist: string
  supportingArtists: string[] | null
  tourName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketUrl: string | null
  ticketLinks: TicketLink[] | null
  // The event's own detail page on the source venue site. Deep-link
  // fallback for "Get tickets" when ticketUrl is null (#1152).
  eventUrl: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  priceSource: PriceSource | null
  pipelineExhaustedAt: string | null
  description: string | null
  imageUrl: string | null
  genre: string[] | null
  status: EventStatus
  confidenceScore: string | null
  verified: boolean
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

// PriceSubmission — community-submitted ticket price for an event
export interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string
  priceMax: string | null
  tier: Tier
  vendor: Vendor
  howFound: HowFound
  sourceCategory: SourceCategory | null
  disputedSubmissionId: string | null
  status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
  corroborationCount: number
  // Submitter's free-text note (existed in DB but was missing from this
  // shared interface — added during the admin contest-review PR per #697).
  note: string | null
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
  archivedReason: string | null
  // Engagement-signal columns surfaced via priceByTier[].counterSubmission
  // so consumers see a quiet "Admin requested more info" pill on the event
  // detail page after an admin defers the contest.
  lastAdminActionAt: string | null
  lastAdminActionKind: 'defer' | null
  createdAt: string
  updatedAt: string
}

// SubmissionWithMeta — single submission + peer-confirm metadata
export interface SubmissionWithMeta extends PriceSubmission {
  confirms: number
  byYou: boolean
}

// SubmissionListResponse — response for GET /v1/events/:id/price-submissions
export interface SubmissionListResponse {
  submissions: SubmissionWithMeta[]
  alreadySubmitted: boolean
  // How many contribution acts the caller has left for this event inside the
  // 24h window (#876) — SP_POLICY.rateLimitMaxSubmissions minus acts used.
  // 0 means the next POST would 429. Anonymous callers get the full allowance.
  submissionsRemaining: number
  userSubmission: SubmissionWithMeta | null
}

// EventReport status options
export type EventReportStatus = 'sold-out' | 'cancelled' | 'postponed'

// EventReport evidence methods
export type EventReportEvidenceMethod =
  'bought_myself' | 'saw_listing' | 'venue_site' | 'other'

// EventReport — community-filed report about an event's status
export interface EventReport {
  id: string
  eventId: string
  reporterId: string
  status: EventReportStatus
  evidenceMethod: EventReportEvidenceMethod
  evidenceUrl: string | null
  note: string | null
  createdAt: string
  confirmsCount: number
  confirmsNeeded: number
  isReporter: boolean
  userHasConfirmed: boolean
  reporterHandle: string | null
}

// Setlist — likely setlist for an event, sourced from Setlist.fm
export interface Setlist {
  songs: string[]
  encore?: string[]
  source?: string
  sourceUrl?: string
  when?: string
}

// EventWithVenue — event joined with its venue, returned by the public events API
export interface EventWithVenue extends Event {
  venue: Pick<
    Venue,
    'id' | 'name' | 'slug' | 'city' | 'websiteUrl' | 'timezone'
  >
  // Vendor from the corroborated community submission — only present for community-priced events
  priceVendor?: string | null
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
  priceByTier?: TierPriceBlock[] | null
  // Display names of the viewer's Spotify-sourced taste artists (followed +
  // top, per §9.1's canonical set) that match this event's headliner or
  // supporting set (#763 PR 6, eng spec §9.2). Present ONLY for signed-in
  // users with Spotify-sourced follow rows — a possibly empty array per
  // event. Absent entirely for anonymous/unconnected viewers.
  followedArtists?: string[]
}

// Per-tier price-aggregation building blocks (issue #644). Surfaced inside
// EventDetailResponse.priceByTier. PR 4 (Consumer UI) consumes these; the
// existing flat priceVendor / priceAlternates / priceConfirmsCount fields
// stay alongside for the migration buffer and get dropped in the Contract PR.

export interface TierHeadline {
  submissionId: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  submitterHandle: string | null
  observedAt: string
  approvedAt: string
  approvalKind: 'admin' | 'fan'
  confirmsCount: number
}

export interface TierAlternate {
  submissionId: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
}

export interface TierPending {
  id: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  howFound: HowFound
  sourceCategory: SourceCategory | null
  note: string | null
  submitterHandle: string | null
  submittedAt: string
  confirmsCount: number
  confirmsNeeded: number
  isSubmitter: boolean
}

export interface TierCounter {
  id: string
  parentSubmissionId: string
  floor: number
  ceiling?: number
  submitter: { handle: string } | null
  submittedAt: string
  // Engagement-signal columns surfaced when an admin defers the contest.
  // The consumer event-detail page renders a quiet "Admin requested more
  // info" pill on the counter card when lastAdminActionKind === 'defer'.
  // Both stay null while the contest sits with no admin engagement; resolve
  // clears them on both rows so a prior defer doesn't outlive resolution.
  lastAdminActionAt: string | null
  lastAdminActionKind: 'defer' | null
}

export interface TierPriceBlock {
  tier: Tier
  headline: TierHeadline | null
  alternates: TierAlternate[]
  pending: TierPending[]
  counterSubmission: TierCounter | null
  reports: number
}

// EventDetailResponse — single event detail with computed watch state and setlist
export interface EventDetailResponse extends EventWithVenue {
  setlist: Setlist | null
  watching: number
  isWatching: boolean
  priceStatus?: 'live' | 'soldout' | null
  // Price detail fields — not yet in DB schema; null until added via migration
  ticketPriceOpenedAt?: number | null
  ticketFees?: number | null
  // Community price enrichment — vendor, submitter handle, and observation timestamp
  priceVendor?: string | null
  priceSubmitterHandle?: string | null
  priceObservedAt?: string | null
  // Approval metadata — who corroborated and when
  priceApprovalKind?: 'admin' | 'fan' | null
  priceApprovedAt?: string | null
  // Alternate corroborated submissions (other vendors/sources beyond the primary)
  priceAlternates?: Array<{
    vendor: string | null
    priceMin: string
    priceMax: string | null
  }> | null
  // Confirms count for the primary live community price
  priceConfirmsCount?: number | null
  // Pending counter-submission against the primary live price (if any).
  // parentSubmissionId is the corroborated submission being disputed — it
  // must be the value passed as disputedSubmissionId when filing a new dispute.
  counterSubmission?: {
    id: string
    parentSubmissionId: string
    floor: number
    ceiling?: number
    submitter: { handle: string } | null
    submittedAt: string
    // Engagement-signal columns surfaced when an admin defers the contest.
    // Mirrors TierCounter.lastAdminAction* above so the flat shape stays in
    // lock-step with the per-tier shape during the PR 4 migration window
    // (events.ts:666–675 writes both paths off the same counter row). Both
    // stay null while the contest sits with no admin engagement.
    lastAdminActionAt: string | null
    lastAdminActionKind: 'defer' | null
  } | null
  // Promoted sold-out report — present when a community sold-out report was confirmed
  soldOutReport?: {
    reporterHandle: string | null
    confirmsCount: number
    reportedAt: string
  } | null
  // All pending submissions whenever any exist (PR 3 dropped the
  // "only when no corroborated price" gate so multi-tier pending stays
  // visible alongside corroborated tiers). Counter rows that surface via
  // counterSubmission / priceByTier.counterSubmission are excluded so they
  // don't double-appear here. Deprecated — PR 4 migrates consumers to
  // priceByTier; the Contract PR drops this field.
  pendingSubmissions?: Array<{
    id: string
    priceMin: string
    priceMax: string | null
    tier: string
    vendor: string
    howFound: string
    sourceCategory: SourceCategory | null
    note: string | null
    submitterHandle: string | null
    submittedAt: string
    confirmsCount: number
    confirmsNeeded: number
    isSubmitter: boolean
  }> | null
  // Per-tier price aggregation (issue #644). Each tier block contains a single
  // corroborated headline (best-of by source-category trust + price), other
  // corroborated rows in the same tier as alternates, every pending submission
  // in the tier, the optional counter-submission against the headline, and a
  // total reports count. Tiers sort by entry price (lowest headline first;
  // pending-only tiers after). The flat priceVendor / priceAlternates / etc.
  // fields above stay for PR 4 migration; the eventual Contract PR drops them
  // once consumers have moved.
  priceByTier?: TierPriceBlock[] | null
}

// Public events list query params
export interface EventsListParams {
  from?: string
  to?: string
  venueSlug?: string
  search?: string
  limit?: number
  offset?: number
}

// Public events list response
export interface EventsListResponse {
  data: EventWithVenue[]
  total: number
  limit: number
  offset: number
}

export interface AvailabilityDay {
  /** ISO date `YYYY-MM-DD` (event-local calendar date). */
  date: string
  /** Number of consumer-visible shows on that date. */
  count: number
}

export interface EventsAvailabilityResponse {
  data: AvailabilityDay[]
  /** Inclusive window start, `YYYY-MM-DD`. */
  from: string
  /** Inclusive window end, `YYYY-MM-DD`. */
  to: string
}

// Related-events response (issue #833). Returned by GET /v1/events/:id/related.
// Slim payload — same shape as EventsListResponse.data but priceByTier is never
// populated (the per-tier batch query is the dominant cost on Red Rocks-sized
// venues, and the related panel doesn't need it). The consumer event detail
// page calls this in parallel with /v1/events/:id and /v1/events/:id/reports
// so the related fetch no longer blocks on resolving the venue slug first.
export interface EventsRelatedResponse {
  data: EventWithVenue[]
}

// VenuePublic — public-facing venue shape (subset of Venue, no crawl internals)
export interface VenuePublic {
  id: string
  name: string
  slug: string
  city: string
  timezone: string
  websiteUrl: string
  active: boolean
  verified: boolean
  address: string | null
  capacity: number | null
  venueType: string | null
  about: string | null
  neighborhood: string | null
  featured: boolean
  lat: number | null
  lng: number | null
  upcomingCount: number
}

// VenueWithEvents — venue profile page response
export interface VenueWithEvents {
  venue: VenuePublic
  // upcomingEvents carry the same priceVendor + priceByTier enrichment the
  // browse list endpoint adds, so the shared consumer EventCard renders an
  // identical "from" price on both surfaces (#787 parity). Without priceByTier
  // the card falls back to the flat ticketPriceMin scalar, which is clobbered
  // to whichever tier was most recently confirmed. Reuse EventWithVenue's
  // enrichment field types (minus its `venue`, which lives on the parent) so
  // the two surfaces can't drift.
  upcomingEvents: Array<Omit<EventWithVenue, 'venue'>>
}

// InviteCode — represents the JSON-serialized API response shape.
// Date fields are ISO 8601 strings because fetch().json() cannot revive Date objects.
export interface InviteCode {
  id: string
  code: string
  createdBy: string
  usedBy: string | null
  usedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  revokedBy: string | null
  createdAt: string
}

// Admin Inbox (#542) — the four operational surfaces the unified admin inbox
// aggregates. Mirrors the DB `inbox_item_type` enum.
export type InboxItemType =
  'event_flag' | 'price_submission' | 'blocked_venue' | 'crawl_failure'

// A single inbox row as returned by GET /v1/admin/inbox. Both timestamps are
// ISO strings — the row is serialized over HTTP. `sourceCreatedAt` is the
// occurrence timestamp (when the item entered the inbox); `readAt` is non-null
// only when the item has been read (via a per-item mark or a category
// watermark).
export interface InboxItem {
  itemType: InboxItemType
  itemId: string
  title: string
  body: string
  actionUrl: string
  sourceCreatedAt: string
  readAt: string | null
}

// GET /v1/admin/inbox response payload. `total` is present only when the
// request opts in via `count=true`. `unreadCounts` is always computed across
// the full inbox per category (independent of the list's category/status
// filters) so the filter-rail badges stay accurate while the list is filtered.
export interface InboxResponse {
  items: InboxItem[]
  total?: number
  unreadCounts: Record<InboxItemType, number>
}

// Avatar color token keys — survive theme switches
export type AvatarColor = 'signal' | 'accent' | 'success' | 'warning'

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
  | 'gloss'

// Six-plan model (eng infra spec Part 1, #781 §6). Mirrors the DB
// subscription_tier enum plus the two non-tier states.
export type UserPlan =
  'logged-out' | 'free' | 'supporter' | 'premium' | 'founder' | 'gifted'

// Mirrors the DB subscription_status enum (Stripe-mirrored statuses).
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'

// Derived plan state (eng infra spec Part 1, "derivePlan rewrite").
// 'past-due' is not a plan — it's `status`. 'trial' is not a plan — it's
// `onTrial` (Decision 7). Roles no longer masquerade as the founder plan.
export interface PlanState {
  plan: UserPlan
  onTrial: boolean // true ⇒ plan === 'premium' via trial (Decision 7)
  trialEndsAt: string | null // ISO; non-null while trial is live or recently ended
  status: SubscriptionStatus | null // Stripe-mirrored status; null when no subscription row
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  roleComped: boolean // PREMIUM_ROLES holder — full entitlements, picker shows "You're in already"
}

// Founder launch-window state as exposed by GET /v1/billing/founder-window
// (eng infra spec Part 2 §1.4). `seatsRemaining` is omitted pre-launch —
// the scarcity number is not public before the window opens.
export type FounderWindowState = 'pre-launch' | 'open' | 'closed'

export interface FounderWindowView {
  state: FounderWindowState
  seatsTotal: number
  seatsRemaining?: number
  closesAt: string | null // ISO; null pre-launch
}

// A single founder-seat claim, surfaced in the admin control panel's
// "recent claims" feed. seatNumber is the 1-based position (seatsTotal -
// seatsRemaining at claim time); null if the originating event predates
// seat-number metadata.
export interface AdminFounderClaim {
  userId: string
  seatNumber: number | null
  claimedAt: string // ISO
}

// GET /v1/admin/founder-window — full singleton view for the admin control
// panel (execution plan PR 6.1). Unlike the public FounderWindowView, this
// always exposes the raw seat counts plus the test-only simulation counter
// and the recent-claims feed.
export interface AdminFounderWindow {
  state: FounderWindowState
  opensAt: string | null // ISO; null while dormant (not yet launched)
  closesAt: string | null // ISO; null while opens_at is null
  windowDays: number
  seatsTotal: number
  seatsRemaining: number
  seatsRemainingTest: number // decremented only by simulate-claim
  recentClaims: AdminFounderClaim[]
}

// POST /v1/billing/checkout-session success payload (eng infra spec Part 2
// §1.3) — the Payment Element mounts against `clientSecret`.
export interface CheckoutSessionResponse {
  clientSecret: string
  subscriptionId: string
  founderSeatNumber: number | null // null for non-founder tiers
}

// User-facing role — separate from auth Role (admin/sub_admin/user)
export type DisplayRole = 'fan' | 'crew' | 'artist' | 'staff'

// Submission status as shown in the UI (mapped from DB enum)
export type SubmissionDisplayStatus = 'confirmed' | 'pending' | 'disputed'

// Full user profile as returned by GET /v1/users/me
export interface UserProfileResponse {
  id: string // Clerk user ID
  email: string // from Clerk
  handle: string | null
  city: string | null
  avatarColor: AvatarColor | null
  theme: UserTheme
  planState: PlanState
  displayRole: DisplayRole
  roleBadge: RoleBadge | null
  joined: string // formatted "Apr 2026"
  submissionCount: number
  cred: number // lifetime cumulative confirmed-submission count
  // Lifecycle nudge flags + founder window snapshot — evaluated
  // server-side (eng infra spec Part 2 §6).
  showTrialEndedTakeover: boolean
  showDayThirteenBanner: boolean
  showPastDueBanner: boolean
  founderWindow: FounderWindowView
}

// Single submission row as returned by GET /v1/users/me/submissions
export interface UserSubmissionItem {
  id: string
  eventId: string
  artist: string
  venue: string
  date: string // ISO YYYY-MM-DD
  priceMin: number // cents (integer)
  priceMax: number | null
  tier: Tier
  corroborationCount: number // fans who confirmed this price
  submittedAt: string // ISO timestamp
  status: SubmissionDisplayStatus
}

// Handle availability check response
export interface HandleAvailabilityResponse {
  available: boolean
  reason?: 'taken' | 'reserved'
}

// WatchingShow — a single upcoming show saved by the user, with price delta context
export interface WatchingShow {
  userEventId: string
  eventId: string
  artist: string
  venueName: string
  venueSlug: string
  date: string // ISO YYYY-MM-DD
  showTime: string | null
  ticketUrl: string | null
  ticketLinks: TicketLink[] | null
  savedAt: string // ISO — when the user saved the show
  savedPrice: number | null // dollars (from ticket_price_min at save time)
  currentPrice: number | null // dollars, from events.ticketPriceMin at query time
  sourceKind: 'primary' | 'resale' | 'community' | null
  eventStatus: 'upcoming' | 'cancelled' | 'postponed'
  watchStatus: 'live' | 'soldout'
  updatedAt: string // ISO — last time event row was updated (for stale check)
  imageUrl: string | null
}

// WatchToggleResponse — returned by PUT /v1/watching/:eventId
export interface WatchToggleResponse {
  watching: boolean
  savedPrice: number | null
}

// --- Admin user detail (GET /v1/admin/users/:userId) ---
// Aggregates a single user's identity (Clerk + user_profiles) with their
// feedback history and watchlist so admins can triage a "View @user" jump from
// the feedback inbox. When Clerk has no record for the id (e.g. a deleted
// account still referenced by old feedback rows), Clerk-only fields — email,
// role, joinedAt — go null, but handle/city/theme/avatarColor still fall back
// to the retained user_profiles row when one exists.

// Admin-surface unions — prefixed to avoid colliding with future general
// domain types. AdminUserEventStatus spans the full tracked-event set (the
// detail view shows going/interested/watching, not just the watchlist).
export type AdminFeedbackStatus =
  'unread' | 'read' | 'flagged' | 'issue_opened' | 'resolved' | 'archived'
export type AdminUserEventStatus = 'going' | 'interested' | 'watching'

export interface AdminUserFeedbackItem {
  id: string
  category: FeedbackCategory
  status: AdminFeedbackStatus
  message: string
  pageUrl: string
  issueUrl: string | null
  createdAt: string
}

// Named for the full tracked-event set (going/interested/watching), not just
// the watchlist — status can be any AdminUserEventStatus, so "watching" would
// mislead.
export interface AdminUserTrackedEventItem {
  eventId: string
  eventTitle: string
  eventDate: string // ISO YYYY-MM-DD
  venueName: string | null
  status: AdminUserEventStatus
  createdAt: string
}

export interface AdminUserDetailStats {
  feedback: number
  trackedEvents: number
  priceSubmissions: number
  artistFollows: number
}

export interface AdminUserDetail {
  id: string
  email: string | null
  handle: string | null
  city: string | null
  theme: UserTheme | null
  avatarColor: AvatarColor | null
  role: Role | null
  joinedAt: string | null // Clerk account creation, ISO
  // true when no Clerk record backs this id (deleted account) — identity
  // fields fall back to profile/null and the UI shows a retained-activity note.
  clerkAccountMissing: boolean
  stats: AdminUserDetailStats
  feedback: AdminUserFeedbackItem[]
  trackedEvents: AdminUserTrackedEventItem[]
}

// --- Spotify sync (#763) ---
// Connection payload returned by GET/POST/PATCH /v1/spotify/connection and
// POST /v1/spotify/connection/sync (eng spec §6). A user with no connection
// row gets the bare disconnected variant.
export type SpotifyConnectionStatus = 'connected' | 'error' | 'revoked'

export interface SpotifyConnectionView {
  status: SpotifyConnectionStatus
  displayName: string | null
  artistCount: number
  lastSyncedAt: string | null // ISO
  autoWatch: boolean
  digestEnabled: boolean
  pushEnabled: boolean
  // Denver-match summary (§9.1 canonical match against upcoming events) —
  // additive extension over the spec §6 payload so the connect-success and
  // Connections surfaces can show real "N play Denver" numbers (PR 5).
  denverArtistCount: number
  denverShowCount: number
  // Display names of every Denver-matched artist for the "WE RECOGNIZED"
  // chip row on the connect-success screen (folds past 6 behind "+N more").
  matchedArtists: string[]
}

export type SpotifyConnectionResponse =
  SpotifyConnectionView | { status: 'disconnected' }

// GET /v1/spotify/nudge — post-first-watch connect nudge gate (PR 5).
// Eligible = user has no Spotify connection row AND has never seen the nudge
// (user_profiles.spotify_nudge_seen_at IS NULL).
export interface SpotifyNudgeResponse {
  eligible: boolean
}

// GET /v1/spotify/taste-picks — "Based on your taste" discovery shelf
// (#763 PR 8, eng spec §9.4). Why the event matched, so the UI can render
// the design's reason chips: top-artist matches carry the listening rank
// ("In your top 5" / "You play them a lot"), followed-artist matches render
// "Following". artistName is the display name of the matched artist.
export type SpotifyTastePickReason =
  | { kind: 'top'; rank: number; artistName: string }
  | { kind: 'followed'; artistName: string }

// One shelf card — a lean event projection (the shelf card shows art,
// artist, venue · date, and a single price), not the full EventWithVenue.
export interface SpotifyTastePick {
  eventId: string
  artist: string
  title: string
  imageUrl: string | null
  date: string // YYYY-MM-DD, event-local (Mountain Time) calendar date
  showTime: string | null // HH:MM:SS
  ticketPriceMin: string | null // decimal string, matches events payloads
  venueName: string
  venueSlug: string
  reason: SpotifyTastePickReason
}

// status mirrors the connection row so the shelf can render the design's
// failure ("taste on pause" + Reconnect) state without a second request;
// error/revoked/disconnected responses always carry an empty picks array.
export interface SpotifyTastePicksResponse {
  status: SpotifyConnectionStatus | 'disconnected'
  picks: SpotifyTastePick[]
}
