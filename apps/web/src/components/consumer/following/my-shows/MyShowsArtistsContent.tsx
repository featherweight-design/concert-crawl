'use client';

// My shows ▸ Artists — the third sub-tab (native following, PR 6).
//
// Mobile is a full-bleed list; desktop is a 940px column with a two-up card
// grid and the two actions promoted into the group-heading row. Both ship in
// this component, and the list body is the only part that forks — everything
// above it (tabs, headings, footnote, empty state) is shared, so the two can
// only diverge in box, never in what they say.
//
// Following is free on every signed-in plan, so nothing on this surface is
// gated: a follow or re-follow that fails just rolls back.

import { useEffect, useMemo, useState } from 'react';
import { SearchLink } from '@/components/consumer/search-palette/SearchLink';
import type { FollowedArtist } from '@concert-crawl/types';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { SpotifyLogo } from '@/components/brand/spotify-logo/SpotifyLogo';
import { useMyShowsArtistCount } from '@/components/consumer/history/MyShowsShell';
import { MY_SHOWS_CTA_GRADIENT } from '@/components/consumer/history/definitions/constants';
import { SHELF_NARROW_QUERY } from '@/components/consumer/following/definitions/constants';
import { ArtistManageRow } from './ArtistManageRow';
import { AlertsRow } from './AlertsRow';
import { ArtistsEmpty } from './ArtistsEmpty';
import { Mono } from './Mono';
import { GlyphSearch } from './Glyphs';
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy';
import { groupFollows, spotifyFollowCount } from './lib/group-follows';

const COPY = MY_SHOWS_ARTISTS_COPY;

interface MyShowsArtistsContentProps {
  /**
   * `undefined` means the fetch failed, which is NOT the same as zero. Showing
   * "nobody on your list" to someone who follows fifty artists is the one
   * mistake this surface must never make.
   */
  artists: FollowedArtist[] | undefined;
}

