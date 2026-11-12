'use client';

// Hides a No longer listed show from the viewer's own Watching list, and puts
// it back (the Undo). Same optimistic-then-invalidate shape as
// use-watch-toggle.ts, but it never touches the watch itself: the row leaves
// the cache, the watch stays, and nobody else's list changes.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
  WatchingDismissResponse,
  WatchingShow,
} from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { watchingQueryKey } from './use-watching';

export type WatchingDismissInput = {
  show: WatchingShow;
  /** true hides the row (POST), false is the Undo (DELETE). */
  dismissed: boolean;
};

// The row goes back where the server would put it: before the first later
// date. The settle refetch has the final word on order.
const reinsert = (
  current: WatchingShow[],
  show: WatchingShow,
): WatchingShow[] => {
  if (current.some((row) => row.eventId === show.eventId)) return current;
  const at = current.findIndex((row) => row.date > show.date);
  if (at === -1) return [...current, show];
  return [...current.slice(0, at), show, ...current.slice(at)];
};

export function useWatchingDismiss() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();

  return useMutation({
    mutationKey: ['watching-dismiss'],
    mutationFn: async ({
      show,
      dismissed,
    }: WatchingDismissInput): Promise<WatchingDismissResponse> => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const path = `/v1/watching/${show.eventId}/dismiss`;
      return dismissed
        ? apiClient.post<WatchingDismissResponse>(path, token, {})
        : apiClient.delete<WatchingDismissResponse>(path, token);
    },
    onMutate: async ({ show, dismissed }: WatchingDismissInput) => {
      await queryClient.cancelQueries({ queryKey: watchingQueryKey(userId) });
      const previous = queryClient.getQueryData<WatchingShow[]>(
        watchingQueryKey(userId),
      );
      // A cold cache has nothing to hide a row from; writing one would turn
      // the query into a resolved empty list.
      if (previous) {
        queryClient.setQueryData(
          watchingQueryKey(userId),
          dismissed
            ? previous.filter((row) => row.eventId !== show.eventId)
            : reinsert(previous, show),
        );
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      // Every failure rolls back, a 409 (the show is listed again) included.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(watchingQueryKey(userId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: watchingQueryKey(userId),
      });
    },
  });
}
