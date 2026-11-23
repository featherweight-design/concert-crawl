// @vitest-environment jsdom

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EntitlementResult } from '@/lib/queries/use-entitlement';

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockSetQuery = vi.fn();
const mockClearQuery = vi.fn();
const mockNavigateTo = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  // FollowButton builds its signed-out return-to href from these (PR 5).
  usePathname: () => '/search',
  useSearchParams: () => new URLSearchParams(),
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
vi.mock('../identity-art/IdentityArt', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  IdentityArt: () => <div data-testid="identity-art" />,
}));

const baseHook = {
  query: '',
  setQuery: mockSetQuery,
  clearQuery: mockClearQuery,
  recentSearches: [],
  popularEvents: [],
  artistResults: [],
  artistList: [],
  venueResults: [],
  isLoading: false,
  failed: false,
  retry: vi.fn(),
  navigateTo: mockNavigateTo,
};

vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: () => baseHook,
}));

// ── Native following, PR 5 ────────────────────────────────────────────────
// The artist-page rows now carry a live Follow button, so the section reads
// Clerk. The entitlement stays mocked so a test can prove a stale
// `paywall-on-tap` answer gates nothing. Everything below is the surrounding
// wiring; the follow behaviour itself is asserted, not mocked away.

const authState: { isSignedIn: boolean | undefined } = { isSignedIn: true };
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => authState,
}));

const entitlementState: { current: EntitlementResult } = {
  current: { isLoading: false, active: true, surface: 'visible-active' },
};
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlementState.current,
}));

// A stand-in for the real optimistic hook: it flips in place, which is exactly
// the behaviour the row is required to show (no collapse, no re-order).
const mockToggle = vi.fn();
vi.mock(
  '@/components/consumer/artist-page/lib/use-artist-follow',
  async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useArtistFollow: (_slug: string | null, initialFollowing: boolean) => {
      const [following, setFollowing] = React.useState(initialFollowing);
      return {
        following,
        error: null,
        toggle: () => {
          mockToggle();
          setFollowing((prev) => !prev);
        },
      };
    },
  }),
);

// jsdom has no matchMedia, and `useMediaQuery` reads it during render. `false`
// for every query is the widest-first default the hook itself ships.
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
  authState.isSignedIn = true;
  entitlementState.current = {
    isLoading: false,
    active: true,
    surface: 'visible-active',
  };
});

import type { ArtistSearchAllResult } from '@concert-crawl/types';
import { SearchDefaultState } from './SearchDefaultState';
import { SearchResultsState } from './SearchResultsState';
import { SearchEmptyState } from './SearchEmptyState';
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { SEARCH_DESKTOP_QUERY } from './definitions/constants';

/** Make one media query report a match, leaving every other query `false`. */
const matchOnly = (matching: string) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === matching,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SearchDefaultState', () => {
  it('renders recent section when recent searches exist', () => {
    const recentSearches = ['godspeed you', 'bluebird'];
    render(
      <SearchDefaultState
        recentSearches={recentSearches}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByText('godspeed you')).toBeTruthy();
    expect(screen.getByText('bluebird')).toBeTruthy();
  });

  it('calls onPickQuery when a recent row is tapped', () => {
    render(
      <SearchDefaultState
        recentSearches={['bluebird']}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );
    fireEvent.click(screen.getByText('bluebird'));
    expect(mockSetQuery).toHaveBeenCalledWith('bluebird');
  });

  // A recent search is text the reader typed; analytics autocapture must not
  // read it off the button (posthog-js skips a `ph-no-capture` element).
  it('keeps recent-search rows out of analytics autocapture', () => {
    render(
      <SearchDefaultState
        recentSearches={['bluebird']}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );
    expect(screen.getByText('bluebird').closest('button')?.classList).toContain(
      'ph-no-capture',
    );
  });

  // The row hand-rolled its own 40px box and drew IdentityArt directly, so a
  // show with real artwork still got a generated mark, at `hero` density in a
  // 40px box. It goes through the slot now, like every other event row.
  it('draws the event artwork on a popular row rather than a generated mark', () => {
    const { container } = render(
      <SearchDefaultState
        recentSearches={[]}
        popularEvents={[
          {
            id: 'ev-art',
            title: 'Show A',
            artist: 'Artist A',
            date: '2027-06-01',
            imageUrl: 'https://cdn.test/flyer.jpg',
            artistPhotoUrl: null,
            ticketPriceMin: '25',
            watcherCount: 3,
            venue: { name: 'Globe Hall', slug: 'globe-hall' },
          },
        ]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.test/flyer.jpg',
    );
  });

  it('renders popular section with event rows', () => {
    const popular = [
      {
        id: 'ev-1',
        title: 'Show A',
        artist: 'Artist A',
        supportingArtists: null,
        tourName: null,
        date: '2027-06-01',
        imageUrl: null,
        artistPhotoUrl: null,
        ticketPriceMin: '25',
        watcherCount: 3,
        venue: { name: 'Globe Hall', slug: 'globe-hall' },
      },
    ];
    render(
      <SearchDefaultState
        recentSearches={[]}
        popularEvents={popular}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );
    expect(screen.getByText('Popular this week')).toBeTruthy();
    expect(screen.getByText('Artist A')).toBeTruthy();
  });
});

