import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { apiClient, publicApiClient } from '@/lib/api'

export function availabilityQueryKey(from: string, to: string) {
  return ['availability', from, to] as const
}

export function availabilityPath(from: string, to: string) {
  return `/v1/events/availability?from=${from}&to=${to}`
}

// SSR-only prefetch for the events page (no `'use client'`), so it must not
// live in the client-only `use-availability` hook module. The client refetch
// path goes through `fetchPublicRead` in that hook. Follow the sibling SSR
// fetches (fetchEvents/fetchVenues/fetchGenres in events/page.tsx): prefer an
// authenticated request when the SSR session carries a token so the calendar
// prefetch works under beta gating (REQUIRE_BETA_AUTH) without depending on
// INTERNAL_API_SECRET being configured on the web server. Service workers only
// intercept browser fetches, so SW caching is irrelevant here.
export async function fetchAvailability(
  from: string,
  to: string,
  token: string | null,
): Promise<EventsAvailabilityResponse> {
  const path = availabilityPath(from, to)
  return token
    ? apiClient.get<EventsAvailabilityResponse>(path, token)
    : publicApiClient.get<EventsAvailabilityResponse>(path)
}
