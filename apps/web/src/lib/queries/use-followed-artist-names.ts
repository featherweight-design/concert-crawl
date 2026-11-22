'use client';

// The viewer's followed acts as a set of canonical names, for the Followed
// highlight on event rows, the hero card and the event page (#750 addendum-8
// §6). One cached read of GET /v1/me/artist-follows serves every row on the
// page; rows never fetch for themselves.
//
// Matching is by canonical name because that is what a follow row is keyed
// on and what both sources write (manual Follow and onboarding picks alike),
// and `canonicalizeArtist` is the same function the API applies to the bill.

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { fetchFollowedArtists } from '@/lib/following';

// Scoped by userId: the QueryClient outlives sign-in sessions, so an account
// switch must not surface the previous viewer's follows.
export const followedArtistNamesQueryKey = (
  userId: string | null | undefined,
) => ['followed-artist-names', userId ?? null] as const;

const EMPTY: ReadonlySet<string> = new Set();

/** Empty while signed out, loading or failed: no mark is the safe answer. */
export function useFollowedArtistNames(): ReadonlySet<string> {
  const { getToken, isSignedIn, userId } = useAuth();
  const { data } = useQuery({
    queryKey: followedArtistNamesQueryKey(userId),
    queryFn: async (): Promise<ReadonlySet<string>> => {
      const token = await getToken();
      if (!token)
        throw new Error('Auth token unavailable while fetching follows');
      const follows = await fetchFollowedArtists(token);
      return new Set(follows.map((follow) => follow.canonicalName));
    },
    enabled: !!isSignedIn,
    staleTime: 60 * 1000,
  });
  return data ?? EMPTY;
}
