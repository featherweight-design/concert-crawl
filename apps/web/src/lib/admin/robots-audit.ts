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
