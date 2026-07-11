import { describe, it, expect, vi } from 'vitest'

const mockUseQuery = vi.fn().mockReturnValue({ data: undefined })
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: Record<string, unknown>) => mockUseQuery(options),
}))
vi.mock('@/lib/billing', () => ({
  fetchFounderWindow: vi.fn(),
}))

import { useFounderWindow } from './use-founder-window'

describe('useFounderWindow', () => {
  it('polls at the 10s server-cache interval so the scarcity rail stays fresh', () => {
    useFounderWindow()
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 10_000,
        refetchInterval: 10_000,
        enabled: true,
      }),
    )
  })
})
