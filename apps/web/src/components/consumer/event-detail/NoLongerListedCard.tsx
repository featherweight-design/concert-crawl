// The event detail card for a show the stale sweep marked No longer listed
// (B+ A5). Neutral on purpose: it is the sweep's inference from the venue page
// dropping the show, not a confirmed cancellation, so it never borrows the red
// of the Cancelled banner. Drawn in addendum 2 item 12: a grey dashed card with
// the chip, the headline and the source line.
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { formatDelistedDate } from '@/lib/delisted-date';

const copy = CONSUMER_COPY.eventDetail;

const MUTED = 'var(--fg-subtle)';

/**
 * The NO LONGER LISTED chip, as drawn in the card and, from `sm` up, above the
 * title in the hero (event-nll-d). One chip so the two never drift apart.
 */
export const NoLongerListedChip = ({
  overArt = false,
}: {
  /**
   * In the hero the chip sits on the photo wash, where `--fg-subtle` and an 8%
   * fill all but vanish. There it steps up to `--fg-muted` and a surface fill
   * (event-nll-d draws a clear grey chip).
   */
  overArt?: boolean;
}) => (
  <span
    data-testid="nll-chip"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 19,
      padding: '0 7px 0 8px',
      borderRadius: 6,
      border: `1px solid color-mix(in oklab, ${overArt ? 'var(--fg-muted)' : 'var(--fg-subtle)'} 50%, transparent)`,
      background: overArt
        ? 'color-mix(in oklab, var(--surface-1) 75%, transparent)'
        : 'color-mix(in oklab, var(--fg-subtle) 8%, transparent)',
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: overArt ? 'var(--fg-muted)' : MUTED,
      lineHeight: 1,
    }}
  >
    {CONSUMER_COPY.noLongerListedLabel}
  </span>
);

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
        <NoLongerListedChip />
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
