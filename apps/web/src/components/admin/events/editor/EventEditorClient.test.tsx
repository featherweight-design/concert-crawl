// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockRouterRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh, push: vi.fn() }),
}))

const mockApiPatch = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/lib/api', () => ({
  apiClient: { patch: (...args: unknown[]) => mockApiPatch(...args) },
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

import { EventEditorClient, type EditorEvent } from './EventEditorClient'

const SAMPLE: EditorEvent = {
  id: 'evt-1',
  title: 'Lord Huron',
  artist: 'Lord Huron',
  date: '2026-06-19',
  doorsTime: '19:00',
  showTime: '20:00',
  ticketPriceMin: '35',
  ticketPriceMax: '60',
  confidenceScore: 0.82,
  verified: true,
  status: 'upcoming',
  extractionStrategy: 'llm',
  genre: ['indie', 'folk'],
  updatedAt: '2026-06-12T18:14:00Z',
  venueId: 'venue-1',
  venueName: 'Mission Ballroom',
  isSoldOut: false,
}

beforeEach(() => {
  mockApiPatch.mockClear()
  mockApiPatch.mockResolvedValue({ success: true })
  mockRouterRefresh.mockClear()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('EventEditorClient', () => {
  it('renders the editor header with title + lifecycle + verification', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByRole('heading', { name: 'Lord Huron' })).toBeTruthy()
    // Upcoming + Verified each appear in both the header and the status section.
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
  })

  it('renders all five numbered sections', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('Identity')).toBeTruthy()
    expect(screen.getByText('Pricing')).toBeTruthy()
    expect(screen.getByText('Classification')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()
    expect(screen.getByText('Identity art')).toBeTruthy()
  })

  it('renders the genre tags', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('indie')).toBeTruthy()
    expect(screen.getByText('folk')).toBeTruthy()
  })

  it('renders the Available chip when isSoldOut=false', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('Available')).toBeTruthy()
  })

  it('renders Sold out when isSoldOut=true', () => {
    render(<EventEditorClient event={{ ...SAMPLE, isSoldOut: true }} />)
    expect(screen.getByText('Sold out')).toBeTruthy()
  })

  it('does not surface SaveBar when the form is clean', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.queryByText('You have unsaved changes')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('shows SaveBar after the user toggles the lifecycle status', () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Postponed' }))
    expect(screen.getByText('You have unsaved changes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('reveals the New date field when postponed is chosen', () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Postponed' }))
    expect(screen.getByLabelText('New date')).toBeTruthy()
  })

  it('PATCHes only the changed fields and refreshes on save', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledTimes(1)
    })
    const [url, , body] = mockApiPatch.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1')
    expect(body).toEqual({ status: 'cancelled' })
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled()
    })
  })

  it('Discard restores the original draft and clears the SaveBar', () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Postponed' }))
    expect(screen.getByText('You have unsaved changes')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('You have unsaved changes')).toBeNull()
  })
})
