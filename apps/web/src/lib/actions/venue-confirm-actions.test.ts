import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiModule from '@/lib/api';

const patch = vi.fn();
const del = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ getToken: async () => 'token' }),
  currentUser: async () => null,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, apiClient: { patch, delete: del } };
});

const { ApiError } = await import('@/lib/api');
const { deleteVenue, hideVenue, tryDeleteVenue } = await import('./venues');

beforeEach(() => {
  patch.mockReset();
  del.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const refusal = (status: number, body: unknown) =>
  new ApiError(
    status,
    'refused',
    undefined,
    undefined,
    undefined,
    undefined,
    body,
  );

describe('tryDeleteVenue', () => {
  it('is ok when the delete goes through, with one DELETE call', async () => {
    del.mockResolvedValue({ eventsDetached: 2 });
    await expect(tryDeleteVenue('v1')).resolves.toEqual({
      ok: true,
      eventsDetached: 2,
    });
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('/v1/admin/venues/v1', 'token');
  });

  it('returns the guard’s counts from a 409 body', async () => {
    del.mockRejectedValue(
      refusal(409, {
        success: false,
        error: 'Venue has history',
        code: 'has_history',
        pastShows: 12,
        upcomingShows: 1,
        watchers: 3,
      }),
    );
    await expect(tryDeleteVenue('v1')).resolves.toEqual({
      ok: false,
      refused: { pastShows: 12, upcomingShows: 1, watchers: 3 },
    });
  });

  it('has no counts for a 409 without them, or any other refusal', async () => {
    del.mockRejectedValue(refusal(409, { success: false, error: 'x' }));
    await expect(tryDeleteVenue('v1')).resolves.toEqual({
      ok: false,
      refused: null,
    });
    del.mockRejectedValue(
      refusal(500, { pastShows: 1, upcomingShows: 0, watchers: 0 }),
    );
    await expect(tryDeleteVenue('v1')).resolves.toEqual({
      ok: false,
      refused: null,
    });
  });

  it('treats the route’s own not-found 404 as done, and logs it', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    del.mockRejectedValue(
      refusal(404, { success: false, error: 'Venue not found' }),
    );
    await expect(tryDeleteVenue('v1')).resolves.toEqual({
      ok: true,
      eventsDetached: 0,
    });
    expect(info).toHaveBeenCalledWith('tryDeleteVenue: already gone', {
      id: 'v1',
    });
  });

  it('treats any other 404 (a missing route, version skew) as a failure', async () => {
    for (const body of [
      { success: false, error: 'Not Found' },
      undefined,
      'Not Found',
    ]) {
      del.mockRejectedValue(refusal(404, body));
      await expect(tryDeleteVenue('v1')).resolves.toEqual({
        ok: false,
        refused: null,
      });
    }
  });

  it('rethrows what is not an API refusal', async () => {
    del.mockRejectedValue(new TypeError('fetch failed'));
    await expect(tryDeleteVenue('v1')).rejects.toThrow('fetch failed');
  });
});

describe('deleteVenue', () => {
  it('still returns the detached count to its callers', async () => {
    del.mockResolvedValue({ eventsDetached: 2 });
    await expect(deleteVenue('v1')).resolves.toEqual({ eventsDetached: 2 });
  });
});

describe('hideVenue', () => {
  it('sends the reason, and the note only for Other', async () => {
    patch.mockResolvedValue({});
    await hideVenue('v1', 'venue_closed', null);
    expect(patch).toHaveBeenLastCalledWith('/v1/admin/venues/v1', 'token', {
      active: false,
      hideReason: 'venue_closed',
    });
    await hideVenue('v1', 'other', 'Renovation through March.');
    expect(patch).toHaveBeenLastCalledWith('/v1/admin/venues/v1', 'token', {
      active: false,
      hideReason: 'other',
      hideNote: 'Renovation through March.',
    });
  });
});
