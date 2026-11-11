// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { EventTicketCta } from './EventTicketCta';

const copy = CONSUMER_COPY.eventDetail;
const href = 'https://tickets.example.com/show';

afterEach(cleanup);

describe('EventTicketCta', () => {
  it('sends a cancelled show to the vendor for refund info, same link', () => {
    render(
      <EventTicketCta cancelled soldOut={false} href={href} hasDirectLink />,
    );
    const link = screen.getByRole('link', { name: copy.refundInfo });
    expect(link.getAttribute('href')).toBe(href);
    expect(screen.queryByText(copy.getTickets)).toBeNull();
  });

  it('prefers refund info over sold out once the show is cancelled', () => {
    render(<EventTicketCta cancelled soldOut href={href} hasDirectLink />);
    expect(screen.getByRole('link', { name: copy.refundInfo })).toBeTruthy();
  });

  it('falls back to no tickets when a cancelled show has no link', () => {
    render(
      <EventTicketCta
        cancelled
        soldOut={false}
        href={null}
        hasDirectLink={false}
      />,
    );
    expect(screen.getByText(copy.noTicketsAvailable)).toBeTruthy();
  });

  it("keeps a venue homepage labelled as the venue's, not refund info", () => {
    render(
      <EventTicketCta
        cancelled
        soldOut={false}
        href={href}
        hasDirectLink={false}
      />,
    );
    expect(screen.queryByText(copy.refundInfo)).toBeNull();
    expect(
      screen.getByRole('link', { name: copy.visitVenueWebsite }),
    ).toBeTruthy();
  });

  it('keeps Get tickets on a live show', () => {
    render(<EventTicketCta soldOut={false} href={href} hasDirectLink />);
    expect(screen.getByRole('link', { name: copy.getTickets })).toBeTruthy();
  });
});