describe('SearchResultsState', () => {
  it('renders the event-derived rows as a Shows section with count', () => {
    const artists = [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ];
    render(
      <SearchResultsState
        artistResults={artists}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText('Shows · 1')).toBeTruthy();
    expect(screen.getByText('Radiohead')).toBeTruthy();
  });

  it('renders venue section with count', () => {
    const venues = [
      {
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        showCount: 4,
        matchingEventId: 'evt-1',
      },
    ];
    render(
      <SearchResultsState
        artistResults={[]}
        venueResults={venues}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText('Venues · 1')).toBeTruthy();
    expect(screen.getByText('Bluebird Theater')).toBeTruthy();
  });

  it('calls onNavigateTo with artist on tap', () => {
    const artists = [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ];
    render(
      <SearchResultsState
        artistResults={artists}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    fireEvent.click(screen.getByText('Radiohead'));
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead');
  });

  it('calls onNavigateTo with venue on tap', () => {
    const venues = [
      {
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        showCount: 4,
        matchingEventId: 'evt-1',
      },
    ];
    render(
      <SearchResultsState
        artistResults={[]}
        venueResults={venues}
        onNavigateTo={mockNavigateTo}
      />,
    );
    fireEvent.click(screen.getByText('Bluebird Theater'));
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'bluebird-theater',
      matchingEventId: 'evt-1',
    });
  });
});

describe('SearchEmptyState', () => {
  it('says nobody by that name', () => {
    render(<SearchEmptyState />);
    expect(screen.getByText('Nobody by that name.')).toBeTruthy();
  });

  it('browse CTA runs the caller hook, then goes to /events', () => {
    const onCtaClick = vi.fn();
    render(<SearchEmptyState onCtaClick={onCtaClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Browse all shows/i }));
    expect(onCtaClick).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/events');
  });
});

const NEXT_SHOW = {
  eventId: '11111111-1111-4111-8111-111111111111',
  iso: '2027-09-15',
  venue: 'Hi-Dive',
  venueSlug: 'hi-dive',
  price: null,
  genres: [],
};

// Kind 1 by default: ours, with shows. `nextShow` is null exactly when the
// count is 0, so the overrides below pair them.
const makeArtist = (
  overrides: Partial<ArtistSearchAllResult> = {},
): ArtistSearchAllResult => ({
  name: 'Radiohead',
  slug: 'radiohead',
  photoUrl: null,
  upcomingShowCount: 2,
  nextShow: NEXT_SHOW,
  following: false,
  mbid: null,
  disambiguation: null,
  area: null,
  type: null,
  hasShows: true,
  ...overrides,
});

const NO_SHOWS = {
  upcomingShowCount: 0,
  nextShow: null,
  hasShows: false,
} as const;

