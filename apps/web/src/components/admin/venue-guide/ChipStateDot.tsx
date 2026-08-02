import type { GuideChipState } from '@concert-crawl/types'
import { ADMIN_COPY } from '../definitions/copy'

// The handoff's dot carried state by colour + fill alone (design-table §D.11).
// We keep the dot and pair it with the state word, so the distinction survives
// greyscale, colour-blindness, and a screen reader.

const GUIDE_COPY = ADMIN_COPY.venueDetailsClient.guide

const TOKENS: Record<GuideChipState, { color: string; fill: boolean }> = {
  blank: { color: 'var(--fg-subtle)', fill: false },
  authored: { color: 'var(--success)', fill: true },
  honest_placeholder: { color: 'var(--warning)', fill: true },
}

interface ChipStateDotProps {
  state: GuideChipState
  size?: number
  /** Render the dot alone; the caller supplies the text equivalent. */
  hideLabel?: boolean
}

export const ChipStateDot = ({
  state,
  size = 7,
  hideLabel = false,
}: ChipStateDotProps) => {
  const token = TOKENS[state]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minWidth: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: size,
          flexShrink: 0,
          background: token.fill ? token.color : 'transparent',
          border: token.fill ? 'none' : `1.5px solid ${token.color}`,
          boxShadow: token.fill
            ? `0 0 0 3px color-mix(in oklab, ${token.color} 20%, transparent)`
            : 'none',
        }}
      />
      {!hideLabel && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: token.color,
            whiteSpace: 'nowrap',
          }}
        >
          {GUIDE_COPY.state[state]}
        </span>
      )}
    </span>
  )
}
