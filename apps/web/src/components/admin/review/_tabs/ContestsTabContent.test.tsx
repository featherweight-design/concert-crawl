// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { type ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReviewContestsResult } from '@/lib/queries/admin-contests'

// Mock the React Query hook directly so the tab body's loading / error /
// empty / data branches can be exercised in isolation. The hook itself
// has its own coverage via admin-contests.test.tsx (Task 16).
const mockUseReviewContestsQuery = vi.fn()
vi.mock('@/lib/queries/admin-contests', () => ({
  useReviewContestsQuery: () => mockUseReviewContestsQuery(),
}))

import { ContestsTabContent } from './ContestsTabContent'

const renderTab = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

const result = (
  overrides: Partial<{
    data: ReviewContestsResult | undefined
    isPending: boolean
    isError: boolean
    refetch: () => void
  }> = {},
) => ({
  data: undefined,
  isPending: false,
  isError: false,
  refetch: () => {},
  ...overrides,
})

describe('ContestsTabContent', () => {
  beforeEach(() => {
    cleanup()
    mockUseReviewContestsQuery.mockReset()
  })

  it('renders a status loading banner while the query is pending', () => {
    mockUseReviewContestsQuery.mockReturnValue(result({ isPending: true }))
    renderTab(<ContestsTabContent />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('renders an alert when the query errors', () => {
    mockUseReviewContestsQuery.mockReturnValue(result({ isError: true }))
    renderTab(<ContestsTabContent />)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  // R1-5 + R1-6: the error banner must include a retry affordance wired
  // to the hook's refetch — mirrors AdminDisputePanel's error UI so both
  // surfaces recover the same way. Without this the only recovery path
  // was a hard reload.
  it('renders a retry button in the error banner with the errorRetry copy', () => {
    mockUseReviewContestsQuery.mockReturnValue(result({ isError: true }))
    renderTab(<ContestsTabContent />)
    const button = screen.getByRole('button', { name: /retry/i })
    expect(button).toBeTruthy()
  })

  it('calls refetch when the retry button is clicked', () => {
    const refetch = vi.fn()
    mockUseReviewContestsQuery.mockReturnValue(
      result({ isError: true, refetch }),
    )
    renderTab(<ContestsTabContent />)
    const button = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(button)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders the queue panel title when data lands with rows', () => {
    mockUseReviewContestsQuery.mockReturnValue(
      result({
        data: {
          items: [
            {
              contestId: 'c-1',
              eventId: 'evt-1',
              eventTitle: 'Big Thief',
              venueName: 'Mission Ballroom',
              eventDate: '2027-08-30',
              tier: 'GA',
              sourceCategory: 'standard',
              parent: {
                id: 'p-1',
                priceMin: '48',
                priceMax: '58',
                vendor: 'AXS',
                submitter: { userId: 'u-1', handle: 'hugh' },
                confirms: { fans: 2, admin: 0 },
                observedAt: '2026-06-20T00:00:00Z',
                lastUpdatedAt: '2026-06-20T00:00:00Z',
                note: null,
              },
              counter: {
                id: 'k-1',
                priceMin: '65',
                priceMax: '80',
                vendor: 'AXS',
                submitter: { userId: 'u-2', handle: 'kel' },
                confirms: { fans: 1, admin: 0 },
                observedAt: '2026-06-22T00:00:00Z',
                note: null,
              },
              filedAt: '2026-06-22T00:00:00Z',
            },
          ],
          total: 1,
          limit: 50,
          offset: 0,
        },
      }),
    )
    renderTab(<ContestsTabContent />)
    // PriceDisputesQueue's title — confirms ContestsTabContent mounts the
    // queue rather than rendering a stub.
    expect(screen.getByText('Price disputes')).toBeTruthy()
    // Resolve link from PriceDisputesQueue's row — confirms the data
    // actually flows through to the row component.
    expect(
      screen.getByRole('link', { name: /resolve/i }).getAttribute('href'),
    ).toBe('/admin/review/contests/c-1')
  })

  // Spec §7.5 + design property table §1 line 15: empty (items.length === 0)
  // → queue returns null. Tab pill keeps the (0) badge (separate surface),
  // and ContestsTabContent intentionally does not render an empty-state
  // message of its own.
  it('renders nothing visible when the query lands with an empty list', () => {
    mockUseReviewContestsQuery.mockReturnValue(
      result({ data: { items: [], total: 0, limit: 50, offset: 0 } }),
    )
    const { container } = renderTab(<ContestsTabContent />)
    expect(container.textContent ?? '').toBe('')
  })
})
