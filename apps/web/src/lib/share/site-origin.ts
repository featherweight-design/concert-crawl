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
 * dev server.
 *
 * `VERCEL_URL` rather than a `NEXT_PUBLIC_` twin because this resolves only in
 * `generateMetadata`, which runs on the server. Vercel sets the unprefixed var
 * on every deploy; the prefixed one exists only if someone opts into exposing
 * system variables, so reading it would silently fall through to localhost and
 * put dev URLs into shared links.
 */

const LOCAL_ORIGIN = 'http://localhost:3000'

const trimTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value.slice(0, -1) : value

const present = (value: string | undefined): string | null =>
  value === undefined || value.length === 0 ? null : value

export const siteOrigin = (): string => {
  const configured = present(process.env['NEXT_PUBLIC_SITE_URL'])
  if (configured !== null) return trimTrailingSlash(configured)

  const vercelHost = present(process.env['VERCEL_URL'])
  if (vercelHost !== null) return `https://${trimTrailingSlash(vercelHost)}`

  return LOCAL_ORIGIN
}

/** Resolve an app-relative path against the site origin. */
export const absoluteUrl = (path: string): string =>
  `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
