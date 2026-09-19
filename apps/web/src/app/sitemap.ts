import { headers } from 'next/headers'
import type { MetadataRoute } from 'next'

import { isCanonicalHost, CANONICAL_ORIGIN } from '@/lib/share/site-origin'

/**
 * Only the routes we actually want indexed. The app is a private beta, so
 * almost everything is behind auth; the three `/legal` pages each set
 * `robots: { index: false }` and are deliberately absent.
 *
 * That exclusion is why `/bot` needs to be listed here rather than relying on
 * an inbound link: the only pages that link to it are noindex, so they pass no
 * signal a search engine can follow.
 *
 * Empty off the canonical host. A sitemap is a discovery channel in its own
 * right, so a staging deploy listing its own absolute URLs can get them indexed
 * even though robots.txt there disallows crawling.
 *
 * URLs are built from `CANONICAL_ORIGIN` rather than the share resolver: this
 * list only ever renders for a request addressed to that domain, so anything
 * else would contradict the condition that produced it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host')
  if (!isCanonicalHost(host)) return []

  return [
    { url: `${CANONICAL_ORIGIN}/`, changeFrequency: 'daily', priority: 1 },
    {
      url: `${CANONICAL_ORIGIN}/bot`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
