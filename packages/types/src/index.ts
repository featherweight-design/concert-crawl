// User roles — mirrors Clerk publicMetadata.role
export type Role = 'admin' | 'sub_admin' | 'user'

// Ordered lowest → highest privilege. Used for role comparison across API and web.
export const ROLE_HIERARCHY: readonly Role[] = ['user', 'sub_admin', 'admin']

// Type guard — use instead of casting when reading role from external sources (e.g. Clerk metadata)
export function isRole(value: unknown): value is Role {
  return ROLE_HIERARCHY.includes(value as Role)
}

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

// Crawl run status
export type CrawlStatus = 'success' | 'failed' | 'partial'

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

// How the submitter found the price
export type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue'

// Shared validation policy — server enforces, client mirrors for UX
export const SP_POLICY = {
  floorMin: 1,
  floorMax: 2000,
  ceilingMax: 2000,
  confirmsRequired: 2,
  rateLimitHours: 24,
  outlierLowFactor: 0.4,
  outlierHighFactor: 2.5,
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
  lastCrawledAt: string | null
  crawlNotes: string | null
  crawlDelayMs: number
  robotsTxtAllowed: boolean | null
  robotsTxtCheckedAt: string | null
  consecutiveFailures: number
  blockedAt: string | null
  extractionStrategy: ExtractionStrategy | null
  contactEmail: string | null
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
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  priceSource: PriceSource | null
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
  disputedSubmissionId: string | null
  status: 'pending' | 'corroborated' | 'disputed' | 'stale'
  corroborationCount: number
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

// EventWithVenue — event joined with its venue, returned by the public events API
export interface EventWithVenue extends Event {
  venue: Pick<
    Venue,
    'id' | 'name' | 'slug' | 'city' | 'websiteUrl' | 'timezone'
  >
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
export type UserTheme = 'electric' | 'jade' | 'light'

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
  savedAt: string // ISO — when the user saved the show
  savedPrice: number | null // dollars (from ticket_price_min at save time)
  currentPrice: number | null // dollars, from events.ticketPriceMin at query time
  sourceKind: 'primary' | 'resale' | 'community' | null
  eventStatus: 'upcoming' | 'cancelled' | 'postponed'
  watchStatus: 'live' | 'soldout' | 'presale'
  updatedAt: string // ISO — last time event row was updated (for stale check)
  imageUrl: string | null
}

// WatchToggleResponse — returned by PUT /v1/watching/:eventId
export interface WatchToggleResponse {
  watching: boolean
  savedPrice: number | null
}
