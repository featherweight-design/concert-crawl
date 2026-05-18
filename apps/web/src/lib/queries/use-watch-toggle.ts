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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey })
      const previous =
        queryClient.getQueryData<WatchingShow[]>(watchingQueryKey)
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
