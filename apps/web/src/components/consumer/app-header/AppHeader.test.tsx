// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import { SearchPaletteContext } from '../search-palette/search-palette-context';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

let mockAuth: { isSignedIn: boolean; isLoaded: boolean } = {
  isSignedIn: false,
  isLoaded: true,
};

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockAuth,
}));

const pathname = { current: '/events' };

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('../user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

// Hoisted: `vi.mock` runs before module-scope consts, so the spy has to be
// created inside the hoisted block to be visible to the factory.
const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }));
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }));

const mockFeatureFlag = (key: string, enabled: boolean) =>
  useFeatureFlag.mockImplementation((requested: string) => ({
    isLoading: false,
    enabled: requested === key ? enabled : true,
  }));

beforeEach(() => {
  mockAuth = { isSignedIn: false, isLoaded: true };
  pathname.current = '/events';
  // Flags on by default, so every pre-flag assertion below keeps asserting the
  // behaviour it was written for.
  mockFeatureFlag('crews', true);
});

afterEach(cleanup);

describe('AppHeader', () => {
  it('renders without rightSlots when none provided', () => {
    render(<AppHeader />);
    expect(screen.getAllByLabelText(/search/i).length).toBeGreaterThan(0);
  });

  it('renders provided rightSlots into the top-right chrome', () => {
    render(
      <AppHeader
        rightSlots={
          <button type="button" data-testid="install-slot">
            Install
          </button>
        }
      />,
    );
    // The slot appears in BOTH mobile and desktop layouts so it's reachable
    // regardless of viewport — the responsive display: none rules hide the
    // other bar, not the absence of the slot.
    expect(screen.getAllByTestId('install-slot').length).toBeGreaterThan(0);
  });
});

// The palette moved out of the header so the page body could open the same
// one. The header's own triggers have to keep working through the provider.
describe('AppHeader search triggers', () => {
  it('asks the provider to open, at both breakpoints', () => {
    const open = vi.fn();
    render(
      <SearchPaletteContext.Provider value={{ open }}>
        <AppHeader />
      </SearchPaletteContext.Provider>,
    );

    const triggers = screen.getAllByLabelText(/search/i);
    expect(triggers.length).toBeGreaterThan(1);
    for (const trigger of triggers) fireEvent.click(trigger);
    expect(open).toHaveBeenCalledTimes(triggers.length);
  });

  it('renders without a provider rather than throwing', () => {
    render(<AppHeader />);
    const [trigger] = screen.getAllByLabelText(/search/i);
    if (trigger === undefined) throw new Error('no search trigger');
    fireEvent.click(trigger);
  });
});

