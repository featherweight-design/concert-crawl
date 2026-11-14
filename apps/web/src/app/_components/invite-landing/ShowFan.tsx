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

// Each slot's side (-1, 0, 1) from the fan's centre, scaled by --fan-dx (a
// fraction of the card width), its drop and its tilt. The side cards sit behind
// and lower than the centre one. invite-320 draws fixed 165x216 cards, side
// centres at about 0.65 of the width and tops at 18px (left) and 21px (right):
// 0.109 and 0.127 of 165. The cards keep that size at 320 too; the board lets
// the side ones run off the screen edge (the fan clips them), and a smaller
// card would crowd the TONIGHT pill under the eye button.
const SLOT_POSE: Record<
  Slot,
  { side: number; dy: number; rotate: number; z: number }
> = {
  left: { side: -1, dy: 18 / 165, rotate: -9, z: 1 },
  centre: { side: 0, dy: 0, rotate: -2, z: 3 },
  right: { side: 1, dy: 21 / 165, rotate: 8, z: 2 },
};

/**
 * The cards are fixed dark on every theme, as invite-320 and inv-light draw
 * them: a photo card with a dark scrim, not a themed surface.
 */
const CARD_SCRIM =
  'linear-gradient(180deg, transparent 30%, rgba(5, 6, 15, 0.94))'; // fwd-allow-hex: board art colour
const CARD_FG = '#F4F6FF'; // fwd-allow-hex: board art colour
const CARD_FG_MUTED = '#C9D1E6'; // fwd-allow-hex: board art colour
// The chip, the TONIGHT pill and the eye button are dark on the dark themes
// (the values below) and light on Light (`inv-light`): the Light values come
// from the `--invite-*` variables `globals.css` sets under `data-theme='light'`.
const CHIP_BG = 'var(--invite-chip-bg, #171D3A)'; // fwd-allow-hex: board art colour
const CHIP_BORDER = 'var(--invite-chip-border, #1F2748)'; // fwd-allow-hex: board art colour
const CHIP_FG = 'var(--invite-chip-fg, #B8C2DA)'; // fwd-allow-hex: board art colour
export const TONIGHT_BG = 'var(--invite-tonight-bg, #FF7BD4)'; // fwd-allow-hex: board art colour
export const TONIGHT_FG = 'var(--invite-tonight-fg, #070A1A)'; // fwd-allow-hex: board art colour
const EYE_BG = 'var(--invite-eye-bg, rgba(7, 10, 26, 0.5))'; // fwd-allow-hex: board art colour
const EYE_BORDER = 'var(--invite-eye-border, #2C3661)'; // fwd-allow-hex: board art colour
const EYE_FG = 'var(--invite-eye-fg, #E8F3FF)'; // fwd-allow-hex: board art colour

const metaLine = (show: InviteShow): string =>
  [show.tonight ? COPY.tonight : show.dateShort, show.showTimeShort, show.venue]
    .filter((part) => part !== '')
    .join(' · ');

function FanCard({ show, slot }: { show: InviteShow; slot: Slot }) {
  const pose = SLOT_POSE[slot];
  const ring = genreColor(show.genre) ?? NEUTRAL_GENRE_COLOR;
  const centre = slot === 'centre';
  // The centre card carries a 2px ring in its genre colour, the sides a 1px
  // one at 60%; all three share a genre-tinted glow (invite-320 fan).
  const edgeShadow = centre
    ? `0 0 0 2px ${ring}`
    : `0 0 0 1px color-mix(in srgb, ${ring} 60%, transparent)`;
  const glow = `0 16px 36px color-mix(in srgb, ${ring} 30%, transparent)`;

  return (
    <div
      aria-hidden={!centre}
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        width: 'var(--fan-card-w)',
        aspectRatio: '165 / 216',
        transform: `translateX(calc(-50% + var(--fan-card-w) * var(--fan-dx) * ${pose.side}))translateY(calc(var(--fan-card-w) * ${pose.dy})) rotate(${pose.rotate}deg)`,
        zIndex: pose.z,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `${edgeShadow}, ${glow}`,
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
        data-fan-scrim
        style={{
          position: 'absolute',
          inset: 0,
          background: CARD_SCRIM,
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
            // Fixed on every theme: the pill sits on the dark card scrim, so
            // the themed --accent (which shifts on Light) would drift from
            // the board's #FF7BD4 on #070A1A.
            background: TONIGHT_BG,
            color: TONIGHT_FG,
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
            background: EYE_BG,
            border: `1px solid ${EYE_BORDER}`,
            color: EYE_FG,
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
              background: CHIP_BG,
              border: `1px solid ${CHIP_BORDER}`,
              color: CHIP_FG,
              fontSize: 9,
              maxWidth: '100%',
            }}
          >
            <GenreDot genre={show.genre} />
            {/* Two genres read "ALTERNATIVE / METAL" (`inv-mob`, `inv-desk`);
                the dot and the ring take the first. */}
            {show.genreExtra
              ? `${show.genre} / ${show.genreExtra}`
              : show.genre}
          </span>
        )}
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 900,
            fontSize: 'calc(var(--fan-card-w) * 0.085)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: CARD_FG,
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
            color: CARD_FG_MUTED,
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
      className="[--fan-card-w:165px] [--fan-dx:0.65] lg:[--fan-card-w:250px]"
      style={{
        position: 'relative',
        width: '100%',
        // invite-320 draws the 165px cards at every phone width and lets the
        // side ones run off the screen edge. `clip`, not `hidden`, so the
        // fan makes no scroll container and the tilted tops are not cut.
        overflowX: 'clip',
        // The board's 259px box for 216px cards: 1.57 of the width.
        height: 'calc(var(--fan-card-w) * 1.57)',
      }}
    >
      {placed.map(({ show, slot }) => (
        <FanCard key={show.id} show={show} slot={slot} />
      ))}
    </div>
  );
}
