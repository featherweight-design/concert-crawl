// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { type AllEvent } from '../all/types'

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
    render(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    expect(screen.getByLabelText('Loading events')).toBeTruthy()
  })

  it('fetches /v1/admin/events with no verified param on mount', async () => {
    mockApiGet.mockResolvedValue([])
    render(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1)
    })
    const [url] = mockApiGet.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events?limit=50&offset=0')
  })

  it('renders the desktop table when events arrive', async () => {
    mockApiGet.mockResolvedValue([buildEvent()])
    render(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
  })

  it('renders mobile cards when isDesktop=false', async () => {
    mockApiGet.mockResolvedValue([buildEvent({ id: 'evt-7', title: 'Spoon' })])
    render(<AllEventsTabContent isDesktop={false} onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Spoon')).toBeTruthy()
    })
  })

  it('renders the empty state when no events come back', async () => {
    mockApiGet.mockResolvedValue([])
    render(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('No events to show.')).toBeTruthy()
    })
  })

  it('calls onRowClick with the clicked event id', async () => {
    mockApiGet.mockResolvedValue([buildEvent({ id: 'evt-77' })])
    const onRowClick = vi.fn()
    render(<AllEventsTabContent isDesktop onRowClick={onRowClick} />)
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Lord Huron'))
    expect(onRowClick).toHaveBeenCalledWith('evt-77')
  })

  it('paginates: Load more fetches with the next offset and appends', async () => {
    const pageOne = Array.from({ length: 50 }, (_, idx) =>
      buildEvent({ id: `evt-${idx}`, title: `Show ${idx}` }),
    )
    const pageTwo = [buildEvent({ id: 'evt-late', title: 'Late Show' })]
    mockApiGet.mockResolvedValueOnce(pageOne).mockResolvedValueOnce(pageTwo)
    render(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Show 0')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2)
    })
    const secondCallUrl = mockApiGet.mock.calls[1]?.[0]
    expect(secondCallUrl).toBe('/v1/admin/events?limit=50&offset=50')
    await waitFor(() => {
      expect(screen.getByText('Late Show')).toBeTruthy()
    })
  })

  it('hides Load more when the last fetch returned fewer than the page size', async () => {
    mockApiGet.mockResolvedValue([buildEvent()])
    render(<AllEventsTabContent isDesktop onRowClick={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Lord Huron')).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })
})
