// @vitest-environment jsdom

// The phone filters (B+ B6b): one Filters pill with a count, the My artists
// switch, removable chips for what is on, and one sheet whose picks are staged
// and applied together by "Show N shows". jsdom has no CSS, so the desktop bar
// renders here too; everything is reached through the phone row and sheet.

import '@testing-library/jest-dom';
import {
  act,
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CrewSummary, VenuePublic } from '@concert-crawl/types';

const { useFeatureFlag, useDraftShowCount } = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
  useDraftShowCount: vi.fn(),
}));
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }));
vi.mock('./useDraftShowCount', () => ({ useDraftShowCount }));

const searchParams = { current: new URLSearchParams() };
const replace = vi.fn();
const router = { push: vi.fn(), replace };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/events',
  useSearchParams: () => searchParams.current,
}));

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: (key: string) =>
    key === 'following'
      ? { isLoading: false, active: true, surface: 'visible-active' }
      : { isLoading: false, active: false, surface: null },
}));
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: () => null,
}));

import { FilterBar } from './FilterBar';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { VIBE_ORDER, getFilterOptions } from './filter-defs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CREWS_COPY } from '@/components/consumer/crews/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';

const copy = CONSUMER_COPY.filterBar;

const venue = (slug: string, name: string, upcomingCount: number) =>
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
    neighborhood: 'Capitol Hill',
    featured: false,
    lat: null,
    lng: null,
    upcomingCount,
    guide: null,
  }) satisfies VenuePublic;

