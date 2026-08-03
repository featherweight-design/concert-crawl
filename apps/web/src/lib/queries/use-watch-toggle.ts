'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { WatchingShow, WatchToggleResponse } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { watchingQueryKey } from './use-watching'
import { eventWatchersEventKey } from './use-event-watchers'
import { OPTIMISTIC_ID_PREFIX } from './optimistic-watch-row'

export function useWatchToggle() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useAuth()

  return useMutation({
    // Identifies watch toggles in the mutation cache so the post-first-watch
    // Spotify nudge gate (#763 PR 5) can subscribe to successful watches.
    mutationKey: ['watch-toggle'],
    mutationFn: async (eventId: string): Promise<WatchToggleResponse> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.put<WatchToggleResponse>(
        `/v1/watching/${eventId}`,
        token,
      )
    },
    onMutate: async (eventId: string) => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey(userId) })
      const previous = queryClient.getQueryData<WatchingShow[]>(
        watchingQueryKey(userId),
      )

      // Treat a cold cache (undefined) as empty so the optimistic toggle always
      // applies — even on first interaction before the watching query has loaded.
      const current = previous ?? []
      const isCurrentlyWatching = current.some(
        (show) => show.eventId === eventId,
      )

      // A prefixed, per-event userEventId placeholder: unique across concurrent
      // optimistic entries, and recognisable as not-yet-real via
      // isOptimisticWatchRow until the server's id replaces it.
      const todayIso = new Date().toISOString().slice(0, 10)
      const optimisticStub: WatchingShow = {
        userEventId: `${OPTIMISTIC_ID_PREFIX}${eventId}`,
        eventId,
        artist: '',
        venueName: '',
        venueSlug: '',
        // Use today's date so classifyDate() does not throw a RangeError when
        // it calls toLocaleDateString on the parsed date.
        date: todayIso,
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        savedAt: new Date().toISOString(),
        savedPrice: null,
        currentPrice: null,
        sourceKind: null,
        eventStatus: 'upcoming',
        watchStatus: 'live',
        updatedAt: new Date().toISOString(),
        priceObservedAt: null,
        imageUrl: null,
        attendingAt: null,
      }
      const next = isCurrentlyWatching
        ? current.filter((show) => show.eventId !== eventId)
        : [...current, optimisticStub]
      queryClient.setQueryData(watchingQueryKey(userId), next)

      return { previous }
    },
    onError: (_err, _eventId, context) => {
      // Restore the exact snapshot captured before the mutation began.
      // `previous` may be undefined when the cache was cold — in that case,
      // remove the optimistic entry rather than setting undefined.
      if (context !== undefined) {
        queryClient.setQueryData(watchingQueryKey(userId), context.previous)
      }
    },
    onSettled: (_data, _error, eventId) => {
      void queryClient.invalidateQueries({ queryKey: watchingQueryKey(userId) })
      // Self-exclusion means the viewer's own toggle doesn't change their own
      // numbers — but it changes what other viewers see, so refresh the roster
      // to keep a long-lived tab honest. Scoped to the toggled event: no other
      // event's roster changed.
      void queryClient.invalidateQueries({
        queryKey: eventWatchersEventKey(eventId),
      })
    },
  })
}
