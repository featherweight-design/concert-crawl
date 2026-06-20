import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EditorEvent } from '@/components/admin/events/editor/EventEditorClient'

// Mocks must be declared before the dynamic import of page.tsx so the
// module under test resolves them.

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}))

const mockRequireAdminUser = vi.fn().mockResolvedValue({
  id: 'admin_1',
  email: 'admin@test',
  role: 'admin',
  firstName: null,
  lastName: null,
})
const mockGetToken = vi.fn().mockResolvedValue('test-token')
const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken })
vi.mock('@/lib/auth', () => ({
  requireAdminUser: () => mockRequireAdminUser(),
  auth: () => mockAuth(),
}))

class MockApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
  ApiError: MockApiError,
}))

// Render the client component as a no-op so we don't drag in its dependency tree.
vi.mock('@/components/admin/events/editor/EventEditorClient', () => ({
  EventEditorClient: ({ event }: { event: EditorEvent }) => ({
    type: 'div',
    props: { 'data-testid': 'event-editor', 'data-event-id': event.id },
  }),
}))

const buildEvent = (overrides: Partial<EditorEvent> = {}): EditorEvent => ({
  id: 'evt_1',
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2026-12-31T00:00:00.000Z',
  doorsTime: null,
  showTime: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  confidenceScore: 0.9,
  verified: false,
  status: 'upcoming',
  extractionStrategy: 'json-ld',
  genre: ['rock'],
  updatedAt: null,
  venueId: 'venue_1',
  venueName: 'Test Venue',
  isSoldOut: false,
  ...overrides,
})

describe('admin events [id] edit page', () => {
  beforeEach(() => {
    mockNotFound.mockClear()
    mockApiGet.mockReset()
  })

  // Regression for #707 — apiClient.get unwraps `{success, data}` and returns
  // body.data directly. Typing this call as the envelope shape would always
  // make `.data` undefined and so always 404. This test pins the unwrap
  // contract: when the client returns an EditorEvent, the page must render
  // the editor, NOT call notFound.
  it('renders the editor with the unwrapped EditorEvent from apiClient', async () => {
    const event = buildEvent({ id: 'evt_unwrap' })
    mockApiGet.mockResolvedValue(event)

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: 'evt_unwrap' })

    const result = await EventEditorPage({ params })

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(mockApiGet).toHaveBeenCalledWith(
      '/v1/admin/events/evt_unwrap',
      'test-token',
    )
    // Result is the outer <div> wrapper containing EventEditorClient.
    expect(result).toBeTruthy()
  })

  it('calls notFound only on ApiError with status 404', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(404, 'Event not found'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: 'evt_missing' })

    await expect(EventEditorPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalledOnce()
  })

  // Non-404 errors must propagate so Next's error boundary / 500 handler
  // surfaces real operational failures instead of silently 404ing.
  it('re-throws ApiError for non-404 statuses (e.g. 500)', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(500, 'Internal Server Error'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: 'evt_500' })

    await expect(EventEditorPage({ params })).rejects.toThrow(
      'Internal Server Error',
    )
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('re-throws non-ApiError failures (network/parse)', async () => {
    mockApiGet.mockRejectedValue(new TypeError('Failed to fetch'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: 'evt_network' })

    await expect(EventEditorPage({ params })).rejects.toThrow('Failed to fetch')
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('returns null when no auth token is available', async () => {
    mockGetToken.mockResolvedValueOnce(null)

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: 'evt_no_token' })

    const result = await EventEditorPage({ params })

    expect(result).toBeNull()
    expect(mockApiGet).not.toHaveBeenCalled()
    expect(mockNotFound).not.toHaveBeenCalled()
  })
})
