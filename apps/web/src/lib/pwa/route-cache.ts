// Explicit allowlist of PUBLIC, cacheable API path prefixes. Anything not
// matched here is network-only — this is the privacy safeguard, so the
// default must stay deny.
const PUBLIC_API_PREFIXES = ['/v1/events', '/v1/venues'] as const

export const isPublicCacheableApi = (url: URL): boolean =>
  PUBLIC_API_PREFIXES.some(
    (prefix) =>
      url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  )
