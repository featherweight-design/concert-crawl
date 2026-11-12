// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  FILTER_DEFS,
  FILTER_ORDER,
} from '@/components/consumer/filter-bar/filter-defs';
import {
  COUNT_ROW_CLASS,
  SEGMENT_BAR_CLASS,
  SEGMENT_BLOCK_CLASS,
} from '@/components/consumer/filter-bar/chrome';
import { CREWS_COPY } from '@/components/consumer/crews/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { BrowseSkeleton } from './BrowseSkeleton';

const copy = CONSUMER_COPY.filterBar;

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
    const chips = screen.getByTestId('filter-bar-preview-chips');
    for (const key of FILTER_ORDER) {
      expect(
        within(chips).getByText(FILTER_DEFS[key].placeholder),
      ).toBeTruthy();
    }
    expect(screen.getByTestId('browse-hero-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('browse-row-skeleton')).toHaveLength(4);
  });

  it('puts the pink wave beside "Loading shows" in a status region', () => {
    const { container } = render(<BrowseSkeleton rows={2} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain(CONSUMER_COPY.loadingShows);
    // The wave sits beside the status, outside the live region.
    expect(
      status.parentElement?.querySelector('svg [data-part="core"]'),
    ).not.toBeNull();
    expect(screen.getAllByTestId('browse-row-skeleton')).toHaveLength(2);
    // Rule 10: one wave on the page, never one per row.
    expect(container.querySelectorAll('[data-part="core"]')).toHaveLength(1);
    expect(animate).toHaveBeenCalled();
  });

  it('ends the loading dots on the core, with no large ringed dot after it (load_browse_d)', () => {
    const { container } = render(<BrowseSkeleton />);
    const wave = screen.getByRole('status').parentElement;
    expect(wave?.querySelectorAll('[data-part="dot"]')).toHaveLength(7);
    expect(wave?.querySelectorAll('[data-part="core"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-part="halo"]')).toHaveLength(0);
  });

  it('sets "Loading shows" after mount so the live region announces it', () => {
    // Server markup (no effects) carries an empty region; the text arrives
    // once the client mounts, which is the change a screen reader reads.
    const html = renderToString(<BrowseSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).not.toContain(CONSUMER_COPY.loadingShows);
    render(<BrowseSkeleton />);
    expect(screen.getByRole('status').textContent).toBe(
      CONSUMER_COPY.loadingShows,
    );
    expect(document.querySelector('[aria-busy]')).toBeNull();
  });

  it('leaves out the phone My artists chip it cannot know about', () => {
    render(<BrowseSkeleton />);
    const chips = screen.getByTestId('filter-bar-preview-chips');
    expect(within(chips).queryByText(FOLLOWING_COPY.chip)).toBeNull();
  });

  it('draws the desktop segmented bar at rest, as load_browse_d does', () => {
    render(<BrowseSkeleton />);
    const bar = screen.getByTestId('filter-bar-preview-bar');
    // Phone gets the chip row, sm and up the bar: never both on screen.
    expect(bar.className).toContain('hidden');
    expect(bar.className).toContain('sm:flex');
    expect(screen.getByTestId('filter-bar-preview-chips').className).toContain(
      'sm:hidden',
    );
    expect(within(bar).getByText(FOLLOWING_COPY.chip)).toBeTruthy();
    expect(within(bar).getByText(copy.segment.followOff)).toBeTruthy();
    expect(within(bar).getByTestId('switch-track')).toBeTruthy();
    const eyebrows = Array.from(
      bar.querySelectorAll('[data-preview-segment]'),
    ).map((node) => node.getAttribute('data-preview-segment'));
    expect(eyebrows).toEqual([
      copy.segment.whoEyebrow,
      copy.whenLabel,
      copy.whereLabel,
      copy.segment.priceEyebrow,
      copy.vibeLabel,
    ]);
    for (const value of [
      CREWS_COPY.lens.pickerNone,
      copy.segment.whenPlaceholder,
      copy.wherePlaceholder,
      copy.pricePlaceholder,
      copy.vibePlaceholder,
    ]) {
      expect(within(bar).getByText(value)).toBeTruthy();
    }
    expect(within(bar).getByText(copy.showCountPending)).toBeTruthy();
  });

  it('holds the live bar block heights so nothing moves on load', () => {
    render(<BrowseSkeleton />);
    const bar = screen.getByTestId('filter-bar-preview-bar');
    const [segmentBar, countRow] = Array.from(bar.children);
    expect(bar.className).toBe(SEGMENT_BLOCK_CLASS);
    expect(segmentBar?.className).toBe(SEGMENT_BAR_CLASS);
    expect(segmentBar).toHaveStyle({ minHeight: '62px' });
    expect(countRow?.className).toBe(COUNT_ROW_CLASS);
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
