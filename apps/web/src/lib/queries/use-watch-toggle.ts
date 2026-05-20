'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { WatchingShow, WatchToggleResponse } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { watchingQueryKey } from './use-watching'

export function useWatchToggle() {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async (eventId: string): Promise<WatchToggleResponse> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.put<WatchToggleResponse>(
        `/v1/watching/${eventId}`,
        token,
      )
    },
    onMutate: async (eventId: string) => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey })
      const previous =
        queryClient.getQueryData<WatchingShow[]>(watchingQueryKey)

      // Treat a cold cache (undefined) as empty so the optimistic toggle always
      // applies — even on first interaction before the watching query has loaded.
      const current = previous ?? []
      const isCurrentlyWatching = current.some(
        (show) => show.eventId === eventId,
      )

      // Use a unique userEventId placeholder so concurrent in-flight optimistic
      // entries (multiple toggles in quick succession) never share the same key.
      const todayIso = new Date().toISOString().slice(0, 10)
      const optimisticStub: WatchingShow = {
        userEventId: `optimistic-${eventId}`,
        eventId,
        artist: '',
        venueName: '',
        venueSlug: '',
        // Use today's date so classifyDate() does not throw a RangeError when
        // it calls toLocaleDateString on the parsed date.
        date: todayIso,
        showTime: null,
        ticketUrl: null,
        savedAt: new Date().toISOString(),
        savedPrice: null,
        currentPrice: null,
        sourceKind: null,
        eventStatus: 'upcoming',
        watchStatus: 'live',
        updatedAt: new Date().toISOString(),
        imageUrl: null,
      }
      const next = isCurrentlyWatching
        ? current.filter((show) => show.eventId !== eventId)
        : [...current, optimisticStub]
      queryClient.setQueryData(watchingQueryKey, next)

      return { previous }
    },
    onError: (_err, _eventId, context) => {
      // Restore the exact snapshot captured before the mutation began.
      // `previous` may be undefined when the cache was cold — in that case,
      // remove the optimistic entry rather than setting undefined.
      if (context !== undefined) {
        queryClient.setQueryData(watchingQueryKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: watchingQueryKey })
    },
  })
}
