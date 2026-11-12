// The artist page while it loads (B+ B10, board `06-states/bp-s-load_artist_m`).
// The stage keeps its real geometry, its back control and a quiet wash, so the
// page holds its shape when the data lands (README rule 9); only the data is a
// skeleton. Every block carries the one shared sweep, which holds still under
// reduced motion.
//
// One deliberate departure from the board: it draws a round portrait, which
// predates the tilted card the artist boards settled on. The skeleton draws
// the card, because a circle that turns into a 4:5 card is the layout shift
// rule 9 exists to prevent. Addendum 2 item 11 then drew it: 190 × 230 at −2.5°. Everything else is the board's: the name and line
// bars, the follow pill, the section label and three carded rows.
//
// This stands in for the ARTIST PAYLOAD only. The Spotify embed has its own
// loading clock: a third-party iframe must never hold the whole page grey.
import React from 'react';

import { BackChip } from '@/components/consumer/back-chip/BackChip';
import {
  ARTIST_CARD_RADIUS,
  ArtistBackdrop,
  ArtistStageShell,
} from '@/components/consumer/artist-page/ArtistStage';
import {
  AP_SKELETON_CARD,
  NF_FOLLOW_SIZES,
} from '@/components/consumer/artist-page/definitions/constants';
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy';
import { cardedEdge } from '@/components/consumer/event-row/lib/carded-edge';
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

/** A carded show row: the date tile, two lines, the price. Neutral edge. */
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
    <SkeletonBlock width={56} height={62} radius={12} />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SkeletonBlock width="70%" height={14} />
      <SkeletonBlock width="45%" height={10} />
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
          // Mobile is the board's 190 × 230; desktop has no board, so it keeps
          // filling the slot at 4:5.
          className="mx-auto h-[230px] w-[190px] md:aspect-[4/5] md:h-auto md:w-full"
          style={{
            transform: `rotate(${AP_SKELETON_CARD.tilt}deg)`,
            borderRadius: ARTIST_CARD_RADIUS,
            boxShadow: '0 0 0 1px var(--border-strong)',
            overflow: 'hidden',
          }}
        >
          <SkeletonBlock height="100%" radius={ARTIST_CARD_RADIUS} />
        </div>
      }
    >
      {/* Eyebrow, name, chips. Mobile centres them under the card; the
          column's own alignment does the rest. */}
      <div className="flex w-full flex-col items-center gap-3 md:items-start">
        <SkeletonBlock width={60} height={11} />
        <span className="block w-[min(230px,70%)] md:w-full md:max-w-[420px]">
          <SkeletonBlock height={36} radius={10} />
        </span>
        <SkeletonBlock width={130} height={20} radius={6} />
      </div>
    </ArtistStageShell>

    <div className="ap-shell">
      <div className="ap-block-follow md:hidden">
        <FollowSkeleton />
      </div>
      <div className="ap-history-card md:hidden">
        <SkeletonBlock width="85%" height={12} />
      </div>

      <div className="ap-grid">
        <div className="ap-block-shows">
          <div className="mb-[14px]">
            <SkeletonBlock width={140} height={16} />
          </div>
          <div className="flex flex-col gap-[10px]">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </div>
        {/* The framed player card. Desktop only: on mobile it sits below the
            fold, and the board stops at the rows. */}
        <div className="ap-block-player hidden md:block">
          <SkeletonBlock height={176} radius={16} />
        </div>
      </div>
    </div>
  </main>
);

export default ArtistLoading;
