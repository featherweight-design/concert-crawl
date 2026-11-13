'use client';

// "Show N shows" on the phone Filters sheet: the events total for the draft,
// asked of GET /v1/events with `limit=1` and read off the response's `total`.
// The first ask goes at once; after that the draft moves with every tap, so
// each ask waits for a quiet moment, and a superseded ask is aborted. The
// answer says whether its number is current: while a newer draft is settling
// or in flight, the last number comes back `pending`, never passed off as the
// count for what is picked now.

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { EventsListResponse } from '@concert-crawl/types';
import { apiClient, publicApiClient } from '@/lib/api';
import { buildEventsApiParams } from '@/lib/events-api-params';
import { isScopeRejection, scopeRetryToken } from '@/lib/scope-rejection';

export const DRAFT_COUNT_DEBOUNCE_MS = 250;

export type DraftShowCount =
  /** No count is asked for (Cal view, a crew lens). */
  | { status: 'none' }
  /** The count for exactly the current draft. */
  | { status: 'ready'; count: number }
  /** A count for the current draft is on its way; `count` is the last one, if any. */
  | { status: 'pending'; count: number | null }
  /** The current draft's count could not be had. */
  | { status: 'error' };

/**
 * `query` is the page URL the draft would leave, or null when there is no
 * count to ask for.
 */
export const useDraftShowCount = (query: string | null): DraftShowCount => {
  const [settled, setSettled] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSettled(query),
      DRAFT_COUNT_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const { getToken, userId } = useAuth();
  const { data, isError, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['events-draft-count', settled, userId ?? null],
    enabled: settled !== null && query !== null,
    // React Query aborts the signal when a newer key replaces this one.
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams(settled ?? '');
      // A total is the same at any offset, and `buildEventsApiParams` reads a
      // page URL's own `offset` when given none: a count never pages.
      params.delete('offset');
      // The scopes ride a token, as they do for the list itself (use-events).
      const following = params.get('filterFollowing') === '1' && userId != null;
      const taste = params.get('filterTaste') === '1' && userId != null;
      const pathFor = (scoped: boolean) =>
        `/v1/events?${buildEventsApiParams(params, {
          limit: 1,
          following: scoped && following,
          taste: scoped && taste,
        }).toString()}`;
      const publicTotal = async () =>
        (
          await publicApiClient.get<EventsListResponse>(pathFor(false), {
            signal,
          })
        ).total;
      if (!following && !taste) return publicTotal();

      const token = await getToken();
      // The list throws here too (use-events): an unscoped count under a
      // scoped list would be a wrong number.
      if (!token) throw new Error('No token for a scoped count');
      try {
        return (
          await apiClient.get<EventsListResponse>(pathFor(true), token, {
            signal,
          })
        ).total;
      } catch (err) {
        // Entitlement lapsed mid-session: the list falls back to the unscoped
        // list (use-events), so the count does too, by the same rule and
        // helpers, a refused token dropped with the scopes.
        if (!isScopeRejection(err)) throw err;
        const retryToken = scopeRetryToken(err, token);
        if (retryToken === null) return publicTotal();
        return (
          await apiClient.get<EventsListResponse>(pathFor(false), retryToken, {
            signal,
          })
        ).total;
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });

  if (query === null) return { status: 'none' };
  // Still settling: the key in the cache belongs to an older draft.
  const current = query === settled;
  if (current && isError) return { status: 'error' };
  if (current && !isFetching && !isPlaceholderData && data !== undefined) {
    return { status: 'ready', count: data };
  }
  return { status: 'pending', count: data ?? null };
};
