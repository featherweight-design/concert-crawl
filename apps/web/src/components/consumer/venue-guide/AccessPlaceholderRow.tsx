import { CONSUMER_COPY } from '../definitions/copy'
import { GuideIcon } from './GuideIcon'

const copy = CONSUMER_COPY.venueGuide

interface AccessPlaceholderRowProps {
  /** First row in its column — suppresses the hairline separator above it. */
  first?: boolean
}

/**
 * The honest accessibility row: shown when the venue has an accessibility chip
 * marked as a placeholder. Accessibility is the one chip that always appears on
 * a published guide — silence here would read as "step-free", which we cannot
 * claim.
 */
export const AccessPlaceholderRow = ({ first }: AccessPlaceholderRowProps) => (
  <div
    className={`flex min-w-0 gap-3 sm:border-t-0 ${first ? '' : 'border-t border-border'}`}
    style={{ padding: '12px 0' }}
    data-testid="guide-chip-accessibility-placeholder"
  >
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px dashed var(--border-strong)',
        color: 'var(--fg-subtle)',
      }}
    >
      <GuideIcon chipType="accessibility" size={16} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.chipLabels.accessibility}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.accessibilityNotDocumented}
        </span>
      </div>
      <p
        style={{
          marginTop: 3,
          fontSize: '13px',
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.accessibilityPlaceholder}
      </p>
    </div>
  </div>
)
