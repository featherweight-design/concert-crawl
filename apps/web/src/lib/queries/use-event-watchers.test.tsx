// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => 'token',
    isSignedIn: true,
    userId: 'user_1',
  }),
}));

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: { get: (...args: unknown[]) => apiGet(...args) },
}));

import { useEventWatchers } from './use-event-watchers';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const load = async (named: unknown[]) => {
  apiGet.mockResolvedValueOnce({ total: named.length, named });
  const { result } = renderHook(() => useEventWatchers('evt_1'), { wrapper });
  await waitFor(() => expect(result.current.isPending).toBe(false));
  return result.current;
};

// B+ B15: the avatar pair's second colour crosses this boundary too.
describe('useEventWatchers avatar pair', () => {
  it('keeps a valid second colour', async () => {
    const { data } = await load([
      { handle: 'ana', avatarColor: 'signal', avatarSecondColor: 'success' },
    ]);
    expect(data?.named[0]?.avatarSecondColor).toBe('success');
  });

  it('reads an API without the field as solid (null, never undefined)', async () => {
    const { data } = await load([{ handle: 'ana', avatarColor: 'signal' }]);
    expect(data?.named[0]?.avatarSecondColor).toBeNull();
  });

  it('rejects an unknown second colour', async () => {
    const { isError } = await load([
      { handle: 'ana', avatarColor: 'signal', avatarSecondColor: 'chartreuse' },
    ]);
    expect(isError).toBe(true);
  });
});
