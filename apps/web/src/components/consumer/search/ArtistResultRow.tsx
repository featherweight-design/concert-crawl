'use client';

// One artist row in the search results (native following, PR 5). The row is
// two targets, not one: the name half opens the artist's page, the follow half
// is the shared `FollowButton`. Search is where "you must be on their page to
// follow them" gets fixed, so the button has to be here rather than one tap in.
//
// An artist with nothing upcoming keeps a normal LIVE Follow button and says so
// in the muted meta line. That is the clearest case the feature exists for, and
// there is no `unavailable` state to render instead. A MusicBrainz-only act
// (kind 3, no slug) has no page to open: its row is Follow-only until U3's
// preview, and its name half is not a control.

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { ArtistSearchAllResult } from '@concert-crawl/types';
import { FollowButton } from '@/components/consumer/artist-page/FollowButton';
import { FollowErrorMessage } from '@/components/consumer/artist-page/FollowErrorMessage';
import {
  followErrorIsFinal,
  useArtistFollow,
} from '@/components/consumer/artist-page/lib/use-artist-follow';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { ArtistPreview } from '@/components/consumer/artist-preview/ArtistPreview';
import { AvatarSlot } from '@/components/consumer/image-slot';
import { ModalShell } from '@/components/consumer/modal-shell';
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

import { artistLine } from './artist-line';

const copy = CONSUMER_COPY.search;

/** The N SHOWS marker: signal at 12% fill and 35% border, mono 9px, 6px dot. */
const ShowsMarker = ({ count }: { count: number }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      marginRight: 6,
      padding: '1px 5px',
      borderRadius: 4,
      border: '1px solid color-mix(in oklch, var(--signal) 35%, transparent)',
      background: 'color-mix(in oklch, var(--signal) 12%, transparent)',
      color: 'var(--signal)',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}
  >
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--signal)',
      }}
    />
    {copy.showsMarker(count)}
  </span>
);

/** The row's name half: a button when it opens something, else plain. */
const Target = ({
  onNavigate,
  rowProps,
  style,
  children,
}: {
  onNavigate: (() => void) | undefined;
  rowProps: ReturnType<typeof resultRowProps>;
  style: CSSProperties;
  children: ReactNode;
}) =>
  onNavigate ? (
    <button type="button" onClick={onNavigate} {...rowProps} style={style}>
      {children}
    </button>
  ) : (
    <div {...rowProps} style={style}>
      {children}
    </div>
  );

interface ArtistResultRowProps {
  artist: ArtistSearchAllResult;
  /** Another listed row carries this name (computed over the list). */
  sharedName: boolean;
  selected: boolean;
  /** The row's keyboard index, for its option id. */
  itemIdx: number;
  /** Inside the palette's listbox (the row is then an `option`). */
  listbox: boolean;
  onHover?: () => void;
  /**
   * Opens the artist. Absent for a MusicBrainz-only act (no page yet): the row
   * is then Follow-only and its name half is not a control. U3's preview joins
   * here.
   */
  onNavigate?: (() => void) | undefined;
  /** Clerk's answer, `undefined` while it is still resolving. */
  isSignedIn: boolean | undefined;
  size: 'row' | 'rowWide';
  iconOnly: boolean;
  /** The typed query, lit in the name (B19). */
  query?: string;
}

export const ArtistResultRow = ({
  artist,
  sharedName,
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
  const follow = useArtistFollow(artist.slug, artist.following, artist.mbid);
  // A MusicBrainz-only act has no page, so its name half opens the preview
  // (addendum 13) instead of navigating. The preview reads this row's follow
  // state, so the row and the sheet never disagree.
  const [previewOpen, setPreviewOpen] = useState(false);
  const opensPreview = onNavigate === undefined && artist.slug === null;
  const openTarget = opensPreview ? () => setPreviewOpen(true) : onNavigate;

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

  const line = artistLine(artist, sharedName);

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
      <Target
        onNavigate={openTarget}
        rowProps={resultRowProps(listbox, itemIdx, selected)}
        style={{
          all: 'unset',
          cursor: openTarget ? 'pointer' : 'default',
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
          {follow.error ? (
            // The refusal replaces the second line and may wrap to two, so
            // the row grows rather than clipping the words (addendum 13 s2).
            <FollowErrorMessage
              error={follow.error}
              variant="row"
              style={{
                ...RESULT_META_STYLE,
                display: 'flex',
                whiteSpace: 'normal',
                overflow: 'visible',
              }}
            />
          ) : (
            <span style={RESULT_META_STYLE}>
              {line.kind === 'shows' && <ShowsMarker count={line.count} />}
              <span
                style={{
                  color:
                    line.kind === 'shows'
                      ? 'var(--fg-muted)'
                      : 'var(--fg-subtle)',
                }}
              >
                {line.text}
              </span>
            </span>
          )}
          <GenreChips genres={genres} maxChips={1} />
        </span>
      </Target>
      <FollowButton
        name={artist.name}
        {...(artist.slug === null ? {} : { slug: artist.slug })}
        following={follow.following}
        signedOut={signedOut}
        size={size}
        iconOnly={iconOnly}
        disabled={followErrorIsFinal(follow.error)}
        onToggle={resolving ? () => undefined : follow.toggle}
      />
      {opensPreview && previewOpen && (
        <ModalShell
          open
          onClose={() => setPreviewOpen(false)}
          ariaLabel={artist.name}
          sheetHeight="fit"
          desktopWidth={420}
        >
          <ArtistPreview
            artist={artist}
            following={follow.following}
            signedOut={signedOut}
            onToggle={resolving ? () => undefined : follow.toggle}
            error={follow.error}
            pageHref={
              follow.following && follow.slug ? `/artists/${follow.slug}` : null
            }
          />
        </ModalShell>
      )}
    </div>
  );
};
