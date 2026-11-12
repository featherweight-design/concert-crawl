'use client';

// Hides a No longer listed show from the viewer's own Watching list, and puts
// it back (the Undo). Same optimistic-then-invalidate shape as
// use-watch-toggle.ts, but it never touches the watch itself: the row leaves
// the cache, the watch stays, and nobody else's list changes.

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { z } from 'zod';
import type {
  WatchingDismissResponse,
  WatchingShow,
} from '@concert-crawl/types';
import { ApiError, apiClient } from '@/lib/api';
import { watchingQueryKey } from './use-watching';

export type WatchingDismissInput = {
  show: WatchingShow;
  /** true hides the row (POST), false is the Undo (DELETE). */
  dismissed: boolean;
};

const watchingDismissResponseSchema: z.ZodType<WatchingDismissResponse> =
  z.object({ dismissed: z.boolean() });

// Where the row stood before the mutation moved it: the row that followed it,
// and its index as the fallback when that neighbour has since gone.
type DismissContext = { index: number; nextEventId: string | null };

// The row goes back where it was: before its old neighbour if that row is
// still there, else at its old index, else where the server would put it
// (before the first later date). The settle refetch has the final word.
const reinsert = (
  current: WatchingShow[],
  show: WatchingShow,
  at?: DismissContext,
): WatchingShow[] => {
  if (current.some((row) => row.eventId === show.eventId)) return current;
  let index = -1;
  if (at?.nextEventId) {
    index = current.findIndex((row) => row.eventId === at.nextEventId);
  }
  if (index === -1 && at && at.index >= 0 && at.index <= current.length) {
    index = at.index;
  }
  if (index === -1) index = current.findIndex((row) => row.date > show.date);
  if (index === -1) return [...current, show];
  return [...current.slice(0, index), show, ...current.slice(index)];
};

const without = (current: WatchingShow[], eventId: string): WatchingShow[] =>
  current.filter((row) => row.eventId !== eventId);

/** A 409 `not_delisted`: the venue listed the show again before the POST. */
export const isStillListed = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 409 && err.code === 'not_delisted';

/**
 * Returns `dismiss(input)`, which resolves with the server's answer or rejects
 * after rolling this one row back, and `isHiding(eventId)`, true while that
 * show's dismiss POST is out. Each call is its own mutation in the shared
 * cache, scoped by event: a POST and the Undo DELETE for one show always reach
 * the server in that order, while different shows don't wait on each other.
 * `useMutation` can't do that, since its scope is fixed per hook, not per call.
 *
 * Hiding is two things only: the cache, and the `hiding` set. The cache drops
 * the row at once. The set keeps it out of the list while the POST is out,
 * whatever a mid-flight refetch writes, and turns away a second tap before
 * React has re-rendered. Every change to the set also bumps a render counter,
 * so a settle re-renders even when its cache write changes nothing (a refetch
 * that landed mid-POST already put the row back in the cache, and only the set
 * was hiding it).
 */
export function useWatchingDismiss() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();
  const hidingRef = useRef<Set<string>>(new Set());
  const [hidingVersion, setHidingVersion] = useState(0);

  const setHiding = useCallback((eventId: string, hiding: boolean) => {
    if (hiding) hidingRef.current.add(eventId);
    else hidingRef.current.delete(eventId);
    setHidingVersion((version) => version + 1);
  }, []);

  // hidingVersion is in the deps so a change to the set hands consumers a new
  // function, and anything memoised on it reads the set again.
  const isHiding = useCallback(
    (eventId: string) => hidingRef.current.has(eventId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hidingVersion is the set's change signal: a new function per change makes consumers re-read the ref
    [hidingVersion],
  );

  const dismiss = useCallback(
    (input: WatchingDismissInput): Promise<WatchingDismissResponse> => {
      const key = watchingQueryKey(userId);
      const { eventId } = input.show;
      if (input.dismissed) setHiding(eventId, true);
      const mutation = queryClient
        .getMutationCache()
        .build<
          WatchingDismissResponse,
          Error,
          WatchingDismissInput,
          DismissContext
        >(queryClient, {
          mutationKey: ['watching-dismiss'],
          scope: { id: `watching-dismiss:${input.show.eventId}` },
          mutationFn: async ({ show, dismissed }) => {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const path = `/v1/watching/${show.eventId}/dismiss`;
            const body = dismissed
              ? await apiClient.post<unknown>(path, token, {})
              : await apiClient.delete<unknown>(path, token);
            const parsed = watchingDismissResponseSchema.safeParse(body);
            if (!parsed.success) {
              throw new Error('Unexpected watching dismiss response');
            }
            return parsed.data;
          },
          onMutate: async ({ show, dismissed }) => {
            await queryClient.cancelQueries({ queryKey: key });
            const current = queryClient.getQueryData<WatchingShow[]>(key);
            const index =
              current?.findIndex((row) => row.eventId === show.eventId) ?? -1;
            // A cold cache has nothing to hide a row from; writing one would
            // turn the query into a resolved empty list.
            if (current) {
              queryClient.setQueryData(
                key,
                dismissed
                  ? without(current, show.eventId)
                  : reinsert(current, show),
              );
            }
            return {
              index,
              nextEventId:
                index >= 0 ? (current?.[index + 1]?.eventId ?? null) : null,
            };
          },
          onSuccess: (_data, { show, dismissed }) => {
            // The server has said yes. A refetch that landed mid-flight may
            // have carried the old answer back in, so apply it again.
            if (dismissed) setHiding(show.eventId, false);
            queryClient.setQueryData<WatchingShow[]>(key, (current) => {
              if (!current) return current;
              return dismissed
                ? without(current, show.eventId)
                : reinsert(current, show);
            });
          },
          onError: (err, { show, dismissed }, context) => {
            // Clearing the set re-renders on its own, so the row shows again
            // even when the rollback below finds it already in the cache.
            if (dismissed) setHiding(show.eventId, false);
            // A 409 means the show is listed again, so the row we hold is
            // stale: it would bring back a dismiss × the show no longer has.
            // Leave it out and let the settle refetch bring the fresh row.
            if (dismissed && isStillListed(err)) {
              queryClient.setQueryData<WatchingShow[]>(key, (current) =>
                current ? without(current, show.eventId) : current,
              );
              return;
            }
            // Any other failure rolls back. Only this row moves: anything else
            // that changed the list meanwhile stays changed.
            queryClient.setQueryData<WatchingShow[]>(key, (current) => {
              if (!current) return current;
              return dismissed
                ? reinsert(current, show, context)
                : without(current, show.eventId);
            });
          },
          onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: key });
          },
        });
      return mutation.execute(input);
    },
    [queryClient, getToken, userId, setHiding],
  );

  return { dismiss, isHiding };
}
