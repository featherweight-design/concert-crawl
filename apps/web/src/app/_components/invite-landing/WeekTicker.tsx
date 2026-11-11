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
      {show.genre && <GenreDot genre={show.genre} />}
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
 * twice so a half-width loop reads as continuous; under reduced motion it
 * holds still and the second copy is hidden from assistive tech either way.
 */
export function WeekTicker({ shows }: { shows: InviteShow[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animation = runMotion(
      trackRef.current,
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
      {
        duration: Math.max(shows.length, 1) * MS_PER_ITEM,
        easing: 'linear',
        iterations: Infinity,
      },
    );
    return () => animation?.cancel();
  }, [shows.length]);

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
          {shows.map((show) => (
            <TickerItem key={show.id} show={show} />
          ))}
          <span aria-hidden style={{ display: 'inline-flex' }}>
            {shows.map((show) => (
              <TickerItem key={`${show.id}-loop`} show={show} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