describe('SearchResultsState — artist list', () => {
  const ARTIST_LIST = [makeArtist()];

  it('draws Artists, Shows, then Venues', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Clipse & J.I.D',
            nextDate: '2027-11-12',
            venueShort: 'Red Rocks',
          },
        ]}
        artistList={ARTIST_LIST}
        venueResults={[
          {
            name: 'Cervantes',
            slug: 'cervantes',
            showCount: 18,
            matchingEventId: 'ev-1',
          },
        ]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    const text = document.body.textContent ?? '';
    const artists = text.indexOf('Artists · 1');
    const shows = text.indexOf('Shows · 1');
    const venues = text.indexOf('Venues · 1');
    expect(artists).toBeGreaterThanOrEqual(0);
    expect(artists).toBeLessThan(shows);
    expect(shows).toBeLessThan(venues);
  });

  it('chips an artist row with the artist genre, and none without one', () => {
    const { rerender } = render(
      <SearchResultsState
        artistResults={[]}
        artistList={[makeArtist({ genre: 'hip-hop' })]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getAllByTestId('genre-chip')).toHaveLength(1);
    rerender(
      <SearchResultsState
        artistResults={[]}
        artistList={[makeArtist({ genre: null })]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.queryAllByTestId('genre-chip')).toHaveLength(0);
  });

  it('renders the artist section with its own header, marker and count', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistList={ARTIST_LIST}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText('Artists · 1')).toBeTruthy();
    expect(screen.getByText('Radiohead')).toBeTruthy();
    expect(screen.getByText('2 shows')).toBeTruthy();
    expect(screen.getByText(/Next .* · Hi-Dive/)).toBeTruthy();
  });

  it('says no Denver dates yet for an artist of ours with nothing booked', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistList={[makeArtist(NO_SHOWS)]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText('No Denver dates yet')).toBeTruthy();
  });

  it('says no upcoming Denver dates for one who has played here', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistList={[makeArtist({ ...NO_SHOWS, hasShows: true })]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText('No upcoming Denver dates')).toBeTruthy();
  });

  it('draws a MusicBrainz-only act Follow-only, with its identity line', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistList={[
          makeArtist({
            ...NO_SHOWS,
            name: 'Clip',
            slug: null,
            mbid: '22222222-2222-4222-8222-222222222222',
            type: 'group',
            area: 'Ohio',
          }),
        ]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText('Band · Ohio')).toBeTruthy();
    expect(screen.getByLabelText(ARTIST_COPY.followAria('Clip'))).toBeTruthy();
    fireEvent.click(screen.getByText('Clip'));
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  // Conformance, not a design call: a photoless artist gets the same
  // IdentityArt every other surface shows, rather than a generic mic icon.
  it('falls to identity art for a photoless artist', () => {
    const { container } = render(
      <SearchResultsState
        artistResults={[]}
        artistList={ARTIST_LIST}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getAllByTestId('identity-art').length).toBeGreaterThan(0);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the portrait when the artist has one', () => {
    const { container } = render(
      <SearchResultsState
        artistResults={[]}
        artistList={[makeArtist({ photoUrl: 'https://i.scdn.co/image/rh' })]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://i.scdn.co/image/rh',
    );
    // Decorative: the row already renders the name as text, so a populated alt
    // would land in the button's accessible name and announce it twice.
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('routes an artist row to the page, not a filtered browse', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistList={ARTIST_LIST}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    fireEvent.click(screen.getByText('Radiohead'));
    expect(mockNavigateTo).toHaveBeenCalledWith('artistPage', {
      slug: 'radiohead',
    });
  });

  it('renders no Artists section when the list is empty', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.queryByText(/Artists ·/)).toBeNull();
    expect(screen.getByText('Shows · 1')).toBeTruthy();
  });

  it('numbers the list first, then Shows, then Venues, so keyboard indices stay unique', () => {
    const shows = [
      { name: 'Ratbag', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ];
    const venues = [
      {
        name: 'Cervantes',
        slug: 'cervantes',
        showCount: 18,
        matchingEventId: 'ev-1',
      },
    ];
    const { rerender } = render(
      <SearchResultsState
        artistResults={shows}
        artistList={ARTIST_LIST}
        venueResults={venues}
        selectedIdx={1}
        onNavigateTo={mockNavigateTo}
      />,
    );
    // Index 0 is the list row, 1 the show row, 2 the venue.
    let selected = document.querySelectorAll('[data-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toContain('Ratbag');

    rerender(
      <SearchResultsState
        artistResults={shows}
        artistList={ARTIST_LIST}
        venueResults={venues}
        selectedIdx={2}
        onNavigateTo={mockNavigateTo}
      />,
    );
    selected = document.querySelectorAll('[data-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toContain('Cervantes');

    // venueFirst swaps Shows and Venues, never the list.
    rerender(
      <SearchResultsState
        artistResults={shows}
        artistList={ARTIST_LIST}
        venueResults={venues}
        venueFirst
        selectedIdx={1}
        onNavigateTo={mockNavigateTo}
      />,
    );
    selected = document.querySelectorAll('[data-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toContain('Cervantes');
  });
});

describe('SearchResultsState — inline following (native following PR 5)', () => {
  const artistPage = makeArtist;

  const renderRows = (
    artistList: ArtistSearchAllResult[] = [artistPage()],
    props: Partial<React.ComponentProps<typeof SearchResultsState>> = {},
  ) =>
    render(
      <SearchResultsState
        artistResults={[]}
        artistList={artistList}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
        {...props}
      />,
    );

  it('puts a live Follow button on the row itself, not one tap in', () => {
    renderRows();
    const button = screen.getByLabelText(ARTIST_COPY.followAria('Radiohead'));
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  // The clearest case the whole feature exists for: nothing on the books yet.
  // The row says so and still lets you follow.
  it('keeps the button live for an artist with nothing upcoming', () => {
    renderRows([artistPage(NO_SHOWS)]);
    expect(screen.getByText('No Denver dates yet')).toBeTruthy();
    const button = screen.getByLabelText(ARTIST_COPY.followAria('Radiohead'));
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('updates the row in place on follow, without collapsing or re-ordering', () => {
    renderRows([artistPage(), artistPage({ name: 'Ratbag', slug: 'ratbag' })]);
    const names = () =>
      Array.from(document.querySelectorAll('[data-selected], button')).length;
    const before = names();
    fireEvent.click(screen.getByLabelText(ARTIST_COPY.followAria('Radiohead')));

    // Same row, same position, same neighbours — only the state flipped.
    expect(
      screen.getByLabelText(ARTIST_COPY.followingAria('Radiohead')),
    ).toBeTruthy();
    expect(screen.getByText('Radiohead')).toBeTruthy();
    expect(screen.getByText('Ratbag')).toBeTruthy();
    expect(
      screen.getByLabelText(ARTIST_COPY.followAria('Ratbag')),
    ).toBeTruthy();
    expect(names()).toBe(before);
  });

  // Following is free on every signed-in plan: an entitlement answer that still
  // reads `paywall-on-tap` is no gate, and the tap writes the follow.
  it('signed in on paywall-on-tap: a tap follows directly', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderRows();
    const button = screen.getByLabelText(ARTIST_COPY.followAria('Radiohead'));
    expect(button.hasAttribute('aria-haspopup')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText(ARTIST_COPY.followingAria('Radiohead')),
    ).toBeTruthy();
  });

  it('signed out: the row renders and a tap never fires a tokenless write', () => {
    authState.isSignedIn = false;
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    };
    renderRows();
    const button = screen.getByLabelText(
      ARTIST_COPY.followSignedOutAria('Radiohead'),
    );
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.hasAttribute('aria-haspopup')).toBe(false);
    fireEvent.click(button);
    expect(mockToggle).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(1);
    // Back to the artist's page, not to /search: the return seam replays a
    // follow only there, and would strip it from /search unread.
    expect(mockPush).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/artists/radiohead?intent=follow%3Aradiohead&label=Radiohead')}`,
    );
  });

  // The window where Clerk has not answered yet. A tap does nothing: it would
  // die on `Not authenticated` as a write, and sending a viewer who may well be
  // signed in to sign-in is worse.
  it('unresolved session: a tap is inert, neither writing nor signing in', () => {
    authState.isSignedIn = undefined;
    entitlementState.current = {
      isLoading: true,
      active: false,
      surface: null,
    };
    renderRows();
    fireEvent.click(screen.getByLabelText(ARTIST_COPY.followAria('Radiohead')));
    expect(mockToggle).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ...but an already-followed row proves a session on its own, so it must not
  // flash back to "Follow" while Clerk resolves.
  it('unresolved session: an already-followed row stays following', () => {
    authState.isSignedIn = undefined;
    entitlementState.current = {
      isLoading: true,
      active: false,
      surface: null,
    };
    renderRows([artistPage({ following: true })]);
    expect(
      screen.getByLabelText(ARTIST_COPY.followingAria('Radiohead')),
    ).toBeTruthy();
  });

  // The palette draws the same component in 560px of overlay, so the rail is
  // opt-in rather than a width check alone.
  it('the explainer rail never appears without the opt-in', () => {
    matchOnly(SEARCH_DESKTOP_QUERY);
    renderRows();
    expect(screen.queryByText(FOLLOWING_COPY.searchRailEyebrow)).toBeNull();
  });

  it('desktop: the opt-in rail renders beside the results', () => {
    matchOnly(SEARCH_DESKTOP_QUERY);
    renderRows([artistPage()], { withExplainerRail: true });
    expect(screen.getByText(FOLLOWING_COPY.searchRailEyebrow)).toBeTruthy();
    expect(screen.getByText(FOLLOWING_COPY.searchRailNoDates)).toBeTruthy();
  });

  it('desktop: no artist rows means no rail to explain them', () => {
    matchOnly(SEARCH_DESKTOP_QUERY);
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        venueResults={[]}
        withExplainerRail
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.queryByText(FOLLOWING_COPY.searchRailEyebrow)).toBeNull();
  });

  // The rail shipped desktop-only, so mobile got the artist rows and no
  // explanation of what following one does. Only the shape forks on viewport.
  it('mobile: the same case renders as a footnote under the results', () => {
    matchOnly('(max-width: 1px)');
    renderRows([artistPage()], { withExplainerRail: true });
    expect(screen.getByText(FOLLOWING_COPY.searchRailBody)).toBeTruthy();
    // The eyebrow labels a column that does not exist at this width.
    expect(screen.queryByText(FOLLOWING_COPY.searchRailEyebrow)).toBeNull();
  });

  it('mobile: no artist rows means no footnote', () => {
    matchOnly('(max-width: 1px)');
    renderRows([], { withExplainerRail: true });
    expect(screen.queryByText(FOLLOWING_COPY.searchRailBody)).toBeNull();
  });
});

// B19: the B+ search rows (`07-more-screens/more-r3-palette*`,
// `more-r3-search_m*`).
describe('Search — B+ rows', () => {
  it('forgets a recent search from its × without rerunning it', () => {
    const onRemove = vi.fn();
    render(
      <SearchDefaultState
        recentSearches={['red rocks']}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
        onRemoveRecent={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove red rocks from recent searches',
      }),
    );
    expect(onRemove).toHaveBeenCalledWith('red rocks');
    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('draws no × when nothing can remove a recent search', () => {
    render(
      <SearchDefaultState
        recentSearches={['red rocks']}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('ranks popular rows and carries the lead genre chip and price', () => {
    render(
      <SearchDefaultState
        recentSearches={[]}
        popularEvents={[
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
            genre: ['hip-hop', 'rap'],
          },
        ]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getAllByTestId('genre-chip')).toHaveLength(1);
    expect(screen.getByText('hip-hop')).toBeTruthy();
    expect(screen.getByText('$160')).toBeTruthy();
  });

  it('gives a matched artist its venue, date, genre and price', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Clipse & J.I.D',
            nextDate: '2027-11-12',
            venueShort: 'Red Rocks Amphitheatre',
            genres: ['hip-hop'],
            imageUrl: null,
            artistPhotoUrl: null,
            ticketPriceMin: '29',
          },
        ]}
        venueResults={[]}
        query="clip"
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(screen.getByText(/Red Rocks Amphitheatre/)).toBeTruthy();
    expect(screen.getByText('hip-hop')).toBeTruthy();
    expect(screen.getByText('$29')).toBeTruthy();
    expect(screen.getByText('Clip').getAttribute('style')).toContain(
      'var(--signal)',
    );
  });

  it('draws a venue with its glyph tile rather than a pin', () => {
    const { container } = render(
      <SearchResultsState
        artistResults={[]}
        venueResults={[
          {
            name: 'Bluebird Theater',
            slug: 'bluebird-theater',
            showCount: 4,
            matchingEventId: 'evt-1',
          },
        ]}
        onNavigateTo={mockNavigateTo}
      />,
    );
    expect(container.querySelector('[data-venue-tile]')).not.toBeNull();
  });

  it('wears the B+ state card when nothing matches', () => {
    render(<SearchEmptyState />);
    expect(screen.getByTestId('state-card')).toBeTruthy();
    expect(screen.getByText('No results')).toBeTruthy();
  });
});
