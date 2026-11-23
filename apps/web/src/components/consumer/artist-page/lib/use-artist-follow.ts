'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import { ApiError, apiClient } from '@/lib/api';
import { FALLBACK_RETRY_AFTER_SECONDS } from '@/lib/retry-after';
import { useInvalidateFollowedArtistNames } from '@/lib/queries/use-followed-artist-names';

/**
 * The four refusals a follow can come back with that the viewer can act on
 * (addendum 13 section 2). `not_found` and `name_held` are final, so the
 * control greys out; the other two leave it live for a retry. Anything else
 * (a network error, a 5xx that is not 503) rolls back with no message, as it
 * always has.
 */
export type FollowError =
  | { kind: 'not_found' }
  | { kind: 'name_held' }
  | { kind: 'rate_limited'; retryAt: Date }
  | { kind: 'unavailable' };

/** A retry cannot succeed, so the Follow beside the message greys out. */
export const followErrorIsFinal = (error: FollowError | null): boolean =>
  error?.kind === 'not_found' || error?.kind === 'name_held';

export const followErrorFor = (err: unknown): FollowError | null => {
  if (!(err instanceof ApiError)) return null;
  switch (err.status) {
    case 404:
      return { kind: 'not_found' };
    case 409:
      return { kind: 'name_held' };
    case 429:
      return {
        kind: 'rate_limited',
        retryAt: new Date(
          Date.now() +
            (err.retryAfterSeconds ?? FALLBACK_RETRY_AFTER_SECONDS) * 1000,
        ),
      };
    case 503:
      return { kind: 'unavailable' };
    default:
      return null;
  }
};

interface ArtistFollowResult {
  following: boolean;
  /** True while a request is in flight — a second click is swallowed. */
  pending: boolean;
  /** The last refusal, until the next tap. The state has already rolled back. */
  error: FollowError | null;
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

/**
 * `slug` is null for a MusicBrainz-only act: it has no artist row until a
 * follow creates one, so its first follow goes out by `mbid` and the answer
 * carries the new slug, which a later unfollow uses.
 */
export const useArtistFollow = (
  slug: string | null,
  initialFollowing: boolean,
  mbid: string | null = null,
) => {
  const { getToken } = useAuth();
  const invalidateFollowedNames = useInvalidateFollowedArtistNames();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FollowError | null>(null);
  const inFlight = useRef(false);
  const knownSlug = useRef(slug);

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
    setError(null);

    const previous = following;
    const next = !previous;
    setFollowing(next);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const heldSlug = knownSlug.current ?? slug;
        let result: unknown;
        if (heldSlug === null) {
          if (mbid === null) throw new Error('Nothing to follow');
          result = await apiClient.post<unknown>('/v1/artists/follow', token, {
            mbid,
          });
          const created = isFollowResponse(result)
            ? Reflect.get(result, 'slug')
            : undefined;
          if (typeof created !== 'string') {
            throw new Error('Unexpected follow response shape');
          }
          knownSlug.current = created;
        } else {
          const path = `/v1/artists/${heldSlug}/follow`;
          result = next
            ? await apiClient.post<unknown>(path, token, {})
            : await apiClient.delete<unknown>(path, token);
        }
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
        setError(followErrorFor(err));
        // Following is free on every signed-in plan, so a 403 is an ordinary
        // failure: it rolls back like any other, with no upgrade path.
        console.warn('artist follow toggle failed; rolling back', err);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    })();
  }, [following, getToken, slug, mbid, invalidateFollowedNames]);

  const result: ArtistFollowResult = { following, pending, error, toggle };
  return result;
};
