import { forwardRef, type ReactNode } from 'react'

/**
 * The row's only chip. Five ad-hoc pills used to compete on size, radius and
 * case, which is how the meta line stopped reading as one row of peers. Size,
 * radius, type and spacing are fixed here; tone is the only variable.
 */

export type ChipTone = 'neutral' | 'strong' | 'warn' | 'signal'

// Every tone sits on the same surface and differs only in its foreground and
// border, so the four read as one family under all nine themes rather than as
// four differently-shaped badges.
const TONE: Record<
  ChipTone,
  { color: string; background: string; border: string }
> = {
  neutral: {
    color: 'var(--fg-muted)',
    background: 'var(--surface-2)',
    border: 'var(--border)',
  },
  // Stand-in pending the open design call on the box-office tone (plan open
  // call 1): admin renders box office in gold and the row's set has no gold.
  strong: {
    color: 'var(--fg)',
    background: 'var(--surface-3)',
    border: 'var(--border-strong)',
  },
  // Tinted rather than solid-bordered: a full-strength --warning/--signal rule
  // around a 9.5px chip out-shouts the label it frames.
  warn: {
    color: 'var(--warning)',
    background: 'color-mix(in oklch, var(--warning) 10%, transparent)',
    border: 'color-mix(in oklch, var(--warning) 42%, transparent)',
  },
  signal: {
    color: 'var(--signal)',
    background: 'color-mix(in oklch, var(--signal) 9%, transparent)',
    border: 'color-mix(in oklch, var(--signal) 42%, transparent)',
  },
}

export interface RowMetaChipProps {
  label: string
  tone?: ChipTone
  /** Replaces the visible label for screen readers, rather than adding to it. */
  srLabel?: string | undefined
  hidden?: boolean | undefined
  /** Leading glyph. Trims the left padding so the mark sits on the same rhythm. */
  icon?: ReactNode
}

export const RowMetaChip = forwardRef<HTMLSpanElement, RowMetaChipProps>(
  function RowMetaChip(
    { label, tone = 'neutral', srLabel, hidden, icon },
    ref,
  ) {
    const { color, background, border } = TONE[tone]
    return (
      <span
        ref={ref}
        aria-hidden={hidden || undefined}
        className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[5px] border"
        style={{
          color,
          background,
          borderColor: border,
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
        {srLabel && !hidden ? <span className="sr-only">{srLabel}</span> : null}
        <span aria-hidden={srLabel ? true : undefined}>{label}</span>
      </span>
    )
  },
)
