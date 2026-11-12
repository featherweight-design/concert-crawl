// The event detail card for a show the stale sweep marked No longer listed
// (B+ A5). Neutral on purpose: it is the sweep's inference from the venue page
// dropping the show, not a confirmed cancellation, so it never borrows the red
// of the Cancelled banner. Shape follows the status cards (`LiveReportBanner`).
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY.eventDetail;

export const NoLongerListedCard = () => (
  <div
    role="status"
    aria-label={copy.noLongerListedAriaLabel}
    style={{
      borderRadius: 12,
      background: 'color-mix(in oklab, var(--fg-muted) 8%, transparent)',
      border:
        '1px dashed color-mix(in oklab, var(--fg-muted) 40%, transparent)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}
  >
    <span
      style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 800,
        fontSize: 15,
        color: 'var(--fg)',
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
      }}
    >
      {copy.noLongerListedHeading}
    </span>
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--fg-muted)',
        letterSpacing: '0.04em',
      }}
    >
      {CONSUMER_COPY.noLongerListedLine}
    </span>
  </div>
);
