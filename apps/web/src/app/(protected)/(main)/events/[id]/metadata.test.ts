import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks are declared before the dynamic import of page.tsx so the module under
// test resolves them. Mirrors `app/e/[id]/page.test.tsx`, which covers the
// mirror route's metadata the same way.

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: null, getToken: () => null }),
}))

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers()),
}))

const mockPublicGet = vi.fn()
const mockAuthedGet = vi.fn()
vi.mock('@/lib/api', () => ({
  publicApiClient: { get: (path: string) => mockPublicGet(path) },
  apiClient: { get: (path: string) => mockAuthedGet(path) },
}))

const EVENT_ID = '11111111-1111-4111-8111-111111111111'

const event = {
  id: EVENT_ID,
  artist: 'Sylvan Esso',
  date: '2026-10-02',
  showTime: '20:00',
  venue: { name: 'Ogden Theatre', city: 'Denver', timezone: 'America/Denver' },
}

beforeEach(() => {
  mockPublicGet.mockReset()
  mockAuthedGet.mockReset()
})

describe('/events/:id generateMetadata', () => {
  it('declares itself canonical and points og:url at itself', async () => {
    mockPublicGet.mockResolvedValue(event)
    const { generateMetadata } = await import('./page')

    const meta = await generateMetadata({
      params: Promise.resolve({ id: EVENT_ID }),
    })

    expect(meta.alternates?.canonical).toBe(
      `http://localhost:3000/events/${EVENT_ID}`,
    )
    expect(meta.openGraph?.url).toBe(`http://localhost:3000/events/${EVENT_ID}`)
  })

  // The crawler asking for this card has no cookies, so a token-bearing fetch
  // would 401 and the page would unfurl bare.
  it('fetches without a session', async () => {
    mockPublicGet.mockResolvedValue(event)
    const { generateMetadata } = await import('./page')

    await generateMetadata({ params: Promise.resolve({ id: EVENT_ID }) })

    expect(mockPublicGet).toHaveBeenCalledWith(`/v1/events/${EVENT_ID}`)
    expect(mockAuthedGet).not.toHaveBeenCalled()
  })

  it('returns bare metadata rather than throwing when the event is gone', async () => {
    mockPublicGet.mockRejectedValue(new Error('404'))
    const { generateMetadata } = await import('./page')

    const meta = await generateMetadata({
      params: Promise.resolve({ id: EVENT_ID }),
    })

    expect(meta).toStrictEqual({})
  })
})
