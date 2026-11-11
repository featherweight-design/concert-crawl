import { forwardRef, type ReactNode } from 'react';
import { EVENT_ROW_COPY } from './definitions/copy';

/**
 * The row's only chip. Five ad-hoc pills used to compete on size, radius and
 * case, which is how the meta line stopped reading as one row of peers. Size,
 * radius, type and spacing are fixed here; tone is the only variable.
 */

export type ChipTone =
  'neutral' | 'strong' | 'warn' | 'signal' | 'accent' | 'danger' | 'success';

// Tinted rather than solid-bordered: a full-strength rule around a 9.5px chip
// out-shouts the label it frames.
const tint = (token: string, fill: number) => ({
  color: `var(${token})`,
  background: `color-mix(in oklch, var(${token}) ${fill}%, transparent)`,
  border: `color-mix(in oklch, var(${token}) 42%, transparent)`,
});

// Every tone shares the chip's size, radius and type and differs only in color:
// a neutral surface for neutral and strong, a tint of its own token for the
// rest. So they read as one family under all nine themes rather than as
// differently-shaped badges.
const TONE: Record<
  ChipTone,
  { color: string; background: string; border: string }
> = {
  neutral: {
    color: 'var(--fg-muted)',
    background: 'var(--surface-2)',
    border: 'var(--border)',
  },
  // The Following chip. Box office used to borrow it; B+ draws box office and
  // resale neutral (`04-genre-and-vibe/bp-chips-all`).
  strong: {
    color: 'var(--fg)',
    background: 'var(--surface-3)',
    border: 'var(--border-strong)',
  },
  warn: tint('--warning', 10),
  signal: tint('--signal', 9),
  // The B+ status set (rule 3): sold out, cancelled and tickets available.
  accent: tint('--accent', 10),
  danger: tint('--danger', 10),
  success: tint('--success', 9),
};

export interface RowMetaChipProps {
  label: string;
  tone?: ChipTone;
  /** Replaces the visible label for screen readers, rather than adding to it. */
  srLabel?: string | undefined;
  hidden?: boolean | undefined;
  /** Leading glyph. Trims the left padding so the mark sits on the same rhythm. */
  icon?: ReactNode;
  /** Rendered after a dimmed separator. Absent when the caller collapsed the pair. */
  secondaryLabel?: string | undefined;
  /** Read after the label, for meaning the visible chip stopped carrying. */
  srSuffix?: string | undefined;
  /** A status still waiting on confirms draws a dashed edge (B+ rule 3). */
  dashed?: boolean | undefined;
}

export const RowMetaChip = forwardRef<HTMLSpanElement, RowMetaChipProps>(
  function RowMetaChip(
    {
      label,
      tone = 'neutral',
      srLabel,
      hidden,
      icon,
      secondaryLabel,
      srSuffix,
      dashed,
    },
    ref,
  ) {
    const { color, background, border } = TONE[tone];
    return (
      <span
        ref={ref}
        aria-hidden={hidden || undefined}
        className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[5px] border"
        style={{
          color,
          background,
          borderColor: border,
          borderStyle: dashed ? 'dashed' : 'solid',
          gap: icon ? 4 : 0,
          padding: icon ? '2px 7px 2px 5px' : '2px 7px',
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.5,
        }}
      >
        {icon}
        {/* A crew chip's label names who is going: analytics skips it. */}
        {srLabel && !hidden ? (
          <span className="ph-no-capture sr-only">{srLabel}</span>
        ) : null}
        <span aria-hidden={srLabel ? true : undefined}>{label}</span>
        {secondaryLabel ? (
          <>
            <span aria-hidden style={{ opacity: 0.45, padding: '0 1px' }}>
              {EVENT_ROW_COPY.glyphs.pair}
            </span>
            <span aria-hidden={srLabel ? true : undefined}>
              {secondaryLabel}
            </span>
          </>
        ) : null}
        {srSuffix && !hidden ? (
          <span className="sr-only">{srSuffix}</span>
        ) : null}
      </span>
    );
  },
);
