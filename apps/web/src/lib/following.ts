// Server-side reads for native following (PR 4 — browse scope chip + shelf).
//
// ⚠️ ONE fetch serves BOTH consumers on browse. The scope chip's `absent` state
// (entitled, zero follows) and the shelf's `some`/`spotify` modes are decided
// from the same follow list, SSR-seeded once in events/page.tsx. Do not add a
// second call for the shelf.
import type {
  ArtistSuggestion,
  FollowedArtist,
  FollowedArtistNextShow,
} from '@concert-crawl/types'
import { formatShortDate } from '@/components/consumer/definitions/lib'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import type { ShelfArtist } from '@/components/consumer/following/definitions/types'
import { apiClient, publicApiClient, ApiError } from './api'

/**
 * The viewer's follows, newest first. The endpoint is deliberately UNGATED —
 * a downgraded user must still see the list they built — so a 403 here means
 * something other than entitlement went wrong.
 */
export async function fetchFollowedArtists(
  token: string,
): Promise<FollowedArtist[]> {
  return apiClient.get<FollowedArtist[]>('/v1/me/artist-follows', token)
}

/** Followable artists with an upcoming Denver date. Public — no token needed. */
export async function fetchArtistSuggestions(
  limit?: number,
): Promise<ArtistSuggestion[]> {
  const qs = limit === undefined ? '' : `?limit=${limit}`
  return publicApiClient.get<ArtistSuggestion[]>(`/v1/artists/suggestions${qs}`)
}

/**
 * SSR seed for both browse consumers.
 *
 * `undefined` means UNKNOWN, not zero. The distinction is load-bearing: a
 * failed fetch must leave the chip rendering `off` and the shelf rendering
 * nothing, because treating "we couldn't ask" as "you follow nobody" would
 * pull the chip out from under a user who follows fifty artists.
 */
export async function seedFollowedArtists(
  token: string | null,
): Promise<FollowedArtist[] | undefined> {
  if (!token) return undefined
  try {
    return await fetchFollowedArtists(token)
  } catch (err: unknown) {
    // 401 is the expected shape when the token has aged out between the Clerk
    // read and this call, so it drops to warn rather than going unlogged: an
    // unlogged catch is indistinguishable from a shelf that silently stopped
    // rendering. Anything else is a real failure.
    if (err instanceof ApiError && err.status === 401) {
      console.warn('followed artists SSR prefetch unauthenticated')
    } else {
      console.error('followed artists SSR prefetch failed', err)
    }
    return undefined
  }
}

/** Suggestions for the starter shelf. Failure degrades to no shelf, not a hole. */
export async function seedArtistSuggestions(
  limit?: number,
): Promise<ArtistSuggestion[] | undefined> {
  try {
    return await fetchArtistSuggestions(limit)
  } catch (err: unknown) {
    console.error('artist suggestions SSR prefetch failed', err)
    return undefined
  }
}

/**
 * Follows the shelf can render a dated row for. A follow with no `nextShow` is
 * a normal case ("played Denver before, nothing upcoming") and simply isn't
 * shelf material — the shelf is a "go see them" surface.
 */
export const datedFollows = (follows: FollowedArtist[]): FollowedArtist[] =>
  follows.filter((follow) => follow.nextShow !== null)

/**
 * Whether ANY of the viewer's follows came from Spotify. Drives the shelf's
 * `spotify` mode, which differs from `some` only in its heading — Spotify is a
 * source, not a second information architecture.
 */
export const hasSpotifyFollows = (follows: FollowedArtist[]): boolean =>
  follows.some((follow) => follow.source !== 'manual')

/**
 * "Venue · Sep 12", or null when nothing is on the books. Built server-side so
 * both shelf sources arrive at the card in one shape.
 */
export const followDateLine = (
  next: FollowedArtistNextShow | null,
): string | null =>
  next === null
    ? null
    : `${next.venue}${FOLLOWING_COPY.cardDateSeparator}${formatShortDate(next.iso)}`

/** Followed artists as shelf rows. Every row is, by definition, followed. */
export const followsToShelfArtists = (
  follows: FollowedArtist[],
): ShelfArtist[] =>
  follows.map((follow) => ({
    key: follow.canonicalName,
    name: follow.name,
    slug: follow.slug,
    photoUrl: follow.photoUrl,
    dateLine: followDateLine(follow.nextShow),
    following: true,
  }))

/**
 * Suggestions as shelf rows. `following` is `null` for an anonymous request,
 * which reads as not-following: a visitor with no session follows nobody.
 */
export const suggestionsToShelfArtists = (
  suggestions: ArtistSuggestion[],
): ShelfArtist[] =>
  suggestions.map((suggestion) => ({
    key: suggestion.slug,
    name: suggestion.name,
    slug: suggestion.slug,
    photoUrl: suggestion.photoUrl,
    dateLine: followDateLine(suggestion.nextShow),
    following: suggestion.following === true,
  }))
