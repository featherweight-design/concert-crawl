// @vitest-environment jsdom

// The desktop segmented filter bar (B+ B6a): from 640px up the chip row gives
// way to one bar of segments, a count line under it, and restyled popovers.
// jsdom has no layout or CSS, so the chip row and the bar both render here
// (the page shows one per width). Which overlay a tap opens is driven by
// mocking matchMedia.

import '@testing-library/jest-dom';
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

// Next's router is one stable object across renders; a fresh one per render
// would re-create every callback built on it.
const router = { push: vi.fn(), replace };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
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
import { VIBE_ORDER, getFilterOptions } from './filter-defs';
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

  it('one lapsed entitlement releases filterFollowing with one update', () => {
    // Both My artists instances are mounted (phone chip and desktop segment);
    // only one of them may run the release, or the bar writes the URL twice.
    searchParams.current = new URLSearchParams('filterFollowing=1');
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBar();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(lastQuery().get('filterFollowing')).toBeNull();
  });

  it('a locked My artists segment opens the plans picker', () => {
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBar();
    // The phone chip renders too (CSS hides it from sm up), so reach the
    // segment through the bar.
    fireEvent.click(
      within(screen.getByTestId('filter-segment-bar')).getByRole('button', {
        name: FOLLOWING_COPY.chipAria,
      }),
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

  it('counts shows in Cal view too (`bp-s-cal_d`)', () => {
    searchParams.current = new URLSearchParams('view=cal');
    renderBar({ showCount: 12 });
    expect(screen.getByTestId('filter-count-line').textContent).toBe(
      copy.showCount(12),
    );
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

  it.each(['filterFollowing=1', 'filterTaste=1'])(
    'says "match" and lights the bar when only a scope narrows (%s)',
    (scope) => {
      searchParams.current = new URLSearchParams(scope);
      renderBar({ showCount: 9 });
      expect(screen.getByTestId('filter-count-line').textContent).toBe(
        copy.showCountMatch(9),
      );
      expect(
        screen.getByTestId('filter-segment-bar').getAttribute('data-active'),
      ).toBe('true');
      // Scopes are modes, not dimensions: still no Clear all.
      expect(screen.queryByRole('button', { name: copy.clearAll })).toBeNull();
    },
  );

  it('offers no clear control beyond Clear all, the mobile ✕ and the segment ✕', () => {
    searchParams.current = new URLSearchParams('filterVibe=indie');
    renderBar();
    // Every button whose name or text mentions clearing. The old desktop
    // "× Clear filters" chip coming back would add a name to this list.
    const clearNames = screen
      .getAllByRole('button')
      .map(
        (button) =>
          button.getAttribute('aria-label') ?? button.textContent ?? '',
      )
      .filter((name) => /clear/i.test(name))
      .sort();
    expect(clearNames).toEqual(
      [
        copy.clearAll,
        copy.clearAllFiltersAriaLabel,
        copy.segment.clearAria(copy.vibeLabel),
      ].sort(),
    );
  });

  it('carries exactly one venue-chip, on the Where segment', () => {
    renderBar();
    const chips = screen.getAllByTestId('venue-chip');
    expect(chips).toHaveLength(1);
    expect(
      chips[0]?.closest('[data-segment]')?.getAttribute('data-segment'),
    ).toBe(copy.whereLabel);
  });

  it('names the dimension on every phone chip, set or not', () => {
    // The phone chip shows only its value, so without a hidden label a set
    // chip read "Red Rocks" with no dimension, and at rest only "Any vibe".
    searchParams.current = new URLSearchParams('filterVibe=electronic');
    renderBar();
    const bar = screen.getByTestId('filter-segment-bar');
    const phoneChips = screen
      .getAllByRole('button', { expanded: false })
      .filter(
        (button) =>
          button.getAttribute('aria-haspopup') === 'dialog' &&
          !bar.contains(button),
      );
    const names = phoneChips.map(
      (button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
    expect(names.some((name) => name.startsWith(`${copy.vibeLabel} `))).toBe(
      true,
    );
    expect(names.some((name) => name.startsWith(`${copy.whereLabel} `))).toBe(
      true,
    );
  });

  it('Where searches venues by name and toggles a pick without closing', () => {
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
    expect(lastQuery().getAll('filterWhere')).toEqual(['ogden-theatre']);
    // Multi-select: the popover stays open for the next pick.
    expect(screen.getByRole('dialog', { name: /filter$/ })).toBeTruthy();
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
    expect(within(dialog).getAllByTestId('genre-dot')).toHaveLength(16);
  });

  it('Vibe lists all 16 buckets in the board order, shows or not, two columns, each with its line', () => {
    // Only two buckets have shows; vibe_pop_d still draws every one.
    renderBar({ genres: ['comedy', 'indie'] });
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    const rows = within(dialog).getAllByTestId('vibe-option');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Electronic',
      'Hip-hop',
      'Pop',
      'Indie',
      'Rock',
      'Metal',
      'Punk',
      'Folk',
      'Country',
      'Jazz',
      'Latin',
      'Reggae',
      'Jam',
      'World',
      'Classical',
      'Comedy',
    ]);
    expect(rows[0]?.parentElement).toHaveClass('grid-cols-2');
    expect(
      within(dialog)
        .getAllByTestId('vibe-option-kind')
        .map((node) => node.textContent),
    ).toEqual(Object.values(copy.popover.vibeKinds));
  });

  it('an empty bucket can be picked and simply narrows to it', () => {
    renderBar({ genres: ['indie'] });
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Jazz' }));
    expect(lastQuery().getAll('filterVibe')).toEqual(['jazz']);
  });

  it('a checked Vibe row takes its genre color for its edge and its box', () => {
    searchParams.current = new URLSearchParams('filterVibe=electronic');
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    const electronic = within(dialog).getByRole('checkbox', {
      name: 'Electronic',
    });
    const indie = within(dialog).getByRole('checkbox', { name: 'Indie' });
    expect(electronic.style.borderColor).toContain('var(--genre-electronic)');
    expect(electronic.style.background).toContain('var(--genre-electronic)');
    expect(indie.style.borderColor).toBe('transparent');
    const box = within(electronic).getByTestId('checkbox-mark');
    expect(box.style.background).toBe('var(--genre-electronic)');
  });

  it('a checked Vibe row is drawn as vibe_pop_d measures it', () => {
    // Sampled from the board: a 1px edge at ~60% of the genre color, a ~10%
    // tint over the popover, a 20px box filled in the genre color with a dark
    // check. Unchecked rows keep an untinted, outlined box.
    searchParams.current = new URLSearchParams(
      'filterVibe=electronic&filterVibe=hip-hop',
    );
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    for (const [name, token] of [
      ['Electronic', 'var(--genre-electronic)'],
      ['Hip-hop', 'var(--genre-hip-hop)'],
    ] as const) {
      const row = within(dialog).getByRole('checkbox', { name });
      expect(row.style.borderWidth).toBe('1px');
      expect(row.style.borderStyle).toBe('solid');
      expect(row.style.borderColor).toBe(
        `color-mix(in oklab, ${token} 60%, transparent)`,
      );
      expect(row.style.background).toBe(
        `color-mix(in oklab, ${token} 10%, transparent)`,
      );
      const box = within(row).getByTestId('checkbox-mark');
      expect(box.style.width).toBe('20px');
      expect(box.style.background).toBe(token);
      const check = box.querySelector('path');
      expect(check?.getAttribute('stroke')).toBe('var(--fg-on-accent)');
    }
    const pop = within(dialog).getByRole('checkbox', { name: 'Pop' });
    expect(pop.style.background).toBe('');
    const popBox = within(pop).getByTestId('checkbox-mark');
    expect(popBox.style.background).toBe('transparent');
    expect(popBox.querySelector('path')).toBeNull();
  });

  it('Vibe ends on "Show N shows" with the events total, which closes it', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const footer = screen.getByTestId('filter-popover-footer');
    // Pinned outside the scrolling list, so it never scrolls away.
    expect(screen.getByTestId('filter-popover-body').contains(footer)).toBe(
      false,
    );
    const show = within(footer).getByRole('button', {
      name: copy.popover.vibeShow(214),
    });
    fireEvent.click(show);
    expect(screen.queryByRole('dialog', { name: /filter$/ })).toBeNull();
  });

  it('Vibe leaves the button out when there is no count to show', () => {
    renderBar({ showCount: null });
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    expect(screen.queryByTestId('filter-popover-footer')).toBeNull();
    expect(screen.queryByTestId('vibe-show')).toBeNull();
  });

  it('Where sorts venues ignoring a leading "The", row by row', () => {
    renderBar({
      venues: [
        venue('bluebird-theater', 'Bluebird Theater', 'Capitol Hill'),
        venue('the-black-box', 'The Black Box', 'Baker'),
        venue('ball-arena', 'Ball Arena', 'Central'),
        venue('the-church', 'The Church Nightclub', 'Capitol Hill'),
      ],
    });
    fireEvent.click(screen.getByTestId('venue-chip'));
    expect(
      screen
        .getAllByTestId('venue-option-name')
        .map((node) => node.textContent),
    ).toEqual([
      'Ball Arena',
      'The Black Box',
      'Bluebird Theater',
      'The Church Nightclub',
    ]);
  });

  it('Where and Vibe right-align to the bar instead of running past it', () => {
    const innerWidth = window.innerWidth;
    window.innerWidth = 1280;
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function measure(this: Element) {
        if (this.getAttribute('data-testid') === 'filter-segment-bar') {
          return new DOMRect(120, 176, 1040, 66);
        }
        const segment = this.getAttribute('data-segment');
        if (segment === copy.whereLabel) return new DOMRect(616, 180, 180, 56);
        if (segment === copy.vibeLabel) return new DOMRect(976, 180, 180, 56);
        return new DOMRect(0, 0, 0, 0);
      });
    try {
      renderBar();
      fireEvent.click(screen.getByTestId('venue-chip'));
      let popover = screen.getByTestId('filter-popover');
      // bp-f-filt_where_d: 620 wide, its right edge on the bar's at 1160.
      expect(popover.style.left).toBe('540px');
      expect(popover.style.width).toBe('620px');
      fireEvent.click(screen.getByTestId('venue-chip'));

      fireEvent.click(screen.getByTestId('filter-segment-vibe'));
      popover = screen.getByTestId('filter-popover');
      // vibe_pop_d: 560 wide, the same right edge.
      expect(popover.style.left).toBe('600px');
      expect(popover.style.width).toBe('560px');
    } finally {
      rect.mockRestore();
      window.innerWidth = innerWidth;
    }
  });

  it('keeps a foot margin outside the scrolling list, so no row is clipped at the edge', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    const popover = screen.getByTestId('filter-popover');
    const body = screen.getByTestId('filter-popover-body');
    expect(popover).toHaveClass('pb-4');
    expect(body.className).not.toMatch(/\bpb-/);
    expect(body).toHaveClass('overflow-y-auto', 'px-4');
  });

  it('draws the whole bar edge in the signal once a filter is on', () => {
    renderBar();
    const bar = screen.getByTestId('filter-segment-bar');
    expect(bar.getAttribute('data-active')).toBeNull();
    expect(bar.style.borderColor).toBe('var(--border-strong)');
    cleanup();
    searchParams.current = new URLSearchParams('filterPrice=under-25');
    renderBar();
    const active = screen.getByTestId('filter-segment-bar');
    expect(active.getAttribute('data-active')).toBe('true');
    expect(active.style.borderColor).toContain('var(--signal)');
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
    const pillSlot = screen.getByTestId('crew-lens-pill-slot');
    expect(pillSlot.classList.contains('sm:hidden')).toBe(true);
    expect(pillSlot.querySelector('button')).not.toBeNull();

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

  it("an open segment's own trigger closes it rather than reopening", () => {
    renderBar();
    const trigger = screen.getByTestId('filter-segment-price');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // A real press: pointerdown reaches the window listener before the click.
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('an outside press still closes the popover', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-price'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to the opener when a pick closes the popover', () => {
    renderBar();
    const trigger = screen.getByTestId('filter-segment-price');
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    const option = within(dialog).getByRole('button', {
      name: copy.priceUnder25,
    });
    option.focus();
    fireEvent.click(option);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the opener on Escape', () => {
    renderBar();
    const trigger = screen.getByTestId('venue-chip');
    fireEvent.click(trigger);
    // The Where search field takes focus on open.
    expect(document.activeElement?.getAttribute('type')).toBe('search');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("moves focus to the segment's opener when its ✕ clears it", () => {
    searchParams.current = new URLSearchParams('filterPrice=under-25');
    renderBar();
    const clear = screen.getByRole('button', {
      name: copy.segment.clearAria(copy.segment.priceEyebrow),
    });
    clear.focus();
    fireEvent.click(clear);
    expect(document.activeElement).toBe(
      screen.getByTestId('filter-segment-price'),
    );
  });

  it("moves focus to the bar's first segment when Clear all is used", () => {
    searchParams.current = new URLSearchParams('filterPrice=under-25');
    renderBar();
    const clearAll = screen.getByRole('button', { name: copy.clearAll });
    clearAll.focus();
    fireEvent.click(clearAll);
    expect(document.activeElement).toBe(
      screen.getByTestId('filter-segment-who'),
    );
  });
});

// Where and Vibe are multi-select (Design addendum 2, item 6; boards
// `bp-f-filt_active_d`, `bp-f-filt_where_d`, `filt_m_active`).
describe('FilterBar multi-select Where and Vibe', () => {
  const openWhere = () => {
    fireEvent.click(screen.getByTestId('venue-chip'));
    return screen.getByRole('dialog', { name: /filter$/ });
  };

  it('Where rows are checkboxes, checked from every repeated key', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const dialog = openWhere();
    const boxes = within(dialog).getAllByRole('checkbox');
    expect(boxes).toHaveLength(VENUES.length);
    const checked = boxes
      .filter((box) => box.getAttribute('aria-checked') === 'true')
      .map((box) => box.textContent);
    expect(checked).toHaveLength(2);
    expect(checked.some((text) => text?.includes('Bluebird Theater'))).toBe(
      true,
    );
    expect(checked.some((text) => text?.includes('Ogden Theatre'))).toBe(true);
    expect(
      within(dialog)
        .getByRole('checkbox', { name: /Globe Hall/ })
        .getAttribute('aria-checked'),
    ).toBe('false');
    // The earlier single-select pass's pressed-button rows are gone.
    expect(within(dialog).queryByRole('button', { pressed: true })).toBeNull();
  });

  it('a second pick adds a repeated key and keeps the other params', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterPrice=under-25&view=list&offset=40',
    );
    renderBar();
    const dialog = openWhere();
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /Ogden Theatre/ }),
    );
    const query = lastQuery();
    expect(query.getAll('filterWhere')).toEqual([
      'bluebird-theater',
      'ogden-theatre',
    ]);
    expect(query.get('filterPrice')).toBe('under-25');
    expect(query.get('view')).toBe('list');
    // A filter change starts the list over.
    expect(query.get('offset')).toBeNull();
    expect(screen.getByRole('dialog', { name: /filter$/ })).toBeTruthy();
  });

  it('picking a checked venue toggles it off', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const dialog = openWhere();
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /Bluebird Theater/ }),
    );
    expect(lastQuery().getAll('filterWhere')).toEqual(['ogden-theatre']);
  });

  it('toggling the last venue off removes the key', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=ogden-theatre&filterVibe=indie',
    );
    renderBar();
    const dialog = openWhere();
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /Ogden Theatre/ }),
    );
    const query = lastQuery();
    expect(query.has('filterWhere')).toBe(false);
    expect(query.getAll('filterVibe')).toEqual(['indie']);
  });

  it('Vibe rows are checkboxes that add and remove repeated keys', () => {
    searchParams.current = new URLSearchParams('filterVibe=electronic');
    renderBar();
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    const dialog = screen.getByRole('dialog', { name: /filter$/ });
    const indie = within(dialog).getByRole('checkbox', { name: 'Indie' });
    const electronic = within(dialog).getByRole('checkbox', {
      name: 'Electronic',
    });
    expect(electronic.getAttribute('aria-checked')).toBe('true');
    expect(indie.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(indie);
    expect(lastQuery().getAll('filterVibe')).toEqual(['electronic', 'indie']);
    expect(screen.getByRole('dialog', { name: /filter$/ })).toBeTruthy();

    // The second tick builds on the first, not on the URL it hasn't reached.
    fireEvent.click(electronic);
    expect(lastQuery().getAll('filterVibe')).toEqual(['indie']);
    fireEvent.click(indie);
    expect(lastQuery().has('filterVibe')).toBe(false);
  });

  it('two quick Where ticks both survive before the URL catches up', () => {
    // The mocked router never moves `useSearchParams()`, exactly the window a
    // real round trip leaves open between two quick ticks.
    searchParams.current = new URLSearchParams('filterPrice=under-25');
    renderBar();
    const dialog = openWhere();
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /Ogden Theatre/ }),
    );
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /Globe Hall/ }),
    );
    const query = lastQuery();
    expect(query.getAll('filterWhere')).toEqual([
      'ogden-theatre',
      'globe-hall',
    ]);
    expect(query.get('filterPrice')).toBe('under-25');
    // The ticks show at once, before the server answers.
    expect(
      within(dialog)
        .getAllByRole('checkbox')
        .filter((box) => box.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(2);
  });

  it('a quick Vibe tick keeps a Where tick still in flight', () => {
    renderBar();
    const dialog = openWhere();
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /Ogden Theatre/ }),
    );
    fireEvent.click(screen.getByTestId('filter-segment-vibe'));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: /filter$/ })).getByRole(
        'checkbox',
        { name: 'Indie' },
      ),
    );
    const query = lastQuery();
    expect(query.getAll('filterWhere')).toEqual(['ogden-theatre']);
    expect(query.getAll('filterVibe')).toEqual(['indie']);
  });

  it('at 25 venues the unticked Where rows are disabled', () => {
    const many = Array.from({ length: 26 }, (_, index) =>
      venue(`venue-${index}`, `Venue ${String(index).padStart(2, '0')}`, ''),
    );
    searchParams.current = new URLSearchParams(
      many
        .slice(0, 25)
        .map((item) => `filterWhere=${item.slug}`)
        .join('&'),
    );
    renderBar({ venues: many });
    const dialog = openWhere();
    const last = within(dialog).getByRole('checkbox', { name: /Venue 25/ });
    expect(last.hasAttribute('disabled')).toBe(true);
    fireEvent.click(last);
    expect(replace).not.toHaveBeenCalled();
    // A ticked row stays live, so a pick can still be taken back.
    const first = within(dialog).getByRole('checkbox', { name: /Venue 00/ });
    expect(first.hasAttribute('disabled')).toBe(false);
  });

  it('under 25 venues no Where row is disabled', () => {
    searchParams.current = new URLSearchParams('filterWhere=ogden-theatre');
    renderBar();
    const dialog = openWhere();
    expect(
      within(dialog)
        .getAllByRole('checkbox')
        .some((box) => box.hasAttribute('disabled')),
    ).toBe(false);
  });

  it('labels from the first venue that resolves when the first is stale', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=gone-venue&filterWhere=ogden-theatre',
    );
    renderBar();
    const where = screen.getByTestId('venue-chip');
    expect(within(where).getByTestId('segment-value').textContent).toBe(
      'Ogden +1',
    );
  });

  it('the Where segment reads "Bluebird +1" over two stacked tiles', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const where = screen.getByTestId('venue-chip');
    expect(where.textContent).toContain('Bluebird +1');
    const stack = within(where).getByTestId('segment-venue-stack');
    expect(stack.children).toHaveLength(2);
    // The count is its own non-shrinking node, so a narrow segment
    // ellipsises the name ("Red Ro…") and never hides the "+1".
    const more = within(where).getByTestId('segment-more');
    expect(more.textContent).toBe(' +1');
    expect(more).toHaveClass('shrink-0');
  });

  it('sets "+1" one word space after the name, with no flex gap between', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const where = screen.getByTestId('venue-chip');
    const value = within(where).getByTestId('segment-value');
    // The name and the count share one run: the space is a real space,
    // kept by whitespace-pre, not a flex gap that reads as two.
    expect(value.className).not.toMatch(/\bgap-/);
    expect(value.textContent).toBe('Bluebird +1');
    const more = within(where).getByTestId('segment-more');
    expect(more.parentElement).toBe(value);
    expect(more).toHaveClass('whitespace-pre');
    // Only the name ellipsises.
    expect(value.firstElementChild).toHaveClass('truncate');
  });

  it('draws the Where pair as the board does: two 18px tiles', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const stack = within(screen.getByTestId('venue-chip')).getByTestId(
      'segment-venue-stack',
    );
    expect(stack.children).toHaveLength(2);
    for (const tile of Array.from(stack.children)) {
      expect(tile.getAttribute('width')).toBe('18');
    }
  });

  it('the Vibe segment reads "Electronic +1" over two stacked dots', () => {
    searchParams.current = new URLSearchParams(
      'filterVibe=electronic&filterVibe=indie',
    );
    renderBar();
    const vibe = screen.getByTestId('filter-segment-vibe');
    expect(vibe.textContent).toContain('Electronic +1');
    const stack = within(vibe).getByTestId('segment-vibe-stack');
    expect(within(stack).getAllByTestId('genre-dot')).toHaveLength(2);
  });

  it('a single pick still reads as the short name', () => {
    searchParams.current = new URLSearchParams('filterWhere=bluebird-theater');
    renderBar();
    const where = screen.getByTestId('venue-chip');
    expect(where.textContent).toContain('Bluebird');
    expect(where.textContent).not.toContain('+');
  });

  it('the phone chips read "2 venues" and "2 vibes"', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre&filterVibe=electronic&filterVibe=indie',
    );
    renderBar();
    const bar = screen.getByTestId('filter-segment-bar');
    const phoneChipText = screen
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-haspopup') === 'dialog' &&
          !bar.contains(button),
      )
      .map((button) => button.textContent ?? '');
    expect(
      phoneChipText.some((text) => text.includes(copy.venueCount(2))),
    ).toBe(true);
    expect(phoneChipText.some((text) => text.includes(copy.vibeCount(2)))).toBe(
      true,
    );
    expect(copy.venueCount(2)).toBe('2 venues');
    expect(copy.vibeCount(2)).toBe('2 vibes');
  });

  it("a segment's ✕ clears every value in its dimension", () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre&filterVibe=indie&filterVibe=electronic',
    );
    renderBar();
    fireEvent.click(
      screen.getByRole('button', {
        name: copy.segment.clearAria(copy.whereLabel),
      }),
    );
    const query = lastQuery();
    expect(query.has('filterWhere')).toBe(false);
    expect(query.getAll('filterVibe')).toEqual(['indie', 'electronic']);
  });

  it('Clear all removes both lists and keeps the scopes', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre&filterVibe=indie&filterVibe=electronic&filterFollowing=1',
    );
    renderBar({ showCount: 4 });
    expect(screen.getByTestId('filter-count-line').textContent).toBe(
      copy.showCountMatch(4),
    );
    fireEvent.click(screen.getByRole('button', { name: copy.clearAll }));
    const query = lastQuery();
    expect(query.has('filterWhere')).toBe(false);
    expect(query.has('filterVibe')).toBe(false);
    expect(query.get('filterFollowing')).toBe('1');
  });

  it('round-trips the URL: what it writes reads back as the same picks', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Ogden Theatre/ }));
    const written = lastQuery();
    expect(written.toString()).toBe('filterWhere=ogden-theatre');

    cleanup();
    searchParams.current = written;
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Bluebird Theater/ }));
    const second = lastQuery();
    expect(second.toString()).toBe(
      'filterWhere=ogden-theatre&filterWhere=bluebird-theater',
    );

    cleanup();
    searchParams.current = second;
    renderBar();
    expect(screen.getByTestId('venue-chip').textContent).toContain('Ogden +1');
    fireEvent.click(screen.getByTestId('venue-chip'));
    expect(
      screen
        .getAllByRole('checkbox')
        .filter((box) => box.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(2);
  });

  it('reads a legacy single value and drops blanks and duplicates', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=ogden-theatre&filterWhere=&filterWhere=ogden-theatre',
    );
    renderBar();
    expect(screen.getByTestId('venue-chip').textContent).toContain('Ogden');
    expect(screen.getByTestId('venue-chip').textContent).not.toContain('+');
  });
});

