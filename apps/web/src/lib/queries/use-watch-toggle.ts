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
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey })
      const previous =
        queryClient.getQueryData<WatchingShow[]>(watchingQueryKey)

      queryClient.setQueryData<WatchingShow[]>(watchingQueryKey, (old = []) => {
        const isWatching = old.some((show) => show.eventId === eventId)
        if (isWatching) {
          return old.filter((show) => show.eventId !== eventId)
        }
        // Optimistically mark as watching with a minimal stub; full data arrives on settle
        return [
          ...old,
          {
            eventId,
            userEventId: `optimistic-${eventId}`,
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
            eventStatus: 'upcoming' as const,
            watchStatus: 'live' as const,
            updatedAt: new Date().toISOString(),
            imageUrl: null,
          },
        ]
      })

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
