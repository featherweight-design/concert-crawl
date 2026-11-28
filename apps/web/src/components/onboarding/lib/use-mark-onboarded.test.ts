// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

interface AuthMock {
  userId: string | null;
  sessionClaims: unknown;
  getToken: Mock<() => Promise<string>>;
}
const auth = vi.hoisted((): AuthMock => ({
  userId: 'user_new',
  sessionClaims: undefined,
  getToken: vi.fn(async () => 'tok'),
}));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => auth }));

const post = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@/lib/api', () => ({ apiClient: { post } }));

import { useMarkOnboarded } from './use-mark-onboarded';

const clearCookie = () => {
  document.cookie = 'cc_onboarded=; Path=/; Max-Age=0';
};

afterEach(() => {
  clearCookie();
  auth.userId = 'user_new';
  auth.sessionClaims = undefined;
  auth.getToken.mockClear();
  post.mockReset().mockResolvedValue({});
});

describe('useMarkOnboarded', () => {
  it('sets the cookie to the user at once, then stamps in the background', async () => {
    const { result } = renderHook(() => useMarkOnboarded());
    result.current();
    // Synchronous: the cookie is there before any await, so a navigation in
    // the same handler already carries it.
    expect(document.cookie).toContain('cc_onboarded=user_new');
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/v1/me/onboarded',
        'tok',
        {},
        {
          keepalive: true,
        },
      ),
    );
  });

  it('keeps the cookie and never throws when the stamp write fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    post.mockRejectedValueOnce(new Error('502'));
    const { result } = renderHook(() => useMarkOnboarded());
    expect(() => result.current()).not.toThrow();
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(document.cookie).toContain('cc_onboarded=user_new');
    error.mockRestore();
  });

  it('skips the write when the token already carries a stamp', async () => {
    auth.sessionClaims = { metadata: { onboardedAt: '2026-11-01T00:00:00Z' } };
    const { result } = renderHook(() => useMarkOnboarded());
    result.current();
    expect(document.cookie).toContain('cc_onboarded=user_new');
    await Promise.resolve();
    expect(auth.getToken).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('does nothing when signed out', () => {
    auth.userId = null;
    const { result } = renderHook(() => useMarkOnboarded());
    result.current();
    expect(document.cookie).not.toContain('cc_onboarded');
    expect(post).not.toHaveBeenCalled();
  });
});
