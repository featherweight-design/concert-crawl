'use client';

import { nfLocked } from '@concert-crawl/entitlements';
import type { ArtistDetailResponse } from '@concert-crawl/types';
import React, { useCallback, useRef, useState } from 'react';

import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants';
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy';
import { usePlanState } from '@/lib/queries/use-plan-state';
import { useTheme } from '@/theme';

import { GenreChips } from '@/components/consumer/GenreChips';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

import { BackChip } from '../back-chip/BackChip';

import {
  AP_BAND_H,
  AP_STICKY_BAR_H,
  CRAWL_SINCE,
} from './definitions/constants';
import { ARTIST_COPY } from './definitions/copy';
import { ArtistReportCard } from './ArtistReportCard';
import { ArtistShareButton } from './ArtistShareButton';
import { ArtistStage } from './ArtistStage';
import { artistGenres } from './lib/artist-genres';
import { ArtistEmbed } from './embed/ArtistEmbed';
import { EmptyUpcoming } from './EmptyUpcoming';
import { FollowBlock } from './FollowBlock';
import { historyLine } from './lib/history-line';
import { useArtistFollow } from './lib/use-artist-follow';
import {
  useIsDesktop,
  useMeasuredHeight,
  useScrolledPast,
} from './lib/use-viewport';
import { PastShows } from './PastShows';
import { StickyBar } from './StickyBar';
import { UpcomingShows } from './UpcomingShows';

/**
 * ONE responsive component, not two trees (B+ B10, `09-artist`). Built like the
 * event page: a washed stage with the tilted portrait card, then the shows.
 *
 * ORDER, on both viewports, is the board's: Upcoming first, then the player,
 * then Previously, then the wrong-artist card at the foot. Desktop lifts the
 * player into a side column with CSS grid (`.ap-grid`), so the DOM order and
 * the tab order stay the mobile reading order.
 *
 * EXACTLY ONE LIVE FOLLOW AFFORDANCE, always, enforced here in code rather
 * than by convention. The viewport decision is made in JS (`useIsDesktop`) and
 * only one slot is ever rendered:
 *   desktop  → the stage's right-hand slot, for the whole visit
 *   mobile   → the block under the stage, for the whole visit. It is not
 *              sticky (addendum 2, item 27): the sub-header that arrives past
 *              the stage carries back and the name only.
 * The empty-upcoming block is copy only now: the follow sits above it on
 * every viewport, so it never needs its own.
 *
 * The `<h1>` sits in the stage on both viewports, so it renders once. The
 * history line is placed by `isDesktop` like the follow: in the stage column
 * on desktop, in its own card under the follow on mobile.
 */
