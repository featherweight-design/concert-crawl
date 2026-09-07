'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type {
  SpotifyConnectionResponse,
  SpotifyConnectionView,
} from '@concert-crawl/types'
import {
  connectSpotify,
  disconnectSpotify,
  fetchSpotifyConnection,
  patchSpotifyConnection,
  syncSpotifyConnection,
} from '@/lib/spotify'
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'

// Prefix key for invalidation (matches every user's entry).
export const spotifyConnectionQueryKeyBase = ['spotify-connection'] as const

// Scoped by userId: the app-level QueryClient outlives sign-in sessions, so
// an account switch must not surface the previous user's cached connection
// (same reasoning as planStateQueryKey).
export const spotifyConnectionQueryKey = (userId: string | null | undefined) =>
  [...spotifyConnectionQueryKeyBase, userId ?? null] as const

const DISCONNECTED: SpotifyConnectionResponse = { status: 'disconnected' }

export function useSpotifyConnection() {
  const { getToken, isSignedIn, userId } = useAuth()
  // Gated here rather than at each mount site: with spotify-sync off the
  // endpoint 404s, so an ungated query would spend a request per consumer and
  // fill the cache with errors nothing is going to render.
  const { enabled: spotifyEnabled } = useFeatureFlag('spotify-sync')

  return useQuery({
    queryKey: spotifyConnectionQueryKey(userId),
    queryFn: async (): Promise<SpotifyConnectionResponse> => {
      const token = await getToken()
      // Throw instead of returning a synthetic disconnected response — with
      // staleTime a cached "disconnected" would stick after the token gap.
      if (!token) {
        throw new Error('Auth token unavailable while fetching connection')
      }
      return fetchSpotifyConnection(token)
    },
    enabled: !!isSignedIn && spotifyEnabled,
    staleTime: 60 * 1000,
  })
}

const useConnectionMutation = <TVariables = void>(
  run: (token: string, variables: TVariables) => Promise<SpotifyConnectionView>,
) => {
  const queryClient = useQueryClient()
  const { getToken, userId } = useAuth()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return run(token, variables)
    },
    onSuccess: (view) => {
      queryClient.setQueryData(spotifyConnectionQueryKey(userId), view)
    },
  })
}

// POST /connection after the OAuth return — creates the row + first sync.
export function useSpotifyConnect() {
  return useConnectionMutation(async (token) => connectSpotify(token))
}

// "Refresh my taste" — throws ApiError 429 when inside the 10-minute window.
export function useSpotifySync() {
  return useConnectionMutation(async (token) => syncSpotifyConnection(token))
}

export function useSpotifyPatch() {
  return useConnectionMutation(
    async (
      token,
      updates: {
        autoWatch?: boolean
        digestEnabled?: boolean
        pushEnabled?: boolean
      },
    ) => patchSpotifyConnection(token, updates),
  )
}

export function useSpotifyDisconnect() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await disconnectSpotify(token)
    },
    onSuccess: () => {
      queryClient.setQueryData(spotifyConnectionQueryKey(userId), DISCONNECTED)
    },
  })
}
