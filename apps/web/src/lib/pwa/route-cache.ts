// Explicit allowlist of PUBLIC, read-only API paths safe to cache for offline
// browsing. Anything not matched here is network-only — this is the privacy
// safeguard, so the default must stay deny. In particular, user-specific
// subresources that live under a public prefix (e.g. /v1/events/:id/reports,
// /v1/events/:id/price-submissions, /v1/events/:id/watch) must NEVER match.
// The API contract for GET /v1/events/:id validates the id as a UUID
// (z.string().uuid()), so we match a UUID shape rather than any single segment.
// This keeps default-deny airtight: a future non-ID route like
// /v1/events/search or /v1/events/recommended won't accidentally become
// cacheable just because it's one segment deep.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const PUBLIC_API_PATTERNS: readonly RegExp[] = [
  // Event list + fixed public collections
  /^\/v1\/events$/,
  /^\/v1\/events\/genres$/,
  /^\/v1\/events\/availability$/,
  // Single event by UUID, and its public related-events list — but nothing
  // deeper or user-specific under the same id segment.
  new RegExp(`^/v1/events/${UUID}$`, 'i'),
  new RegExp(`^/v1/events/${UUID}/related$`, 'i'),
  // Venue list + single venue by slug (slugs are not UUIDs, and the public
  // venues router exposes no non-public single-segment subresources).
  /^\/v1\/venues$/,
  /^\/v1\/venues\/[^/]+$/,
]

export const isPublicCacheableApi = (url: URL): boolean =>
  PUBLIC_API_PATTERNS.some((pattern) => pattern.test(url.pathname))