export const ArtistPageContent = ({
  data,
  scaRegion = false,
  olderHref,
}: {
  data: ArtistDetailResponse;
  scaRegion?: boolean;
  /** "Show older" target: the next past-shows window; absent when none. */
  olderHref?: string | undefined;
}) => {
  const { artist, shows, past, history } = data;
  const hasShows = shows.length > 0;
  const genres = artistGenres(shows);
  // The lead bucket's color. Every bucket owns a token, so `find` only falls
  // through to the neutral ring when there are no genres at all.
  const ring = genres.map(genreColor).find(Boolean) ?? NEUTRAL_GENRE_COLOR;

  // `null` is the API's word for "nobody is signed in" — distinct from `false`,
  // which is a real signed-in user who does not follow this artist.
  const signedOut = data.following === null;
  const { data: planState } = usePlanState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const openUpgrade = useCallback(() => setPickerOpen(true), []);
  const { following, toggle } = useArtistFollow(
    artist.slug,
    data.following ?? false,
    openUpgrade,
  );

  const isDesktop = useIsDesktop();
  // Measured, not assumed: the stage's height follows the card and the name's
  // wrap, so a fixed threshold would bring the bar up over a stage still on
  // screen.
  const bandRef = useRef<HTMLDivElement>(null);
  const bandHeight = useMeasuredHeight(bandRef, AP_BAND_H);
  const scrolled = useScrolledPast(bandHeight - AP_STICKY_BAR_H);
  const { theme } = useTheme();

  // ONE gate, asked once, passed down. `nfLocked` takes the plan state rather
  // than a tier string because `roleComped` is an override the matrix does not
  // encode — never test `plan === 'free'` here.
  //
  // Undefined while the plan is still resolving, and `false` is the right
  // answer for that window: a locked skin that appears a beat after paint is a
  // worse lie than a live button whose 403 opens the same picker (which is what
  // `openUpgrade` already handles).
  //
  // `&& !following` is the downgrade case, and it is load-bearing: downgrading
  // never deletes follows, and DELETE is unentitled by design so the user can
  // always undo one. Gating on the plan alone would draw the locked skin over
  // an existing follow and strand it.
  const locked =
    !signedOut && planState !== undefined && nfLocked(planState) && !following;

  const followProps = {
    name: artist.name,
    following,
    signedOut,
    locked,
    onToggle: toggle,
    onLockedTap: openUpgrade,
  };

  // Follow stays under the hero on mobile and scrolls away with it
  // (addendum 2, item 27); desktop keeps it in the stage.
  const inlineFollow = !isDesktop;

  const historyText = historyLine(history, CRAWL_SINCE);
  const historyNode = (
    <p className="ap-history">
      <span aria-hidden="true" className="ap-history-dot" />
      <span>{historyText}</span>
    </p>
  );

  // The dashed note under the rows. Signed out and locked cannot be
  // following, so they read the invitation.
  const upcomingNote =
    following && !locked && !signedOut
      ? ARTIST_COPY.upcomingNoteFollowing
      : ARTIST_COPY.upcomingNote;

  // Ends the main column on both viewports. Keyed on the artist and the loaded
  // report so the card's own state resets when either changes rather than
  // going stale.
  const reportCard = (
    <ArtistReportCard
      key={`${artist.slug}:${data.myOpenReport?.id ?? ''}`}
      slug={artist.slug}
      name={artist.name}
      photoUrl={artist.photoUrl}
      match={data.match}
      myOpenReport={data.myOpenReport}
      signedOut={signedOut}
    />
  );

  return (
    <main className="ap-page" aria-label={ARTIST_COPY.pageAria(artist.name)}>
      <StickyBar name={artist.name} visible={!isDesktop && scrolled} />

      <div ref={bandRef}>
        <ArtistStage
          name={artist.name}
          photoUrl={artist.photoUrl}
          ring={ring}
          back={<BackChip inline fallbackHref="/events" />}
          actions={<ArtistShareButton slug={artist.slug} name={artist.name} />}
          aside={isDesktop ? <FollowBlock {...followProps} /> : null}
        >
          <p className="ap-eyebrow">{ARTIST_COPY.eyebrow}</p>
          <h1 className="ap-name">{artist.name}</h1>
          <GenreChips genres={genres} className="ap-genres" />
          {isDesktop ? historyNode : null}
        </ArtistStage>
      </div>

      <div className="ap-shell">
        {inlineFollow ? (
          <div className="ap-block-follow">
            <FollowBlock {...followProps} />
          </div>
        ) : null}
        {isDesktop ? null : (
          <div className="ap-history-card">{historyNode}</div>
        )}

        <div className="ap-grid">
          <div className="ap-block-shows">
            {hasShows ? (
              <UpcomingShows
                name={artist.name}
                photoUrl={artist.photoUrl}
                shows={shows}
                note={upcomingNote}
              />
            ) : (
              <EmptyUpcoming {...followProps} inlineFollow={false} />
            )}
          </div>

          <div className="ap-block-player">
            <ArtistEmbed
              name={artist.name}
              spotifyArtistId={artist.spotifyArtistId}
              // Past the player to whatever follows it in the reading order.
              skipTo={past.length > 0 ? 'previously' : 'artist-report'}
              themeKey={theme}
            />
          </div>

          {/* The wrapper carries the top margin, so it has to disappear with
              its contents — an empty `.ap-block-past` leaves a gap. */}
          {past.length > 0 ? (
            <div id="previously" className="ap-block-past">
              <PastShows name={artist.name} past={past} olderHref={olderHref} />
            </div>
          ) : null}

          <div id="artist-report" className="ap-block-report">
            {reportCard}
          </div>
        </div>
      </div>

      {/* Following is Premium. This one sheet serves both routes into the
          upgrade: a locked tap (which never issues a request) and the 403 a
          request gets when the plan resolved late or lapsed mid-session. */}
      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry="paywall"
      />
    </main>
  );
};
