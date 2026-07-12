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
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

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

  it('renders a single price when the max is not above the min', () => {
    const inverted = [row({ id: 'sub-inv', priceMin: '60', priceMax: '40' })]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: inverted,
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={inverted}
        initialTotal={inverted.length}
      />,
    )
    expect(screen.getByText('$60')).toBeTruthy()
    expect(screen.queryByText('$60–$40')).toBeNull()
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

  it('narrows to archived rows when the Archived filter is active', () => {
    const withArchived = [
      row({ id: 'sub-a', eventTitle: 'Archived Show', status: 'archived' }),
      row({ id: 'sub-p', eventTitle: 'Pending Show', status: 'pending' }),
    ]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: withArchived,
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={withArchived}
        initialTotal={withArchived.length}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
    expect(screen.getByText('Archived Show')).toBeTruthy()
    expect(screen.queryByText('Pending Show')).toBeNull()
  })

  it('labels the count badge as a subset when a filter is active', () => {
    const mixed = [
      row({ id: 'sub-a', status: 'archived' }),
      row({ id: 'sub-p1', status: 'pending' }),
      row({ id: 'sub-p2', status: 'pending' }),
    ]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: mixed,
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={mixed}
        initialTotal={mixed.length}
      />,
    )
    // Unfiltered: badge states the overall total.
    expect(screen.getByText('3 total')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
    // Filtered: badge states the subset out of the loaded rows, not "total".
    expect(screen.getByText('1 of 3')).toBeTruthy()
    expect(screen.queryByText('1 total')).toBeNull()
  })

  it('shows a filter-aware empty message when a filter matches no rows', () => {
    const onlyPending = [row({ id: 'sub-p', status: 'pending' })]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: onlyPending,
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={onlyPending}
        initialTotal={onlyPending.length}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Disputed' }))
    expect(screen.getByText('No disputed price submissions.')).toBeTruthy()
    expect(screen.queryByText('No price submissions yet.')).toBeNull()
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

  it('hides the select-all checkbox when the view has no pending rows', () => {
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
    )
    // Charlie Show is corroborated — filtering to it leaves no pending rows,
    // so neither the row checkboxes nor the select-all header render.
    fireEvent.click(screen.getByRole('button', { name: 'Corroborated' }))
    expect(screen.getByText('Charlie Show')).toBeTruthy()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('does not render a ticket link for a non-http(s) URL', () => {
    const hostile = [
      row({
        id: 'sub-js',
        eventTitle: 'Hostile Show',
        ticketUrl: 'javascript:alert(1)',
      }),
      row({
        id: 'sub-ok',
        eventTitle: 'Safe Show',
        ticketUrl: 'https://tickets.example.com/1',
      }),
    ]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: hostile,
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={hostile}
        initialTotal={hostile.length}
      />,
    )
    expect(
      screen.queryByRole('link', { name: /Open ticket page for Hostile Show/ }),
    ).toBeNull()
    expect(
      screen.getByRole('link', { name: /Open ticket page for Safe Show/ }),
    ).toBeTruthy()
  })

  it('renders anonymous for a submission with no user id', () => {
    const anon = [row({ id: 'sub-anon', userId: null })]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: anon,
      isFetching: false,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={anon}
        initialTotal={anon.length}
      />,
    )
    expect(screen.getByText('anonymous')).toBeTruthy()
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

  it('resyncs the cache when a bulk PATCH partially fails', async () => {
    // First PATCH lands, second rejects — the catch path must invalidate so
    // the table reflects server truth instead of the pre-failure optimistic view.
    mockPatch.mockReset()
    mockPatch.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    render(
      <PricesSubmissionsClient
        initialSubmissions={ROWS}
        initialTotal={ROWS.length}
      />,
      { wrapper: Wrapper },
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
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['admin', 'prices', 'submissions', 'history'],
    })
  })

  it('awaits every PATCH before surfacing a bulk failure', async () => {
    // First PATCH rejects, second lands. Promise.allSettled must let both
    // settle before we resync — Promise.all would short-circuit on the first
    // rejection while the second request was still in flight.
    mockPatch.mockReset()
    mockPatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({})
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
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    // Both PATCHes ran despite the first rejecting — no short-circuit.
    expect(mockPatch).toHaveBeenCalledTimes(2)
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

  it('surfaces auth copy when the query fails with an auth error', () => {
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: [],
      isFetching: false,
      isError: true,
      error: new Error('Not authenticated'),
    })
    renderClient(
      <PricesSubmissionsClient initialSubmissions={[]} initialTotal={0} />,
    )
    expect(
      screen.getByText(ADMIN_COPY.submissionsHistory.authError),
    ).toBeTruthy()
    expect(
      screen.queryByText(ADMIN_COPY.submissionsHistory.loadError),
    ).toBeNull()
  })

  it('states the count as a subset of the server total while still loading', () => {
    const firstPage = [row({ id: 'sub-1', status: 'archived' })]
    mockUseAdminPriceSubmissions.mockReturnValue({
      data: firstPage,
      isFetching: true,
    })
    renderClient(
      <PricesSubmissionsClient
        initialSubmissions={firstPage}
        initialTotal={3}
      />,
    )
    // Loaded rows (1) < server total (3): badge must not claim "1 total".
    expect(screen.getByText('1 of 3')).toBeTruthy()
    expect(screen.queryByText('1 total')).toBeNull()
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

  it('names every submission status in the page subtitle', () => {
    // The subtitle enumerates the statuses the history view surfaces; it must
    // stay in sync with the status filters (including archived) so the page
    // description doesn't misrepresent what's shown.
    const statuses: ReadonlyArray<PriceSubmissionHistoryRow['status']> = [
      'pending',
      'corroborated',
      'disputed',
      'stale',
      'archived',
    ]
    for (const status of statuses) {
      expect(ADMIN_COPY.submissionsHistory.subtitle).toContain(status)
    }
  })
})
