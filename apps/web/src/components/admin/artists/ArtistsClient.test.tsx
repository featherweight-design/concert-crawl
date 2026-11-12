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

beforeEach(() => {
  patchStatus = 200;
  listCalls = 0;
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        return patchStatus === 200
          ? json(200, { success: true, data: {} })
          : json(patchStatus, { success: false, error: 'nope' });
      }
      if (url.includes('/counts'))
        return json(200, { success: true, data: COUNTS });
      listCalls += 1;
      return json(200, { success: true, data: [row()], total: 1 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ArtistsClient', () => {
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
});
