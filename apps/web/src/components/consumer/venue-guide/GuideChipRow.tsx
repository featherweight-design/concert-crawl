import type { GuideChipKey } from '@concert-crawl/types'
import { CONSUMER_COPY } from '../definitions/copy'
import { GuideIcon } from './GuideIcon'

const copy = CONSUMER_COPY.venueGuide

interface GuideChipRowProps {
  chipType: GuideChipKey
  body: string
  /** First row in its column — suppresses the hairline separator above it. */
  first?: boolean
}

export const GuideChipRow = ({ chipType, body, first }: GuideChipRowProps) => {
  const isAccessibility = chipType === 'accessibility'

  // The separator is a class, not an inline style, so the two-column desktop
  // grid can drop it wholesale at `sm:` — each column starts fresh there and a
  // leading hairline would read as a stray rule.
  return (
    <div
      className={`flex min-w-0 gap-3 sm:border-t-0 ${first ? '' : 'border-t border-border'}`}
      style={{ padding: '12px 0' }}
      data-testid={`guide-chip-${chipType}`}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: isAccessibility
            ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
            : 'var(--surface-2)',
          color: isAccessibility ? 'var(--signal)' : 'var(--fg-muted)',
        }}
      >
        <GuideIcon chipType={chipType} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isAccessibility ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {copy.chipLabels[chipType]}
          </span>
          {isAccessibility && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--signal)',
              }}
            >
              <span aria-hidden="true">
                {copy.accessibilityAlwaysHereStar}{' '}
              </span>
              {copy.accessibilityAlwaysHere}
            </span>
          )}
        </div>
        <p
          style={{
            marginTop: 3,
            fontSize: '13.5px',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            textWrap: 'pretty',
            color: 'var(--fg)',
          }}
        >
          {body}
        </p>
      </div>
    </div>
  )
}
