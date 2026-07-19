'use client'

// Push toggle for the Connections card (#763 PR 9). Composes the browser
// subscribe/unsubscribe flow (lib/push/client) with the connection PATCH so
// the toggle's server preference and this device's subscription move
// together:
//   ON  → permission prompt + pushManager subscribe + POST, then
//         PATCH { pushEnabled: true }
//   OFF → PATCH { pushEnabled: false } FIRST (the server preference is the
//         opt-out that gates sends to every device), then best-effort local
//         DELETE + pushManager unsubscribe
// Every failure resolves to { ok: false } — the mutation never rejects — so
// the card can render the matching note.

import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { SpotifyConnectionView } from '@concert-crawl/types'
import {
  getPushDeviceState,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/client'
import { patchSpotifyConnection } from '@/lib/spotify'
import { spotifyConnectionQueryKey } from './use-spotify-connection'

export const pushDeviceStateQueryKey = ['push-device-state'] as const

// Support tier + permission + this-device subscription presence. Device-local
// and cheap; invalidated after every toggle attempt (permission can change
// even on failure).
export function usePushDeviceState() {
  return useQuery({
    queryKey: pushDeviceStateQueryKey,
    queryFn: getPushDeviceState,
    staleTime: Infinity,
  })
}

export type PushToggleOutcome =
  | { ok: true; view: SpotifyConnectionView }
  | { ok: false; reason: 'permission-denied' | 'unsupported' | 'error' }

export function usePushToggle() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useAuth()
  // Server row id from this session's subscribe — lets toggle-off DELETE
  // without a lookup; unsubscribeFromPush re-derives it after a reload.
  const subscriptionIdRef = useRef<string | null>(null)

  return useMutation<PushToggleOutcome, Error, boolean>({
    mutationFn: async (next) => {
      try {
        const token = await getToken()
        if (!token) return { ok: false, reason: 'error' }
        if (next) {
          const result = await subscribeToPush(token)
          if (result.status !== 'subscribed') {
            return { ok: false, reason: result.status }
          }
          subscriptionIdRef.current = result.id
          const view = await patchSpotifyConnection(token, {
            pushEnabled: true,
          })
          return { ok: true, view }
        }
        // The preference PATCH goes first — it's what stops sends to every
        // device — so a failed local teardown can't strand the opt-out.
        const view = await patchSpotifyConnection(token, {
          pushEnabled: false,
        })
        const result = await unsubscribeFromPush(
          token,
          subscriptionIdRef.current ?? undefined,
        )
        if (result.status !== 'error') subscriptionIdRef.current = null
        return { ok: true, view }
      } catch (err) {
        console.error('push: toggle failed', err)
        return { ok: false, reason: 'error' }
      }
    },
    onSuccess: (outcome) => {
      if (outcome.ok) {
        queryClient.setQueryData(
          spotifyConnectionQueryKey(userId),
          outcome.view,
        )
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pushDeviceStateQueryKey })
    },
  })
}
