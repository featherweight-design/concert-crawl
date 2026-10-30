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

// The production API's origins across the Render exit (2026-10/11). The web
// app reads the API from NEXT_PUBLIC_API_URL, which is inlined at build time,
// so the switch from Render to Vercel happens with a web redeploy. An open tab
// from before it keeps calling the old origin while the new service worker
// controls it (and the reverse can briefly hold too), so both stay eligible
// for the public cache until the Render service is deleted. Drop the onrender
// entry in the PR that removes it.
export const PRODUCTION_API_ORIGINS: readonly string[] = [
  'https://api.concertcrawl.app',
  'https://concert-crawl-api.onrender.com',
]

// Whether a request goes to the API: the origin this build was configured
// with, or one of the production API's origins.
export const isApiOrigin = (
  origin: string,
  configuredOrigin: string,
): boolean =>
  origin === configuredOrigin || PRODUCTION_API_ORIGINS.includes(origin)

// Documents and RSC payloads get the same default-deny treatment, for a second
// reason on top of privacy: a cached page is served without the middleware ever
// running, so anything cached here is reachable by a signed-out visitor. These
// two lists must stay a SUBSET of proxy.ts's `isAlwaysPublic` and
// `isPublicOnceLaunched` — a route may be public there and still be excluded
// here, but never the reverse.
//
// Excluded on purpose despite being public in middleware:
//  - the auth surfaces (/sign-in, /sign-up, /auth/code), where a stale shell
//    is worse than a network round trip. /onboarding is not public in
//    middleware at all — the tour runs post-sign-up — so it is out of scope
//    here for the same reason /~offline is.
//  - /search, whose value is entirely in the live query
//  - /watching, which is route-public once launched but payload-private always
//
// /~offline is absent for a different reason: it is served to an offline
// visitor from Serwist's precache via `fallbacks.entries`, not from this
// list, so adding it here would buy nothing. It IS public in middleware —
// it has to be, or the precache fetch is redirected and the fallback never
// lands in the cache at all.
const ALWAYS_CACHEABLE_PAGES: readonly RegExp[] = [
  /^\/$/,
  /^\/legal(\/.*)?$/,
  /^\/changelog(\/.*)?$/,
]

const CACHEABLE_PAGES_ONCE_LAUNCHED: readonly RegExp[] = [
  /^\/events(\/.*)?$/,
  /^\/venues(\/.*)?$/,
  /^\/artists(\/.*)?$/,
  /^\/e\/[^/]+$/,
]

export const isPublicCacheableDocument = (
  url: URL,
  launched: boolean,
): boolean => {
  const { pathname } = url
  if (ALWAYS_CACHEABLE_PAGES.some((pattern) => pattern.test(pathname)))
    return true
  return (
    launched &&
    CACHEABLE_PAGES_ONCE_LAUNCHED.some((pattern) => pattern.test(pathname))
  )
}
