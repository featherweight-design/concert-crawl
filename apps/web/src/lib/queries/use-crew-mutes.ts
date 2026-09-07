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
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'

// Scoped by userId: `muted` and `isKeeper` are both viewer-relative, so a
// QueryClient that outlives a sign-in must not serve the previous account's
// answers. Same rule as useCrewGoing.
export const crewsQueryKey = (userId: string | null | undefined) =>
  ['crews', userId ?? null] as const

// Settings needs the identity plus the mute, and nothing else the crews index
// returns. Narrowing to exactly that keeps the guard honest: a wider claim would
// vouch for `members` and `upcomingCount` without checking either.
export type CrewMuteRow = Pick<
  CrewSummary,
  'id' | 'name' | 'patchSalt' | 'muted'
>

// apps/web ships no zod — the boundary is narrowed with hand-written guards.
const isCrewMuteRow = (value: unknown): value is CrewMuteRow => {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    // Whole steps only, matching crew-meta's reader: the salt picks a patch
    // variant, so a float or NaN would draw an identity no crew actually has.
    typeof record.patchSalt === 'number' &&
    Number.isInteger(record.patchSalt) &&
    typeof record.muted === 'boolean'
  )
}

export function useCrews() {
  const { getToken, isSignedIn, userId } = useAuth()
  // Gated here rather than at each mount site: with crews off the endpoint
  // 404s, so an ungated query would spend a request per consumer and fill the
  // cache with errors nothing is going to render.
  const { enabled: crewsEnabled } = useFeatureFlag('crews')

  return useQuery({
    queryKey: crewsQueryKey(userId),
    queryFn: async (): Promise<CrewMuteRow[]> => {
      const token = await getToken()
      if (!token) return []
      const raw = await apiClient.get<unknown>('/v1/crews', token)
      const crews =
        typeof raw === 'object' && raw !== null && 'crews' in raw
          ? raw.crews
          : null
      if (!Array.isArray(crews) || !crews.every(isCrewMuteRow)) {
        throw new Error('Unexpected /v1/crews response shape')
      }
      return crews
    },
    enabled: !!isSignedIn && crewsEnabled,
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
      const previous = queryClient.getQueryData<CrewMuteRow[]>(key)
      if (previous) {
        queryClient.setQueryData<CrewMuteRow[]>(
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
