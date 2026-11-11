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
vi.mock('@/lib/queries/use-feature-flags', () => ({
  useFeatureFlag: () => ({ enabled: true }),
}));

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: { get: (...args: unknown[]) => apiGet(...args) },
}));

import { useCrewGoing } from './use-crew-going';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const load = async (going: unknown[]) => {
  apiGet.mockResolvedValueOnce({ count: going.length, going });
  const { result } = renderHook(() => useCrewGoing('evt_1'), { wrapper });
  await waitFor(() => expect(result.current.isPending).toBe(false));
  return result.current;
};

// B+ B15: the avatar pair's second colour crosses this boundary too.
describe('useCrewGoing avatar pair', () => {
  it('reads an API without the field as solid (null, never undefined)', async () => {
    const { data } = await load([
      { userId: 'u2', handle: 'ana', avatarColor: 'signal' },
    ]);
    expect(data?.going[0]?.avatarSecondColor).toBeNull();
  });

  it('rejects an unknown second colour', async () => {
    const { isError } = await load([
      {
        userId: 'u2',
        handle: 'ana',
        avatarColor: 'signal',
        avatarSecondColor: 'chartreuse',
      },
    ]);
    expect(isError).toBe(true);
  });
});
