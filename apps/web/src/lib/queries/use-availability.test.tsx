// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAvailability } from './use-availability'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null }),
}))
vi.mock('@/lib/api', () => ({
  publicApiClient: {
    get: async () => ({
      data: [{ date: '2026-04-28', count: 2 }],
      from: '2026-04-01',
      to: '2027-04-30',
    }),
  },
  apiClient: { get: async () => ({ data: [], from: '', to: '' }) },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useAvailability', () => {
  it('exposes a date→count map', async () => {
    const { result } = renderHook(
      () => useAvailability({ from: '2026-04-01', to: '2027-04-30' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.data?.size).toBeGreaterThan(0))
    expect(result.current.data?.get('2026-04-28')).toBe(2)
  })
})
