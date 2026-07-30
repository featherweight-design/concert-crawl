'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { HistoryResponse } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { isEntitlementError } from '@/lib/history'

// Scoped by userId: the app-level QueryClient outlives sign-in sessions, so an
// unscoped key could briefly serve the previous account's attended shows after
// an account switch (same reasoning as planStateQueryKey).
export const historyQueryKey = (userId: string | null | undefined) =>
  ['history', userId ?? null] as const

interface UseHistoryOptions {
  initialData?: HistoryResponse | null
  enabled?: boolean
}

export function useHistory(options: UseHistoryOptions = {}) {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: historyQueryKey(userId),
    queryFn: async (): Promise<HistoryResponse> => {
      const token = await getToken()
      if (!token) {
        // Throw rather than resolve null: a successful null would be cached as
        // fresh for staleTime and show an empty History for minutes after a
        // transient token gap. An error lets React Query retry.
        throw new Error('Auth token unavailable while fetching history')
      }
      return apiClient.get<HistoryResponse>('/v1/history', token)
    },
    enabled: !!isSignedIn && !!userId && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    // A 403 is the plan's verdict, not a transient failure — retrying it just
    // burns requests. Everything else keeps the default retry behaviour.
    retry: (failureCount, error) =>
      !isEntitlementError(error) && failureCount < 3,
    // Seeded onto the userId-scoped key, so the server's payload can never be
    // adopted by a different account. Skipped when null — that is the locked
    // 403, not a history worth caching as fresh.
    ...(options.initialData ? { initialData: options.initialData } : {}),
  })
}
