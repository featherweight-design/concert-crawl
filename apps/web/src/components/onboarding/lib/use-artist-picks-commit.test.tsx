// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const followArtistsBulk =
  vi.fn<(token: string, slugs: readonly string[]) => Promise<void>>();

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', userId: 'user_1' }),
}));

vi.mock('@/lib/following', () => ({
  followArtistsBulk: (token: string, slugs: readonly string[]) =>
    followArtistsBulk(token, slugs),
}));

import { ApiError } from '@/lib/api';
import { ENTITLEMENT_REQUIRED_CODE } from '@/lib/history';
import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  writePicks,
  readPicks,
} from '@/components/consumer/artist-picker';
import { useArtistPicksCommit } from './use-artist-picks-commit';

beforeEach(() => {
  followArtistsBulk.mockReset();
  window.sessionStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useArtistPicksCommit', () => {
  it('advances without a write when nothing is selected', () => {
    const onDone = vi.fn();
    writePicks(ARTIST_PICKS_KEY, ['stale']);
    writePicks(GENRE_PICKS_KEY, ['punk']);
    const { result } = renderHook(() => useArtistPicksCommit(onDone));

    act(() => result.current.commit([]));

    expect(followArtistsBulk).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    // Skipping is a real outcome, so the mirror goes with it.
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([]);
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([]);
  });

  it('writes every pick in ONE request, then clears the mirror', async () => {
    const onDone = vi.fn();
    followArtistsBulk.mockResolvedValue(undefined);
    writePicks(ARTIST_PICKS_KEY, ['aa', 'bb']);
    writePicks(GENRE_PICKS_KEY, ['punk', 'metal']);
    const { result } = renderHook(() => useArtistPicksCommit(onDone));

    act(() => result.current.commit(['aa', 'bb']));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(followArtistsBulk).toHaveBeenCalledTimes(1);
    expect(followArtistsBulk).toHaveBeenCalledWith('test-token', ['aa', 'bb']);
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([]);
    // The lede promises the genres are not saved, so they cannot outlive the
    // step that used them as a filter.
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([]);
  });

  // An entitlement 403 used to hold the step and open the tier picker.
  // Following is on every plan now, so it is just another failed write and
  // the tour moves on rather than holding a fan on a sheet with nothing in it.
  it('moves on from an entitlement 403 instead of holding the step', async () => {
    const onDone = vi.fn();
    followArtistsBulk.mockRejectedValue(
      new ApiError(403, 'Forbidden', ENTITLEMENT_REQUIRED_CODE),
    );
    writePicks(ARTIST_PICKS_KEY, ['aa', 'bb']);
    writePicks(GENRE_PICKS_KEY, ['punk']);
    const { result } = renderHook(() => useArtistPicksCommit(onDone));

    act(() => result.current.commit(['aa', 'bb']));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(result.current).not.toHaveProperty('pickerOpen');
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([]);
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([]);
  });

  it('moves on when the write fails for any other reason', async () => {
    const onDone = vi.fn();
    followArtistsBulk.mockRejectedValue(new ApiError(500, 'Boom'));
    writePicks(ARTIST_PICKS_KEY, ['aa']);
    writePicks(GENRE_PICKS_KEY, ['punk']);
    const { result } = renderHook(() => useArtistPicksCommit(onDone));

    act(() => result.current.commit(['aa']));

    // Onboarding may never become a wall.
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    // The step is over either way, so neither mirror survives it.
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([]);
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([]);
  });
});
