// The event detail primary CTA, shared by the protected page and the public
// share mirror at /e/:id (#72).
//
// Three states, first match wins:
//   sold out          → disabled "Sold out"
//   a safe http(s) url → "Get tickets ↗" (or "Visit venue website" when the only
//                        link we have is the venue's homepage)
//   nothing            → disabled "No tickets available"
//
// `href` must already be `isSafeHttpUrl`-filtered by the caller: ticketUrl and
// eventUrl are crawler-derived and untrusted, so a compromised venue page must
// not be able to put a javascript:/data: target here (#1152).
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

import { ExternalLinkIcon } from './InfoRow'

const copy = CONSUMER_COPY.eventDetail

const disabledStyle = {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'not-allowed',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: 48,
  borderRadius: 10,
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  color: 'var(--fg-subtle)',
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: '-0.005em',
} satisfies React.CSSProperties

interface EventTicketCtaProps {
  /** True when the show is sold out — takes precedence over any link. */
  soldOut: boolean
  /** Already-validated http(s) destination, or null when we have none. */
  href: string | null
  /**
   * Whether `href` points at a ticket/event page rather than the venue's
   * homepage. Only changes the label.
   */
  hasDirectLink: boolean
}

export const EventTicketCta = ({
  soldOut,
  href,
  hasDirectLink,
}: EventTicketCtaProps) => {
  if (soldOut) {
    return (
      <button
        type="button"
        disabled
        aria-label={copy.soldOutAriaLabel}
        style={disabledStyle}
      >
        {copy.soldOut}
      </button>
    )
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[10px] text-fg-on-accent"
        style={{
          background: 'var(--accent)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '-0.01em',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {hasDirectLink ? copy.getTickets : copy.visitVenueWebsite}
        <ExternalLinkIcon />
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled
      aria-label={copy.noTicketsAriaLabel}
      style={disabledStyle}
    >
      {copy.noTicketsAvailable}
    </button>
  )
}
