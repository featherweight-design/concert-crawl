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

// Notification types
export type NotificationType = 'admin_alert' | 'user_notification'

// Feedback categories
export type FeedbackCategory = 'bug' | 'suggestion' | 'praise'

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
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
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

// EventWithVenue — event joined with its venue, returned by the public events API
export interface EventWithVenue extends Event {
  venue: Pick<Venue, 'id' | 'name' | 'slug' | 'city' | 'websiteUrl'>
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
