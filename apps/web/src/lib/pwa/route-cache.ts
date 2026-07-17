// Explicit allowlist of PUBLIC, read-only API paths safe to cache for offline
// browsing. Anything not matched here is network-only — this is the privacy
// safeguard, so the default must stay deny. In particular, user-specific
// subresources that live under a public prefix (e.g. /v1/events/:id/reports,
// /v1/events/:id/price-submissions, /v1/events/:id/watch) must NEVER match.
const PUBLIC_API_PATTERNS: readonly RegExp[] = [
  // Event list + fixed public collections
  /^\/v1\/events$/,
  /^\/v1\/events\/genres$/,
  /^\/v1\/events\/availability$/,
  // Single event by id, and its public related-events list — but nothing
  // deeper or user-specific under the same id segment.
  /^\/v1\/events\/[^/]+$/,
  /^\/v1\/events\/[^/]+\/related$/,
  // Venue list + single venue by slug
  /^\/v1\/venues$/,
  /^\/v1\/venues\/[^/]+$/,
]

export const isPublicCacheableApi = (url: URL): boolean =>
  PUBLIC_API_PATTERNS.some((pattern) => pattern.test(url.pathname))
