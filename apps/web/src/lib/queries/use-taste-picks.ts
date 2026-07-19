'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { SpotifyTastePicksResponse } from '@concert-crawl/types'
import { fetchTastePicks } from '@/lib/spotify'

// Prefix key for invalidation (matches every user's entry).
export const tastePicksQueryKeyBase = ['spotify-taste-picks'] as const

// Scoped by userId: the app-level QueryClient outlives sign-in sessions, so
// an account switch must not surface the previous user's cached picks (same
// reasoning as spotifyConnectionQueryKey).
export const tastePicksQueryKey = (userId: string | null | undefined) =>
  [...tastePicksQueryKeyBase, userId ?? null] as const

// "Based on your taste" picks (#763 PR 8). `enabled` is driven by the
// spotify-sync entitlement so non-premium viewers never hit the gated
// endpoint (which would 403).
export function useTastePicks(enabled: boolean) {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: tastePicksQueryKey(userId),
    queryFn: async (): Promise<SpotifyTastePicksResponse> => {
      const token = await getToken()
      // Throw instead of returning a synthetic empty response — with
      // staleTime a cached empty shelf would stick after the token gap.
      if (!token) {
        throw new Error('Auth token unavailable while fetching taste picks')
      }
      return fetchTastePicks(token)
    },
    enabled: !!isSignedIn && enabled,
    staleTime: 5 * 60 * 1000,
  })
}
