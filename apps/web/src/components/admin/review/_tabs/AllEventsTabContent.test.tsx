// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type ReactElement } from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type AllEvent } from '../all/types'
import { type AllEventsApi } from './AllEventsTabContent'

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
  ApiError: class ApiError extends Error {},
}))

import { AllEventsTabContent } from './AllEventsTabContent'

// Tests get their own QueryClient with retries off so a single failure
// surfaces immediately (TanStack's default retries would mask the assertion).
const renderWithClient = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

const buildApiMock = (overrides: Partial<AllEventsApi> = {}): AllEventsApi => ({
  verify: vi.fn().mockResolvedValue(undefined),
  unverify: vi.fn().mockResolvedValue(undefined),
  setStatus: vi.fn().mockResolvedValue(undefined),
  markSoldOut: vi.fn().mockResolvedValue(undefined),
  markAvailable: vi.fn().mockResolvedValue(undefined),
  markNonConcert: vi.fn().mockResolvedValue(undefined),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
  bulkUnverify: vi.fn().mockResolvedValue(undefined),
  bulkMarkNonConcert: vi.fn().mockResolvedValue(undefined),
  bulkDelete: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

const buildEvent = (overrides: Partial<AllEvent> = {}): AllEvent => ({
  id: 'evt-1',
  title: 'Lord Huron',
  artist: 'Lord Huron',
  venueId: 'venue-1',
  venueName: 'Mission Ballroom',
  date: '2026-07-12',
  doorsTime: '19:00',
  showTime: '20:00',
  ticketPriceMin: '35',
  ticketPriceMax: '60',
  confidenceScore: 0.82,
  verified: true,
  status: 'upcoming',
  extractionStrategy: 'json-ld',
  sourceUrl: null,
  genre: ['indie', 'folk'],
  createdAt: '2026-06-12T18:14:00Z',
  isSoldOut: false,
  ...overrides,
})

beforeEach(() => {
  mockApiGet.mockReset()
  mockGetToken.mockReset()
  mockGetToken.mockResolvedValue('test-token')
  cleanup()
})

describe('AllEventsTabContent', () => {
  it('renders the loading skeleton on initial mount', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}))
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    expect(screen.getByLabelText('Loading events')).toBeTruthy()
  })

  it('fetches /v1/admin/events with no verified param on mount', async () => {
    mockApiGet.mockResolvedValue([])
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1)
    })
    const [url] = mockApiGet.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events?limit=20&offset=0')
  })

  it('renders the desktop table when events arrive', async () => {
    mockApiGet.mockResolvedValue([buildEvent()])
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
  })

  it('renders mobile cards when isDesktop=false', async () => {
    mockApiGet.mockResolvedValue([buildEvent({ id: 'evt-7', title: 'Spoon' })])
    renderWithClient(
      <AllEventsTabContent isDesktop={false} onRowClick={() => {}} />,
    )
    await waitFor(() => {
      expect(screen.getByText('Spoon')).toBeTruthy()
    })
  })

  it('renders the empty state when no events come back', async () => {
    mockApiGet.mockResolvedValue([])
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('No events to show.')).toBeTruthy()
    })
  })

  it('calls onRowClick with the clicked event id', async () => {
    mockApiGet.mockResolvedValue([buildEvent({ id: 'evt-77' })])
    const onRowClick = vi.fn()
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={onRowClick} />)
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Lord Huron'))
    expect(onRowClick).toHaveBeenCalledWith('evt-77')
  })

  // 15s timeout: rendering 50 mock rows + interactions can exceed the
  // default 5s ceiling on slower CI runners. The local run finishes in
  // ~900ms so the extra budget is purely a flake-suppressant.
  it(
    'paginates: Load more fetches with the next offset and appends',
    { timeout: 15000 },
    async () => {
      const pageOne = Array.from({ length: 20 }, (_, idx) =>
        buildEvent({ id: `evt-${idx}`, title: `Show ${idx}` }),
      )
      const pageTwo = [buildEvent({ id: 'evt-late', title: 'Late Show' })]
      mockApiGet.mockResolvedValueOnce(pageOne).mockResolvedValueOnce(pageTwo)
      renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
      await waitFor(() => {
        expect(screen.getByText('Show 0')).toBeTruthy()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledTimes(2)
      })
      const secondCallUrl = mockApiGet.mock.calls[1]?.[0]
      expect(secondCallUrl).toBe('/v1/admin/events?limit=20&offset=20')
      await waitFor(() => {
        expect(screen.getByText('Late Show')).toBeTruthy()
      })
    },
  )

  it('shows the error banner (not empty state) when the initial fetch fails', async () => {
    mockApiGet.mockRejectedValue(new Error('boom'))
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load events.')).toBeTruthy()
    })
    expect(screen.queryByText('No events to show.')).toBeNull()
  })

  it(
    'keeps Load more visible after a transient pagination failure',
    { timeout: 15000 },
    async () => {
      const pageOne = Array.from({ length: 20 }, (_, idx) =>
        buildEvent({ id: `evt-${idx}`, title: `Show ${idx}` }),
      )
      mockApiGet
        .mockResolvedValueOnce(pageOne)
        .mockRejectedValueOnce(new Error('transient'))
      renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
      await waitFor(() => {
        expect(screen.getByText('Show 0')).toBeTruthy()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
      await waitFor(() => {
        expect(screen.getByText('Failed to load events.')).toBeTruthy()
      })
      // The Load-more button must remain so the admin can retry.
      expect(screen.getByRole('button', { name: 'Load more' })).toBeTruthy()
    },
  )

  it('hides Load more when the last fetch returned fewer than the page size', async () => {
    mockApiGet.mockResolvedValue([buildEvent()])
    renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })

  it('clears the action-error banner when filters change', async () => {
    // First render: fetch succeeds, but a row mutation fails → banner shows.
    // Use verified:false so the menu shows "Verify" (the verified=true variant
    // shows "Send back to review" instead).
    mockApiGet.mockResolvedValue([buildEvent({ id: 'evt-a', verified: false })])
    const api = buildApiMock({
      verify: vi.fn().mockRejectedValue(new Error('mutation boom')),
    })
    const onFiltersChange = vi.fn()
    const { rerender } = renderWithClient(
      <AllEventsTabContent
        isDesktop
        onRowClick={() => {}}
        api={api}
        onFiltersChange={onFiltersChange}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
    // Open the row menu and trigger the failing verify.
    fireEvent.click(screen.getByLabelText('Row actions'))
    fireEvent.click(screen.getByText('Verify'))
    await waitFor(() => {
      expect(screen.getByText('Failed to apply the change.')).toBeTruthy()
    })
    // Now change the filter (re-render with a fresh filter object). The
    // banner should clear on the filter-change effect.
    rerender(
      <AllEventsTabContent
        isDesktop
        onRowClick={() => {}}
        api={api}
        filters={{
          query: 'spoon',
          verified: 'all',
          dateFrom: '',
          dateTo: '',
          genre: [],
          missingData: [],
        }}
        onFiltersChange={onFiltersChange}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText('Failed to apply the change.')).toBeNull()
    })
  })

  describe('bulk selection', () => {
    it('does not render row checkboxes when no api prop is supplied', async () => {
      mockApiGet.mockResolvedValue([buildEvent()])
      renderWithClient(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
      await waitFor(() => {
        expect(screen.getByText('Lord Huron')).toBeTruthy()
      })
      expect(screen.queryByLabelText('Select event')).toBeNull()
    })

    it('shows the bulk dock when at least one row is selected', async () => {
      mockApiGet.mockResolvedValue([
        buildEvent({ id: 'evt-a', title: 'Spoon' }),
        buildEvent({ id: 'evt-b', title: 'Phoebe' }),
      ])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Spoon')).toBeTruthy()
      })
      const rowCheckboxes = screen.getAllByLabelText('Select event')
      const firstCheckbox = rowCheckboxes[0]!
      fireEvent.click(firstCheckbox)
      expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeTruthy()
      expect(screen.getByText('1')).toBeTruthy()
    })

    it('select-all toggles every rendered row', async () => {
      mockApiGet.mockResolvedValue([
        buildEvent({ id: 'evt-a', title: 'Spoon' }),
        buildEvent({ id: 'evt-b', title: 'Phoebe' }),
      ])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Spoon')).toBeTruthy()
      })
      const selectAll = screen.getByLabelText('Select all events on the page')
      fireEvent.click(selectAll)
      expect(screen.getByText('2')).toBeTruthy()
      // Toggle off — selection clears and dock disappears.
      fireEvent.click(selectAll)
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull()
    })

    it('clear button empties the selection', async () => {
      mockApiGet.mockResolvedValue([buildEvent({ id: 'evt-a' })])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Lord Huron')).toBeTruthy()
      })
      fireEvent.click(screen.getByLabelText('Select event'))
      const dock = screen.getByRole('region', { name: 'Bulk actions' })
      fireEvent.click(within(dock).getByLabelText('Clear'))
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull()
    })

    it('Send back to review confirm calls api.bulkUnverify with selected ids', async () => {
      mockApiGet
        .mockResolvedValueOnce([
          buildEvent({ id: 'evt-a', title: 'Spoon' }),
          buildEvent({ id: 'evt-b', title: 'Phoebe' }),
        ])
        .mockResolvedValueOnce([])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Spoon')).toBeTruthy()
      })
      fireEvent.click(screen.getByLabelText('Select all events on the page'))
      const dock = screen.getByRole('region', { name: 'Bulk actions' })
      fireEvent.click(within(dock).getByText('Send back to review'))
      const dialog = await screen.findByRole('dialog')
      fireEvent.click(within(dialog).getByText('Send 2 back'))
      await waitFor(() => {
        expect(api.bulkUnverify).toHaveBeenCalledWith(['evt-a', 'evt-b'])
      })
    })

    it('Mark non-concert confirm calls api.bulkMarkNonConcert with selected ids', async () => {
      mockApiGet
        .mockResolvedValueOnce([
          buildEvent({ id: 'evt-a', title: 'Spoon', artist: 'Spoon' }),
          buildEvent({ id: 'evt-b', title: 'Phoebe', artist: 'Phoebe' }),
        ])
        .mockResolvedValueOnce([])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Spoon')).toBeTruthy()
      })
      fireEvent.click(screen.getByLabelText('Select all events on the page'))
      const dock = screen.getByRole('region', { name: 'Bulk actions' })
      fireEvent.click(within(dock).getByText('Mark non-concert'))
      const dialog = await screen.findByRole('dialog')
      fireEvent.click(within(dialog).getByText('Mark 2 non-concert'))
      await waitFor(() => {
        expect(api.bulkMarkNonConcert).toHaveBeenCalledWith(['evt-a', 'evt-b'])
      })
    })

    it('Delete confirm requires typing DELETE before calling api.bulkDelete', async () => {
      mockApiGet
        .mockResolvedValueOnce([
          buildEvent({ id: 'evt-a', title: 'Spoon', artist: 'Spoon' }),
          buildEvent({ id: 'evt-b', title: 'Phoebe', artist: 'Phoebe' }),
        ])
        .mockResolvedValueOnce([])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Spoon')).toBeTruthy()
      })
      fireEvent.click(screen.getByLabelText('Select all events on the page'))
      const dock = screen.getByRole('region', { name: 'Bulk actions' })
      fireEvent.click(within(dock).getByText('Delete 2'))
      const dialog = await screen.findByRole('dialog')
      const confirmBtn = within(dialog).getAllByText('Delete 2').slice(-1)[0]!
      expect((confirmBtn as HTMLButtonElement).disabled).toBe(true)
      const input = within(dialog).getByLabelText('Type DELETE to confirm')
      fireEvent.change(input, { target: { value: 'DELETE' } })
      expect((confirmBtn as HTMLButtonElement).disabled).toBe(false)
      fireEvent.click(confirmBtn)
      await waitFor(() => {
        expect(api.bulkDelete).toHaveBeenCalledWith(['evt-a', 'evt-b'])
      })
    })

    it('clears the selection after a successful bulk action (refetch fires)', async () => {
      mockApiGet
        .mockResolvedValueOnce([buildEvent({ id: 'evt-a' })])
        .mockResolvedValueOnce([buildEvent({ id: 'evt-a' })])
      const api = buildApiMock()
      renderWithClient(
        <AllEventsTabContent isDesktop onRowClick={() => {}} api={api} />,
      )
      await waitFor(() => {
        expect(screen.getByText('Lord Huron')).toBeTruthy()
      })
      fireEvent.click(screen.getByLabelText('Select event'))
      const dock = screen.getByRole('region', { name: 'Bulk actions' })
      fireEvent.click(within(dock).getByText('Send back to review'))
      const dialog = await screen.findByRole('dialog')
      fireEvent.click(within(dialog).getByText('Send 1 back'))
      await waitFor(() => {
        expect(api.bulkUnverify).toHaveBeenCalled()
      })
      // After a successful bulk action, refresh() clears selection — dock gone.
      await waitFor(() => {
        expect(
          screen.queryByRole('region', { name: 'Bulk actions' }),
        ).toBeNull()
      })
    })
  })
})
