import { CONSUMER_COPY } from '../definitions/copy'

const copy = CONSUMER_COPY.venueGuide

interface InsiderTipProps {
  body: string
}

/**
 * Leads the guide section — it sits between the section header and the chips,
 * never after them. It is the one line a returning local would still read.
 */
export const InsiderTip = ({ body }: InsiderTipProps) => (
  <div
    data-testid="guide-insider-tip"
    style={{
      padding: '13px 14px',
      borderRadius: 10,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      marginBottom: 14,
    }}
  >
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
      }}
    >
      {copy.insiderTipEyebrow}
    </span>
    <p
      style={{
        marginTop: 6,
        fontSize: '14.5px',
        lineHeight: 1.55,
        letterSpacing: '-0.01em',
        textWrap: 'pretty',
        color: 'var(--fg)',
      }}
    >
      {body}
    </p>
  </div>
)
