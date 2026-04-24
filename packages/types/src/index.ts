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
