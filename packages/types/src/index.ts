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
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

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
  | 'AXS'
  | 'Ticketmaster'
  | 'SeatGeek'
  | 'DICE'
  | 'Eventbrite'
  | 'VenueBoxOffice'

// Ticket vendor — lower-cased for pipeline
export type TicketVendor =
  | 'axs'
  | 'ticketmaster'
  | 'seatgeek'
  | 'dice'
  | 'eventbrite'
  | 'venue_box_office'
  | 'unknown'

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
  debugCaptureHtml: boolean
  crawlMode: 'http' | 'browser' | null
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
}

// Event — represents the JSON-serialized API response shape.
// Date/time fields are strings; date is YYYY-MM-DD, time is HH:MM:SS or null.
export interface Event {
  id: string
  venueId: string
  title: string
  artist: string
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketUrl: string | null
  ticketLinks: TicketLink[] | null
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
  // Admin's reason text when status = 'archived' (loser-of-contest sink).
  // No DB-level length cap; the API enforces min 10 / max 2000 chars at
  // the resolve/defer Zod validators (see apps/api/src/routes/admin/
  // contests.ts resolveBodySchema + deferBodySchema).
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
  userSubmission: SubmissionWithMeta | null
}

// EventReport status options
export type EventReportStatus = 'sold-out' | 'cancelled' | 'postponed'

// EventReport evidence methods
export type EventReportEvidenceMethod =
  | 'bought_myself'
  | 'saw_listing'
  | 'venue_site'
  | 'other'

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
  upcomingEvents: Event[]
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

// Plan state — founder is the beta default; paid/trial/past-due are post-beta
export type UserPlan = 'founder' | 'paid' | 'trial' | 'past-due'

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
  plan: UserPlan
  displayRole: DisplayRole
  roleBadge: RoleBadge | null
  joined: string // formatted "Apr 2026"
  submissionCount: number
  cred: number // lifetime cumulative confirmed-submission count
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
