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

// Render the client component as a no-op so we don't drag in its dependency
// tree. Returning `null` is a valid React node ("render nothing"); a plain
// object literal would not be — if any test ever rendered the page output
// React would throw "Objects are not valid as a React child".
vi.mock('@/components/admin/events/editor/EventEditorClient', () => ({
  EventEditorClient: (_props: { event: EditorEvent }) => null,
}))

// Fixtures use realistic UUIDs because the API validates `:id` as a UUID
// via `z.string().uuid()` (apps/api/src/routes/admin/events.ts) — anything
// else would 400. The "400 invalid-UUID" test below is the one case where
// a deliberately-bogus id is the point.
//
// `date` is stored as YYYY-MM-DD throughout the admin editor — the API
// PATCH validator enforces `^\d{4}-\d{2}-\d{2}$` (same file).
const UUID_EVENT = '11111111-1111-4111-8111-111111111111'
const UUID_VENUE = '22222222-2222-4222-8222-222222222222'
const UUID_MISSING = '33333333-3333-4333-8333-333333333333'
const UUID_500 = '44444444-4444-4444-8444-444444444444'
const UUID_403 = '55555555-5555-4555-8555-555555555555'
const UUID_NETWORK = '66666666-6666-4666-8666-666666666666'
const UUID_NO_TOKEN = '77777777-7777-4777-8777-777777777777'

const buildEvent = (overrides: Partial<EditorEvent> = {}): EditorEvent => ({
  id: UUID_EVENT,
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2026-12-31',
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
  venueId: UUID_VENUE,
  venueName: 'Test Venue',
  isSoldOut: false,
  hiddenFromConsumer: false,
  isConcertReviewNeeded: false,
  ...overrides,
})

describe('admin events [id] edit page', () => {
  beforeEach(() => {
    mockNotFound.mockClear()
    mockApiGet.mockReset()
    // `mockResolvedValueOnce(null)` in the no-token test only swallows the
    // next call — reset + restore the default so test order can't bleed.
    mockGetToken.mockReset()
    mockGetToken.mockResolvedValue('test-token')
  })

  // Regression for #707 — apiClient.get unwraps `{success, data}` and returns
  // body.data directly. Typing this call as the envelope shape would always
  // make `.data` undefined and so always 404. This test pins the unwrap
  // contract: when the client returns an EditorEvent, the page must render
  // the editor, NOT call notFound.
  it('renders the editor with the unwrapped EditorEvent from apiClient', async () => {
    const event = buildEvent({ id: UUID_EVENT })
    mockApiGet.mockResolvedValue(event)

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: UUID_EVENT })

    const result = await EventEditorPage({ params })

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(mockApiGet).toHaveBeenCalledWith(
      `/v1/admin/events/${UUID_EVENT}`,
      'test-token',
    )
    // Result is the outer <div> wrapper containing EventEditorClient.
    expect(result).toBeTruthy()
  })

  it('calls notFound on ApiError with status 404', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(404, 'Event not found'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: UUID_MISSING })

    await expect(EventEditorPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalledOnce()
  })

  // The API's Zod param validator rejects non-UUID :id strings with 400.
  // From the user's perspective that's "the page doesn't exist" — same UX
  // as 404. Without this branch, /admin/events/<not-a-uuid>/edit would
  // surface Next's error boundary instead of the 404 page. The non-UUID
  // here is intentional — this test is about the bogus-id case.
  it('calls notFound on ApiError 400 (invalid UUID rejected by API)', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(400, 'Invalid input'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: 'not-a-uuid' })

    await expect(EventEditorPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalledOnce()
  })

  // Non-missing errors must propagate so Next's error boundary / 500 handler
  // surfaces real operational failures instead of silently 404ing.
  it('re-throws ApiError for non-missing statuses (e.g. 500)', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(500, 'Internal Server Error'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: UUID_500 })

    await expect(EventEditorPage({ params })).rejects.toThrow(
      'Internal Server Error',
    )
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('re-throws ApiError for auth statuses (e.g. 403)', async () => {
    mockApiGet.mockRejectedValue(new MockApiError(403, 'Forbidden'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: UUID_403 })

    await expect(EventEditorPage({ params })).rejects.toThrow('Forbidden')
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('re-throws non-ApiError failures (network/parse)', async () => {
    mockApiGet.mockRejectedValue(new TypeError('Failed to fetch'))

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: UUID_NETWORK })

    await expect(EventEditorPage({ params })).rejects.toThrow('Failed to fetch')
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('returns null when no auth token is available', async () => {
    mockGetToken.mockResolvedValueOnce(null)

    const { default: EventEditorPage } = await import('./page.js')
    const params = Promise.resolve({ id: UUID_NO_TOKEN })

    const result = await EventEditorPage({ params })

    expect(result).toBeNull()
    expect(mockApiGet).not.toHaveBeenCalled()
    expect(mockNotFound).not.toHaveBeenCalled()
  })
})
