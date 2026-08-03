import { forwardRef } from 'react'

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
  warn: {
    color: 'var(--warning)',
    background: 'var(--surface-2)',
    border: 'var(--warning)',
  },
  signal: {
    color: 'var(--signal)',
    background: 'var(--surface-2)',
    border: 'var(--signal)',
  },
}

export interface RowMetaChipProps {
  label: string
  tone?: ChipTone
  /** Replaces the visible label for screen readers, rather than adding to it. */
  srLabel?: string | undefined
  hidden?: boolean | undefined
}

export const RowMetaChip = forwardRef<HTMLSpanElement, RowMetaChipProps>(
  function RowMetaChip({ label, tone = 'neutral', srLabel, hidden }, ref) {
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
          padding: '2px 6px',
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1.4,
        }}
      >
        {srLabel && !hidden ? <span className="sr-only">{srLabel}</span> : null}
        <span aria-hidden={srLabel ? true : undefined}>{label}</span>
      </span>
    )
  },
)
