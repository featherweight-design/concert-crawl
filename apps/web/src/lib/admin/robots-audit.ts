import type { VenueRobotsStatus } from '@concert-crawl/types'
import type { StatusKind } from '@/components/admin/primitives'

// 'unchecked' covers venues the crawler has never resolved a robots.txt verdict
// for (robotsTxtAllowed is null) — these are the ones most likely to need a
// manual look before the next crawl.
export type RobotsStatus = 'allowed' | 'blocked' | 'unchecked'

export type RobotsStatusFilter = RobotsStatus | 'all'

export function deriveRobotsStatus(
  venue: Pick<VenueRobotsStatus, 'robotsTxtAllowed'>,
): RobotsStatus {
  if (venue.robotsTxtAllowed === null) return 'unchecked'
  return venue.robotsTxtAllowed ? 'allowed' : 'blocked'
}

export const ROBOTS_STATUS_KIND: Record<RobotsStatus, StatusKind> = {
  allowed: 'success',
  blocked: 'danger',
  unchecked: 'neutral',
}

export interface RobotsStatusCounts {
  total: number
  allowed: number
  blocked: number
  unchecked: number
}

// websiteUrl is stored non-null and Zod-validated as a URL on write, but
// z.string().url() still accepts non-http schemes (mailto:, javascript:) and a
// legacy/malformed row shouldn't crash the audit table. Fall back to the raw
// string when parsing fails or yields no host (e.g. mailto:/javascript: URLs
// have an empty hostname), which would otherwise render a blank label.
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url
  }
}

// Only http(s) URLs are safe to render as a clickable link — Zod's url()
// validator accepts javascript:/data: schemes, so guard before linking to
// avoid a stored-XSS vector in the admin table.
export function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function countRobotsStatuses(
  venues: VenueRobotsStatus[],
): RobotsStatusCounts {
  return venues.reduce<RobotsStatusCounts>(
    (acc, venue) => {
      acc.total += 1
      acc[deriveRobotsStatus(venue)] += 1
      return acc
    },
    { total: 0, allowed: 0, blocked: 0, unchecked: 0 },
  )
}
