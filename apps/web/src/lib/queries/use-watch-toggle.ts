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

      // Optimistically toggle the event in the cache so the button
      // transitions in a single step without intermediate states.
      if (previous !== undefined) {
        const isCurrentlyWatching = previous.some(
          (show) => show.eventId === eventId,
        )
        const optimisticStub: WatchingShow = {
          userEventId: '',
          eventId,
          artist: '',
          venueName: '',
          venueSlug: '',
          date: '',
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
          ? previous.filter((show) => show.eventId !== eventId)
          : [...previous, optimisticStub]
        queryClient.setQueryData(watchingQueryKey, next)
      }

      return { previous }
    },
    onError: (_err, _eventId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(watchingQueryKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: watchingQueryKey })
    },
  })
}
