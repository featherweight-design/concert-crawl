// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { EventTicketCta } from './EventTicketCta';

const copy = CONSUMER_COPY.eventDetail;
const ticket = 'https://tickets.example.com/show';
const venuePage = 'https://venue.example.com/events/show';

afterEach(cleanup);

describe('EventTicketCta', () => {
  it('sends a cancelled show to the vendor for refund info, same link', () => {
    render(
      <EventTicketCta
        status="cancelled"
        ticketHref={ticket}
        soldOut={false}
        href={ticket}
        hasDirectLink
      />,
    );
    const link = screen.getByRole('link', { name: copy.refundInfo });
    expect(link.getAttribute('href')).toBe(ticket);
    expect(screen.queryByText(copy.getTickets)).toBeNull();
  });

  it('prefers refund info over sold out once the show is cancelled', () => {
    render(
      <EventTicketCta
        status="cancelled"
        ticketHref={ticket}
        soldOut
        href={ticket}
        hasDirectLink
      />,
    );
    expect(screen.getByRole('link', { name: copy.refundInfo })).toBeTruthy();
  });

  it("never offers tickets on a cancelled show with only the venue's event page", () => {
    render(
      <EventTicketCta
        status="cancelled"
        ticketHref={null}
        soldOut={false}
        href={venuePage}
        hasDirectLink
      />,
    );
    expect(screen.queryByText(copy.refundInfo)).toBeNull();
    expect(screen.queryByText(copy.getTickets)).toBeNull();
    const link = screen.getByRole('link', { name: copy.visitVenueWebsite });
    // Outlined in the neutral border, never the filled primary: nothing to buy.
    expect(link.style.background).toBe('');
    // jsdom's cssstyle can drop a shorthand holding var(), so read the attribute.
    expect(link.getAttribute('style')).toContain('var(--border-strong)');
  });

  it('falls back to no tickets when a cancelled show has no link', () => {
    render(
      <EventTicketCta
        status="cancelled"
        soldOut={false}
        href={null}
        hasDirectLink={false}
      />,
    );
    expect(screen.getByText(copy.noTicketsAvailable)).toBeTruthy();
  });

  it('ignores the ticket URL for refunds on a live show', () => {
    render(
      <EventTicketCta
        status="upcoming"
        ticketHref={ticket}
        soldOut={false}
        href={ticket}
        hasDirectLink
      />,
    );
    expect(screen.getByRole('link', { name: copy.getTickets })).toBeTruthy();
    expect(screen.queryByText(copy.refundInfo)).toBeNull();
  });

  // B+ A5: the stale sweep's cancellation is not a confirmed one, so the
  // ticket link keeps its ordinary label rather than turning into refund info.
  it('keeps the ordinary ticket label on a No longer listed show', () => {
    render(
      <EventTicketCta
        status="cancelled"
        delistedAt="2026-11-01T00:00:00.000Z"
        ticketHref={ticket}
        soldOut={false}
        href={ticket}
        hasDirectLink
      />,
    );
    expect(screen.getByRole('link', { name: copy.getTickets })).toBeTruthy();
    expect(screen.queryByText(copy.refundInfo)).toBeNull();
  });
});
