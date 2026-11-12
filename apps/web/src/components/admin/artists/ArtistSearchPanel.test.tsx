// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ArtistSearchPanel } from './ArtistSearchPanel';
import { artistsApi, type AdminArtistRow } from './artists-api';

const row: AdminArtistRow = {
  id: 'a1',
  name: 'Cashmere',
  spotifyArtistId: 'sp-denver',
  matchStatus: 'matched',
  photoUrl: null,
  autoMatchedAt: null,
  openReportCount: 2,
  upcomingCount: 1,
  watchingCount: 0,
  nextShow: { date: '2026-11-15', venueName: 'Lost Lake' },
  candidates: null,
};

const CANDIDATES = [
  {
    id: 'sp-denver',
    name: 'Cashmere',
    imageUrl: null,
    genres: ['indie soul'],
    spotifyUrl: 'https://open.spotify.com/artist/sp-denver',
    isExactMatch: true,
  },
  {
    id: 'sp-cat',
    name: 'Cashmere Cat',
    imageUrl: null,
    genres: ['electronic'],
    spotifyUrl: 'https://open.spotify.com/artist/sp-cat',
    isExactMatch: false,
  },
];

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      json({ success: true, data: CANDIDATES, query: 'Cashmere' }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const api = artistsApi(async () => 'token');

const renderPanel = (isPhone: boolean) => {
  const onUse = vi.fn();
  const onNotAnArtist = vi.fn();
  const onClose = vi.fn();
  render(
    <ArtistSearchPanel
      row={row}
      api={api}
      isPhone={isPhone}
      onUse={onUse}
      onNotAnArtist={onNotAnArtist}
      onClose={onClose}
    />,
  );
  return { onUse, onNotAnArtist, onClose };
};

const candidateUrls = () =>
  vi.mocked(fetch).mock.calls.map(([input]) => String(input));

describe('ArtistSearchPanel on desktop', () => {
  it('opens as a side panel on the saved candidates, with the row as context', async () => {
    renderPanel(false);
    expect(
      screen.getByRole('dialog', { name: 'Find the right Cashmere' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('For Lost Lake · Sun Nov 15 · 2 wrong-artist reports'),
    ).toBeInTheDocument();
    expect(await screen.findByText('2 results')).toBeInTheDocument();
    // No query on open: the snapshot, not a live Spotify search.
    expect(candidateUrls()).toEqual([
      expect.stringMatching(/\/v1\/admin\/artists\/a1\/candidates$/),
    ]);
  });

  it('limits the results to exact name matches', async () => {
    renderPanel(false);
    await screen.findByText('2 results');
    fireEvent.click(screen.getByRole('button', { name: 'Exact name' }));
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Use: Cashmere Cat' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Exact name' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('searches Spotify for a new name only on submit', async () => {
    renderPanel(false);
    await screen.findByText('2 results');
    const input = screen.getByRole('searchbox', {
      name: 'Search Spotify by name',
    });
    fireEvent.change(input, { target: { value: 'Cashmere Cat' } });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    fireEvent.submit(input);
    await waitFor(() =>
      expect(candidateUrls()[1]).toMatch(/candidates\?query=Cashmere\+Cat$/),
    );
  });

  it('hands the picked artist back, and Not an artist to the page', async () => {
    const { onUse, onNotAnArtist } = renderPanel(false);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use: Cashmere Cat' }),
    );
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sp-cat' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Not an artist' }));
    expect(onNotAnArtist).toHaveBeenCalledTimes(1);
  });
});

describe('ArtistSearchPanel on the phone', () => {
  it('opens full screen with a back link to Artists', async () => {
    const { onClose, onNotAnArtist } = renderPanel(true);
    expect(screen.getByTestId('admin-sheet')).toBeInTheDocument();
    expect(
      screen.getByText('Lost Lake · Sun Nov 15 · 2 wrong-artist reports'),
    ).toBeInTheDocument();
    expect(await screen.findByText('2 results')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not an artist' }));
    expect(onNotAnArtist).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Artists' }));
    expect(onClose).toHaveBeenCalled();
  });
});
