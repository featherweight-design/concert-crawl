import type { GuideChipKey } from '@concert-crawl/types'
import { CONSUMER_COPY } from '../definitions/copy'
import { GuideIcon } from './GuideIcon'

const copy = CONSUMER_COPY.venueGuide

interface StillGatheringProps {
  /** The chip keys this venue has nothing for yet. Derived, never hard-coded. */
  chipTypes: GuideChipKey[]
  venueShortName: string
}

/**
 * Honest ghost list of what we do not know yet. The pills are non-interactive
 * `<span>`s — there is nothing behind them to open.
 */
export const StillGathering = ({
  chipTypes,
  venueShortName,
}: StillGatheringProps) => {
  if (chipTypes.length === 0) return null

  return (
    <div style={{ marginTop: 14 }} data-testid="guide-still-gathering">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {copy.thinLabel}
      </span>
      <ul
        className="flex list-none flex-wrap p-0"
        style={{ gap: 6, marginTop: 8 }}
      >
        {chipTypes.map((chipType) => (
          <li
            key={chipType}
            className="inline-flex items-center"
            style={{
              gap: 5,
              padding: '4px 9px',
              borderRadius: 999,
              background: 'transparent',
              border: '1px dashed var(--border-strong)',
              color: 'var(--fg-subtle)',
              fontSize: '11.5px',
              fontWeight: 500,
            }}
          >
            <GuideIcon chipType={chipType} size={12} />
            {copy.chipLabels[chipType]}
          </li>
        ))}
      </ul>
      <p
        style={{
          marginTop: 10,
          fontSize: '12px',
          fontStyle: 'italic',
          letterSpacing: '-0.005em',
          color: 'var(--fg-subtle)',
        }}
      >
        {copy.thinFooter(venueShortName)}
      </p>
    </div>
  )
}
