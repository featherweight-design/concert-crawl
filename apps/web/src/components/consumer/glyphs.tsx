'use client';

import React from 'react';

// PendingDot
export const PendingDot = ({
  size = 7,
  filled = false,
  color = 'oklch(0.62 0.12 240)',
}: {
  size?: number;
  filled?: boolean;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 7 7" style={{ flexShrink: 0 }}>
    <circle
      cx="3.5"
      cy="3.5"
      r="2.6"
      fill={filled ? color : 'transparent'}
      stroke={color}
      strokeWidth="1.1"
    />
  </svg>
);

// LockGlyph
export const LockGlyph = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
    <rect
      x="2"
      y="4.5"
      width="6"
      height="4"
      rx="0.8"
      stroke="currentColor"
      strokeWidth="1.1"
    />
    <path
      d="M3.4 4.5V3.2A1.6 1.6 0 015 1.6a1.6 1.6 0 011.6 1.6V4.5"
      stroke="currentColor"
      strokeWidth="1.1"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

// CheckGlyph
export const CheckGlyph = ({
  size = 10,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
    <path
      d="M1.8 5.2L4 7.4 8.4 2.6"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ArrowGlyph
export const ArrowGlyph = ({
  size = 13,
  dir = 'right',
}: {
  size?: number;
  dir?: 'right' | 'left';
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}
  >
    <path
      d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// StarGlyph
export const StarGlyph = ({
  size = 10,
  color = 'oklch(0.66 0.14 78)',
}: {
  size?: number;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
    <path
      d="M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"
      fill={color}
    />
  </svg>
);

// Eyebrow
/**
 * The price cards' measured scale (more-p-price_states, at 4x): every drawn
 * price has a 25px cap height, which is Inter at 34px, and every TICKETS /
 * BOX OFFICE eyebrow is 9.5px mono at 0.14em.
 */
export const PRICE_HEADLINE_SIZE = 34;
export const PRICE_EYEBROW = { size: '9.5px', tracking: '0.14em' } as const;

export const Eyebrow = ({
  children,
  color = 'var(--fg-subtle)',
  size = '9px',
  tracking = '0.06em',
}: {
  children: React.ReactNode;
  color?: string;
  /** Defaults to the general eyebrow; the price cards pass PRICE_EYEBROW. */
  size?: string;
  tracking?: string;
}) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: size,
      color,
      letterSpacing: tracking,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

// TrustPill — the one price trust pill, shared by the live and pending price
// cards (addendum 4 item 5, price-states-age-trust). B+ styling: 19px tall,
// 0 7px 0 8px, radius 6, the kind's colour as a 1px edge at 50% over an 8%
// fill, mono 9.5px bold caps at 0.08em. Community is the theme's signal,
// Resale its danger and Box office its warning gold, as the board draws them;
// the text runs through the AA-safe --price-text-* tokens (globals.css).
const TRUST_PILL = {
  community: { tone: 'var(--signal)', text: 'var(--price-text-signal)' },
  resale: { tone: 'var(--danger)', text: 'var(--price-text-danger)' },
  boxoffice: { tone: 'var(--warning)', text: 'var(--price-text-warning)' },
} as const;

export const TrustPill = ({
  kind,
}: {
  kind: 'community' | 'boxoffice' | 'resale';
}) => {
  const { tone, text } = TRUST_PILL[kind];
  const isBox = kind === 'boxoffice';
  const label =
    kind === 'boxoffice'
      ? 'Box office'
      : kind === 'resale'
        ? 'Resale'
        : 'Community';
  return (
    <span
      data-testid={`trust-pill-${kind}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '19px',
        boxSizing: 'border-box',
        padding: '0 7px 0 8px',
        borderRadius: '6px',
        border: `1px solid color-mix(in oklab, ${tone} 50%, transparent)`,
        background: `color-mix(in oklab, ${tone} 8%, transparent)`,
        color: text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '9.5px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {isBox && <StarGlyph size={8} color={text} />}
      {label}
    </span>
  );
};

/** The pending cards' former name for the shared TrustPill. */
export const PendingTrustPill = TrustPill;

// TierMark
// Property table §primitives lines 42-63. The boxoffice star intentionally uses
// an inline 12×12 viewBox SVG with a fuller star path — it is NOT the shipped
// 10×10 `StarGlyph` above. The two stars coexist intentionally: `StarGlyph` is
// the chip-scale glyph used by `MT_ListChip` and pending cards, while
// `TierMark` carries a slightly fuller star sized for the eyebrow surface.
const TIER_COLOR = {
  boxoffice: 'oklch(0.66 0.14 78)',
  resale: 'oklch(0.65 0.20 25)',
  community: 'oklch(0.62 0.12 240)',
} as const;

const TIER_MARK_STAR_PATH =
  'M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z';

export interface TierMarkProps {
  kind: 'boxoffice' | 'resale' | 'community';
  glyph?: boolean;
  children: React.ReactNode;
}

export const TierMark = ({ kind, glyph = false, children }: TierMarkProps) => {
  const color = TIER_COLOR[kind];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 7px',
        borderRadius: '4px',
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 50%, transparent)`,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '9px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {kind === 'boxoffice' && glyph && (
        <svg
          width={9}
          height={9}
          viewBox="0 0 12 12"
          fill={color}
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <path d={TIER_MARK_STAR_PATH} />
        </svg>
      )}
      {children}
    </span>
  );
};
