// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { ENTITLEMENT_REQUIRED_CODE } from '@/lib/history';
import { useInvalidateFollowedArtistNames } from '@/lib/queries/use-followed-artist-names';

import { useArtistFollow } from './use-artist-follow';

const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, isSignedIn: true }),
}));

const post = vi.fn();
const del = vi.fn();
// A real class, so the branded 403 the test throws is a genuine ApiError and
// the rollback test proves the hook gives it no special path.
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code?: string,
      // The real ApiError's argument list, so the call sites below type-check
      // against it: only the 8th (`retryAfterSeconds`) matters here.
      _zodIssues?: unknown,
      _reason?: string,
      _field?: string,
      _body?: unknown,
      public readonly retryAfterSeconds?: number,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    apiClient: {
      post: (...args: unknown[]) => post(...args),
      delete: (...args: unknown[]) => del(...args),
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useArtistFollow', () => {
  it('flips immediately and keeps the server answer', async () => {
    post.mockResolvedValue({ following: true });
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false));

    act(() => {
      result.current.toggle();
    });
    // Optimistic: the flip lands in the same tick as the click, before the
    // request resolves.
    expect(result.current.following).toBe(true);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]?.[0]).toBe('/v1/artists/wax-harbour/follow');
    expect(result.current.following).toBe(true);
  });

  it('refreshes the Followed highlight set once the write settles, not on a rollback', async () => {
    const invalidate = vi.fn();
    vi.mocked(useInvalidateFollowedArtistNames).mockReturnValue(invalidate);

    post.mockResolvedValueOnce({ following: true });
    const ok = renderHook(() => useArtistFollow('wax-harbour', false));
    act(() => {
      ok.result.current.toggle();
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));

    post.mockRejectedValueOnce(new Error('nope'));
    const failed = renderHook(() => useArtistFollow('wax-harbour', false));
    act(() => {
      failed.result.current.toggle();
    });
    await waitFor(() => expect(failed.result.current.following).toBe(false));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('rolls back when the request is rejected', async () => {
    post.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false));

    act(() => {
      result.current.toggle();
    });
    expect(result.current.following).toBe(true);

    await waitFor(() => expect(result.current.following).toBe(false));
  });

  it('rolls back when a 2xx body has an unreadable shape', async () => {
    // A success we cannot parse is not a success — keeping the optimistic
    // guess would strand the UI out of sync with the server.
    post.mockResolvedValue({ ok: 'sure' });
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false));

    act(() => {
      result.current.toggle();
    });
    expect(result.current.following).toBe(true);

    await waitFor(() => expect(result.current.following).toBe(false));
  });

  it('takes the server state when it disagrees with the optimistic flip', async () => {
    // Unfollowing a Spotify-sourced artist leaves the follow standing — the
    // API returns the EFFECTIVE state, and that is what we must render.
    del.mockResolvedValue({ following: true });
    const { result } = renderHook(() => useArtistFollow('wax-harbour', true));

    act(() => {
      result.current.toggle();
    });
    expect(result.current.following).toBe(false);

    await waitFor(() => expect(result.current.following).toBe(true));
    expect(del).toHaveBeenCalledWith('/v1/artists/wax-harbour/follow', 'token');
  });

  it('never returns silently on a branded 403: it warns and rolls back', async () => {
    // Following is free, so there is no upgrade path to hand a 403 to. A
    // branch that returned early on the entitlement code would swallow the
    // failure without a trace; it has to take the ordinary failure path.
    post.mockRejectedValue(
      new ApiError(403, 'premium', ENTITLEMENT_REQUIRED_CODE),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false));

    act(() => {
      result.current.toggle();
    });

    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(result.current.following).toBe(false);
    warn.mockRestore();
  });

  it('adopts a changed initialFollowing, as after the sign-in replay refresh', () => {
    // The replay follows on arrival and refreshes the route; the hook is
    // already mounted, so only a prop change can carry the server's answer.
    const { result, rerender } = renderHook(
      ({ initial }: { initial: boolean }) =>
        useArtistFollow('wax-harbour', initial),
      { initialProps: { initial: false } },
    );
    expect(result.current.following).toBe(false);

    rerender({ initial: true });
    expect(result.current.following).toBe(true);
  });

  it('does not let a prop change clobber an in-flight toggle', async () => {
    let settle: (value: unknown) => void = () => {};
    post.mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ initial }: { initial: boolean }) =>
        useArtistFollow('wax-harbour', initial),
      { initialProps: { initial: false } },
    );

    act(() => {
      result.current.toggle();
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    // A stale refresh lands mid-request: the optimistic flip holds.
    rerender({ initial: false });
    expect(result.current.following).toBe(true);
    rerender({ initial: true });
    rerender({ initial: false });
    expect(result.current.following).toBe(true);

    await act(async () => {
      settle({ following: true });
    });
    expect(result.current.following).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  it('ignores a second click while one is in flight', async () => {
    post.mockResolvedValue({ following: true });
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false));

    act(() => {
      result.current.toggle();
      result.current.toggle();
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(del).not.toHaveBeenCalled();
  });

  describe('by mbid (slug null)', () => {
    it('follows by mbid, then unfollows through the slug it learned', async () => {
      post.mockResolvedValueOnce({ following: true, slug: 'new-act' });
      const { result } = renderHook(() =>
        useArtistFollow(null, false, 'mbid-1'),
      );
      act(() => {
        result.current.toggle();
      });
      await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
      expect(post.mock.calls[0]?.[0]).toBe('/v1/artists/follow');
      expect(post.mock.calls[0]?.[2]).toEqual({ mbid: 'mbid-1' });
      await waitFor(() => expect(result.current.pending).toBe(false));
      expect(result.current.following).toBe(true);

      del.mockResolvedValueOnce({ following: false });
      act(() => {
        result.current.toggle();
      });
      await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
      expect(del.mock.calls[0]?.[0]).toBe('/v1/artists/new-act/follow');
      await waitFor(() => expect(result.current.following).toBe(false));
    });

    it('rolls back when the answer carries no slug', async () => {
      post.mockResolvedValueOnce({ following: true });
      const { result } = renderHook(() =>
        useArtistFollow(null, false, 'mbid-1'),
      );
      act(() => {
        result.current.toggle();
      });
      await waitFor(() => expect(result.current.pending).toBe(false));
      expect(result.current.following).toBe(false);
    });
  });

  describe('refusals', () => {
    const refuse = async (err: unknown) => {
      post.mockRejectedValueOnce(err);
      const hook = renderHook(() => useArtistFollow('wax-harbour', false));
      act(() => {
        hook.result.current.toggle();
      });
      await waitFor(() => expect(hook.result.current.pending).toBe(false));
      return hook;
    };

    it.each([
      [404, 'not_found'],
      [409, 'name_held'],
      [503, 'unavailable'],
    ])('maps a %i to %s and rolls back', async (status, kind) => {
      const { result } = await refuse(new ApiError(status, 'x'));
      expect(result.current.following).toBe(false);
      expect(result.current.error).toEqual({ kind });
    });

    it('maps a 429 to a retry time from Retry-After', async () => {
      const now = Date.now();
      const { result } = await refuse(
        new ApiError(
          429,
          'x',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          900,
        ),
      );
      expect(result.current.following).toBe(false);
      const error = result.current.error;
      expect(error?.kind).toBe('rate_limited');
      if (error?.kind !== 'rate_limited') return;
      expect(error.retryAt.getTime() - now).toBeGreaterThanOrEqual(899_000);
      expect(error.retryAt.getTime() - now).toBeLessThan(905_000);
    });

    it('leaves an unmapped failure silent', async () => {
      const { result } = await refuse(new ApiError(500, 'x'));
      expect(result.current.error).toBeNull();
    });

    it('clears the message on the next tap', async () => {
      const { result } = await refuse(new ApiError(503, 'x'));
      expect(result.current.error).not.toBeNull();
      post.mockResolvedValueOnce({ following: true });
      act(() => {
        result.current.toggle();
      });
      expect(result.current.error).toBeNull();
      await waitFor(() => expect(result.current.following).toBe(true));
    });
  });
});
