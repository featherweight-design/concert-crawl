'use client'

// Suggestions for the onboarding artists step.
//
// Lives in the SHELL, not in the step. The shell renders its mobile and its
// desktop tree at the same time (one of them `display:none`), so a fetch
// mounted inside the step would fire twice for one screen. Hoisting it also
// means the two trees can never disagree about what is on offer.

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { formatShortDate } from '@/components/consumer/definitions/lib'
import { fetchArtistSuggestions } from '@/lib/following'
import {
  PICK_SUGGESTION_LIMIT,
  type PickArtist,
} from '@/components/consumer/artist-picker'

/**
 * Suggestions as picker tiles, minus anyone already followed: the tile has one
 * unchecked state and no way to say "you already have this one", so offering
 * it would let a user "select" something the commit could not change.
 *
 * That filter is why the token is sent. The route only fills `following` for a
 * reader it can identify, so an anonymous fetch answers `null` on every row and
 * the exclusion quietly does nothing. Onboarding is post-auth, so a missing
 * token here means the read failed, not that nobody is signed in.
 */
export function useOnboardingSuggestions(
  genres: readonly string[],
  enabled: boolean,
): {
  artists: PickArtist[]
  loading: boolean
  loaded: boolean
  errored: boolean
} {
  // The genre set is part of the key, so re-picking on the step before this
  // one refetches rather than showing the previous lane's artists.
  const sorted = Array.from(genres).sort()
  const { getToken } = useAuth()
  const query = useQuery({
    queryKey: ['onboarding', 'artist-suggestions', sorted],
    queryFn: async () => {
      // Failing beats degrading. `fetchArtistSuggestions` falls back to the
      // public client on a null token, and that read answers `following: null`
      // on every row, so the exclusion below would pass everything through and
      // the step would offer tiles the commit cannot change.
      const token = await getToken()
      if (token === null) throw new Error('onboarding suggestions: no token')
      return fetchArtistSuggestions(PICK_SUGGESTION_LIMIT, sorted, token)
    },
    enabled,
    // The tour is a single sitting; refetching mid-step would swap tiles out
    // from under a half-made selection.
    staleTime: Infinity,
    retry: 1,
  })

  const artists = (query.data ?? [])
    .filter((suggestion) => suggestion.following !== true)
    .map((suggestion) => ({
      slug: suggestion.slug,
      name: suggestion.name,
      photoUrl: suggestion.photoUrl,
      dateLabel: formatShortDate(suggestion.nextShow.iso),
    }))

  // `loaded` is not `!loading`. A failed fetch is also not-loading, and it
  // hands back the same empty array a genuinely empty result does — so a caller
  // that reconciles state against this list has to know which of the two it is
  // holding. Only a success says the list is the whole truth.
  //
  // `errored` is the same distinction told the other way round, for the reader
  // rather than for the state: an outage that renders as "nobody booked in that
  // lane" blames the listings for our own failure.
  return {
    artists,
    loading: enabled && query.isPending,
    loaded: query.isSuccess,
    errored: enabled && query.isError,
  }
}
