// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { NoLongerListedCard } from './NoLongerListedCard';

afterEach(cleanup);

describe('NoLongerListedCard', () => {
  it('says the show is no longer listed, never that it is cancelled', () => {
    render(<NoLongerListedCard />);
    const card = screen.getByRole('status', {
      name: CONSUMER_COPY.eventDetail.noLongerListedAriaLabel,
    });
    expect(card.textContent).toContain(
      CONSUMER_COPY.eventDetail.noLongerListedHeading,
    );
    expect(card.textContent).toContain(CONSUMER_COPY.noLongerListedLine);
    expect(card.textContent?.toLowerCase()).not.toContain('cancel');
  });
});
