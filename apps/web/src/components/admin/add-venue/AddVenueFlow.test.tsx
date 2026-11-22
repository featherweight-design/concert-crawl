// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTitle: vi.fn(), setPhoneBack: vi.fn() }),
}));

import { AddVenueFlow } from './AddVenueFlow';

const COPY = ADMIN_COPY.addVenue;

beforeEach(() => {
  // `useIsPhone` reads matchMedia, which jsdom does not ship: desktop.
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

describe('AddVenueFlow', () => {
  it('opens on Start, with Nobody asked yet and Start from scratch', () => {
    render(<AddVenueFlow />);
    expect(screen.getByTestId('add-venue-start')).toBeTruthy();
    expect(screen.getByText(COPY.start.emptyTitle)).toBeTruthy();
    expect(screen.queryByTestId('add-venue-shell')).toBeNull();
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    expect(screen.getByTestId('add-venue-shell')).toBeTruthy();
    expect(screen.queryByTestId('add-venue-start')).toBeNull();
  });

  it('goes back to Start from step 1', () => {
    render(<AddVenueFlow />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    fireEvent.click(screen.getByTestId('add-venue-back'));
    expect(screen.getByTestId('add-venue-start')).toBeTruthy();
    expect(screen.queryByTestId('add-venue-shell')).toBeNull();
  });

  it('marks Basics current and draws steps 2 to 5 as not open yet', () => {
    render(<AddVenueFlow />);
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    expect(
      screen.getByTestId('add-venue-step-basics').getAttribute('aria-current'),
    ).toBe('step');
    for (const step of ['source', 'icon', 'guide', 'review']) {
      expect(
        screen
          .getByTestId(`add-venue-step-${step}`)
          .getAttribute('aria-disabled'),
      ).toBe('true');
    }
  });
});
