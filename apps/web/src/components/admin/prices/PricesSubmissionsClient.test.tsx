// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PriceSubmissionHistoryRow } from '@/lib/queries/use-admin-price-submissions'

// The query hook has its own coverage; here we mock it so the client's
// filter / sort / paginate / bulk-action branches run against a fixed set.
const mockUseAdminPriceSubmissions = vi.fn<(...args: unknown[]) => unknown>()
vi.mock('@/lib/queries/use-admin-price-submissions', () => ({
  adminPriceSubmissionsKey: ['admin', 'prices', 'submissions', 'history'],
  useAdminPriceSubmissions: (...args: unknown[]) =>
    mockUseAdminPriceSubmissions(...args),
}))

// Clerk auth — the client calls getToken() before each PATCH.
const mockGetToken = vi.fn<() => Promise<string | null>>()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

// apiClient.patch drives approve / deny; assert the URL + status payload.
const mockPatch = vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
  Promise.resolve({}),
)
vi.mock('@/lib/api', () => ({
  apiClient: { patch: (...args: unknown[]) => mockPatch(...args) },
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

import { PricesSubmissionsClient } from './PricesSubmissionsClient'

const row = (
  overrides: Partial<PriceSubmissionHistoryRow>,
): PriceSubmissionHistoryRow => ({
  id: 'sub-x',
  eventId: 'evt-x',
  userId: 'user-x-1234567890',
  priceMin: '40',
  priceMax: '60',
  status: 'pending',
  disputedSubmissionId: null,
  createdAt: '2026-07-01T00:00:00Z',
  eventTitle: 'Untitled',
  eventDate: null,
  ticketUrl: null,
  venueName: null,
  ...overrides,
})

const ROWS: PriceSubmissionHistoryRow[] = [
  row({ id: 'sub-1', eventTitle: 'Alpha Show', status: 'pending' }),
  row({ id: 'sub-2', eventTitle: 'Bravo Show', status: 'pending' }),
  row({ id: 'sub-3', eventTitle: 'Charlie Show', status: 'corroborated' }),
  row({ id: 'sub-4', eventTitle: 'Delta Show', status: 'disputed' }),
]

const renderClient = (ui: ReactElement): ReturnType<typeof render> => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

describe('PricesSubmissionsClient', () => {
  beforeEach(() => {
    cleanup()
    mockUseAdminPriceSubmissions.mockReset()
    mockPatch.mockReset()
    mockPatch.mockResolvedValue({})
    mockGetToken.mockReset()
    mockGetToken.mockResolvedValue('test-token')
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: ROWS,
      isFetching: false,
    })
  })

  it('renders every submission regardless of status', () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    expect(screen.getByText('Alpha Show')).toBeTruthy()
    expect(screen.getByText('Bravo Show')).toBeTruthy()
    expect(screen.getByText('Charlie Show')).toBeTruthy()
    expect(screen.getByText('Delta Show')).toBeTruthy()
  })

  it('narrows to pending rows when the Pending filter is active', () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    expect(screen.getByText('Alpha Show')).toBeTruthy()
    expect(screen.getByText('Bravo Show')).toBeTruthy()
    expect(screen.queryByText('Charlie Show')).toBeNull()
    expect(screen.queryByText('Delta Show')).toBeNull()
  })

  it('shows checkboxes and approve/deny only for pending rows', () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    // 2 pending row checkboxes + 1 select-all header checkbox.
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    // Approve/Deny render per pending row (2 each).
    expect(
      screen.getAllByRole('button', { name: /^Approve submission for/ }),
    ).toHaveLength(2)
    expect(
      screen.getAllByRole('button', { name: /^Deny submission for/ }),
    ).toHaveLength(2)
  })

  it('PATCHes corroborated when a row is approved', async () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Approve submission for Alpha Show' }),
    )
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1))
    expect(mockPatch).toHaveBeenCalledWith(
      '/v1/admin/prices/submissions/sub-1',
      'test-token',
      { status: 'corroborated' },
    )
  })

  it('PATCHes disputed when a row is denied', async () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Deny submission for Bravo Show' }),
    )
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1))
    expect(mockPatch).toHaveBeenCalledWith(
      '/v1/admin/prices/submissions/sub-2',
      'test-token',
      { status: 'disputed' },
    )
  })

  it('surfaces an auth error and skips the PATCH when the token is missing', async () => {
    mockGetToken.mockResolvedValue(null)
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Approve submission for Alpha Show' }),
    )
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(
      screen.getByText(
        'Your session expired. Refresh and sign in to continue.',
      ),
    ).toBeTruthy()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('surfaces a bulk dock and loops PATCHes when pending rows are bulk-approved', async () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Select all pending submissions on this page',
      }),
    )
    const bulkApprove = await screen.findByRole('button', {
      name: '✓ Approve 2',
    })
    fireEvent.click(bulkApprove)
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(2))
    const patchedIds = mockPatch.mock.calls.map((call) => call[0])
    expect(patchedIds).toContain('/v1/admin/prices/submissions/sub-1')
    expect(patchedIds).toContain('/v1/admin/prices/submissions/sub-2')
    for (const call of mockPatch.mock.calls) {
      expect(call[2]).toEqual({ status: 'corroborated' })
    }
  })

  it('toggles sort direction when the same column header is clicked twice', () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    const eventSort = screen.getByRole('button', {
      name: /Sort by Event/,
    })
    fireEvent.click(eventSort)
    expect(
      screen.getByRole('button', {
        name: /Sort by Event, currently ascending/,
      }),
    ).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', {
        name: /Sort by Event, currently ascending/,
      }),
    )
    expect(
      screen.getByRole('button', {
        name: /Sort by Event, currently descending/,
      }),
    ).toBeTruthy()
  })

  it('surfaces a load-error banner when the query fails', () => {
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: [],
      isFetching: false,
      isError: true,
    })
    renderClient(
      <PricesSubmissionsClient initialSubmissions={[]} initialTotal={0} />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(
      screen.getByText('Couldn’t load submissions. Refresh to try again.'),
    ).toBeTruthy()
  })

  it('renders the empty copy when there are no submissions', () => {
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: [],
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient initialSubmissions={[]} initialTotal={0} />,
    )
    expect(screen.getByText('No price submissions yet.')).toBeTruthy()
  })
})
