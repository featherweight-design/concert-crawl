// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  FILTER_DEFS,
  FILTER_ORDER,
} from '@/components/consumer/filter-bar/filter-defs';
import { BrowseSkeleton } from './BrowseSkeleton';

let reduced = false;
const animate = vi.fn(() => ({ cancel: vi.fn() }));
const originalAnimate = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'animate',
);
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  reduced = false;
  animate.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animate,
  });
});

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  if (originalAnimate) {
    Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  } else {
    Reflect.deleteProperty(Element.prototype, 'animate');
  }
});

describe('BrowseSkeleton', () => {
  it('renders the page chrome as it looks live and only the data as skeletons', () => {
    render(<BrowseSkeleton />);
    expect(screen.getByText(CONSUMER_COPY.filterBar.locationLine)).toBeTruthy();
    expect(screen.getByText(CONSUMER_COPY.filterBar.headingTitle)).toBeTruthy();
    for (const key of FILTER_ORDER) {
      expect(screen.getByText(FILTER_DEFS[key].placeholder)).toBeTruthy();
    }
    expect(screen.getByTestId('browse-hero-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('browse-row-skeleton')).toHaveLength(4);
  });

  it('puts the pink wave beside "Loading shows" in a status region', () => {
    const { container } = render(<BrowseSkeleton rows={2} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain(CONSUMER_COPY.loadingShows);
    expect(status.querySelector('svg [data-part="core"]')).not.toBeNull();
    expect(screen.getAllByTestId('browse-row-skeleton')).toHaveLength(2);
    // Rule 10: one wave on the page, never one per row.
    expect(container.querySelectorAll('[data-part="core"]')).toHaveLength(1);
    expect(animate).toHaveBeenCalled();
  });

  it('holds the wave still under reduced motion', () => {
    reduced = true;
    render(<BrowseSkeleton />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('keeps the chrome inert: hidden from assistive tech, nothing to tap or tab to', () => {
    const { container } = render(<BrowseSkeleton />);
    const preview = screen.getByTestId('filter-bar-preview');
    expect(preview.getAttribute('aria-hidden')).toBe('true');
    expect(
      container.querySelectorAll('button, a, input, [tabindex]'),
    ).toHaveLength(0);
  });

  it('uses no hand-rolled pulse animation', () => {
    const { container } = render(<BrowseSkeleton />);
    expect(container.innerHTML).not.toContain('skeletonPulse');
  });
});
