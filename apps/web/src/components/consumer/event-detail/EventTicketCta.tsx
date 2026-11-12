// The event detail primary CTA, shared by the protected page and the public
// share mirror at /e/:id (#72).
//
// A No longer listed show (B+ A5: cancelled by the stale sweep, `delistedAt`
// set) is not treated as cancelled here: nothing says the show is off, so it
// keeps the ordinary ticket or venue link and its ordinary label, never refund
// info.
//
// Four states, first match wins:
//   cancelled + ticket URL → "Refund info from the vendor ›" on that URL: the
//                        vendor handles the refund. The venue's event page or
//                        homepage is not the vendor, so without a ticket URL a
//                        cancelled show falls through, never to "Get tickets"
//   sold out          → disabled "Sold out"
//   a safe http(s) url → "Get tickets ↗" (or "Visit venue website" when the only
//                        link we have is the venue's homepage)
//   nothing            → disabled "No tickets available"
//
// Postponed never reaches here on the signed-in page: the Watch toggle takes
// this slot (WatchShowButton's `cta` variant).
//
// `href` must already be `isSafeHttpUrl`-filtered by the caller: ticketUrl and
// eventUrl are crawler-derived and untrusted, so a compromised venue page must
// not be able to put a javascript:/data: target here (#1152).
import { ChevronRight } from 'lucide-react';

import type { EventStatus } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { isDelisted } from '@/components/consumer/event-row/lib/row-status';

import { ExternalLinkIcon } from './InfoRow';

const copy = CONSUMER_COPY.eventDetail;

const disabledStyle = {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'not-allowed',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: 48,
  // Disabled is transparent with the strong stroke, radius 12 (event-cancelled-no-link-m).
  borderRadius: 12,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--fg-subtle)',
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: '-0.005em',
} satisfies React.CSSProperties;

// The two link CTAs (tickets, refund info) share one shape.
const linkClass =
  'flex h-12 w-full items-center justify-center gap-1.5 rounded-xl';
const linkStyle = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 800,
  fontSize: 15,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
} satisfies React.CSSProperties;

// A cancelled show's link is outlined, never the filled primary: refund info
// in the danger tone, the venue's page in the neutral border (addendum 2,
// 13-cancelled-variants/event-cancelled-venue-link).
const CANCELLED_LINK_STYLE = {
  ...linkStyle,
  border: '1.5px solid color-mix(in oklab, var(--danger) 50%, transparent)',
} satisfies React.CSSProperties;
const CANCELLED_VENUE_LINK_STYLE = {
  ...linkStyle,
  border: '1px solid var(--border-strong)',
} satisfies React.CSSProperties;

interface EventTicketCtaProps {
  /** The show's lifecycle. Cancelled turns the ticket link into refund info. */
  status?: EventStatus | undefined;
  /** The stale sweep's marker: a delisted cancellation is not a cancellation. */
  delistedAt?: string | null | undefined;
  /**
   * The already-validated ticket URL (the vendor), or null. Only read on a
   * cancelled show, where it is the refund link.
   */
  ticketHref?: string | null | undefined;
  /** True when the show is sold out — takes precedence over any link. */
  soldOut: boolean;
  /** Already-validated http(s) destination, or null when we have none. */
  href: string | null;
  /**
   * Whether `href` points at a ticket/event page rather than the venue's
   * homepage. Only changes the label.
   */
  hasDirectLink: boolean;
}

export const EventTicketCta = ({
  status,
  delistedAt = null,
  ticketHref = null,
  soldOut,
  href,
  hasDirectLink,
}: EventTicketCtaProps) => {
  const cancelled = status === 'cancelled' && !isDelisted(status, delistedAt);
  if (cancelled && ticketHref) {
    return (
      <a
        href={ticketHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} text-fg`}
        style={CANCELLED_LINK_STYLE}
      >
        {copy.refundInfo}
        <ChevronRight size={16} aria-hidden />
      </a>
    );
  }

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
    );
  }

  // A cancelled show is never offered tickets: without a vendor link it keeps
  // the venue's own page, in the refund link's outlined style rather than the
  // filled primary, since there is nothing left to buy.
  if (cancelled && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} text-fg`}
        style={CANCELLED_VENUE_LINK_STYLE}
      >
        {copy.visitVenueWebsite}
        <ChevronRight size={16} aria-hidden />
      </a>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} text-fg-on-accent`}
        style={{
          ...linkStyle,
          background: 'var(--accent)',
          // The Get Tickets glow, as drawn (event-nll-m, event-tickets-back-live-m).
          boxShadow:
            '0 0 30px color-mix(in oklab, var(--accent) 30%, transparent)',
        }}
      >
        {hasDirectLink ? copy.getTickets : copy.visitVenueWebsite}
        <ExternalLinkIcon />
      </a>
    );
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
  );
};
