'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import { apiClient } from '@/lib/api';
import { useInvalidateFollowedArtistNames } from '@/lib/queries/use-followed-artist-names';

interface ArtistFollowResult {
  following: boolean;
  /** True while a request is in flight — a second click is swallowed. */
  pending: boolean;
  toggle: () => void;
}

/**
 * The relationship is rendered in up to three places at once (hero, sticky
 * sub-header, empty-upcoming block), so the state has to live above all of
 * them. The button itself stays presentational.
 *
 * The flip is optimistic and rolls back on failure. On success we take the
 * SERVER's answer, not our guess: unfollowing an artist whose follow also came
 * from a Spotify sync leaves the follow standing, and the API reports that
 * effective state.
 */
const isFollowResponse = (value: unknown): value is { following: boolean } =>
  typeof value === 'object' &&
  value !== null &&
  'following' in value &&
  typeof Reflect.get(value, 'following') === 'boolean';

export const useArtistFollow = (slug: string, initialFollowing: boolean) => {
  const { getToken } = useAuth();
  const invalidateFollowedNames = useInvalidateFollowedArtistNames();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  // The server's answer can change under a mounted hook: the sign-in replay
  // follows on arrival and then `router.refresh()`es, which re-renders with
  // `initialFollowing` true while `following` still holds the first render's
  // false. Adopt a changed prop during render (React's "adjust state when a
  // prop changes" pattern), but not mid-toggle: the in-flight request settles
  // on the server's own answer, which is at least as fresh as the prop.
  const [seenInitial, setSeenInitial] = useState(initialFollowing);
  if (initialFollowing !== seenInitial) {
    setSeenInitial(initialFollowing);
    if (!pending) setFollowing(initialFollowing);
  }

  const toggle = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);

    const previous = following;
    const next = !previous;
    setFollowing(next);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const path = `/v1/artists/${slug}/follow`;
        const result = next
          ? await apiClient.post<unknown>(path, token, {})
          : await apiClient.delete<unknown>(path, token);
        // A 2xx whose body we can't read is not a success we can act on —
        // keeping the optimistic guess would strand the UI out of sync with a
        // server we just failed to understand. Throw into the rollback below.
        if (!isFollowResponse(result)) {
          throw new Error('Unexpected follow response shape');
        }
        setFollowing(result.following);
        invalidateFollowedNames();
      } catch (err) {
        setFollowing(previous);
        // Following is free on every signed-in plan, so a 403 is an ordinary
        // failure: it rolls back like any other, with no upgrade path.
        console.warn('artist follow toggle failed; rolling back', err);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    })();
  }, [following, getToken, slug, invalidateFollowedNames]);

  const result: ArtistFollowResult = { following, pending, toggle };
  return result;
};