describe('FilterBar phone sheet, multi-select', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
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

  it('the Where sheet toggles checkboxes and stays open', () => {
    searchParams.current = new URLSearchParams('filterWhere=bluebird-theater');
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    const sheet = screen.getByRole('dialog', { name: /filter$/ });
    expect(
      within(sheet)
        .getByRole('checkbox', { name: 'Bluebird Theater' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Ogden Theatre' }),
    );
    expect(lastQuery().getAll('filterWhere')).toEqual([
      'bluebird-theater',
      'ogden-theatre',
    ]);
    expect(screen.getByRole('dialog', { name: /filter$/ })).toBeTruthy();
  });

  it('the Vibe sheet lists all 16 buckets in the board order, shows or not', () => {
    // The page only has shows in two genres; the sheet still lists every
    // bucket, as `bp-vibe-vibe_sheet_m` and the desktop popover do.
    renderBar({ genres: ['indie', 'electronic'] });
    const vibeChip = screen
      .getAllByRole('button', { expanded: false })
      .find(
        (button) =>
          button.getAttribute('aria-haspopup') === 'dialog' &&
          button.textContent?.startsWith(`${copy.vibeLabel} `),
      );
    if (!vibeChip) throw new Error('no phone Vibe chip');
    fireEvent.click(vibeChip);
    const sheet = screen.getByRole('dialog', { name: /filter$/ });
    const rows = within(sheet)
      .getAllByRole('checkbox')
      .map((box) => box.textContent);
    expect(rows).toEqual(
      getFilterOptions('vibe', [], [...VIBE_ORDER]).map(
        (option) => option.label,
      ),
    );
    expect(rows).toHaveLength(16);
  });

  it('two quick sheet ticks both survive', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('venue-chip'));
    const sheet = screen.getByRole('dialog', { name: /filter$/ });
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Ogden Theatre' }),
    );
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Globe Hall' }),
    );
    expect(lastQuery().getAll('filterWhere')).toEqual([
      'ogden-theatre',
      'globe-hall',
    ]);
  });
});
