'use client';

// "Show N shows" on the phone Filters sheet while a crew lens is drafted WITH
// other filters: the number of the crew's shows that pass those filters, which
// the crew's own total (`upcomingCount`) does not know. It asks the same feed
// the list reads (`GET /v1/crews/:id/shows` with the lens filter query) and
// counts the rows, on the same terms as `useDraftShowCount`: the first ask
// goes at once, later ones wait for a quiet moment, a superseded ask is
// aborted, and a number for an older draft comes back `pending`, never passed
// off as the count for what is picked now.

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { fetchCrewShows } from '@/lib/crews';
import {
  DRAFT_COUNT_DEBOUNCE_MS,
  type DraftShowCount,
} from './useDraftShowCount';

/**
 * `crewId` is null when there is nothing to ask (no lens, or a lens whose
 * count is already known).
 */
export const useDraftLensCount = (
  crewId: string | null,
  filterQuery: string,
): DraftShowCount => {
  const key = crewId === null ? null : `${crewId}?${filterQuery}`;
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSettled(key),
      DRAFT_COUNT_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [key]);

  const { getToken, userId } = useAuth();
  const { data, isError, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['crew-lens-draft-count', settled, userId ?? null],
    enabled: settled !== null && key !== null,
    queryFn: async () => {
      const [id = '', query = ''] = (settled ?? '').split('?');
      const token = await getToken();
      // The list needs the token too: no token is no honest count.
      if (!token) throw new Error('No token for a lens count');
      return (await fetchCrewShows(token, id, query)).length;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });

  if (key === null) return { status: 'none' };
  const current = key === settled;
  if (current && isError) return { status: 'error' };
  if (current && !isFetching && !isPlaceholderData && data !== undefined) {
    return { status: 'ready', count: data };
  }
  return { status: 'pending', count: data ?? null };
};
