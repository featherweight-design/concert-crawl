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
  wrongPhotoReportCount: 0,
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

/** What a candidates call answers, from its URL. Tests swap it per case. */
let respond: (url: string) => Promise<Response>;

beforeEach(() => {
  respond = async () =>
    json({ success: true, data: CANDIDATES, query: 'Cashmere' });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => respond(String(input))),
  );
});

/** Lets pending promise work (a token await, a fetch) run before asserting. */
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

/** A held response, released by the returned function. */
const held = (body: unknown) => {
  let release = () => undefined as void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    response: gate.then(() => json(body)),
    release: () => release(),
  };
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const api = artistsApi(async () => 'token');

const renderPanel = (isPhone: boolean, over: Partial<AdminArtistRow> = {}) => {
  const onUse = vi.fn();
  const onNotAnArtist = vi.fn();
  const onClose = vi.fn();
  render(
    <ArtistSearchPanel
      row={{ ...row, ...over }}
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

describe('ArtistSearchPanel requests and states', () => {
  const submit = (value: string) => {
    const input = screen.getByRole('searchbox', {
      name: 'Search Spotify by name',
    });
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(input);
  };

  it('ignores a submit while a search is out, so no older answer can land late', async () => {
    const first = held({ success: true, data: CANDIDATES });
    respond = () => first.response;
    renderPanel(false);
    // The opening load awaits the token before it fetches, so wait for it.
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));
    submit('Cashmere Cat');
    // A submit that slipped through would fetch only after the token await.
    await settle();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    first.release();
    expect(await screen.findByText('2 results')).toBeInTheDocument();
  });

  it('never runs the same search twice in a row', async () => {
    renderPanel(false);
    await screen.findByText('2 results');
    submit('Cashmere Cat');
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await screen.findByText('2 results');
    submit('Cashmere Cat');
    await settle();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('drops an answer that lands after the panel closed', async () => {
    const first = held({ success: true, data: CANDIDATES });
    respond = () => first.response;
    renderPanel(false);
    cleanup();
    first.release();
    await first.response;
    expect(screen.queryByText('2 results')).toBeNull();
  });

  it('says Spotify could not be reached, and lets the same search run again', async () => {
    respond = async () =>
      new Response(JSON.stringify({ success: false }), { status: 503 });
    renderPanel(false);
    expect(
      await screen.findByText("Couldn't reach Spotify."),
    ).toBeInTheDocument();
    submit('Cashmere');
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
  });

  it('prompts a search when nothing is saved, and says so when a search finds nobody', async () => {
    respond = async () => json({ success: true, data: [] });
    renderPanel(false);
    expect(
      await screen.findByText(
        'Nothing saved for this name yet. Search Spotify above.',
      ),
    ).toBeInTheDocument();
    submit('zzqq');
    expect(
      await screen.findByText('No artist by that name. Try another spelling.'),
    ).toBeInTheDocument();
  });

  it('says when Exact name hides every hit', async () => {
    respond = async () =>
      json({
        success: true,
        data: CANDIDATES.map((each) => ({ ...each, isExactMatch: false })),
      });
    renderPanel(false);
    await screen.findByText('2 results');
    fireEvent.click(screen.getByRole('button', { name: 'Exact name' }));
    expect(
      screen.getByText(
        'No exact name match. Turn off Exact name to see the rest.',
      ),
    ).toBeInTheDocument();
  });

  it('labels the current match Looks right and marks it current', async () => {
    renderPanel(false);
    const keep = await screen.findByRole('button', {
      name: 'Looks right: Cashmere',
    });
    expect(keep.closest('li')).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('list', { name: 'Spotify artists for Cashmere' }),
    ).toBeInTheDocument();
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

  it('keeps the wrong-artist wording when there are wrong-photo reports', async () => {
    renderPanel(true, { wrongPhotoReportCount: 3 });
    expect(
      screen.getByText('Lost Lake · Sun Nov 15 · 2 wrong-artist reports'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/current photo is wrong/)).toBeNull();
    await screen.findByText('2 results');
  });
});

describe('ArtistSearchPanel desktop subtitle', () => {
  it('names the wrong-photo reports, plural', async () => {
    renderPanel(false, { wrongPhotoReportCount: 2 });
    const subtitle = screen.getByText(
      'For Lost Lake · Sun Nov 15 · 2 fans say the current photo is wrong',
    );
    expect(subtitle).toHaveStyle({ fontSize: '13px', marginTop: '4px' });
    expect(subtitle.style.color).toBe('var(--fg-muted)');
    await screen.findByText('2 results');
  });

  it('names one wrong-photo report, singular', async () => {
    renderPanel(false, { wrongPhotoReportCount: 1 });
    expect(
      screen.getByText(
        'For Lost Lake · Sun Nov 15 · 1 fan says the current photo is wrong',
      ),
    ).toBeInTheDocument();
    await screen.findByText('2 results');
  });

  it.each([null, 0])(
    'keeps the wrong-artist wording when the wrong-photo count is %s',
    async (count) => {
      renderPanel(false, { wrongPhotoReportCount: count });
      expect(
        screen.getByText('For Lost Lake · Sun Nov 15 · 2 wrong-artist reports'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/current photo is wrong/)).toBeNull();
      await screen.findByText('2 results');
    },
  );

  it('puts "For" on the show only, so a row with no next show has none', async () => {
    renderPanel(false, { wrongPhotoReportCount: 2, nextShow: null });
    expect(
      screen.getByText('2 fans say the current photo is wrong'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^For /)).toBeNull();
    await screen.findByText('2 results');
  });
});
