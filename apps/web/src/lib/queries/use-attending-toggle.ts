'use client'

// Toggles the "I'm going!" commitment (#70). Mirrors use-watch-toggle.ts —
// same apiClient usage, same optimistic-then-invalidate shape — but writes the
// attendance relationship, which is independent of Watching. A toggle here must
// never add or remove a watch, so the optimistic update only patches
// `attendingAt` on a row that is already in the watching cache.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type {
  AttendingToggleResponse,
  WatchingShow,
} from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { watchingQueryKey } from './use-watching'

export const historyQueryKey = ['history'] as const

export type AttendingToggleInput = { eventId: string; going: boolean }

export function useAttendingToggle() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationKey: ['attending-toggle'],
    mutationFn: async ({
      eventId,
      going,
    }: AttendingToggleInput): Promise<AttendingToggleResponse> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return going
        ? apiClient.put<AttendingToggleResponse>(
            `/v1/attending/${eventId}`,
            token,
          )
        : apiClient.delete<AttendingToggleResponse>(
            `/v1/attending/${eventId}`,
            token,
          )
    },
    onMutate: async ({ eventId, going }: AttendingToggleInput) => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey })
      const previous =
        queryClient.getQueryData<WatchingShow[]>(watchingQueryKey)

      if (previous) {
        queryClient.setQueryData(
          watchingQueryKey,
          previous.map((show) =>
            show.eventId === eventId
              ? {
                  ...show,
                  attendingAt: going ? new Date().toISOString() : null,
                }
              : show,
          ),
        )
      }

      return { previous }
    },
    onError: (_err, _input, context) => {
      // Only restore when there was a cache to restore. A cold cache means
      // onMutate wrote nothing, and writing `undefined` back would leave a
      // resolved query with no data for consumers expecting WatchingShow[].
      if (context?.previous !== undefined) {
        queryClient.setQueryData(watchingQueryKey, context.previous)
      }
    },
    // Event Detail is server-rendered and has no react-query key — callers on
    // that page refresh it with router.refresh(), the pattern the rest of
    // EventDetailClient already uses for its own mutations.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: watchingQueryKey })
      void queryClient.invalidateQueries({ queryKey: historyQueryKey })
    },
  })
}
