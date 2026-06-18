// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockRouterRefresh = vi.fn()
const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh, push: mockRouterPush }),
}))

const mockApiPatch = vi.fn().mockResolvedValue({ success: true })
const mockApiPost = vi.fn().mockResolvedValue({ success: true })
const mockApiDelete = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/lib/api', () => ({
  apiClient: {
    patch: (...args: unknown[]) => mockApiPatch(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
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
  mockApiPost.mockClear()
  mockApiPost.mockResolvedValue({ success: true })
  mockApiDelete.mockClear()
  mockApiDelete.mockResolvedValue({ success: true })
  mockRouterRefresh.mockClear()
  mockRouterPush.mockClear()
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

  it('reveals provenance fields when toggling availability to Sold out', () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sold out' }))
    expect(screen.getByLabelText('How did you confirm?')).toBeTruthy()
    expect(screen.getByLabelText('Source URL (optional)')).toBeTruthy()
    expect(screen.getByLabelText('Note (optional, 280 chars max)')).toBeTruthy()
  })

  it('POSTs /sold-out with provenance when availability toggles to Sold out', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sold out' }))
    fireEvent.change(screen.getByLabelText('How did you confirm?'), {
      target: { value: 'venue_site' },
    })
    fireEvent.change(screen.getByLabelText('Source URL (optional)'), {
      target: { value: 'https://example.com/show' },
    })
    fireEvent.change(screen.getByLabelText('Note (optional, 280 chars max)'), {
      target: { value: 'GA gone' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1)
    })
    const [url, , body] = mockApiPost.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1/sold-out')
    expect(body).toEqual({
      evidenceMethod: 'venue_site',
      evidenceUrl: 'https://example.com/show',
      note: 'GA gone',
    })
    expect(mockApiPatch).not.toHaveBeenCalled()
  })

  it('POSTs /available when availability toggles back to Available', async () => {
    render(<EventEditorClient event={{ ...SAMPLE, isSoldOut: true }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Available' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1)
    })
    const [url] = mockApiPost.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1/available')
  })

  it('combines a status PATCH with a sold-out POST in one save', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sold out' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledTimes(1)
      expect(mockApiPost).toHaveBeenCalledTimes(1)
    })
    const [patchUrl, , patchBody] = mockApiPatch.mock.calls[0] ?? []
    expect(patchUrl).toBe('/v1/admin/events/evt-1')
    expect(patchBody).toEqual({ status: 'cancelled' })
    const [postUrl] = mockApiPost.mock.calls[0] ?? []
    expect(postUrl).toBe('/v1/admin/events/evt-1/sold-out')
  })

  it('renders the Danger zone section', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('Danger zone')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Mark non-concert' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete event…' })).toBeTruthy()
  })

  it('PATCHes hiddenFromConsumer when confirming Mark non-concert', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mark non-concert' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Mark non-concert' }),
    )
    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledTimes(1)
    })
    const [url, , body] = mockApiPatch.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1')
    expect(body).toEqual({ hiddenFromConsumer: true })
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled()
    })
  })

  it('DELETEs and redirects when confirming Delete event', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete event…' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Delete event' }),
    )
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledTimes(1)
    })
    const [url] = mockApiDelete.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1')
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/admin/review?tab=all-events',
      )
    })
  })

  it('Cancel on the danger confirm closes the modal without an API call', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete event…' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(mockApiDelete).not.toHaveBeenCalled()
  })
})
