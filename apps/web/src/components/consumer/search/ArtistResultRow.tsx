'use client';

// One artist row in the search results (native following, PR 5). The row is
// two targets, not one: the name half opens the artist's page, the follow half
// is the shared `FollowButton`. Search is where "you must be on their page to
// follow them" gets fixed, so the button has to be here rather than one tap in.
//
// An artist with nothing upcoming keeps a normal LIVE Follow button and says so
// in the muted meta line. That is the clearest case the feature exists for, and
// there is no `unavailable` state to render instead: artists are a projection
// off event billing strings, so an artist with no Denver history cannot be in
// the index at all.

import type { ArtistSearchResult } from '@concert-crawl/types';
import { FollowButton } from '@/components/consumer/artist-page/FollowButton';
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { AvatarSlot } from '@/components/consumer/image-slot';
import { GenreChips } from '../GenreChips';
import {
  Highlight,
  RESULT_ART_SIZE,
  RESULT_NAME_STYLE,
  RESULT_META_STYLE,
  resultRowProps,
  resultRowStyle,
  ringColorFor,
} from './ResultParts';

const copy = CONSUMER_COPY.search;

interface ArtistResultRowProps {
  artist: ArtistSearchResult;
  selected: boolean;
  /** The row's keyboard index, for its option id. */
  itemIdx: number;
  /** Inside the palette's listbox (the row is then an `option`). */
  listbox: boolean;
  onHover?: () => void;
  onNavigate: () => void;
  /** Clerk's answer, `undefined` while it is still resolving. */
  isSignedIn: boolean | undefined;
  size: 'row' | 'rowWide';
  iconOnly: boolean;
  /** The typed query, lit in the name (B19). */
  query?: string;
}

export const ArtistResultRow = ({
  artist,
  selected,
  itemIdx,
  listbox,
  onHover,
  onNavigate,
  isSignedIn,
  size,
  iconOnly,
  query,
}: ArtistResultRowProps) => {
  const follow = useArtistFollow(artist.slug, artist.following);

  // Until Clerk answers, a tap does nothing, as on the follow shelf: a toggle
  // with no token yet dies on `Error('Not authenticated')`, and sending a
  // viewer who may well be signed in to sign-in is worse. The row keeps its
  // drawn state through the window, so an already-followed row does not flash
  // back to "Follow" (`artist.following` can only be true for an
  // authenticated request: the search route reports `false` to anonymous
  // ones). `signedOut` renders idle's exact pixels (#794 §3.10) and hands a
  // tap to sign-in.
  const resolving = isSignedIn === undefined;
  const signedOut = isSignedIn === false && !artist.following;

  const meta =
    artist.upcomingShowCount > 0
      ? `${artist.upcomingShowCount} ${
          artist.upcomingShowCount === 1
            ? copy.upcomingShowSingular
            : copy.upcomingShowPlural
        }`
      : copy.artistPageNoUpcoming;

  // The artist's own genre (the search API derives it from their shows) rings
  // the portrait and fills the chip; an artist with none keeps the neutral
  // ring. Either way the row takes the B+ selected wash and edge.
  const genres = artist.genre ? [artist.genre] : null;
  const ring = ringColorFor(genres);

  return (
    <div
      style={{ ...resultRowStyle(selected, ring), cursor: 'default' }}
      onMouseEnter={onHover}
    >
      <button
        type="button"
        onClick={onNavigate}
        {...resultRowProps(listbox, itemIdx, selected)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flex: 1,
          minWidth: 0,
          // The navigate-to-artist target, sized independently of the Follow
          // button beside it, which draws at 28 or 32 and grows its own
          // transparent overlay out to 44.
          minHeight: 44,
        }}
      >
        {/* An artist surface: the portrait or the generated mark, never an
            event's artwork. Decorative, because the row already renders the
            name as text. Round, as the one artist slot always is. */}
        <span
          style={{
            display: 'inline-flex',
            flexShrink: 0,
            borderRadius: '50%',
            boxShadow: `0 0 0 1.25px ${ring}`,
          }}
        >
          <AvatarSlot
            name={artist.name}
            photoUrl={artist.photoUrl}
            size={RESULT_ART_SIZE}
          />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={RESULT_NAME_STYLE}>
            <Highlight text={artist.name} {...(query ? { query } : {})} />
          </span>
          {/* The count, then the tag that tells a reader which kind of
              "Artists" row this is, on one line as B+ draws it. The no-dates
              line is quieter than a real count, not louder: it is an absence,
              and the live button beside it is the point. */}
          <span style={RESULT_META_STYLE}>
            <span
              style={{
                color:
                  artist.upcomingShowCount > 0
                    ? 'var(--fg-muted)'
                    : 'var(--fg-subtle)',
              }}
            >
              {meta}
            </span>
            {' · '}
            <span>{copy.artistPageRowTag}</span>
          </span>
          <GenreChips genres={genres} maxChips={1} />
        </span>
      </button>
      <FollowButton
        name={artist.name}
        slug={artist.slug}
        following={follow.following}
        signedOut={signedOut}
        size={size}
        iconOnly={iconOnly}
        onToggle={resolving ? () => undefined : follow.toggle}
      />
    </div>
  );
};
