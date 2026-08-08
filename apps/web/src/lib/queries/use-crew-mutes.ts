'use client'

// The crew list plus its mute state, for Settings ▸ Notifications (#1226 PR-7).
//
// The crews index is server-rendered on /crews, but the settings section is a
// client component that has to reflect a mute the moment it is flipped — so it
// reads the same endpoint through the query cache. `muted` rides on the list
// row itself; there is no separate mutes endpoint to keep in step.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { CrewSummary } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { setCrewMuted } from '@/lib/crews'

// Scoped by userId: `muted` and `isKeeper` are both viewer-relative, so a
// QueryClient that outlives a sign-in must not serve the previous account's
// answers. Same rule as useCrewGoing.
export const crewsQueryKey = (userId: string | null | undefined) =>
  ['crews', userId ?? null] as const

// apps/web ships no zod — the boundary is narrowed with hand-written guards.
const isCrewSummary = (value: unknown): value is CrewSummary => {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.patchSalt === 'number' &&
    typeof record.muted === 'boolean'
  )
}

export function useCrews() {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: crewsQueryKey(userId),
    queryFn: async (): Promise<CrewSummary[]> => {
      const token = await getToken()
      if (!token) return []
      const raw = await apiClient.get<unknown>('/v1/crews', token)
      const crews =
        typeof raw === 'object' && raw !== null && 'crews' in raw
          ? raw.crews
          : null
      if (!Array.isArray(crews) || !crews.every(isCrewSummary)) {
        throw new Error('Unexpected /v1/crews response shape')
      }
      return crews
    },
    enabled: !!isSignedIn,
    staleTime: 60_000,
  })
}

/**
 * Optimistic on purpose: a switch that waits a round-trip to move reads as
 * broken, and the failure path here is cheap — the snapshot is restored and
 * the settled invalidate re-reads the server's answer either way.
 */
export function useCrewMuteToggle() {
  const { getToken, userId } = useAuth()
  const queryClient = useQueryClient()
  const key = crewsQueryKey(userId)

  return useMutation({
    mutationFn: async ({
      crewId,
      muted,
    }: {
      crewId: string
      muted: boolean
    }) => {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      await setCrewMuted(token, crewId, muted)
    },
    onMutate: async ({ crewId, muted }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CrewSummary[]>(key)
      if (previous) {
        queryClient.setQueryData<CrewSummary[]>(
          key,
          previous.map((crew) =>
            crew.id === crewId ? { ...crew, muted } : crew,
          ),
        )
      }
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      console.warn('crew mute toggle failed', err)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
