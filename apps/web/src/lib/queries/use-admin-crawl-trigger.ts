'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminVenueRunsQueryKey } from './use-admin-venue-runs'

function extractErrorMessage(rawBody: unknown, fallback: string): string {
  if (
    rawBody !== null &&
    typeof rawBody === 'object' &&
    'error' in rawBody &&
    typeof (rawBody as { error?: unknown })['error'] === 'string'
  ) {
    return (rawBody as { error: string })['error']
  }
  return fallback
}

export function useTriggerVenueCrawl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (venueId: string) => {
      const res = await fetch(`/api/admin/crawl/${venueId}`, { method: 'POST' })
      if (!res.ok) {
        const rawBody: unknown = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(rawBody, `HTTP ${res.status}`))
      }
    },
    onSuccess: (_data, venueId) => {
      void queryClient.invalidateQueries({
        queryKey: adminVenueRunsQueryKey(venueId),
      })
    },
  })
}
