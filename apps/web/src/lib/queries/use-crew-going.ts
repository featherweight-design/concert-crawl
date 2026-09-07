'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type {
  AvatarColor,
  CrewMemberPreview,
  EventCrewGoing,
} from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'

const crewGoingQueryKeyBase = ['crew-going'] as const

/** Prefix key: one event's crew line across every cached viewer. */
export const crewGoingEventKey = (eventId: string) =>
  [...crewGoingQueryKeyBase, eventId] as const

// Scoped by userId for the same reason the watcher roster is: the response
// excludes the viewer, so a QueryClient outliving a sign-in must not serve the
// previous account's exclusion set after a switch.
export const crewGoingQueryKey = (
  eventId: string,
  userId: string | null | undefined,
) => [...crewGoingEventKey(eventId), userId ?? null] as const

// apps/web has no zod dependency, so the boundary is narrowed with hand-written
// guards, matching use-event-watchers.
const AVATAR_COLORS: readonly AvatarColor[] = [
  'signal',
  'accent',
  'success',
  'warning',
]

const isAvatarColor = (value: unknown): value is AvatarColor =>
  AVATAR_COLORS.some((color) => color === value)

const isCrewMemberPreview = (value: unknown): value is CrewMemberPreview => {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return (
    typeof record.userId === 'string' &&
    (record.handle === null || typeof record.handle === 'string') &&
    (record.avatarColor === null || isAvatarColor(record.avatarColor))
  )
}

const isEventCrewGoing = (value: unknown): value is EventCrewGoing => {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return (
    typeof record.count === 'number' &&
    Number.isInteger(record.count) &&
    record.count >= 0 &&
    Array.isArray(record.going) &&
    record.going.every(isCrewMemberPreview) &&
    // The count is the length of the list it carries. Unlike the watcher
    // roster there is no unnamed remainder held back, so a mismatch is a bug.
    record.going.length === record.count
  )
}

const EMPTY: EventCrewGoing = { count: 0, going: [] }

export function useCrewGoing(eventId: string) {
  const { getToken, isSignedIn, userId } = useAuth()
  // Gated here rather than at each mount site: with crews off the endpoint
  // 404s, and this one fires once per event row on Browse.
  const { enabled: crewsEnabled } = useFeatureFlag('crews')

  return useQuery({
    queryKey: crewGoingQueryKey(eventId, userId),
    queryFn: async (): Promise<EventCrewGoing> => {
      const token = await getToken()
      if (!token) return EMPTY
      const raw = await apiClient.get<unknown>(
        `/v1/crews/event-going/${eventId}`,
        token,
      )
      if (!isEventCrewGoing(raw)) {
        throw new Error('Unexpected /crews/event-going response shape')
      }
      return raw
    },
    enabled: !!isSignedIn && crewsEnabled,
    staleTime: 60_000,
  })
}
