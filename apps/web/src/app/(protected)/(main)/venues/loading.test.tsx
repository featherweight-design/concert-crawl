// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

import VenuesLoading from './loading';

afterEach(cleanup);

describe('venues index loading', () => {
  it('renders the heading at once and skeleton venue cards', () => {
    const { container } = render(<VenuesLoading />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: CONSUMER_COPY.venuesIndex.pageHeading,
      }),
    ).toBeTruthy();
    expect(screen.getAllByTestId('venue-row-skeleton')).toHaveLength(6);
    // Every placeholder carries the shared sweep, hidden under reduced motion.
    expect(container.querySelectorAll('.dl-sweep').length).toBeGreaterThan(6);
    expect(container.firstElementChild?.getAttribute('aria-busy')).toBe('true');
  });
});
