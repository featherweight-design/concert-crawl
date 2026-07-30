'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { WatchingShow } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'

// Scoped by userId: the app-level QueryClient outlives sign-in sessions, so an
// unscoped key could briefly serve the previous account's watched shows after an
// account switch (same reasoning as planStateQueryKey and historyQueryKey).
export const watchingQueryKey = (userId: string | null | undefined) =>
  ['watching', userId ?? null] as const

interface UseWatchingOptions {
  initialData?: WatchingShow[]
}

export function useWatching(options: UseWatchingOptions = {}) {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: watchingQueryKey(userId),
    queryFn: async (): Promise<WatchingShow[]> => {
      const token = await getToken()
      if (!token) {
        // Throw rather than resolve []: a successful empty array would be cached
        // as fresh for staleTime and show an empty Watching list for minutes
        // after a transient token gap. An error lets React Query retry.
        throw new Error('Auth token unavailable while fetching watching')
      }
      return apiClient.get<WatchingShow[]>('/v1/watching', token)
    },
    enabled: !!isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000,
    ...(options.initialData !== undefined
      ? { initialData: options.initialData }
      : {}),
  })
}
