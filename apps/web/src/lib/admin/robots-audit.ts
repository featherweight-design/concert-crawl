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

// websiteUrl is stored non-null and Zod-validated as a URL on write, but a
// legacy or malformed row shouldn't crash the whole audit table — fall back to
// the raw string when it can't be parsed.
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
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
