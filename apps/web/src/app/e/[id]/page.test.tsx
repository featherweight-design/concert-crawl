import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventDetailResponse } from '@concert-crawl/types'

// Mocks are declared before the dynamic import of page.tsx so the module under
// test resolves them.

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
const mockRedirect = vi.fn((_url: string) => {
  throw new Error('NEXT_REDIRECT')
})
vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  redirect: (url: string) => mockRedirect(url),
}))

const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

const mockPublicGet = vi.fn()
vi.mock('@/lib/api', () => ({
  publicApiClient: { get: (path: string) => mockPublicGet(path) },
}))

// The renderer is a no-op so the test doesn't drag in its dependency tree.
// `null` is a valid React node; an object literal would not be.
vi.mock('@/components/consumer/event-detail', () => ({
  PublicEventDetail: (_props: {
    event: EventDetailResponse
    related: unknown[]
  }) => null,
}))

const EVENT_ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ userId: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const loadPage = async () => (await import('./page')).default

describe('/e/[id] — public event mirror (#72)', () => {
  it('redirects a signed-in visitor to the full protected page', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_1' })
    const Page = await loadPage()

    await expect(
      Page({ params: Promise.resolve({ id: EVENT_ID }) }),
    ).rejects.toThrow('NEXT_REDIRECT')

    // Middleware early-returns for authenticated users, so this is the only
    // thing stopping a signed-in user landing on the stripped-down mirror.
    expect(mockRedirect).toHaveBeenCalledWith(`/events/${EVENT_ID}`)
    expect(mockPublicGet).not.toHaveBeenCalled()
  })

  it('does not redirect an anonymous visitor', async () => {
    mockPublicGet.mockImplementation((path: string) =>
      path.endsWith('/related')
        ? Promise.resolve({ data: [] })
        : Promise.resolve({ id: EVENT_ID }),
    )
    const Page = await loadPage()

    await Page({ params: Promise.resolve({ id: EVENT_ID }) })

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('fetches the event and its related shows without a token', async () => {
    mockPublicGet.mockImplementation((path: string) =>
      path.endsWith('/related')
        ? Promise.resolve({ data: [] })
        : Promise.resolve({ id: EVENT_ID }),
    )
    const Page = await loadPage()

    await Page({ params: Promise.resolve({ id: EVENT_ID }) })

    expect(mockPublicGet).toHaveBeenCalledWith(`/v1/events/${EVENT_ID}`)
    expect(mockPublicGet).toHaveBeenCalledWith(`/v1/events/${EVENT_ID}/related`)
    // Reports are auth-only and must not be requested here.
    expect(
      mockPublicGet.mock.calls.some(([path]) =>
        String(path).includes('/reports'),
      ),
    ).toBe(false)
  })

  it('404s on a non-UUID id without calling the API', async () => {
    const Page = await loadPage()

    await expect(
      Page({ params: Promise.resolve({ id: 'not-a-uuid' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
    expect(mockPublicGet).not.toHaveBeenCalled()
  })

  // A malformed id is a dead link for everyone. Redirecting it would just hand
  // the same garbage to /events/:id instead of showing the branded 404.
  it('404s a signed-in visitor on a non-UUID id rather than redirecting', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_1' })
    const Page = await loadPage()

    await expect(
      Page({ params: Promise.resolve({ id: 'not-a-uuid' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockPublicGet).not.toHaveBeenCalled()
  })

  it('404s when the event fetch fails, and logs why', async () => {
    mockPublicGet.mockRejectedValue(new Error('404'))
    const Page = await loadPage()

    await expect(
      Page({ params: Promise.resolve({ id: EVENT_ID }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
    // A swallowed fetch failure here is a silently blank shared link; it has to
    // be diagnosable from the server logs.
    expect(console.error).toHaveBeenCalledWith(
      '[public event] event fetch failed',
      expect.objectContaining({ id: EVENT_ID }),
    )
  })

  it('still renders when only the related fetch fails', async () => {
    mockPublicGet.mockImplementation((path: string) =>
      path.endsWith('/related')
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ id: EVENT_ID }),
    )
    const Page = await loadPage()

    await Page({ params: Promise.resolve({ id: EVENT_ID }) })

    expect(mockNotFound).not.toHaveBeenCalled()
  })
})
