import type { GuideChipKey } from '@concert-crawl/types'
import { CONSUMER_COPY } from '../definitions/copy'

const copy = CONSUMER_COPY.venueGuide

interface StillGatheringProps {
  /** The chip keys this venue has nothing for yet. Derived, never hard-coded. */
  chipTypes: GuideChipKey[]
  venueShortName: string
  /**
   * The closing line reads "that's the lot — this venue is new to us," which is
   * only true of a thin guide. On a populated one the missing-topic line still
   * belongs, but that sentence would contradict the five chips sitting above it.
   */
  showFooter: boolean
}

/**
 * Honest note of what we do not know yet. Deliberately prose rather than pills:
 * dashed chips carry the visual grammar of filters, and there is nothing behind
 * these to open.
 */
export const StillGathering = ({
  chipTypes,
  venueShortName,
  showFooter,
}: StillGatheringProps) => {
  if (chipTypes.length === 0) return null

  return (
    <div style={{ marginTop: 12 }} data-testid="guide-still-gathering">
      <p
        style={{
          fontSize: '12px',
          lineHeight: 1.5,
          textWrap: 'pretty',
          color: 'var(--fg-subtle)',
        }}
      >
        {copy.stillGathering(chipTypes.map((key) => copy.chipLabels[key]))}
      </p>
      {showFooter && (
        <p
          style={{
            marginTop: 6,
            fontSize: '12px',
            fontStyle: 'italic',
            letterSpacing: '-0.005em',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.thinFooter(venueShortName)}
        </p>
      )}
    </div>
  )
}
