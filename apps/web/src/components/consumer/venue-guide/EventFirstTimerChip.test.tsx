// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CONSUMER_COPY } from '../definitions/copy';
import { EventFirstTimerChip } from './EventFirstTimerChip';

afterEach(cleanup);

const copy = CONSUMER_COPY.venueGuide;

describe('EventFirstTimerChip', () => {
  it('links to the venue guide anchor for a first-timer', () => {
    render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="first_timer"
      />,
    );
    const chip = screen.getByTestId('event-first-timer-chip');
    expect(chip).toHaveAttribute('href', '/venues/the-roxy#ft-guide');
    expect(chip).toHaveTextContent(copy.eventChip('Roxy'));
  });

  it('renders nothing when the venue has no published guide', () => {
    const { container } = render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished={false}
        mode="first_timer"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a returner', () => {
    const { container } = render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="returner"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('clears the 44px touch-target floor', () => {
    render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="first_timer"
      />,
    );
    expect(screen.getByTestId('event-first-timer-chip').style.minHeight).toBe(
      '44px',
    );
  });

  // bp-event, bp-m-event_m_end: a small rounded rectangle, text and an arrow,
  // no leading dots glyph.
  it('is a rounded rectangle with no leading glyph', () => {
    const { container } = render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="first_timer"
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
    const pill = container.querySelector<HTMLElement>(
      '[data-testid="event-first-timer-chip"] > span',
    );
    expect(pill?.style.borderRadius).toBe('8px');
  });

  // The phone draws it under Ages, the desktop level with the Venue row, so the
  // page renders a copy of each and CSS shows one.
  it('hides the phone copy from the desktop line and the desktop copy below it', () => {
    const { container } = render(
      <>
        <EventFirstTimerChip
          venueName="The Roxy"
          venueSlug="the-roxy"
          venueGuidePublished
          mode="first_timer"
          placement="phone"
        />
        <EventFirstTimerChip
          venueName="The Roxy"
          venueSlug="the-roxy"
          venueGuidePublished
          mode="first_timer"
          placement="desktop"
        />
      </>,
    );
    expect(
      container.querySelector('[data-testid="event-first-timer-chip-phone"]')
        ?.className,
    ).toContain('lg:hidden');
    expect(
      container.querySelector('[data-testid="event-first-timer-chip"]')
        ?.className,
    ).toContain('hidden lg:inline-flex');
  });
});
