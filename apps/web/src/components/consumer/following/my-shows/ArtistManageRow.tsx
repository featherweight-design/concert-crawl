'use client';

// One followed artist on My shows ▸ Artists.
//
// Two densities of the SAME row, not two components: `row` is the mobile
// list card, `card` is the desktop two-up grid cell. B+ (README "My shows",
// rule 2) cards both, and the next show's lead genre colours the image ring
// and the left edge; an artist with no date takes the neutral edge. They differ
// in box and type scale only — same fields, same order, same control — so a
// change to what a row says lands on both by construction.
//
// The control is the shipped FollowButton. There is no second follow
// affordance in this product and no confirm step on unfollow: the row stays
// where it is until the next navigation, so a mis-tap is one tap to undo.
//
// The control is quiet in both densities and takes the density's own key:
// `rowWide` on the desktop card, `row` on the mobile list. Its tap target is
// 44px either way — the visual pill shrank, the overlay did not. It also keeps
// its label in both, because an unlabelled check reads as confirmation rather
// than as a toggle you can switch off. 320px is the one exception, where
// `narrow` drops the word for want of room. That labelled control is also why
// the desktop grid is two-up rather than the handoff's three-up: it needs the
// width.

import Link from 'next/link';
import { Panel } from '@/components/consumer/image-slot';
import { FollowDateLine } from '@/components/consumer/following/FollowDateLine';
import { FollowButton } from '@/components/consumer/artist-page/FollowButton';
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { followDateLine } from '@/lib/following';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import type { FollowedArtist } from '@concert-crawl/types';
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy';
import {
  CARD_ART_SIZE,
  ROW_ART_SIZE,
  ROW_ART_SIZE_NARROW,
} from './definitions/constants';
import { SourceMark } from './SourceMark';

const COPY = MY_SHOWS_ARTISTS_COPY;

export interface ArtistManageRowProps {
  artist: FollowedArtist;
  /** `row` is mobile, `card` is the desktop grid cell. */
  variant?: 'row' | 'card';
  /** 320px: the row has no width for the word "Following". */
  narrow?: boolean;
  /** The API answered 403 — open the tier picker. */
  onEntitlementRequired: () => void;
}

export const ArtistManageRow = ({
  artist,
  variant = 'row',
  narrow = false,
  onEntitlementRequired,
}: ArtistManageRowProps) => {
  // Hooks run unconditionally. A slug-less follow (a Spotify act never billed
  // in Denver) simply never renders the control that would call `toggle` —
  // the follow endpoint is keyed by slug, so there is nothing to call.
  const follow = useArtistFollow(
    artist.slug ?? '',
    true,
    onEntitlementRequired,
  );
  // The follows endpoint is deliberately ungated — a user must be able to
  // manage a list they already have — so `source` keeps arriving with the flag
  // off. Naming Spotify is the part that has to stop, not the row.
  const { enabled: spotifyEnabled } = useFeatureFlag('spotify-sync');

  const card = variant === 'card';
  const art = card
    ? CARD_ART_SIZE
    : narrow
      ? ROW_ART_SIZE_NARROW
      : ROW_ART_SIZE;
  const dateLine = followDateLine(artist.nextShow);
  const genre = genreColor(artist.nextShow?.genres[0]) ?? NEUTRAL_GENRE_COLOR;

  return (
    <div
      data-testid="artist-manage-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: card ? 12 : '11px 12px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        borderLeftWidth: 2,
        borderLeftColor: genre,
        // Group 1 cards are the ones with a date; the tint is what
        // separates them from the reference list below.
        ...(artist.nextShow === null
          ? {}
          : {
              background: `linear-gradient(90deg, color-mix(in oklch, ${genre} 7%, var(--surface-1)), var(--surface-1) 45%)`,
            }),
      }}
    >
      <span
        data-testid="artist-image-ring"
        className="block shrink-0 overflow-hidden rounded-md"
        style={{
          width: art,
          height: art,
          // A box-shadow, so the clip never cuts the ring.
          boxShadow: `0 0 0 1.25px ${genre}, 0 0 10px color-mix(in oklch, ${genre} 35%, transparent)`,
        }}
      >
        <Panel
          surface="artist"
          name={artist.name}
          photoUrl={artist.photoUrl}
          size={art}
        />
      </span>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: card ? 0 : 4,
        }}
      >
        {artist.slug === null ? (
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              fontSize: card ? 14 : 14.5,
              fontWeight: 800,
              letterSpacing: '-0.015em',
              color: 'var(--fg)',
            }}
          >
            {artist.name}
          </span>
        ) : (
          <Link
            href={`/artists/${artist.slug}`}
            className="overflow-hidden text-ellipsis whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            style={{
              fontSize: card ? 14 : 14.5,
              fontWeight: 800,
              letterSpacing: '-0.015em',
              color: 'var(--fg)',
              textDecoration: 'none',
            }}
          >
            {artist.name}
          </Link>
        )}

        <FollowDateLine
          dateLine={dateLine}
          fallback={COPY.groups.noDates}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: card ? 9 : 9.5,
            letterSpacing: dateLine === null ? '0.08em' : '0.06em',
            fontWeight: dateLine === null ? 600 : 400,
            marginTop: card ? 4 : 0,
            // The quiet group is not a signal, so it does not get the signal
            // colour — the date line earns that by being actionable.
            color: dateLine === null ? 'var(--fg-subtle)' : 'var(--signal)',
          }}
        />

        {spotifyEnabled && artist.source !== 'manual' && (
          <span style={{ marginTop: card ? 4 : 1 }}>
            <SourceMark />
          </span>
        )}
      </div>

      {artist.slug !== null && (
        <FollowButton
          name={artist.name}
          following={follow.following}
          signedOut={false}
          size={card ? 'rowWide' : 'row'}
          iconOnly={narrow}
          onToggle={follow.toggle}
          // Unreachable: every row here is an existing follow, and DELETE is
          // ungated, so `locked` is never true. A 403 on a re-follow comes
          // back through `onEntitlementRequired` instead.
          onLockedTap={onEntitlementRequired}
        />
      )}
    </div>
  );
};
