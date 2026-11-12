'use client';

// Toggles the "I'm going!" commitment (#70). Mirrors use-watch-toggle.ts —
// same apiClient usage, same optimistic-then-invalidate shape — but writes the
// attendance relationship, which is independent of Watching. A toggle here must
// never add or remove a watch, so the optimistic update only patches
// `attendingAt` on a row that is already in the watching cache.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
  AttendingToggleResponse,
  HistoryResponse,
  WatchingShow,
} from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { watchingQueryKey } from './use-watching';
import { historyQueryKey } from './use-history';

export type AttendingToggleInput = {
  eventId: string;
  going: boolean;
  // Undo of a remove: the token DELETE returned, sent with the PUT that puts
  // back exactly the attendance it removed.
  restore?: { attendingAt: string; token: string };
};

export function useAttendingToggle() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();

  return useMutation({
    mutationKey: ['attending-toggle'],
    mutationFn: async ({
      eventId,
      going,
      restore,
    }: AttendingToggleInput): Promise<AttendingToggleResponse> => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return going
        ? apiClient.put<AttendingToggleResponse>(
            `/v1/attending/${eventId}`,
            token,
            restore ? { restore } : undefined,
          )
        : apiClient.delete<AttendingToggleResponse>(
            `/v1/attending/${eventId}`,
            token,
          );
    },
    onMutate: async ({ eventId, going }: AttendingToggleInput) => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey(userId) });
      await queryClient.cancelQueries({ queryKey: historyQueryKey(userId) });
      const previous = queryClient.getQueryData<WatchingShow[]>(
        watchingQueryKey(userId),
      );
      const previousHistory = queryClient.getQueryData<HistoryResponse>(
        historyQueryKey(userId),
      );

      // Releasing a night takes its row off Concerts at once. Going (a restore
      // included) is not patched in: the row needs the server's join, so the
      // settle refetch brings it back in its month slot.
      if (previousHistory && !going) {
        queryClient.setQueryData<HistoryResponse>(historyQueryKey(userId), {
          ...previousHistory,
          past: previousHistory.past.filter((row) => row.eventId !== eventId),
          upcoming: previousHistory.upcoming.filter(
            (row) => row.eventId !== eventId,
          ),
        });
      }

      if (previous) {
        queryClient.setQueryData(
          watchingQueryKey(userId),
          previous.map((show) =>
            show.eventId === eventId
              ? {
                  ...show,
                  attendingAt: going ? new Date().toISOString() : null,
                }
              : show,
          ),
        );
      }

      return { previous, previousHistory };
    },
    onError: (_err, _input, context) => {
      if (context?.previousHistory !== undefined) {
        queryClient.setQueryData(
          historyQueryKey(userId),
          context.previousHistory,
        );
      }
      // Only restore when there was a cache to restore. A cold cache means
      // onMutate wrote nothing, and writing `undefined` back would leave a
      // resolved query with no data for consumers expecting WatchingShow[].
      if (context?.previous !== undefined) {
        queryClient.setQueryData(watchingQueryKey(userId), context.previous);
      }
    },
    // Event Detail is server-rendered and has no react-query key — callers on
    // that page refresh it with router.refresh(), the pattern the rest of
    // EventDetailClient already uses for its own mutations.
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: watchingQueryKey(userId),
      });
      void queryClient.invalidateQueries({ queryKey: historyQueryKey(userId) });
    },
  });
}
