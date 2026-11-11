// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import VenueLoading from './loading';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

afterEach(cleanup);

describe('venue page loading', () => {
  it('renders the back chip at once and skeletons for the data', () => {
    const { container } = render(<VenueLoading />);
    expect(screen.getByRole('button')).toBeTruthy();
    expect(screen.getByTestId('venue-hero-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('venue-event-row-skeleton')).toHaveLength(4);
    expect(container.querySelectorAll('.dl-sweep').length).toBeGreaterThan(4);
  });
});
