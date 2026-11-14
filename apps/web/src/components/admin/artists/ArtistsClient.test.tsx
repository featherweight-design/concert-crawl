// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ArtistsClient } from './ArtistsClient';
import type { AdminArtistRow } from './artists-api';

const { getTokenMock } = vi.hoisted(() => ({
  getTokenMock: async () => 'token',
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: getTokenMock }),
}));

const row = (over: Partial<AdminArtistRow> = {}): AdminArtistRow => ({
  id: 'a1',
  name: 'Kyle Emerson',
  spotifyArtistId: 'sp1',
  matchStatus: 'matched',
  photoUrl: null,
  autoMatchedAt: '2026-11-01T00:00:00Z',
  openReportCount: 0,
  wrongPhotoReportCount: 0,
  genres: ['folk rock'],
  upcomingCount: 1,
  watchingCount: 0,
  nextShow: { date: '2026-11-14', venueName: 'Larimer Lounge' },
  candidates: [
    { id: 'sp1', name: 'Kyle Emerson', imageUrl: null, genres: ['folk rock'] },
  ],
  ...over,
});

const COUNTS = {
  to_check: 1,
  to_check_soon: 1,
  to_check_later: 0,
  to_check_none: 0,
  matched: 10,
  not_an_artist: 2,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let patchStatus = 200;
let listCalls = 0;
/** Set to hold the PATCH open until the test releases it. */
let patchGate: Promise<void> | null = null;
/** What a list call answers, from its query. */
let listFor: (query: URLSearchParams) => {
  data: AdminArtistRow[];
  total: number;
} = () => ({ data: [row()], total: 1 });

beforeEach(() => {
  patchStatus = 200;
  listCalls = 0;
  patchGate = null;
  listFor = (query) => ({
    data: [
      query.get('status') === 'not_an_artist'
        ? row({
            id: 'n1',
            name: 'All My Friends Tour',
            matchStatus: 'not_an_artist',
            spotifyArtistId: null,
            autoMatchedAt: null,
            candidates: null,
          })
        : row(),
    ],
    total: 1,
  });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        if (patchGate) await patchGate;
        return patchStatus === 200
          ? json(200, { success: true, data: {} })
          : json(patchStatus, {
              success: false,
              error:
                patchStatus === 409
                  ? 'The artist has changed since it was loaded'
                  : 'nope',
            });
      }
      if (url.includes('/counts'))
        return json(200, { success: true, data: COUNTS });
      if (url.includes('/candidates'))
        return json(200, {
          success: true,
          data: [
            {
              id: 'sp9',
              name: 'Search Pick',
              imageUrl: 'https://img/sp9',
              genres: ['garage'],
              isExactMatch: false,
            },
          ],
        });
      listCalls += 1;
      const { data, total } = listFor(new URL(url).searchParams);
      return json(200, { success: true, data, total });
    }),
  );
});

/** Hold the next PATCH open; call the result to let it answer. */
const holdPatch = () => {
  let release = () => undefined as void;
  patchGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return () => release();
};

