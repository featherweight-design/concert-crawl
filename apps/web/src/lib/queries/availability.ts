import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'

export function availabilityQueryKey(from: string, to: string) {
  return ['availability', from, to] as const
}

// Server-safe (no `'use client'`): the events page prefetches this during SSR,
// so it must not live in the client-only `use-availability` hook module.
// Fetched WITHOUT auth: the /v1/events/availability route is fully public (no
// clerkMiddleware, no per-user fields), so an anonymous request returns
// identical data and — unlike an authenticated one — stays cacheable by the
// service worker for offline browsing.
export async function fetchAvailability(
  from: string,
  to: string,
): Promise<EventsAvailabilityResponse> {
  const url = `/v1/events/availability?from=${from}&to=${to}`
  return publicApiClient.get<EventsAvailabilityResponse>(url)
}
