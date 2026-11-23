// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTitle: vi.fn(), setPhoneBack: vi.fn() }),
}));

// The robots.txt card's check is a network read; desktop draws it.
vi.mock('@/lib/api', () => ({
  adminFetch: () => Promise.resolve(new Response('{}', { status: 500 })),
}));

import { AddVenueFlow } from './AddVenueFlow';

const COPY = ADMIN_COPY.addVenue;
const FIELDS = ADMIN_COPY.venueDetails.fields;

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const openBasics = () => {
  render(<AddVenueFlow />);
  fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
};

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
  it('opens on Start, then Start from scratch opens Basics', () => {
    render(<AddVenueFlow />);
    expect(screen.getByText(COPY.start.emptyTitle)).toBeTruthy();
    expect(screen.queryByTestId('add-venue-shell')).toBeNull();
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    expect(screen.getByTestId('add-venue-shell')).toBeTruthy();
    expect(screen.getByText(COPY.basics.title)).toBeTruthy();
  });

  it('makes the link from the name until the link is edited', () => {
    openBasics();
    type(FIELDS.name, 'Dazzle Jazz');
    const link = screen.getByLabelText<HTMLInputElement>(FIELDS.link.label);
    expect(link.value).toBe('dazzle-jazz');
    type(FIELDS.link.label, 'dazzle');
    type(FIELDS.name, 'Dazzle Jazz Club');
    expect(link.value).toBe('dazzle');
  });

  it('shows what is missing on Continue and stays on Basics', () => {
    openBasics();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    expect(screen.getByText(COPY.errors.nameRequired)).toBeTruthy();
    expect(screen.getByText(COPY.errors.websiteRequired)).toBeTruthy();
    expect(
      screen.getByTestId('add-venue-step-basics').getAttribute('aria-current'),
    ).toBe('step');
  });

  it('focuses the first field it marks', () => {
    openBasics();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    const name = screen.getByLabelText(FIELDS.name);
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute('aria-describedby')).toBe('add-venue-name-error');
  });

  it('clears a field error once the field is edited', () => {
    openBasics();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    type(FIELDS.name, 'Dazzle Jazz');
    expect(screen.queryByText(COPY.errors.nameRequired)).toBeNull();
    expect(screen.getByText(COPY.errors.websiteRequired)).toBeTruthy();
  });

  it('goes back to Start from Basics and forgets the errors', () => {
    openBasics();
    fireEvent.click(screen.getByTestId('add-venue-continue'));
    fireEvent.click(screen.getByTestId('add-venue-back'));
    expect(screen.getByTestId('add-venue-start')).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-venue-from-scratch'));
    expect(screen.queryByText(COPY.errors.nameRequired)).toBeNull();
  });

  it('marks Basics current and draws steps 2 to 5 as not open yet', () => {
    openBasics();
    for (const step of ['source', 'icon', 'guide', 'review']) {
      expect(
        screen
          .getByTestId(`add-venue-step-${step}`)
          .getAttribute('aria-disabled'),
      ).toBe('true');
    }
  });
});
