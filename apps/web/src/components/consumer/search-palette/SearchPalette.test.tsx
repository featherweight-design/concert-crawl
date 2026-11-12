// @vitest-environment jsdom

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stubMatchMedia } from '@/test-utils/match-media';

const mockPush = vi.fn();
const mockNavigateTo = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  // FollowButton builds its signed-out return-to href from these (PR 5).
  usePathname: () => '/events',
  useSearchParams: () => new URLSearchParams(),
}));

// Native following PR 5 — the artist-page rows the palette draws now carry a
// live Follow button, so the section reads Clerk, the entitlement and the plan.
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true }),
}));
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => ({
    isLoading: false,
    active: true,
    surface: 'visible-active',
  }),
}));
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}));
vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: (_slug: string, initialFollowing: boolean) => ({
    following: initialFollowing,
    toggle: vi.fn(),
  }),
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Base hook state — mutable so individual tests can override query
const mockHookState = {
  query: 'radio',
  setQuery: vi.fn(),
  clearQuery: vi.fn(),
  recentSearches: [],
  // B19 — the popular list the arrows walk before anything is typed.
  popularEvents: [] as unknown[],
  artistResults: [
    { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    { name: 'Godspeed', nextDate: '2027-06-05', venueShort: 'Bluebird' },
  ],
  // #1115 PR-G — artists with their own page. Empty by default so the existing
  // keyboard-arithmetic tests below keep asserting the pre-PR-G index layout.
  artistPageResults: [] as Array<{
    name: string;
    slug: string;
    photoUrl: string | null;
    upcomingShowCount: number;
  }>,
  venueResults: [
    {
      name: 'Red Rocks',
      slug: 'red-rocks',
      showCount: 3,
      matchingEventId: 'ev-1',
    },
  ],
  venueFirst: false,
  isLoading: false,
  navigateTo: mockNavigateTo,
};

vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: () => mockHookState,
}));

import { SearchPalette } from './SearchPalette';

const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no matchMedia, and the artist rows size their follow control off
  // one. `false` is the hook's own widest-first default. The shared helper
  // rather than a local literal: its listeners are real, so a later test that
  // flips the viewport after mount fails honestly instead of passing on a
  // no-op addEventListener.
  stubMatchMedia(false);
  // Reset to non-empty query so SearchResultsState renders by default
  mockHookState.query = 'radio';
  mockHookState.artistResults = [
    { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    { name: 'Godspeed', nextDate: '2027-06-05', venueShort: 'Bluebird' },
  ];
  mockHookState.venueResults = [
    {
      name: 'Red Rocks',
      slug: 'red-rocks',
      showCount: 3,
      matchingEventId: 'ev-1',
    },
  ];
  mockHookState.venueFirst = false;
  mockHookState.artistPageResults = [];
  mockHookState.popularEvents = [];
});

describe('SearchPalette', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <SearchPalette open={false} onClose={onClose} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the palette when open', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    expect(
      screen.getByPlaceholderText('Search artists or venues…'),
    ).toBeTruthy();
  });

  it('calls onClose when Escape is pressed', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(
      <SearchPalette open={true} onClose={onClose} />,
    );
    // The backdrop is the outermost div
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when palette body is clicked', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.click(screen.getByPlaceholderText('Search artists or venues…'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('highlights the first result after one ArrowDown', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // idx 0 = Radiohead (first artist)
    const buttons = screen.getAllByRole('option', { name: /Radiohead/i });
    // The matching button should have data-selected="true"
    const selected = buttons.find(
      (btn) => btn.getAttribute('data-selected') === 'true',
    );
    expect(selected).toBeTruthy();
  });

  // The input is a combobox that points at the highlighted row, so a screen
  // reader announces the arrow-key selection.
  it('points the combobox at the highlighted option', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    const input = screen.getByRole('combobox');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const [selected] = screen.getAllByRole('option', { selected: true });
    expect(selected?.id).toBeTruthy();
    expect(input.getAttribute('aria-activedescendant')).toBe(selected?.id);
  });

  it('scrolls the highlighted row into view', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('leaves Enter to a focused control inside the panel', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    screen.getByRole('button', { name: 'Clear' }).focus();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('highlights the second result after two ArrowDowns', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // idx 1 = Godspeed (second artist)
    const buttons = screen.getAllByRole('option', { name: /Godspeed/i });
    const selected = buttons.find(
      (btn) => btn.getAttribute('data-selected') === 'true',
    );
    expect(selected).toBeTruthy();
  });

  it('de-highlights all rows at idx -1 (before any navigation)', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    // No ArrowDown pressed — nothing should be selected
    const selectedButtons = screen
      .getAllByRole('option')
      .filter((btn) => btn.getAttribute('data-selected') === 'true');
    expect(selectedButtons).toHaveLength(0);
  });

  it('moves highlight back up with ArrowUp', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // idx 0
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // idx 1
    fireEvent.keyDown(window, { key: 'ArrowUp' }); // back to idx 0
    const buttons = screen.getAllByRole('option', { name: /Radiohead/i });
    const selected = buttons.find(
      (btn) => btn.getAttribute('data-selected') === 'true',
    );
    expect(selected).toBeTruthy();
  });

  it('navigates with ArrowDown + Enter on artist result', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // select idx 0 = Radiohead
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates with ArrowDown x3 + Enter to select venue result', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    // 2 artists + 1 venue. ArrowDown x3 → idx 2 = Red Rocks venue
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'red-rocks',
      matchingEventId: 'ev-1',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when Enter is pressed with no selection', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('clamps ArrowDown at the last result', () => {
    render(<SearchPalette open={true} onClose={onClose} />);
    // 3 total results, pressing down 10 times should clamp to idx 2
    for (let times = 0; times < 10; times++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'Enter' });
    // Should navigate to the last result (Red Rocks venue at idx 2)
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'red-rocks',
      matchingEventId: 'ev-1',
    });
  });
});

