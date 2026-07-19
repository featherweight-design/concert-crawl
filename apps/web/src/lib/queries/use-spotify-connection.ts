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

export const spotifyConnectionQueryKey = ['spotify-connection'] as const

const DISCONNECTED: SpotifyConnectionResponse = { status: 'disconnected' }

export function useSpotifyConnection() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: spotifyConnectionQueryKey,
    queryFn: async (): Promise<SpotifyConnectionResponse> => {
      const token = await getToken()
      if (!token) return DISCONNECTED
      return fetchSpotifyConnection(token)
    },
    enabled: !!isSignedIn,
    staleTime: 60 * 1000,
  })
}

const useConnectionMutation = <TVariables = void>(
  run: (token: string, variables: TVariables) => Promise<SpotifyConnectionView>,
) => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return run(token, variables)
    },
    onSuccess: (view) => {
      queryClient.setQueryData(spotifyConnectionQueryKey, view)
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
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await disconnectSpotify(token)
    },
    onSuccess: () => {
      queryClient.setQueryData(spotifyConnectionQueryKey, DISCONNECTED)
    },
  })
}
