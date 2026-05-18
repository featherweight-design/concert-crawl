'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { WatchingShow } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'

export const watchingQueryKey = ['watching'] as const

interface UseWatchingOptions {
  initialData?: WatchingShow[]
}

export function useWatching(options: UseWatchingOptions = {}) {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: watchingQueryKey,
    queryFn: async (): Promise<WatchingShow[]> => {
      const token = await getToken()
      if (!token) return []
      return apiClient.get<WatchingShow[]>('/v1/watching', token)
    },
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    ...(options.initialData !== undefined
      ? { initialData: options.initialData }
      : {}),
  })
}
