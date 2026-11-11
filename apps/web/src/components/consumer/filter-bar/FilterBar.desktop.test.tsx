// @vitest-environment jsdom

// The desktop segmented filter bar (B+ B6a): from 640px up the chip row gives
// way to one bar of segments, a count line under it, and restyled popovers.
// jsdom has no layout, so `isDesktop` is driven by mocking matchMedia.

import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CrewSummary, VenuePublic } from '@concert-crawl/types';
import type { EntitlementResult } from '@/lib/queries/use-entitlement';

const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }));
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }));

const searchParams = { current: new URLSearchParams() };
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => '/events',
  useSearchParams: () => searchParams.current,
}));

const entitlement: { current: EntitlementResult } = {
  current: { isLoading: false, active: true, surface: 'visible-active' },
};
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: (key: string) =>
    key === 'following'
      ? entitlement.current
      : { isLoading: false, active: false, surface: null },
}));

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}));

import { FilterBar } from './FilterBar';
import { CREWS_COPY } from '@/components/consumer/crews/definitions/copy';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';

const copy = CONSUMER_COPY.filterBar;

const venue = (slug: string, name: string, neighborhood: string) =>
  ({
    id: slug,
    name,
    slug,
    city: 'Denver',
    timezone: 'America/Denver',
    websiteUrl: 'https://example.com',
    active: true,
    verified: true,
    address: null,
    capacity: null,
    venueType: null,
    about: null,
    neighborhood,
    featured: false,
    lat: null,
    lng: null,
    upcomingCount: 0,
    guide: null,
  }) satisfies VenuePublic;

const VENUES: VenuePublic[] = [
  venue('ogden-theatre', 'Ogden Theatre', 'Capitol Hill'),
  venue('bluebird-theater', 'Bluebird Theater', 'Capitol Hill'),
  venue('globe-hall', 'Globe Hall', 'Globeville'),
];

const crew: CrewSummary = {
  id: 'crew_1',
  name: 'Night Shift',
  patchSalt: 1,
  memberCount: 3,
  members: [],
  upcomingCount: 2,
  isKeeper: false,
  muted: false,
};

const lastQuery = () => {
  const url: unknown = replace.mock.calls.at(-1)?.[0];
  return new URLSearchParams(String(url).split('?')[1] ?? '');
};

