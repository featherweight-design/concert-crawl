import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { apiClient, publicApiClient } from '@/lib/api'

export function availabilityQueryKey(from: string, to: string) {
  return ['availability', from, to] as const
}

// Server-safe (no `'use client'`): the events page prefetches this during SSR,
// so it must not live in the client-only `use-availability` hook module.
export async function fetchAvailability(
  from: string,
  to: string,
  token: string | null,
): Promise<EventsAvailabilityResponse> {
  const url = `/v1/events/availability?from=${from}&to=${to}`
  return token
    ? apiClient.get<EventsAvailabilityResponse>(url, token)
    : publicApiClient.get<EventsAvailabilityResponse>(url)
}
