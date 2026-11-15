// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const authedGet = vi.fn();
vi.mock('@/lib/api', () => ({
  publicApiClient: { get },
  apiClient: { get: authedGet },
}));

// Clerk settles before the query runs; `userId` is the viewer (null = signed out).
const auth = vi.hoisted(() => ({
  state: { isLoaded: true, userId: null as string | null },
  getToken: vi.fn(),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ ...auth.state, getToken: auth.getToken }),
}));

const { useFeatureFlag, useFeatureFlags } = await import('./use-feature-flags');

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useFeatureFlags', () => {
  beforeEach(() => {
    auth.state = { isLoaded: true, userId: null };
    get.mockReset();
    authedGet.mockReset();
    auth.getToken.mockReset();
  });

  // A flag at Me or Beta is on for some people only: the signed-in viewer's
  // token goes with the request, or they get the signed-out map.
  it('sends the signed-in viewer token so a Me or Beta flag reaches them', async () => {
    auth.state = { isLoaded: true, userId: 'user_a' };
    auth.getToken.mockResolvedValue('tok_a');
    authedGet.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    });
    const { result } = renderHook(() => useFeatureFlags(), { wrapper });
    await waitFor(() => expect(result.current.data?.crews).toBe(true));
    expect(authedGet).toHaveBeenCalledWith('/v1/flags', 'tok_a');
    expect(get).not.toHaveBeenCalled();
  });

  it('waits for Clerk before asking, so the first answer is not the signed-out one', async () => {
    auth.state = { isLoaded: false, userId: null };
    renderHook(() => useFeatureFlags(), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(get).not.toHaveBeenCalled();
    expect(authedGet).not.toHaveBeenCalled();
  });

  it('returns the flag map from the public endpoint', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    });
    const { result } = renderHook(() => useFeatureFlags(), { wrapper });
    await waitFor(() => expect(result.current.data?.crews).toBe(true));
    expect(get).toHaveBeenCalledWith('/v1/flags');
  });

  it('serves the registry default while the fetch is in flight', async () => {
    get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFeatureFlag('crews'), { wrapper });
    expect(result.current).toEqual({
      isLoading: true,
      enabled: false,
      loaded: false,
    });
  });

  // Same in-flight state, opposite default: a released feature must not blink
  // out between first paint and the flag map landing.
  it('keeps a default-on flag on while the fetch is in flight', async () => {
    get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFeatureFlag('release-notes'), {
      wrapper,
    });
    expect(result.current).toEqual({
      isLoading: true,
      enabled: true,
      loaded: false,
    });
  });

  it('falls back to registry defaults when the fetch fails', async () => {
    get.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useFeatureFlag('release-notes'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(true);
  });

  // apps/web has no zod, so the boundary is narrowed with a hand-written guard
  // (same approach as use-event-watchers). A malformed map must not be able to
  // turn a default-off flag on.
  it('rejects a malformed flag map and keeps the registry defaults', async () => {
    get.mockResolvedValue({ crews: 'yes' });
    const { result } = renderHook(() => useFeatureFlag('crews'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });
});
