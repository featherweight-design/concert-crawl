import { headers } from 'next/headers'
import type { MetadataRoute } from 'next'

import { isCanonicalHost, CANONICAL_ORIGIN } from '@/lib/share/site-origin'

/**
 * The app had no robots.txt at all until #1228, which meant every deploy was
 * open to indexing by default, including staging and every Vercel preview. An
 * indexed preview competes with production for the same queries and serves
 * whatever half-finished state that branch was in, so only the canonical host
 * invites crawlers.
 *
 * `/bot` is the reason this file exists: it is the page our own user agent
 * advertises to venue operators, and it had no inbound link and no sitemap
 * entry, so nothing could find it.
 *
 * Which host a crawler asked for is read off the request rather than inferred
 * from the deploy's configured site URL — see `isCanonicalHost`, which explains
 * why the configured value was the wrong source and what it broke in prod.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')
  if (!isCanonicalHost(host)) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Named individually rather than blanket-disallowing `/api/`, because
      // `/api/pwa/icon-*` serves the manifest's icons and a crawler that cannot
      // fetch those cannot evaluate the app as installable. What is listed here
      // either sits behind auth or is a mutation endpoint, so a crawler spends
      // its budget for nothing. Written without a trailing slash so each entry
      // matches the bare entrypoint as well as everything under it.
      disallow: ['/api/admin', '/api/revalidate', '/admin'],
    },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  }
}
