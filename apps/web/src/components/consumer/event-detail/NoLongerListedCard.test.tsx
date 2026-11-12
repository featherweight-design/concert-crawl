// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { NoLongerListedCard } from './NoLongerListedCard';

afterEach(cleanup);

const getCard = () =>
  screen.getByRole('status', {
    name: CONSUMER_COPY.eventDetail.noLongerListedAriaLabel,
  });

describe('NoLongerListedCard', () => {
  it('shows the chip and the headline, never that it is cancelled', () => {
    render(<NoLongerListedCard delistedAt="2026-11-04T10:00:00.000Z" />);
    const text = getCard().textContent ?? '';
    expect(text).toContain(CONSUMER_COPY.noLongerListedLabel);
    expect(text).toContain(CONSUMER_COPY.noLongerListedLine);
    expect(text.toLowerCase()).not.toContain('cancel');
  });

  it('shows the source line with the delisted date in Mountain Time', () => {
    render(<NoLongerListedCard delistedAt="2026-11-04T10:00:00.000Z" />);
    expect(getCard().textContent).toContain(
      CONSUMER_COPY.noLongerListedSince('Nov 4'),
    );
  });

  it('leaves the source line out when there is no usable date', () => {
    render(<NoLongerListedCard delistedAt={null} />);
    expect(getCard().textContent).not.toContain('calendar since');
  });
});