const rowName = (name: string) => screen.queryByText(name, { selector: 'div' });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ArtistsClient', () => {
  it('keeps the failed tab in the toast when Try again runs from another tab', async () => {
    patchStatus = 500;
    render(<ArtistsClient />);
    fireEvent.click(await screen.findByRole('tab', { name: /Not artists/ }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'It’s an artist: All My Friends Tour',
      }),
    );
    expect(await screen.findByText(/It's still in Not artists\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /To check/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.filter(([, init]) => init?.method === 'PATCH').length,
      ).toBe(2),
    );
    expect(await screen.findByText(/It's still in Not artists\./)).toBeTruthy();
  });

  it('keeps only Matched hits on a Matched search', async () => {
    // An automatic match lives in To check, so a Matched search drops it.
    listFor = () => ({ data: [row()], total: 1 });
    render(<ArtistsClient />);
    fireEvent.click(await screen.findByRole('tab', { name: /Matched/ }));
    await screen.findByTestId('artists-list');
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search artists' }),
      {
        target: { value: 'kyle' },
      },
    );
    expect(await screen.findByText('Not in Matched')).toBeTruthy();
    expect(
      screen.getByText('That name is in To check or Not artists.'),
    ).toBeTruthy();
  });

  it('lists a row sent back by It’s an artist once its save lands, after a switch to To check mid-save', async () => {
    const sentBack = row({
      id: 'n1',
      name: 'All My Friends Tour',
      matchStatus: 'unmatched',
      spotifyArtistId: null,
      autoMatchedAt: null,
      candidates: null,
    });
    listFor = (query) =>
      query.get('status') === 'not_an_artist'
        ? {
            data: [{ ...sentBack, matchStatus: 'not_an_artist' }],
            total: 1,
          }
        : // To check lists the row too: the server has it there already.
          { data: [row(), sentBack], total: 2 };
    const release = holdPatch();
    render(<ArtistsClient />);
    fireEvent.click(await screen.findByRole('tab', { name: /Not artists/ }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'It’s an artist: All My Friends Tour',
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /To check/ }));
    // While the save is out, the To check load leaves the row out.
    await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' });
    expect(rowName('All My Friends Tour')).toBeNull();
    release();
    expect(
      await screen.findByText('All My Friends Tour', { selector: 'div' }),
    ).toBeTruthy();
  });

  it('sends a Not artists row back with unmatched', async () => {
    render(<ArtistsClient />);
    fireEvent.click(await screen.findByRole('tab', { name: /Not artists/ }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'It’s an artist: All My Friends Tour',
      }),
    );
    await waitFor(() => {
      const patch = vi
        .mocked(fetch)
        .mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(patch?.[1]?.body).toBe(
        JSON.stringify({
          spotifyArtistId: null,
          matchStatus: 'unmatched',
          expectedStatus: 'not_an_artist',
        }),
      );
    });
  });

  it('draws a Check row with its counts', async () => {
    render(<ArtistsClient />);
    expect(
      await screen.findByText('Kyle Emerson', { selector: 'div' }),
    ).toBeTruthy();
    expect(screen.getByText('Matched automatically')).toBeTruthy();
    expect(await screen.findByText('10')).toBeTruthy();
  });

  it('snaps a row back with Save failed when the write fails', async () => {
    patchStatus = 500;
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' }),
    );
    expect(await screen.findByTestId('save-failed')).toBeTruthy();
    expect(screen.getByText('Kyle Emerson', { selector: 'div' })).toBeTruthy();
  });

  it('reloads on a 409 instead of showing Save failed', async () => {
    patchStatus = 409;
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' }),
    );
    await waitFor(() => expect(listCalls).toBe(2));
    expect(screen.queryByTestId('save-failed')).toBeNull();
    // No snap-back: the row comes back only from the reload's own list.
    expect(
      vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH')
        .length,
    ).toBe(1);
  });

  it('pins a Looks right confirm to the status the row was loaded with', async () => {
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' }),
    );
    await waitFor(() => {
      const patch = vi
        .mocked(fetch)
        .mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        spotifyArtistId: 'sp1',
        confirmAutoMatch: true,
        expectedStatus: 'matched',
      });
    });
  });

  it('keeps the current match from Change match (Looks right), pinned to its status', async () => {
    listFor = () => ({
      data: [row({ spotifyArtistId: 'sp9', autoMatchedAt: null })],
      total: 1,
    });
    render(<ArtistsClient />);
    fireEvent.click(await screen.findByRole('tab', { name: /Matched/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'More for Kyle Emerson' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Change match/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Search Pick' }),
    );
    await waitFor(() => {
      const patch = vi
        .mocked(fetch)
        .mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        spotifyArtistId: 'sp9',
        expectedStatus: 'matched',
      });
    });
  });

  it('opens the artist search full screen from the phone row’s Pick and Search', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    listFor = () => ({
      data: [
        row({
          matchStatus: 'no_match',
          spotifyArtistId: null,
          autoMatchedAt: null,
          candidates: [],
        }),
      ],
      total: 1,
    });
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Pick: Kyle Emerson' }),
    );
    expect(await screen.findByTestId('admin-sheet')).toBeTruthy();
    // The back link returns to the list.
    fireEvent.click(screen.getByRole('button', { name: 'Artists' }));
    await waitFor(() => expect(screen.queryByTestId('admin-sheet')).toBeNull());
    fireEvent.click(
      screen.getByRole('button', { name: 'Search: Kyle Emerson' }),
    );
    expect(await screen.findByTestId('admin-sheet')).toBeTruthy();
  });

  it('saves a pick from the artist search with the loaded status', async () => {
    listFor = () => ({
      data: [
        row({
          matchStatus: 'no_match',
          spotifyArtistId: null,
          autoMatchedAt: null,
          candidates: [],
        }),
      ],
      total: 1,
    });
    render(<ArtistsClient />);
    // The No match row's Search card opens the panel.
    fireEvent.click(await screen.findByRole('button', { name: /^Search/ }));
    expect(
      await screen.findByRole('dialog', {
        name: 'Find the right Kyle Emerson',
      }),
    ).toBeTruthy();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use: Search Pick' }),
    );
    await waitFor(() => {
      const patch = vi
        .mocked(fetch)
        .mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        spotifyArtistId: 'sp9',
        photoUrl: 'https://img/sp9',
        expectedStatus: 'no_match',
      });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sends the original expected status again on Try again', async () => {
    patchStatus = 500;
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      const bodies = vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => init?.method === 'PATCH')
        .map(([, init]) => JSON.parse(String(init?.body)));
      expect(bodies).toHaveLength(2);
      expect(bodies.map((body) => body.expectedStatus)).toEqual([
        'matched',
        'matched',
      ]);
    });
  });

  it('confirms Not an artist before writing it', async () => {
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Not an artist: Kyle Emerson',
      }),
    );
    expect(
      (await screen.findAllByText('Mark Kyle Emerson as not an artist?'))
        .length,
    ).toBeGreaterThan(0);
    expect(
      vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'PATCH'),
    ).toBe(false);
  });

  it('drops a row saved while a load lands', async () => {
    const release = holdPatch();
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' }),
    );
    // A new load lists the row again while its PATCH is still out.
    fireEvent.click(screen.getByRole('button', { name: /^Later/ }));
    await waitFor(() => expect(listCalls).toBe(2));
    await waitFor(() =>
      expect(screen.queryByTestId('page-skeleton')).toBeNull(),
    );
    expect(rowName('Kyle Emerson')).toBeNull();
    release();
    await waitFor(() => expect(rowName('Kyle Emerson')).toBeNull());
  });

  it('never snaps a failed row back into a newer list', async () => {
    // The row's show is in the next 60 days, so the server lists it under
    // Show in 60 days and never under Later.
    listFor = (query) =>
      query.get('window') === 'later'
        ? { data: [], total: 0 }
        : { data: [row()], total: 1 };
    patchStatus = 500;
    const release = holdPatch();
    render(<ArtistsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Later/ }));
    await waitFor(() => expect(listCalls).toBe(2));
    release();
    expect(await screen.findByTestId('save-failed')).toBeTruthy();
    // The newer list re-reads the server rather than taking the row back at
    // its old index, and the server has no such row under Later.
    await waitFor(() => expect(listCalls).toBe(3));
    expect(rowName('Kyle Emerson')).toBeNull();
  });

  it('keeps only To check hits on a search, and says when they live elsewhere', async () => {
    listFor = (query) =>
      query.has('search')
        ? {
            data: [row({ id: 'm1', name: 'Matched Act', autoMatchedAt: null })],
            total: 1,
          }
        : { data: [row()], total: 1 };
    render(<ArtistsClient />);
    await screen.findByRole('button', { name: 'Looks right: Kyle Emerson' });
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search artists' }),
      {
        target: { value: 'matched' },
      },
    );
    expect(await screen.findByText('Not in To check')).toBeTruthy();
    expect(rowName('Matched Act')).toBeNull();
  });

  it('steps back a page when a save empties a later one', async () => {
    listFor = (query) =>
      query.get('offset') === '0'
        ? {
            data: Array.from({ length: 100 }, (_, i) =>
              row({ id: `r${i}`, name: `Artist ${i}` }),
            ),
            total: 101,
          }
        : { data: [row({ id: 'last', name: 'Last Act' })], total: 101 };
    render(<ArtistsClient />);
    await screen.findByRole('button', { name: 'Looks right: Artist 0' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]!);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Looks right: Last Act' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Looks right: Artist 0' }),
    ).toBeTruthy();
  });
});