const VENUES: VenuePublic[] = [
  venue('ogden-theatre', 'Ogden Theatre', 30),
  venue('bluebird-theater', 'Bluebird Theater', 40),
  venue('globe-hall', 'Globe Hall', 20),
  venue('gothic-theatre', 'Gothic Theatre', 25),
  venue('the-church', 'The Church Nightclub', 12),
  venue('larimer-lounge', 'Larimer Lounge', 15),
  venue('mission-ballroom', 'The Mission Ballroom', 35),
  venue('red-rocks', 'Red Rocks Amphitheatre', 50),
  venue('hi-dive', 'Hi-Dive', 8),
  venue('black-box', 'The Black Box', 3),
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

/** The sheet's sections, by their eyebrow, in order. */
const sectionsOf = (sheet: HTMLElement) =>
  Array.from(sheet.querySelectorAll('[data-section]')).map((section) =>
    section.getAttribute('data-section'),
  );

const openSheet = () => {
  fireEvent.click(screen.getByTestId('filters-button'));
  return screen.getByRole('dialog', { name: copy.phone.filters });
};

beforeEach(() => {
  searchParams.current = new URLSearchParams();
  replace.mockClear();
  useDraftShowCount.mockReset();
  useDraftShowCount.mockImplementation((query: string | null) =>
    query === null ? { status: 'none' } : { status: 'ready', count: 23 },
  );
  useFeatureFlag.mockImplementation((key: string) => ({
    isLoading: false,
    enabled: key === 'crews',
  }));
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

afterEach(cleanup);

describe('FilterBar phone row', () => {
  it('keeps the crew pill out of the heading row, so the title fits at 320', () => {
    renderBar();
    expect(screen.queryByTestId('crew-lens-pill-slot')).toBeNull();
    const headingRow = screen.getByRole('heading', { level: 1 }).parentElement
      ?.parentElement;
    if (!headingRow) throw new Error('no heading row');
    // Only the List/Cal toggle sits beside the title.
    expect(
      within(headingRow)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([copy.viewList, copy.viewCal]);
    expect(within(headingRow).queryByText(crew.name)).toBeNull();
  });

  it('rests as the Filters pill and the My artists switch, with no chips', () => {
    renderBar();
    const row = screen.getByTestId('phone-filter-row');
    const button = within(row).getByTestId('filters-button');
    expect(button).toHaveTextContent(copy.phone.filters);
    expect(button).toHaveAccessibleName(copy.phone.filtersAria(0));
    expect(within(row).queryByTestId('filters-count')).toBeNull();
    expect(
      within(row).getByRole('switch', { name: FOLLOWING_COPY.chipAria }),
    ).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByTestId('phone-filter-chips')).toBeNull();
    // The old chip row is gone: no "Any date" pill runs off the edge.
    expect(within(row).queryByText(copy.whenPlaceholder)).toBeNull();
  });

  it('counts what is on, the crew lens included, and lists each as a chip', () => {
    searchParams.current = new URLSearchParams(
      'crew=crew_1&filterWhen=this-weekend&filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    expect(screen.getByTestId('filters-count')).toHaveTextContent('3');
    expect(screen.getByTestId('filters-button')).toHaveAccessibleName(
      copy.phone.filtersAria(3),
    );
    const chips = within(screen.getByTestId('phone-filter-chips'))
      .getAllByRole('button')
      .map((chip) => chip.textContent);
    expect(chips).toEqual([
      crew.name,
      copy.whenThisWeekend,
      copy.venueCount(2),
    ]);
  });

  it("rings each tucked venue tile in the chip's fill, and only on the phone", () => {
    searchParams.current = new URLSearchParams(
      'crew=crew_1&filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const chips = screen.getByTestId('phone-filter-chips');
    const rings = within(screen.getByTestId('chip-venue-stack')).getAllByTestId(
      'stack-ring',
    );
    expect(rings).toHaveLength(2);
    for (const ring of rings) {
      expect(ring).toHaveStyle({ boxShadow: '0 0 0 2px var(--surface-2)' });
      expect(ring).toHaveClass('rounded-[4px]');
    }
    // `browse-active-320` rings the tiles alone: the crew patch has none,
    // and the desktop segment's stack stays as B6a drew it.
    expect(within(chips).getAllByTestId('stack-ring')).toHaveLength(2);
    expect(
      within(screen.getByTestId('segment-venue-stack')).queryByTestId(
        'stack-ring',
      ),
    ).toBeNull();
  });

  it("a chip's ✕ removes only its own filter and resets the offset", () => {
    searchParams.current = new URLSearchParams(
      'filterWhen=this-weekend&filterVibe=indie&offset=40',
    );
    renderBar();
    fireEvent.click(
      screen.getByRole('button', {
        name: copy.segment.clearAria(copy.whenThisWeekend),
      }),
    );
    expect(lastQuery().get('filterWhen')).toBeNull();
    expect(lastQuery().getAll('filterVibe')).toEqual(['indie']);
    expect(lastQuery().get('offset')).toBeNull();
  });

  it('a removed chip hands focus to the Filters pill', () => {
    searchParams.current = new URLSearchParams('filterVibe=indie');
    renderBar();
    const chip = within(screen.getByTestId('phone-filter-chips')).getByRole(
      'button',
    );
    chip.focus();
    fireEvent.click(chip);
    expect(screen.getByTestId('filters-button')).toHaveFocus();
  });

  it('a pick that resolves to nothing still counts, as a chip under its dimension', () => {
    searchParams.current = new URLSearchParams('filterWhere=closed-venue');
    renderBar();
    expect(screen.getByTestId('filters-count')).toHaveTextContent('1');
    const chips = within(screen.getByTestId('phone-filter-chips'))
      .getAllByRole('button')
      .map((chip) => chip.textContent);
    expect(chips).toEqual([copy.whereLabel]);
  });
});

describe('FilterBar phone sheet, nothing changed', () => {
  it('"Show N shows" just closes: the page, window and URL stay', () => {
    searchParams.current = new URLSearchParams('from=2026-11-01&offset=40');
    renderBar();
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByTestId('filter-sheet-show'));
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('phone-filter-sheet')).toBeNull();
  });
});

describe('FilterBar phone sheet', () => {
  it('holds Who, When, Where, Price and Vibe in one sheet', () => {
    renderBar();
    const sheet = openSheet();
    expect(screen.getByTestId('filters-button')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(sectionsOf(sheet)).toEqual([
      copy.segment.whoEyebrow,
      copy.whenLabel,
      copy.whereLabel,
      copy.segment.priceEyebrow,
      copy.vibeLabel,
    ]);
    // Single-choice sections are radiogroups; Where and Vibe pick several.
    expect(
      within(sheet)
        .getAllByRole('radiogroup')
        .map((group) => group.getAttribute('aria-label')),
    ).toEqual([
      copy.segment.whoEyebrow,
      copy.whenLabel,
      copy.segment.priceEyebrow,
    ]);
    expect(
      within(sheet)
        .getAllByRole('group')
        .map((group) => group.getAttribute('aria-label')),
    ).toEqual([copy.whereLabel, copy.vibeLabel]);
    expect(
      within(sheet).getByRole('button', { name: copy.clearAll }),
    ).toBeTruthy();
  });

  it('Who, When and Price are radios: one checked, one tab stop, arrows move', () => {
    searchParams.current = new URLSearchParams('filterPrice=tbd');
    renderBar();
    const sheet = openSheet();
    const price = within(sheet).getByRole('radiogroup', {
      name: copy.segment.priceEyebrow,
    });
    const radios = within(price).getAllByRole('radio');
    expect(
      radios.filter((radio) => radio.getAttribute('aria-checked') === 'true'),
    ).toEqual([within(price).getByRole('radio', { name: copy.priceTbd })]);
    // The checked pill is the group's one tab stop.
    expect(radios.filter((radio) => radio.tabIndex === 0)).toEqual([
      within(price).getByRole('radio', { name: copy.priceTbd }),
    ]);
    fireEvent.keyDown(price, { key: 'Home' });
    expect(radios[0]).toHaveFocus();
    fireEvent.keyDown(price, { key: 'ArrowRight' });
    expect(radios[1]).toHaveFocus();
    // A pick replaces the last one: still one checked.
    fireEvent.click(radios[1]!);
    expect(
      within(price)
        .getAllByRole('radio')
        .filter((radio) => radio.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(1);
    // Who starts on Everyone, the lens off.
    expect(
      within(sheet).getByRole('radio', { name: CREWS_COPY.lens.pickerNone }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('stages picks and applies them together with "Show N shows"', () => {
    searchParams.current = new URLSearchParams('offset=40&view=list');
    renderBar();
    const sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenThisWeekend }),
    );
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Ogden Theatre' }),
    );
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Indie' }));
    // Nothing reaches the URL until the button.
    expect(replace).not.toHaveBeenCalled();
    const show = within(sheet).getByTestId('filter-sheet-show');
    expect(show).toHaveTextContent(copy.popover.vibeShow(23));
    fireEvent.click(show);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(lastQuery().get('filterWhen')).toBe('this-weekend');
    expect(lastQuery().getAll('filterWhere')).toEqual(['ogden-theatre']);
    expect(lastQuery().getAll('filterVibe')).toEqual(['indie']);
    expect(lastQuery().get('offset')).toBeNull();
    expect(lastQuery().get('view')).toBe('list');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('counts the draft: the page URL with the picks laid over it, no offset', () => {
    searchParams.current = new URLSearchParams(
      'offset=40&filterPrice=under-25',
    );
    renderBar();
    const sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    const query = new URLSearchParams(
      String(useDraftShowCount.mock.calls.at(-1)?.[0]),
    );
    expect(query.get('filterWhen')).toBe('tonight');
    expect(query.get('filterPrice')).toBe('under-25');
    expect(query.get('offset')).toBeNull();
  });

  it('closing any other way drops the draft', () => {
    renderBar();
    let sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    sheet = openSheet();
    expect(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('closes, draft dropped, once the width crosses to desktop', () => {
    // A phone turned to landscape past 640px hides the `sm:hidden` sheet; it
    // must not leave its focus trap and Escape listener live behind the bar.
    let wide = false;
    const listeners = new Set<() => void>();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return query.includes('min-width') ? wide : !wide;
        },
        media: query,
        addEventListener: (_: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          listeners.delete(listener),
      })),
    });
    renderBar();
    const sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    act(() => {
      wide = true;
      for (const listener of listeners) listener();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('Clear all empties the draft, and applying it clears the window too', () => {
    searchParams.current = new URLSearchParams(
      'filterWhen=tonight&from=2026-11-01&filterVibe=indie&crew=crew_1',
    );
    renderBar();
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByRole('button', { name: copy.clearAll }));
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(within(sheet).getByTestId('filter-sheet-show'));
    for (const key of ['filterWhen', 'from', 'filterVibe', 'crew']) {
      expect(lastQuery().get(key)).toBeNull();
    }
  });

  it("Who picks a crew lens and counts the crew's shows", () => {
    renderBar();
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByRole('radio', { name: crew.name }));
    const show = within(sheet).getByTestId('filter-sheet-show');
    expect(show).toHaveTextContent(copy.popover.vibeShow(crew.upcomingCount));
    fireEvent.click(show);
    expect(lastQuery().get('crew')).toBe(crew.id);
  });

  it('leaves Who out without crews and When out in Cal view, with no count', () => {
    searchParams.current = new URLSearchParams('view=cal');
    renderBar({ crews: [], showCount: null });
    const sheet = openSheet();
    expect(sectionsOf(sheet)).toEqual([
      copy.whereLabel,
      copy.segment.priceEyebrow,
      copy.vibeLabel,
    ]);
    expect(useDraftShowCount).toHaveBeenLastCalledWith(null);
    expect(within(sheet).getByTestId('filter-sheet-show')).toHaveTextContent(
      copy.phone.apply,
    );
  });

  it('Where draws eight tiles, the picked first, then the busiest', () => {
    searchParams.current = new URLSearchParams('filterWhere=black-box');
    renderBar();
    const sheet = openSheet();
    const tiles = within(sheet).getAllByTestId('venue-tile-option');
    expect(tiles).toHaveLength(8);
    expect(tiles[0]).toHaveAccessibleName('The Black Box');
    expect(tiles[0]).toHaveAttribute('aria-checked', 'true');
    expect(tiles[1]).toHaveAccessibleName('Red Rocks Amphitheatre');
    // No short-name field exists, so a tile carries the full name, clamped to
    // two lines under the tile (ruling, 2026-11-12).
    expect(tiles[0]).toHaveTextContent(/^The Black Box$/);
    expect(tiles[1]).toHaveTextContent(/^Red Rocks Amphitheatre$/);
    expect(tiles[1]?.querySelector('.line-clamp-2')).not.toBeNull();
  });

  it('"All N" opens the full Where list, searchable, and Back returns', () => {
    renderBar();
    const sheet = openSheet();
    const all = within(sheet).getByTestId('filter-sheet-all-where');
    expect(all).toHaveTextContent(copy.phone.allCount(VENUES.length));
    fireEvent.click(all);
    expect(
      within(sheet).getByRole('heading', { name: copy.whereLabel }),
    ).toBeTruthy();
    const back = within(sheet).getByRole('button', {
      name: copy.phone.backAria,
    });
    expect(back).toHaveFocus();
    expect(
      within(sheet).getByRole('searchbox', { name: copy.popover.whereSearch }),
    ).not.toHaveFocus();
    expect(within(sheet).getAllByTestId('venue-option')).toHaveLength(
      VENUES.length,
    );
    // A list row reads its name and then its neighborhood.
    fireEvent.click(within(sheet).getByRole('checkbox', { name: /^Hi-Dive/ }));
    fireEvent.click(back);
    expect(within(sheet).getByTestId('filter-sheet-all-where')).toHaveFocus();
    // The pick from the list now leads the grid.
    expect(
      within(sheet).getAllByTestId('venue-tile-option')[0],
    ).toHaveAccessibleName('Hi-Dive');
    fireEvent.click(within(sheet).getByTestId('filter-sheet-show'));
    expect(lastQuery().getAll('filterWhere')).toEqual(['hi-dive']);
  });

  it('"All 16" opens every Vibe bucket under the teaching line', () => {
    searchParams.current = new URLSearchParams(
      'filterVibe=latin&filterWhen=tonight',
    );
    renderBar();
    const sheet = openSheet();
    // Ten chips in the board's order, plus a pick past them.
    expect(
      within(sheet)
        .getAllByTestId('vibe-chip-option')
        .map((chip) => chip.textContent),
    ).toEqual(
      getFilterOptions('vibe', [], [...VIBE_ORDER.slice(0, 10), 'latin']).map(
        (option) => option.label,
      ),
    );
    fireEvent.click(within(sheet).getByTestId('filter-sheet-all-vibe'));
    expect(
      within(sheet).getByRole('heading', { name: copy.vibePlaceholder }),
    ).toBeTruthy();
    expect(within(sheet).getByText(copy.popover.vibeSub)).toBeTruthy();
    const rows = within(sheet).getAllByTestId('vibe-option');
    expect(rows).toHaveLength(VIBE_ORDER.length);
    expect(
      within(sheet).getByRole('checkbox', { name: 'Latin' }),
    ).toHaveAttribute('aria-checked', 'true');
    // Clear empties Vibe alone.
    fireEvent.click(
      within(sheet).getByRole('button', { name: copy.popover.clear }),
    );
    fireEvent.click(within(sheet).getByTestId('filter-sheet-show'));
    expect(lastQuery().get('filterVibe')).toBeNull();
    expect(lastQuery().get('filterWhen')).toBe('tonight');
  });

  it.each(['where', 'vibe'] as const)(
    'the %s list opens at its top, and Back returns to where the sheet was',
    (list) => {
      renderBar();
      const sheet = openSheet();
      const body = within(sheet).getByTestId('filter-sheet-body');
      // At 320 the main sheet is scrolled down to reach "All N".
      body.scrollTop = 320;
      fireEvent.click(within(sheet).getByTestId(`filter-sheet-all-${list}`));
      expect(body.scrollTop).toBe(0);
      body.scrollTop = 140;
      fireEvent.click(
        within(sheet).getByRole('button', { name: copy.phone.backAria }),
      );
      expect(body.scrollTop).toBe(320);
    },
  );

  it('Where leads with the URL picks in their order, then the busiest', () => {
    searchParams.current = new URLSearchParams(
      'filterWhere=bluebird-theater&filterWhere=ogden-theatre',
    );
    renderBar();
    const names = within(openSheet())
      .getAllByTestId('venue-tile-option')
      .map((tile) => tile.getAttribute('aria-label'));
    // Without picks Red Rocks (50) leads and Ogden (30) is fourth.
    expect(names.slice(0, 3)).toEqual([
      'Bluebird Theater',
      'Ogden Theatre',
      'Red Rocks Amphitheatre',
    ]);
  });

  it('a fresh pick stays put under the finger, and leads at the next opening', () => {
    renderBar();
    let sheet = openSheet();
    const before = within(sheet)
      .getAllByTestId('venue-tile-option')
      .map((tile) => tile.getAttribute('aria-label'));
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Globe Hall' }),
    );
    expect(
      within(sheet)
        .getAllByTestId('venue-tile-option')
        .map((tile) => tile.getAttribute('aria-label')),
    ).toEqual(before);
    fireEvent.click(within(sheet).getByTestId('filter-sheet-show'));
    cleanup();
    searchParams.current = lastQuery();
    renderBar();
    sheet = openSheet();
    expect(
      within(sheet).getAllByTestId('venue-tile-option')[0],
    ).toHaveAccessibleName('Globe Hall');
  });

  it('draws the crew patch tile, weave included, in the Who pill and the chip', () => {
    // The shared CrewPatch at its `tile` scale, as the crews picker draws
    // it: `micro` drops the weave, which the board's 16px patch keeps.
    const shapes = (scale: 'tile' | 'micro') => {
      const { container, unmount } = render(
        <CrewPatch
          crewId={crew.id}
          patchSalt={crew.patchSalt}
          size={16}
          scale={scale}
        />,
      );
      const count = container.querySelectorAll('svg *').length;
      unmount();
      return count;
    };
    const tile = shapes('tile');
    expect(tile).toBeGreaterThan(shapes('micro'));

    searchParams.current = new URLSearchParams('crew=crew_1');
    renderBar();
    const chipPatch = within(screen.getByTestId('phone-filter-chips'))
      .getByRole('button', { name: copy.segment.clearAria(crew.name) })
      .querySelector('svg');
    expect(chipPatch).toHaveAttribute('width', '16');
    expect(chipPatch?.querySelectorAll('*')).toHaveLength(tile);
    const pillPatch = within(openSheet())
      .getByRole('radio', { name: crew.name })
      .querySelector('svg');
    expect(pillPatch).toHaveAttribute('width', '18');
    expect(pillPatch?.querySelectorAll('*')).toHaveLength(tile);
  });

  it('Escape inside a full list steps back; the scrim still closes the sheet', () => {
    renderBar();
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByTestId('filter-sheet-all-where'));
    fireEvent.keyDown(document, { key: 'Escape' });
    // Back on the main sheet, the dialog still open, focus on "All N".
    expect(screen.getByRole('dialog', { name: copy.phone.filters })).toBe(
      sheet,
    );
    expect(within(sheet).getByTestId('filter-sheet-all-where')).toHaveFocus();
    fireEvent.click(within(sheet).getByTestId('filter-sheet-all-vibe'));
    fireEvent.click(
      screen.getByRole('button', { name: copy.filterSheet.closeAriaLabel }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('FilterBar phone sheet, Show N shows', () => {
  const show = () =>
    within(screen.getByRole('dialog')).getByTestId('filter-sheet-show');

  it('at open, with nothing changed, shows the applied total and asks for none', () => {
    useDraftShowCount.mockReturnValue({ status: 'pending', count: null });
    searchParams.current = new URLSearchParams('filterPrice=tbd');
    renderBar({ showCount: 214 });
    const sheet = openSheet();
    expect(show()).toHaveTextContent(copy.popover.vibeShow(214));
    expect(show()).toHaveAttribute('data-count-state', 'ready');
    expect(show()).toHaveAttribute('aria-busy', 'false');
    // The applied draft is never sent for a count: the hook gets null.
    expect(useDraftShowCount).toHaveBeenCalled();
    expect(
      useDraftShowCount.mock.calls.every(([query]) => query === null),
    ).toBe(true);
    // A change asks; changing back is the applied draft again, so it doesn't.
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    expect(useDraftShowCount.mock.calls.at(-1)?.[0]).not.toBeNull();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    expect(useDraftShowCount).toHaveBeenLastCalledWith(null);
    expect(show()).toHaveTextContent(copy.popover.vibeShow(214));
  });

  it('with no count yet, shows the pending label, busy, with no number', () => {
    useDraftShowCount.mockReturnValue({ status: 'pending', count: null });
    renderBar();
    const sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    expect(show()).toHaveTextContent(copy.showCountPending);
    expect(show()).toHaveAttribute('data-count-state', 'pending');
    expect(show()).toHaveAttribute('aria-busy', 'true');
  });

  it('while a newer count is in flight, the last number is marked stale', () => {
    useDraftShowCount.mockReturnValue({ status: 'pending', count: 40 });
    renderBar();
    const sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    expect(show()).toHaveTextContent(copy.popover.vibeShow(40));
    expect(show()).toHaveAttribute('data-count-state', 'pending');
    expect(show()).toHaveAttribute('aria-busy', 'true');
    expect(show().querySelector('span')).toHaveStyle({ opacity: '0.55' });
  });

  it('when the count fails, falls back to "Apply filters", which still applies', () => {
    useDraftShowCount.mockReturnValue({ status: 'error' });
    renderBar();
    const sheet = openSheet();
    fireEvent.click(
      within(sheet).getByRole('radio', { name: copy.whenTonight }),
    );
    expect(show()).toHaveTextContent(copy.phone.apply);
    expect(show()).toHaveAttribute('aria-busy', 'false');
    fireEvent.click(show());
    expect(lastQuery().get('filterWhen')).toBe('tonight');
  });
});
