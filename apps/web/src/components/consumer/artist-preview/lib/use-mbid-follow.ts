'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  ArtistFollowByMbidResponse,
  ArtistFollowResponse,
} from '@concert-crawl/types';

import {
  followErrorFor,
  type FollowError,
} from '@/components/consumer/artist-page/lib/use-artist-follow';
import { apiClient } from '@/lib/api';
import { useInvalidateFollowedArtistNames } from '@/lib/queries/use-followed-artist-names';

const isByMbidResponse = (
  value: unknown,
): value is ArtistFollowByMbidResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'following') === 'boolean' &&
  typeof Reflect.get(value, 'slug') === 'string';

const isFollowResponse = (value: unknown): value is ArtistFollowResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'following') === 'boolean';

/**
 * The follow for an act we hold no page for: `POST /v1/artists/follow` by
 * MusicBrainz id, which creates the artist's row and answers with its slug.
 * The slug is what opens their page and what the same-session unfollow
 * (`DELETE /v1/artists/:slug/follow`) needs, so the hook keeps it. Same
 * optimism and refusals as `useArtistFollow`: flip first, roll back on a
 * failure, and map 404, 409, 429 and 503 to a `FollowError`.
 */
export const useMbidFollow = (mbid: string) => {
  const { getToken } = useAuth();
  const invalidateFollowedNames = useInvalidateFollowedArtistNames();
  const [following, setFollowing] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FollowError | null>(null);
  const inFlight = useRef(false);

  const toggle = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);

    const previous = following;
    setFollowing(!previous);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        if (!previous) {
          const result = await apiClient.post<unknown>(
            '/v1/artists/follow',
            token,
            { mbid },
          );
          if (!isByMbidResponse(result)) {
            throw new Error('Unexpected follow response shape');
          }
          setSlug(result.slug);
          setFollowing(result.following);
        } else {
          // A row exists by now: the follow that made it returned the slug.
          if (!slug) throw new Error('Unfollow before the follow settled');
          const result = await apiClient.delete<unknown>(
            `/v1/artists/${slug}/follow`,
            token,
          );
          if (!isFollowResponse(result)) {
            throw new Error('Unexpected follow response shape');
          }
          setFollowing(result.following);
        }
        invalidateFollowedNames();
      } catch (err) {
        setFollowing(previous);
        setError(followErrorFor(err));
        console.warn(
          'artist follow by MusicBrainz id failed; rolling back',
          err,
        );
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    })();
  }, [following, getToken, invalidateFollowedNames, mbid, slug]);

  return { following, slug, pending, error, toggle };
};
