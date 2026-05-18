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
          // Optimistic remove — safe because we have the full data to revert to
          return old.filter((show) => show.eventId !== eventId)
        }
        // For adds: don't insert a stub with blank fields — let isPending handle
        // the visual state in WatchShowButton, full data arrives on settle
        return old
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