export const MyShowsArtistsContent = ({
  artists,
}: MyShowsArtistsContentProps) => {
  const { enabled: spotifyEnabled } = useFeatureFlag('spotify-sync');
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(SHELF_NARROW_QUERY);
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const follows = useMemo(() => artists ?? [], [artists]);
  const groups = useMemo(() => groupFollows(follows), [follows]);
  const spotifyCount = useMemo(() => spotifyFollowCount(follows), [follows]);
  // The shared tab bar draws it on the Artists tab. A failed read has no count.
  useMyShowsArtistCount(artists === undefined ? undefined : follows.length);

  // The fetch failed. Deliberately NOT the empty state: "nobody on your list"
  // is a claim about the account, and we are not in a position to make it.
  if (artists === undefined) {
    return (
      <main className="flex w-full flex-1 flex-col">
        <p
          className="text-fg-muted"
          style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 24 }}
        >
          {COPY.error}
        </p>
      </main>
    );
  }

  if (follows.length === 0) {
    return (
      <main className="flex w-full flex-1 flex-col">
        <div className="flex flex-1 flex-col lg:hidden">
          <ArtistsEmpty />
        </div>
        <div className="hidden flex-1 flex-col lg:flex">
          <ArtistsEmpty desktop />
        </div>
      </main>
    );
  }

  const datedHeading = COPY.groups.dated(groups.dated.length);
  const undatedHeading = COPY.groups.undated(groups.undated.length);

  // Both densities promote this into whichever group heading renders first, as
  // the B+ boards draw it (`bp-artists`, `bp-m-artists_m`). It used to live
  // only in the dated row, which stranded it for anyone whose follows all lack
  // a date — the one state where finding artists matters most.
  //
  // Alerts is NOT here. It shipped as a second dense button beside this one,
  // pointing at the same place as the AlertsRow and carrying none of
  // that row's live "push on · digest off" readout, so desktop offered the
  // control twice and the state zero times.
  const findPill = (
    <SearchLink
      className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={densePrimary}
    >
      <GlyphSearch size={13} />
      {COPY.find.title}
    </SearchLink>
  );

  // Moves with the per-row SourceMark: the footnote's reassurance only makes
  // sense beside rows that say where they came from, so neither is shown
  // without the other.
  const spotifyNote = spotifyEnabled && spotifyCount > 0 && (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <SpotifyLogo size={14} />
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: 12,
          color: 'var(--fg-muted)',
          lineHeight: 1.4,
        }}
      >
        {COPY.spotifyFootnote(spotifyCount)}
      </p>
    </div>
  );

  // Both densities carry these ABOVE the list. Trailing it put the surface's
  // only notification affordance below however many follows the viewer had,
  // which for a long list meant it was never seen at all.
  const meta = (
    <div
      className="flex flex-col gap-2.5"
      style={{ marginTop: 16, marginBottom: 4 }}
    >
      <AlertsRow />
      {spotifyNote}
    </div>
  );

  return (
    // One landmark, two densities. The responsive wrappers are plain divs
    // because a page gets a single <main>, and landmark navigation still walks
    // a CSS-hidden one.
    <main className="flex w-full flex-1 flex-col">
      {/* Mobile: a list of cards (B+), so it no longer bleeds to the edge. */}
      <div
        data-testid="my-shows-artists-mobile"
        className="w-full flex-1 lg:hidden"
      >
        {meta}
        <div>
          {groups.dated.length > 0 && (
            <>
              <div
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
                style={{ padding: '13px 2px 10px' }}
              >
                <Mono as="h2" size={9.5}>
                  {datedHeading}
                </Mono>
                {findPill}
              </div>
              <div className="flex flex-col gap-2.5">
                {groups.dated.map((artist) => (
                  <ArtistManageRow
                    key={artist.canonicalName}
                    artist={artist}
                    narrow={narrow}
                  />
                ))}
              </div>
            </>
          )}
          {groups.undated.length > 0 && (
            <>
              <div
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
                style={{ padding: '22px 2px 10px' }}
              >
                <Mono as="h2" size={9.5}>
                  {undatedHeading}
                </Mono>
                {groups.dated.length === 0 && findPill}
              </div>
              <div className="flex flex-col gap-2.5">
                {groups.undated.map((artist) => (
                  <ArtistManageRow
                    key={artist.canonicalName}
                    artist={artist}
                    narrow={narrow}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop: the shared My shows column, two-up cards, actions in the heading row.
          DELTA vs the handoff, which draws three-up: the handoff's card carries
          an `sm` ICON-ONLY control, and this one deliberately keeps the
          labelled `md` button (see ArtistManageRow's header). A labelled
          control costs ~110px, which left a three-up cell 285px wide and
          ellipsised the artist NAME — the Gate 5 walk caught "Tame I…" at
          1280px against "Tame Impala" rendering in full at 390px, so desktop
          was truncating what mobile showed. Two-up gives the cell 434px. */}
      <div
        data-testid="my-shows-artists-desktop"
        className="hidden w-full flex-1 lg:block"
      >
        {/* No page title: the active sub-tab above already reads "Artists",
            and the sibling Watching and Concerts tabs ship none either. */}
        {meta}

        {groups.dated.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Mono as="h2" size={10}>
                {datedHeading}
              </Mono>
              {findPill}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {groups.dated.map((artist) => (
                <ArtistManageRow
                  key={artist.canonicalName}
                  artist={artist}
                  variant="card"
                />
              ))}
            </div>
          </>
        )}

        {groups.undated.length > 0 && (
          <>
            <div
              className="flex items-center justify-between gap-3"
              style={{ margin: '26px 0 12px' }}
            >
              <Mono as="h2" size={10}>
                {undatedHeading}
              </Mono>
              {groups.dated.length === 0 && findPill}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {groups.undated.map((artist) => (
                <ArtistManageRow
                  key={artist.canonicalName}
                  artist={artist}
                  variant="card"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const denseButton = {
  minHeight: 40,
  padding: '10px 14px',
  borderRadius: 10,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 13,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
} as const;

// B+ (`bp-artists`): the find action is a gradient rounded rectangle, radius
// about 10, with a signal glow (not a full pill).
const densePrimary = {
  ...denseButton,
  background: MY_SHOWS_CTA_GRADIENT,
  color: 'var(--fg-on-accent)',
  border: '1px solid transparent',
  borderRadius: 10,
  boxShadow: '0 8px 24px -10px var(--signal)',
  fontWeight: 800,
};
