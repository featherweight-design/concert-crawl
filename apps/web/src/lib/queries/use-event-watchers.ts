'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type {
  AvatarColor,
  EventWatcher,
  EventWatchersResponse,
} from '@concert-crawl/types'
import { apiClient } from '@/lib/api'

const eventWatchersQueryKeyBase = ['event-watchers'] as const

// Prefix key for invalidating one event's roster across every cached viewer,
// without touching the rosters of every other event in the cache.
export const eventWatchersEventKey = (eventId: string) =>
  [...eventWatchersQueryKeyBase, eventId] as const

// Scoped by userId: the response excludes the viewer from their own roster, so
// the app-level QueryClient outliving a sign-in session must not serve the
// previous account's exclusion set after a switch (same reasoning as
// tastePicksQueryKey).
export const eventWatchersQueryKey = (
  eventId: string,
  userId: string | null | undefined,
) => [...eventWatchersEventKey(eventId), userId ?? null] as const

// apps/web has no zod dependency, so the response is narrowed with hand-written
// guards rather than introducing one for a single call site.
const AVATAR_COLORS: readonly AvatarColor[] = [
  'signal',
  'accent',
  'success',
  'warning',
]

function isAvatarColor(value: unknown): value is AvatarColor {
  return AVATAR_COLORS.some((color) => color === value)
}

function isEventWatcher(value: unknown): value is EventWatcher {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return (
    typeof record.handle === 'string' &&
    (record.avatarColor === null || isAvatarColor(record.avatarColor))
  )
}

function isEventWatchersResponse(
  value: unknown,
): value is EventWatchersResponse {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return (
    typeof record.total === 'number' &&
    Number.isInteger(record.total) &&
    record.total >= 0 &&
    Array.isArray(record.named) &&
    record.named.every(isEventWatcher) &&
    // `total` counts named plus handle-less watchers, so it can never be
    // smaller than the named roster it contains.
    record.named.length <= record.total
  )
}

export function useEventWatchers(eventId: string) {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: eventWatchersQueryKey(eventId, userId),
    queryFn: async (): Promise<EventWatchersResponse> => {
      const token = await getToken()
      if (!token) return { total: 0, named: [] }
      const raw = await apiClient.get<unknown>(
        `/v1/events/${eventId}/watchers`,
        token,
      )
      if (!isEventWatchersResponse(raw)) {
        throw new Error('Unexpected /watchers response shape')
      }
      return raw
    },
    enabled: !!isSignedIn,
    staleTime: 60_000,
  })
}
