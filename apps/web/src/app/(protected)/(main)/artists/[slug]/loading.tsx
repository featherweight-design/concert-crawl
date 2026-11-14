// The artist page while it loads (B+ B10, board `06-states/bp-s-load_artist_m`).
// The stage keeps its real geometry, its back control and a quiet wash, so the
// page holds its shape when the data lands (README rule 9); only the data is a
// skeleton. Every block carries the one shared sweep, which holds still under
// reduced motion.
//
// One deliberate departure from the board: it draws a round portrait, which
// predates the tilted card the artist boards settled on. The skeleton draws
// the card, because a circle that turns into a 4:5 card is the layout shift
// rule 9 exists to prevent. Addendum 3 settled it as the loaded card exactly
// (200 × 250 at −2° on mobile, the same radius and outline, on desktop too),
// so it reads the loaded card's own ratio and frame rather than its own
// numbers. Everything else is addendum 2's board `11-artist-skeleton/
// load-artist-m`: the eyebrow and name bars, two genre-chip pills, the follow
// pill and its line, the history block, the section label and two carded rows
// of three lines each.
//
// This stands in for the ARTIST PAYLOAD only. The Spotify embed has its own
// loading clock: a third-party iframe must never hold the whole page grey.
import React from 'react';

import { BackChip } from '@/components/consumer/back-chip/BackChip';
import {
  ARTIST_CARD_RADIUS,
  ARTIST_CARD_RATIO,
  ArtistBackdrop,
  ArtistStageShell,
  artistCardFrame,
} from '@/components/consumer/artist-page/ArtistStage';
import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants';
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy';
import { cardedEdge } from '@/components/consumer/event-row/lib/carded-edge';
import { MONTH_TILE_SIZE } from '@/components/consumer/events-list/DayTile';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

const FOLLOW = NF_FOLLOW_SIZES.primary;

/** The follow pill and the one line under it, at the real control's height. */
const FollowSkeleton = () => (
  <div className="flex flex-col items-center gap-2">
    <SkeletonBlock height={FOLLOW.height} radius={FOLLOW.radius} />
    <SkeletonBlock width="70%" height={11} />
  </div>
);

/**
 * A carded show row: the date tile, three lines (venue, time, and the short
 * third bar the board draws), the price. Neutral edge. The line widths are the
 * board's (`11-artist-skeleton/load-artist-m`: 137, 97 and 64px of a ~235px
 * column at 390), as fractions so a 320 column scales them rather than
 * overflowing. The tile stays the loaded row's tile so nothing shifts (rule 9).
 */
const RowSkeleton = () => (
  <div
    data-testid="artist-row-skeleton"
    className="flex items-center border border-border bg-surface-1"
    style={{
      ...cardedEdge(NEUTRAL_GENRE_COLOR),
      gap: 12,
      padding: '12px 12px 12px 14px',
    }}
  >
    <span
      data-testid="artist-row-skeleton-tile"
      className={`block shrink-0 ${MONTH_TILE_SIZE}`}
    >
      <SkeletonBlock height="100%" radius={12} />
    </span>
    <div
      data-testid="artist-row-skeleton-lines"
      className="flex min-w-0 flex-1 flex-col gap-2"
    >
      <SkeletonBlock width="58%" height={13} />
      <SkeletonBlock width="41%" height={10} />
      <SkeletonBlock width="27%" height={15} radius={6} />
    </div>
    <SkeletonBlock width={30} height={12} radius={999} />
  </div>
);

const ArtistLoading = () => (
  <main className="ap-page" data-testid="artist-skeleton" aria-busy="true">
    <span role="status" className="sr-only">
      {ARTIST_COPY.loadingArtist}
    </span>
    <ArtistStageShell
      backdrop={<ArtistBackdrop />}
      back={<BackChip inline fallbackHref="/events" />}
      aside={<FollowSkeleton />}
      card={
        <div
          data-testid="stage-card-skeleton"
          // Fills the same slot at the same ratio as the loaded card, wearing
          // the ring an ungenred artist's card wears, so nothing moves when
          // the data lands.
          style={{
            ...artistCardFrame(NEUTRAL_GENRE_COLOR),
            aspectRatio: ARTIST_CARD_RATIO,
          }}
        >
          <SkeletonBlock height="100%" radius={ARTIST_CARD_RADIUS} />
        </div>
      }
    >
      {/* Eyebrow, name, chips. Mobile centres them under the card; the
          column's own alignment does the rest. */}
      <div className="flex w-full flex-col items-center gap-3 lg:items-start">
        <SkeletonBlock width={60} height={11} />
        <span className="block w-[min(230px,70%)] lg:w-full lg:max-w-[420px]">
          <SkeletonBlock height={36} radius={10} />
        </span>
        {/* Two genre-chip pills, as the board draws them (92 and 76 × 24). */}
        <div data-testid="genre-chip-skeletons" className="flex gap-1.5">
          <SkeletonBlock width={92} height={24} radius={999} />
          <SkeletonBlock width={76} height={24} radius={999} />
        </div>
      </div>
    </ArtistStageShell>

    <div className="ap-shell">
      <div className="ap-block-follow lg:hidden">
        <FollowSkeleton />
      </div>
      {/* The board draws the history card as one filled block, 40 tall. */}
      <div className="mt-[18px] lg:hidden">
        <SkeletonBlock height={40} radius={14} />
      </div>

      <div className="ap-grid">
        <div className="ap-block-shows">
          <div className="mb-[14px]">
            <SkeletonBlock width={170} height={16} radius={8} />
          </div>
          <div className="flex flex-col gap-[10px]">
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </div>
        {/* The framed player card. Desktop only: on mobile it sits below the
            fold, and the board stops at the rows. */}
        <div className="ap-block-player hidden lg:block">
          <SkeletonBlock height={176} radius={16} />
        </div>
      </div>
    </div>
  </main>
);

export default ArtistLoading;