describe('AppHeader — signed-out auth affordances (#794)', () => {
  it('renders the Sign up pill and the Sign in link for a signed-out visitor', () => {
    render(<AppHeader />);
    const signUp = screen.getAllByRole('link', { name: /^sign up$/i });
    expect(signUp.length).toBeGreaterThan(0);
    expect(signUp[0]?.getAttribute('href')).toBe('/sign-up');
    const signIn = screen.getAllByRole('link', { name: /^sign in$/i });
    expect(signIn.length).toBeGreaterThan(0);
    expect(signIn[0]?.getAttribute('href')).toBe('/sign-in');
  });

  it('renders neither for a signed-in visitor', () => {
    mockAuth = { isSignedIn: true, isLoaded: true };
    render(<AppHeader />);
    expect(screen.queryByRole('link', { name: /^sign up$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^sign in$/i })).toBeNull();
  });

  it('exposes both affordances at both breakpoints — only the position moves', () => {
    // The in-row Sign in is `hidden sm:inline-flex` and the rail that carries
    // it at 320 is `sm:hidden`, so exactly one of the two is visible at any
    // width. Both must exist in the tree.
    render(<AppHeader />);
    const signIn = screen.getAllByRole('link', { name: /^sign in$/i });
    const inRow = signIn.filter((el) =>
      el.className.includes('sm:inline-flex'),
    );
    const railed = signIn.filter((el) => el.className.includes('min-h-[44px]'));
    expect(inRow.length).toBeGreaterThan(0);
    expect(railed.length).toBeGreaterThan(0);
  });

  it('keeps the account menu out of the mobile bar', () => {
    // Slot 4 of the bottom nav is the only account-menu entry on mobile; a
    // second trigger in the header duplicates it a thumb's width away.
    render(<AppHeader />);
    // Named rather than by test id: the point is that no control in the mobile
    // bar opens the account menu, not that one particular component is gone.
    const labels = CONSUMER_COPY.userMenu.ariaLabels;
    for (const name of [labels.accountMenu, labels.accountMenuSignedOut]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('lights "My shows" on both of the routes it owns', () => {
    for (const route of ['/watching', '/history']) {
      pathname.current = route;
      const { unmount } = render(<AppHeader />);
      expect(
        screen.getByRole('link', { name: 'My shows' }).className,
        route,
      ).toContain('font-semibold text-fg');
      unmount();
    }
  });

  it('leaves the nav tabs alone', () => {
    render(<AppHeader />);
    for (const [label, href] of [
      ['Browse', '/events'],
      ['Venues', '/venues'],
      ['My shows', '/watching'],
    ] as const) {
      expect(
        screen.getByRole('link', { name: label }).getAttribute('href'),
      ).toBe(href);
    }
  });
});

describe('AppHeader crews tab (#1226)', () => {
  it('carries the same crews destination as the mobile bar', () => {
    render(<AppHeader />);
    expect(
      screen.getByRole('link', { name: 'Crews' }).getAttribute('href'),
    ).toBe('/crews');
  });

  it('marks the active tab as the current page', () => {
    pathname.current = '/crews';
    render(<AppHeader />);
    expect(
      screen.getByRole('link', { name: 'Crews' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Browse' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('drops the crews link when the flag is off', () => {
    mockFeatureFlag('crews', false);
    render(<AppHeader />);
    expect(screen.queryByRole('link', { name: 'Crews' })).toBeNull();
  });

  it('renders the crews link when the flag is on', () => {
    mockFeatureFlag('crews', true);
    render(<AppHeader />);
    expect(
      screen.getByRole('link', { name: 'Crews' }).getAttribute('href'),
    ).toBe('/crews');
  });

  it('marks My shows current on a /history sub-route', () => {
    pathname.current = '/history';
    render(<AppHeader />);
    expect(
      screen
        .getByRole('link', { name: 'My shows' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  // Chrome B17 fidelity.
  it('carries hidden and md:inline classes on the wordmark and a 32px bordered mark tile', () => {
    render(<AppHeader />);
    const wordmark = screen.getByTestId('header-wordmark');
    expect(wordmark.className).toContain('hidden');
    expect(wordmark.className).toContain('md:inline');
    // The mark is always there, in a 32px tile on the desktop bar.
    const tiles = screen.getAllByTestId('header-mark-tile');
    expect(tiles).toHaveLength(2);
    const desktopTile = tiles[1];
    expect(desktopTile?.className).toContain('h-8');
    expect(desktopTile?.className).toContain('rounded-[7px]');
    expect(desktopTile?.className).toContain('border');
  });

  it('puts no bg class on the phone header and no bg-bg class on the desktop bar', () => {
    render(<AppHeader />);
    const phone = screen.getByTestId('header-mobile');
    expect(phone.className).not.toMatch(/\bbg-/);
    const desktop = screen.getByTestId('header-desktop');
    expect(desktop.className).not.toMatch(/\bbg-bg/);
    expect(desktop.className).toContain('border-b');
  });

  it('gives the active tab rounded-[10px], a transparent border and an inline style the others lack', () => {
    render(<AppHeader />);
    const browse = screen.getByRole('link', { name: 'Browse' });
    expect(browse.className).toContain('rounded-[10px]');
    expect(browse.className).toContain('border-transparent');
    expect(browse.getAttribute('style')).not.toBeNull();
    const venues = screen.getByRole('link', { name: 'Venues' });
    expect(venues.getAttribute('style')).toBeNull();
  });

  it('gives every tab whitespace-nowrap and shrink-0 classes', () => {
    render(<AppHeader />);
    for (const label of ['Browse', 'Venues', 'My shows', 'Crews']) {
      const tab = screen.getByRole('link', { name: label });
      expect(tab.className).toContain('whitespace-nowrap');
      expect(tab.className).toContain('shrink-0');
    }
  });

  it('lights Browse on an artist page', () => {
    pathname.current = '/artists/some-band';
    render(<AppHeader />);
    expect(
      screen.getByRole('link', { name: 'Browse' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Venues' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  // Addendum-3 header-640/900/1100: search, then the Offline pill, then avatar.
  it('renders the PWA slots after the search button in the desktop bar', () => {
    render(<AppHeader rightSlots={<span data-testid="pwa-slot" />} />);
    const slot = screen.getAllByTestId('pwa-slot').at(-1);
    const search = screen.getByTestId('header-search-desktop');
    expect(slot).toBeDefined();
    if (slot === undefined) return;
    expect(
      search.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // jsdom applies no media queries, so this pins the classes each board
  // draws its values on: header-640 below 900, header-900 and header-1100 from 900.
  it('draws the 640 header, switching to the 900 board at min-[900px]', () => {
    render(<AppHeader />);
    const search = screen.getByTestId('header-search-desktop');
    expect(search.className).toContain('h-[38px]');
    expect(search.className).toContain('w-[38px]');
    expect(search.className).toContain('rounded-[10px]');
    expect(search.className).toContain('lg:w-[280px]');
    const tab = screen.getByRole('link', { name: 'Venues' });
    // 640 board: 14px 600 tabs, 10px sides; 900 board: 14px sides.
    expect(tab.className).toContain('text-[14px]');
    expect(tab.className).toContain('font-semibold');
    expect(tab.className).toContain('px-[10px]');
    expect(tab.className).toContain('min-[900px]:px-[14px]');
    expect(tab.className).not.toContain('md:px-[14px]');
    // 640 board: 2px tab gap, 12px header gap; 900 board: 6px and 20px.
    const nav = tab.parentElement;
    expect(nav?.className).toContain('gap-0.5');
    expect(nav?.className).toContain('min-[900px]:gap-1.5');
    const bar = screen.getByTestId('header-desktop').className;
    expect(bar).toContain('gap-3');
    expect(bar).toContain('min-[900px]:gap-5');
    // The 1100 board draws the same 20px and 6px gaps: no lg override.
    expect(bar).not.toContain('lg:gap-');
    expect(nav?.className).not.toContain('lg:gap-');
    // header-640 draws the bare mark; the frame arrives with the 900 board.
    const mark = screen.getAllByTestId('header-mark-tile').at(-1);
    expect(mark?.className).toContain('border-transparent');
    expect(mark?.className).toContain('min-[900px]:border-border');
  });
});
