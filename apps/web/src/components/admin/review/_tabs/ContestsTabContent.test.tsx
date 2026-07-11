// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReviewContestsResult } from '@/lib/queries/admin-contests'

// Mock the React Query hook directly so the tab body's loading / error /
// empty / data branches can be exercised in isolation. The hook itself
// has its own coverage via admin-contests.test.tsx (Task 16).
const mockUseReviewContestsQuery = vi.fn()
vi.mock('@/lib/queries/admin-contests', () => ({
  useReviewContestsQuery: (...args: unknown[]) =>
    mockUseReviewContestsQuery(...args),
}))

// URL state (#758/#759) comes from next/navigation — the tab derives
// pagination/sort/scope from the search params and pushes updates via
// router.push. `mockSearch` is mutated per-test to simulate deep links.
const mockPush = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/review',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

import { ContestsTabContent } from './ContestsTabContent'

const renderTab = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

const result = (
  overrides: Partial<{
    data: ReviewContestsResult | undefined
    isPending: boolean
    isFetching: boolean
    isError: boolean
    refetch: () => void
  }> = {},
) => ({
  data: undefined,
  isPending: false,
  isFetching: false,
  isError: false,
  refetch: () => {},
  ...overrides,
})

describe('ContestsTabContent', () => {
  beforeEach(() => {
    cleanup()
    mockUseReviewContestsQuery.mockReset()
    mockPush.mockReset()
    mockSearch = ''
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
                status: 'pending',
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

  // #758/#759 — with a bare URL the query receives the server defaults:
  // first page at pageSize 20, oldest-first, open contests only.
  it('calls the query with default params when the URL has no state', () => {
    mockUseReviewContestsQuery.mockReturnValue(
      result({ data: { items: [], total: 0, limit: 20, offset: 0 } }),
    )
    renderTab(<ContestsTabContent />)
    expect(mockUseReviewContestsQuery).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      sort: 'filed-at-asc',
      includeArchived: false,
    })
  })

  // #758/#759 — deep-linked URL state (page/pageSize/sort/disputes) is
  // parsed into the query params: page 3 at size 50 → offset 100.
  it('derives query params from the URL search params', () => {
    mockSearch = 'page=3&pageSize=50&sort=filed-at-desc&disputes=all'
    mockUseReviewContestsQuery.mockReturnValue(
      result({ data: { items: [], total: 0, limit: 50, offset: 100 } }),
    )
    renderTab(<ContestsTabContent />)
    expect(mockUseReviewContestsQuery).toHaveBeenCalledWith({
      limit: 50,
      offset: 100,
      sort: 'filed-at-desc',
      includeArchived: true,
    })
  })

  // #759 — items=[] but total>0 (deep link past the last page). The queue
  // auto-hides, but the bare pager must render so its clamp-sync effect
  // can push the URL back to a real page.
  it('renders the bare pagination footer when items is empty but total > 0', () => {
    mockSearch = 'page=99'
    mockUseReviewContestsQuery.mockReturnValue(
      result({ data: { items: [], total: 42, limit: 20, offset: 1960 } }),
    )
    renderTab(<ContestsTabContent />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy()
  })
})