beforeEach(() => {
  searchParams.current = new URLSearchParams();
  replace.mockClear();
  entitlement.current = {
    isLoading: false,
    active: true,
    surface: 'visible-active',
  };
  useFeatureFlag.mockImplementation((key: string) => ({
    isLoading: false,
    enabled: key === 'crews',
  }));
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(cleanup);

const renderBar = (
  overrides: Partial<React.ComponentProps<typeof FilterBar>> = {},
) =>
  render(
    <FilterBar
      venues={VENUES}
      genres={['indie', 'electronic']}
      crews={[crew]}
      followCount={12}
      showCount={214}
      {...overrides}
    />,
  );

describe('FilterBar desktop segmented bar', () => {
  it('orders the segments My artists, Who, When, Where, Price, Vibe', () => {
    renderBar();
    const bar = screen.getByTestId('filter-segment-bar');
    const follow = within(bar).getByRole('switch', {
      name: FOLLOWING_COPY.chipAria,
    });
    const eyebrows = Array.from(bar.querySelectorAll('[data-segment]')).map(
      (node) => node.getAttribute('data-segment'),
    );
    expect(eyebrows).toEqual([
      copy.segment.whoEyebrow,
      copy.whenLabel,
      copy.whereLabel,
      copy.segment.priceEyebrow,
      copy.vibeLabel,
    ]);
    // My artists leads, before every other segment.
    const firstSegment = bar.querySelector('[data-segment]');
    expect(
      firstSegment &&
        follow.compareDocumentPosition(firstSegment) &
          Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows resting values and hides When in Cal view', () => {
    searchParams.current = new URLSearchParams('view=cal');
    renderBar();
    const bar = screen.getByTestId('filter-segment-bar');
    expect(bar.querySelector('[data-segment="When"]')).toBeNull();
    expect(within(bar).getByText(copy.wherePlaceholder)).toBeTruthy();
    expect(within(bar).getByText(copy.segment.followOff)).toBeTruthy();
  });

  it('the My artists switch reads its count and drives filterFollowing', () => {
    searchParams.current = new URLSearchParams('filterFollowing=1');
    renderBar();
    const toggle = screen.getByRole('switch', {
      name: FOLLOWING_COPY.chipAria,
    });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.textContent).toContain(copy.segment.followedCount(12));
    fireEvent.click(toggle);
    expect(lastQuery().get('filterFollowing')).toBeNull();
  });

  it('a locked My artists segment opens the plans picker', () => {
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBar();
    fireEvent.click(
      screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
    );
    expect(screen.getByTestId('tier-picker')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("an active segment's ✕ clears only its own param", () => {
    searchParams.current = new URLSearchParams(
      'filterWhen=tonight&filterPrice=under-25',
    );
    renderBar();
    fireEvent.click(
      screen.getByRole('button', {
        name: copy.segment.clearAria(copy.whenLabel),
      }),
    );
    const query = lastQuery();
    expect(query.get('filterWhen')).toBeNull();
    expect(query.get('filterPrice')).toBe('under-25');
    // A resting segment carries no ✕.
    expect(
      screen.queryByRole('button', {
        name: copy.segment.clearAria(copy.vibeLabel),
      }),
    ).toBeNull();
  });

  it('counts shows at rest', () => {
    renderBar();
    expect(screen.getByTestId('filter-count-line').textContent).toBe(
      copy.showCount(214),
    );
    expect(screen.queryByRole('button', { name: copy.clearAll })).toBeNull();
  });

  it('counts matches and offers Clear all once a filter is on', () => {
    searchParams.current = new URLSearchParams(
      'filterVibe=indie&filterWhere=globe-hall&filterFollowing=1',
    );
    renderBar({ showCount: 4 });
    expect(screen.getByTestId('filter-count-line').textContent).toBe(
      copy.showCountMatch(4),
    );
    fireEvent.click(screen.getByRole('button', { name: copy.clearAll }));
    const query = lastQuery();
    expect(query.get('filterVibe')).toBeNull();
    expect(query.get('filterWhere')).toBeNull();
    // Clear all keeps its old reach: scopes are modes, not dimensions.
    expect(query.get('filterFollowing')).toBe('1');
  });

  it('drops the old "Clear filters" chip', () => {
    searchParams.current = new URLSearchParams('filterVibe=indie');
    renderBar();
    expect(screen.queryByText(/Clear filters/)).toBeNull();
  });

  it('carries exactly one venue-chip, on the Where segment', () => {
    renderBar();
    const chips = screen.getAllByTestId('venue-chip');
    expect(chips).toHaveLength(1);
    expect(
      chips[0]?.closest('[data-segment]')?.getAttribute('data-segment'),
    ).toBe(copy.whereLabel);
  });

  it('Where searches venues by name and applies a pick', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    expect(within(dialog).getByText(copy.popover.whereSub)).toBeTruthy();
    expect(within(dialog).getByText('Globeville')).toBeTruthy();

    fireEvent.change(
      within(dialog).getByRole('searchbox', { name: copy.popover.whereSearch }),
      { target: { value: 'og' } },
    );
    expect(within(dialog).getByText('Ogden Theatre')).toBeTruthy();
    expect(within(dialog).queryByText('Bluebird Theater')).toBeNull();

    fireEvent.click(within(dialog).getByText('Ogden Theatre'));
    expect(lastQuery().get('filterWhere')).toBe('ogden-theatre');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Where says so when no venue matches', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    fireEvent.change(
      screen.getByRole('searchbox', { name: copy.popover.whereSearch }),
      { target: { value: 'zzz' } },
    );
    expect(screen.getByText(copy.popover.whereNoMatch)).toBeTruthy();
  });

  it('Vibe teaches the genre colors and dots every option', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    expect(within(dialog).getByText(copy.popover.vibeSub)).toBeTruthy();
    expect(within(dialog).getAllByTestId('genre-dot')).toHaveLength(2);
  });

  it('the popover Clear resets its filter', () => {
    searchParams.current = new URLSearchParams('filterPrice=under-25');
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-price'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    fireEvent.click(
      within(dialog).getByRole('button', { name: copy.popover.clear }),
    );
    expect(lastQuery().get('filterPrice')).toBeNull();
  });

  it('Who moves into the bar and picks a crew lens', () => {
    renderBar();
    const who = screen.getByTestId('filter-segment-who');
    expect(who.textContent).toContain(CREWS_COPY.lens.pickerNone);
    // The heading's pill is mobile only from here up.
    expect(
      document.querySelector('.sm\\:hidden [aria-haspopup="dialog"]'),
    ).not.toBeNull();

    fireEvent.click(who);
    const dialog = screen.getByRole('dialog', {
      name: `${copy.popover.whoTitle} filter`,
    });
    fireEvent.click(within(dialog).getByRole('radio', { name: /Night Shift/ }));
    expect(lastQuery().get('crew')).toBe('crew_1');
  });

  it('an active Who names the crew and clears the lens', () => {
    searchParams.current = new URLSearchParams('crew=crew_1');
    renderBar();
    expect(screen.getByTestId('filter-segment-who').textContent).toContain(
      crew.name,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: copy.segment.clearAria(copy.segment.whoEyebrow),
      }),
    );
    expect(lastQuery().get('crew')).toBeNull();
  });

  it('leaves Who out without crews', () => {
    renderBar({ crews: [] });
    expect(screen.queryByTestId('filter-segment-who')).toBeNull();
  });
});