// The tablist moved onto AdminTabs (3b part 1) with the same ids, names and
// keys it had when it was hand-rolled here.
describe('ArtistsClient tabs on AdminTabs', () => {
  it('keeps the tab ids, the one panel and the roving tabindex', async () => {
    render(<ArtistsClient />);
    const list = await screen.findByRole('tablist', { name: 'Artist lists' });
    const tabs = screen.getAllByRole('tab');
    expect(list.contains(tabs[0]!)).toBe(true);
    expect(tabs.map((tab) => tab.id)).toEqual([
      'artists-tab-to_check',
      'artists-tab-matched',
      'artists-tab-not_an_artist',
    ]);
    for (const tab of tabs) {
      expect(tab.getAttribute('aria-controls')).toBe('artists-tab-panel');
    }
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    const panel = await screen.findByRole('tabpanel');
    expect(panel.id).toBe('artists-tab-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('artists-tab-to_check');
  });

  it('moves selection and focus with the arrow keys, Home and End', async () => {
    render(<ArtistsClient />);
    const toCheck = await screen.findByRole('tab', { name: /To check/ });
    fireEvent.keyDown(toCheck, { key: 'ArrowLeft' });
    const notArtists = screen.getByRole('tab', { name: /Not artists/ });
    expect(notArtists.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(notArtists);
    fireEvent.keyDown(notArtists, { key: 'Home' });
    expect(document.activeElement).toBe(
      screen.getByRole('tab', { name: /To check/ }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(
      screen
        .getByRole('tab', { name: /Matched/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });
});