describe('SearchPalette — artist pages (#1115 PR-G)', () => {
  beforeEach(() => {
    mockHookState.artistPageResults = [
      {
        name: 'Radiohead',
        slug: 'radiohead',
        photoUrl: null,
        upcomingShowCount: 2,
      },
    ];
  });

  // B+ order (`more-r3-palette_typed`): Artists, Venues, then Artist pages.
  // The fixture has 2 artists and 1 venue, so the artist page is index 3.
  it('opens the artist page when the last row, after artists and venues, is selected', () => {
    render(<SearchPalette open onClose={onClose} />);

    for (let step = 0; step < 4; step++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockNavigateTo).toHaveBeenCalledWith('artistPage', {
      slug: 'radiohead',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('reaches the event-derived artist rows ahead of the artist pages', () => {
    render(<SearchPalette open onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead');
  });
});

// B19: the B+ palette (`07-more-screens/more-r3-palette*`).
describe('SearchPalette — B+ dialog', () => {
  const popular = [
    {
      id: 'ev-1',
      title: 'Show A',
      artist: 'Vince Staples',
      date: '2027-06-01',
      imageUrl: null,
      artistPhotoUrl: null,
      ticketPriceMin: '160',
      watcherCount: 9,
      venue: { name: 'The Fillmore Auditorium', slug: 'fillmore' },
      genre: ['hip-hop'],
    },
    {
      id: 'ev-2',
      title: 'Show B',
      artist: 'TOKiMONSTA',
      date: '2027-06-02',
      imageUrl: null,
      artistPhotoUrl: null,
      ticketPriceMin: null,
      watcherCount: 4,
      venue: { name: 'The Church Nightclub', slug: 'the-church' },
      genre: ['electronic'],
    },
  ];

  it('is a named modal dialog', () => {
    render(<SearchPalette open onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Search' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(
      screen.getByRole('textbox', { name: /Search artists or venues/ }),
    ).toBeTruthy();
  });

  it('draws the navigate, open and close hints in the footer', () => {
    render(<SearchPalette open onClose={onClose} />);
    expect(screen.getByText('navigate')).toBeTruthy();
    expect(screen.getByText('open')).toBeTruthy();
    expect(screen.getByText('close')).toBeTruthy();
  });

  it('walks the popular list with the arrows before anything is typed', () => {
    mockHookState.query = '';
    mockHookState.popularEvents = popular;
    render(<SearchPalette open onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'TOKiMONSTA');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes after a popular row is clicked, like a result row', () => {
    mockHookState.query = '';
    mockHookState.popularEvents = popular;
    render(<SearchPalette open onClose={onClose} />);
    fireEvent.click(screen.getByText('Vince Staples'));
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Vince Staples');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab inside the dialog', () => {
    render(<SearchPalette open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input'),
    );
    const tail = focusable[focusable.length - 1];
    tail?.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(focusable[0]);
  });

  it('pulls focus back in when Tab is pressed from outside', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    try {
      render(<SearchPalette open onClose={onClose} />);
      outside.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
        true,
      );
    } finally {
      outside.remove();
    }
  });

  it('returns focus to the control that opened it', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    try {
      trigger.focus();
      const { rerender } = render(<SearchPalette open onClose={onClose} />);
      screen.getByRole('textbox').focus();
      rerender(<SearchPalette open={false} onClose={onClose} />);
      expect(document.activeElement).toBe(trigger);
    } finally {
      trigger.remove();
    }
  });

  it('lights the typed query inside a result name', () => {
    render(<SearchPalette open onClose={onClose} />);
    const lit = screen.getByText('Radio');
    expect(lit.getAttribute('style')).toContain('var(--signal)');
  });

  it('becomes a full-screen search with a back button at phone width', () => {
    stubMatchMedia(true);
    render(<SearchPalette open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('navigate')).toBeNull();
  });
});
