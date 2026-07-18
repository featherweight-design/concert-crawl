import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'

export function availabilityQueryKey(from: string, to: string) {
  return ['availability', from, to] as const
}

export function availabilityPath(from: string, to: string) {
  return `/v1/events/availability?from=${from}&to=${to}`
}

// SSR-only prefetch for the events page (no `'use client'`), so it must not
// live in the client-only `use-availability` hook module. The client refetch
// path goes through `fetchPublicRead` in that hook; this call runs on the
// server, where `publicApiClient` sends the x-service-key header — so it
// succeeds even when the API is beta-gated (REQUIRE_BETA_AUTH). Service workers
// only intercept browser fetches, so SW caching is irrelevant here.
export async function fetchAvailability(
  from: string,
  to: string,
): Promise<EventsAvailabilityResponse> {
  return publicApiClient.get<EventsAvailabilityResponse>(
    availabilityPath(from, to),
  )
}
