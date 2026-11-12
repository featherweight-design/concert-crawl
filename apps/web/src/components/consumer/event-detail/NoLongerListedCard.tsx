// The event detail card for a show the stale sweep marked No longer listed
// (B+ A5). Neutral on purpose: it is the sweep's inference from the venue page
// dropping the show, not a confirmed cancellation, so it never borrows the red
// of the Cancelled banner. Drawn in addendum 2 item 12: a grey dashed card with
// the chip, the headline and the source line.
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { DENVER_TIME_ZONE } from '@/lib/time';

const copy = CONSUMER_COPY.eventDetail;

const MUTED = 'var(--fg-subtle)';

/** The sweep's timestamp as a short Mountain Time date, or null if unreadable. */
const formatDelistedDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const NoLongerListedCard = ({
  delistedAt,
}: {
  delistedAt?: string | null | undefined;
}) => {
  const since = formatDelistedDate(delistedAt);
  return (
    <div
      role="status"
      aria-label={copy.noLongerListedAriaLabel}
      style={{
        borderRadius: 16,
        background: 'var(--surface-1)',
        border:
          '1.5px dashed color-mix(in oklab, var(--fg-muted) 40%, transparent)',
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          flex: 'none',
          border:
            '1px dashed color-mix(in oklab, var(--fg-muted) 40%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={MUTED}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 19,
            padding: '0 7px 0 8px',
            borderRadius: 6,
            border:
              '1px solid color-mix(in oklab, var(--fg-subtle) 50%, transparent)',
            background: 'color-mix(in oklab, var(--fg-subtle) 8%, transparent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: MUTED,
            lineHeight: 1,
          }}
        >
          {CONSUMER_COPY.noLongerListedLabel}
        </span>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: 15.5,
            color: 'var(--fg)',
            marginTop: 8,
            lineHeight: 1.3,
          }}
        >
          {CONSUMER_COPY.noLongerListedLine}
        </div>
        {since !== null && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: MUTED,
              marginTop: 6,
            }}
          >
            {CONSUMER_COPY.noLongerListedSince(since)}
          </div>
        )}
      </div>
    </div>
  );
};
