'use client';

import { Eye, Star } from 'lucide-react';
import { EventImage } from '@/components/consumer/event-image';
import { GenreDot } from '@/components/consumer/GenreDot';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { LANDING_COPY } from '../definitions/copy';
import type { InviteShow } from './definitions/types';
import { MONO_CAPS } from './definitions/styles';

const COPY = LANDING_COPY.invite;

type Slot = 'left' | 'centre' | 'right';

// Each slot's offset from the fan's centre, as a fraction of the card width,
// and its tilt. The side cards sit behind and lower than the centre one.
const SLOT_POSE: Record<
  Slot,
  { dx: number; dy: number; rotate: number; z: number }
> = {
  left: { dx: -0.62, dy: 0.1, rotate: -8, z: 1 },
  centre: { dx: 0, dy: 0, rotate: 0, z: 3 },
  right: { dx: 0.62, dy: 0.12, rotate: 8, z: 2 },
};

const metaLine = (show: InviteShow): string =>
  [show.tonight ? COPY.tonight : show.dateShort, show.showTime, show.venue]
    .filter((part) => part !== '')
    .join(' · ');

function FanCard({ show, slot }: { show: InviteShow; slot: Slot }) {
  const pose = SLOT_POSE[slot];
  const ring = genreColor(show.genre) ?? NEUTRAL_GENRE_COLOR;
  const centre = slot === 'centre';
  const edge = centre ? 'var(--warning)' : ring;

  return (
    <div
      aria-hidden={!centre}
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        width: 'var(--fan-card-w)',
        aspectRatio: '3 / 4',
        transform: `translateX(calc(-50% + var(--fan-card-w) * ${pose.dx})) translateY(calc(var(--fan-card-w) * ${pose.dy})) rotate(${pose.rotate}deg)`,
        zIndex: pose.z,
        borderRadius: 16,
        overflow: 'hidden',
        border: `2px solid ${edge}`,
        boxShadow: `0 24px 60px -24px ${edge}, 0 18px 40px var(--shadow-strong)`,
        background: 'var(--surface-1)',
      }}
    >
      <EventImage
        src={show.imageUrl}
        artistPhotoUrl={show.artistPhotoUrl}
        alt={show.artist}
        artist={show.artist}
        identityScale="tile"
        // Never `fill`: that switches EventImage to next/image, and
        // next.config allows no remote hosts, so a venue image from any CDN
        // (Ticketmaster's, for one) crashed the whole landing. The plain
        // <img> branch is what every other surface uses.
        className="absolute inset-0 h-full w-full"
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, transparent 40%, var(--scrim) 72%, var(--bg) 100%)',
        }}
      />
      {centre && show.tonight && (
        <span
          style={{
            ...MONO_CAPS,
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 9px',
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--fg-on-accent)',
            fontSize: 9.5,
          }}
        >
          <Star size={9} aria-hidden fill="currentColor" />
          {COPY.tonight}
        </span>
      )}
      {centre && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--scrim)',
            border: '1px solid var(--border-strong)',
            color: 'var(--fg)',
          }}
        >
          <Eye size={14} />
        </span>
      )}
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {show.genre && (
          <span
            style={{
              ...MONO_CAPS,
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'var(--scrim)',
              color: 'var(--fg)',
              fontSize: 9,
              maxWidth: '100%',
            }}
          >
            <GenreDot genre={show.genre} />
            {show.genre}
          </span>
        )}
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 900,
            fontSize: 'calc(var(--fan-card-w) * 0.085)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {show.artist}
        </span>
        <span
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            letterSpacing: '0.08em',
            color: 'var(--fg-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {metaLine(show)}
        </span>
      </div>
    </div>
  );
}

/**
 * Three tilted show cards, the centre one a show playing tonight when there is
 * one. Decoration of the pitch, not navigation: before launch nothing on this
 * page may link into the gated browse surface, so the cards are not links.
 */
export function ShowFan({ shows }: { shows: InviteShow[] }) {
  // Shows arrive in date order, so the first is tonight's whenever one is.
  const [centre, ...rest] = shows;
  if (centre === undefined) return null;
  const sides = rest.slice(0, 2);
  const placed: { show: InviteShow; slot: Slot }[] = [
    ...(sides[0] ? [{ show: sides[0], slot: 'left' as const }] : []),
    ...(sides[1] ? [{ show: sides[1], slot: 'right' as const }] : []),
    { show: centre, slot: 'centre' },
  ];

  return (
    <div
      className="[--fan-card-w:min(46vw,220px)] md:[--fan-card-w:250px]"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(var(--fan-card-w) * 1.5)',
      }}
    >
      {placed.map(({ show, slot }) => (
        <FanCard key={show.id} show={show} slot={slot} />
      ))}
    </div>
  );
}
