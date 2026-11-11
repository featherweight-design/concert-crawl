'use client';

import { useEffect, useRef } from 'react';
import { GenreDot } from '@/components/consumer/GenreDot';
import { runMotion } from '@/lib/motion';
import { LANDING_COPY } from '../definitions/copy';
import type { InviteShow } from './definitions/types';
import { MONO_CAPS } from './definitions/styles';

const COPY = LANDING_COPY.invite;

// A fixed design timeline rather than a token: the ticker is a slow ambient
// drift, measured per item so a longer week does not scroll faster.
const MS_PER_ITEM = 4000;

// Each half of the loop holds at least this many items, so even a quiet week
// is wider than the strip and the loop never shows a gap.
const MIN_ITEMS_PER_HALF = 8;

/** The strip only shows from `md` up; below it nothing animates. */
const TICKER_VIEWPORT_QUERY = '(min-width: 768px)';

function TickerItem({ show }: { show: InviteShow }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 10,
        paddingRight: 36,
        whiteSpace: 'nowrap',
      }}
    >
      {show.genre && (
        <>
          <GenreDot genre={show.genre} />
          <span className="sr-only">{show.genre}</span>
        </>
      )}
      {show.showTime !== '' && (
        <span
          style={{
            ...MONO_CAPS,
            letterSpacing: '0.08em',
            color: 'var(--fg-muted)',
          }}
        >
          {show.showTime}
        </span>
      )}
      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--fg)' }}>
        {show.artist}
      </span>
      <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
        {show.venue}
      </span>
    </span>
  );
}

/**
 * The desktop footer strip: this week's shows drifting past. The list is drawn
 * twice (and repeated within each half for a quiet week) so a half-width loop
 * reads as continuous. Under reduced motion, or below `md`, it holds still;
 * every repeat is hidden from assistive tech, so each show is read once.
 */
export function WeekTicker({ shows }: { shows: InviteShow[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const half =
    shows.length === 0
      ? []
      : Array.from(
          { length: Math.ceil(MIN_ITEMS_PER_HALF / shows.length) },
          () => shows,
        ).flat();

  useEffect(() => {
    if (
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia(TICKER_VIEWPORT_QUERY).matches
    )
      return;
    const animation = runMotion(
      trackRef.current,
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
      {
        duration: Math.max(half.length, 1) * MS_PER_ITEM,
        easing: 'linear',
        iterations: Infinity,
      },
    );
    return () => animation?.cancel();
  }, [half.length]);

  if (shows.length === 0) return null;

  return (
    <div
      className="hidden md:flex"
      style={{
        alignItems: 'center',
        gap: 28,
        padding: '18px 48px',
        borderTop: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <span style={{ ...MONO_CAPS, color: 'var(--signal)', flexShrink: 0 }}>
        {COPY.ticker}
      </span>
      <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <div
          ref={trackRef}
          style={{ display: 'inline-flex', width: 'max-content' }}
        >
          {half.map((show, index) => (
            <span
              key={`${show.id}-${index}`}
              aria-hidden={index >= shows.length}
              style={{ display: 'inline-flex' }}
            >
              <TickerItem show={show} />
            </span>
          ))}
          <span aria-hidden style={{ display: 'inline-flex' }}>
            {half.map((show, index) => (
              <TickerItem key={`${show.id}-loop-${index}`} show={show} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
