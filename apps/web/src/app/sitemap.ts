import type { MetadataRoute } from 'next'

import { isCanonicalOrigin, absoluteUrl } from '@/lib/share/site-origin'

/**
 * Only the routes we actually want indexed. The app is a private beta, so
 * almost everything is behind auth; the three `/legal` pages each set
 * `robots: { index: false }` and are deliberately absent.
 *
 * That exclusion is why `/bot` needs to be listed here rather than relying on
 * an inbound link: the only pages that link to it are noindex, so they pass no
 * signal a search engine can follow.
 *
 * Empty off the canonical origin. A sitemap is a discovery channel in its own
 * right, so a staging deploy listing its own absolute URLs can get them indexed
 * even though robots.txt there disallows crawling.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isCanonicalOrigin()) return []

  return [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/bot'), changeFrequency: 'monthly', priority: 0.5 },
  ]
}
