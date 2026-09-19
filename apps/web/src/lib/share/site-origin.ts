/**
 * The absolute origin to build shareable, crawler-visible URLs from.
 *
 * Open Graph and Twitter card images are fetched by a crawler that has no page
 * context, so a relative `/share/:id/link` is silently ignored by every one of
 * them. Metadata runs on the server, where `window.location` does not exist,
 * so the origin has to come from configuration.
 *
 * Preference order: an explicitly configured site URL wins, because previews
 * and staging both need to advertise themselves rather than the canonical
 * domain. `VERCEL_URL` covers deploys where nobody set the explicit var — it
 * is host-only, so the scheme is added here. Local dev falls through to the
 * dev server. Each source is normalised to a bare origin before it is
 * accepted, and a source that cannot be normalised is skipped rather than
 * emitted.
 *
 * `VERCEL_URL` rather than a `NEXT_PUBLIC_` twin because this resolves only in
 * `generateMetadata`, which runs on the server. Vercel sets the unprefixed var
 * on every deploy; the prefixed one exists only if someone opts into exposing
 * system variables, so reading it would silently fall through to localhost and
 * put dev URLs into shared links.
 */

const LOCAL_ORIGIN = 'http://localhost:3000'

const present = (value: string | undefined): string | null => {
  if (value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * Reduce a configured value to a bare `scheme://host`, or reject it.
 *
 * Dashboard-entered variables arrive malformed in predictable ways — a stray
 * space, a trailing path, a missing scheme — and each of those produces a URL
 * no crawler can fetch. The failure is silent and only ever visible inside
 * somebody else's chat client, so an unusable value falls through to the next
 * source instead of being shipped.
 */
const toOrigin = (value: string): string | null => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return `${url.protocol}//${url.host}`
  } catch (err) {
    console.error('share: unusable site origin', { value, err })
    return null
  }
}

export const siteOrigin = (): string => {
  const configured = present(process.env['NEXT_PUBLIC_SITE_URL'])
  const fromConfig = configured === null ? null : toOrigin(configured)
  if (fromConfig !== null) return fromConfig

  // Host-only by contract, so a scheme is prepended before parsing; a value
  // that already carries one still resolves rather than becoming `https://https`.
  const vercelHost = present(process.env['VERCEL_URL'])
  const fromVercel =
    vercelHost === null
      ? null
      : toOrigin(
          vercelHost.includes('://') ? vercelHost : `https://${vercelHost}`,
        )
  if (fromVercel !== null) return fromVercel

  return LOCAL_ORIGIN
}

/** The one origin we want search engines to know about. */
export const CANONICAL_ORIGIN = 'https://concertcrawl.app'

/**
 * Whether the request being served was addressed to the production site.
 *
 * Deliberately NOT derived from `siteOrigin()`. That resolver answers "what
 * absolute URL should this deploy advertise", which is a build-time question
 * settled by `NEXT_PUBLIC_SITE_URL` or `VERCEL_URL` — and in prod it resolves
 * to the per-deployment `*.vercel.app` host, so gating on it made the live
 * robots.txt say `Disallow: /` and the live sitemap come back empty. The host
 * on the request is the only thing that actually knows which domain a crawler
 * asked, and it needs no dashboard variable to be right.
 *
 * `robots.ts` and `sitemap.ts` both gate on this, and they have to agree: a
 * sitemap is a discovery channel independent of robots.txt, so a staging deploy
 * that disallows crawling but still publishes its own absolute URLs can have
 * those URLs indexed anyway.
 *
 * The header is client-controllable, so a spoofed `Host` can coax an "allow"
 * robots.txt out of a preview deploy. That costs nothing: robots.txt is an
 * instruction to well-behaved crawlers rather than an access control, and a
 * caller who forges the header is already choosing to ignore the answer.
 */
export const isCanonicalHost = (host: string | null | undefined): boolean => {
  if (host === null || host === undefined) return false
  // Host names are case-insensitive, and the header is echoed back as the
  // client sent it. An uppercase request would otherwise be read as a foreign
  // domain and answered with the blanket disallow. The default HTTPS port is
  // stripped because a client may send it explicitly and `https://host:443` is
  // the same origin as `https://host`.
  const normalised = host.trim().toLowerCase().replace(/:443$/, '')
  return normalised === new URL(CANONICAL_ORIGIN).host
}

/** Resolve an app-relative path against the site origin. */
export const absoluteUrl = (path: string): string =>
  `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
