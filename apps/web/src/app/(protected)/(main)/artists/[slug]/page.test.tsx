// @vitest-environment jsdom

import React from 'react'
import type { ArtistDetailResponse } from '@concert-crawl/types'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api'
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy'

// Mocks are declared before the page import so the module under test resolves
// them.

const mockGetToken = vi.fn<() => Promise<string | null>>()
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: mockGetToken }),
}))

const mockGet = vi.fn()
const mockPublicGet = vi.fn()
// The class is declared inside the factory because vi.mock is hoisted above
// every module-scope binding in this file.
vi.mock('@/lib/api', () => ({
  ApiError: class MockApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
  publicApiClient: { get: (...args: unknown[]) => mockPublicGet(...args) },
}))

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  // BackChip renders inside the page tree and reaches for the router.
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/nightjar-choir',
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import ArtistPage from './page'

const NAME = 'Nightjar Choir'

const payload = (
  overrides: Partial<ArtistDetailResponse> = {},
): ArtistDetailResponse => ({
  artist: {
    name: NAME,
    slug: 'nightjar-choir',
    spotifyArtistId: null,
    photoUrl: null,
  },
  shows: [
    {
      eventId: 'event-1',
      iso: '2026-09-04',
      venue: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
      city: 'Denver',
      showTime: '20:00',
      price: 18,
      status: 'upcoming',
    },
  ],
  past: [
    {
      eventId: 'event-0',
      iso: '2026-05-09',
      venue: 'Globe Hall',
      venueSlug: 'globe-hall',
      city: 'Denver',
    },
  ],
  history: { count: 2, venues: ['Larimer Lounge', 'Globe Hall'] },
  following: false,
  ...overrides,
})

const params = Promise.resolve({ slug: 'nightjar-choir' })

beforeEach(() => {
  mockGetToken.mockReset()
  mockGet.mockReset()
  mockPublicGet.mockReset()
  mockNotFound.mockClear()
  mockGetToken.mockResolvedValue(null)
})

describe('ArtistPage', () => {
  it('renders for a signed-out visitor without ever using the token client (#794)', async () => {
    mockPublicGet.mockResolvedValue(payload())

    const html = renderToString(await ArtistPage({ params }))

    expect(mockPublicGet).toHaveBeenCalledWith('/v1/artists/nightjar-choir')
    expect(mockGet).not.toHaveBeenCalled()
    expect(html).toContain(NAME)
  })

  it('uses the authenticated client when a session exists', async () => {
    mockGetToken.mockResolvedValue('tok_123')
    mockGet.mockResolvedValue(payload())

    await ArtistPage({ params })

    expect(mockGet).toHaveBeenCalledWith(
      '/v1/artists/nightjar-choir',
      'tok_123',
    )
    expect(mockPublicGet).not.toHaveBeenCalled()
  })

  it('calls notFound() on an unknown slug', async () => {
    mockPublicGet.mockRejectedValue(new ApiError(404, 'no such artist'))

    await expect(ArtistPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('re-throws a server failure instead of claiming the artist does not exist', async () => {
    mockPublicGet.mockRejectedValue(new ApiError(500, 'upstream exploded'))

    await expect(ArtistPage({ params })).rejects.toThrow('upstream exploded')
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('labels the landmark and ships exactly one h1', async () => {
    mockPublicGet.mockResolvedValue(payload())

    const html = renderToString(await ArtistPage({ params }))
    const dom = new DOMParser().parseFromString(html, 'text/html')

    expect(dom.querySelector('main')?.getAttribute('aria-label')).toBe(
      ARTIST_COPY.pageAria(NAME),
    )
    expect(dom.querySelectorAll('h1')).toHaveLength(1)
    expect(dom.querySelector('h1')?.textContent).toBe(NAME)
  })

  it('puts one h2 on each section, upcoming before previously', async () => {
    mockPublicGet.mockResolvedValue(payload())

    const html = renderToString(await ArtistPage({ params }))
    const dom = new DOMParser().parseFromString(html, 'text/html')
    const heads = Array.from(dom.querySelectorAll('h2')).map(
      (node) => node.textContent,
    )

    expect(heads).toHaveLength(2)
    expect(heads[0]).toBe(ARTIST_COPY.upcomingTitle)
    expect(heads[1]).toBe(ARTIST_COPY.pastTitle)
  })

  it('keeps the previously list on the page when there is nothing upcoming', async () => {
    // The order rule is state-dependent: with no shows, the upcoming block (and
    // in PR-F the empty-state pitch) leads. PR-E has no player yet, so what is
    // assertable here is that the past list still renders and stays last.
    mockPublicGet.mockResolvedValue(payload({ shows: [] }))

    const html = renderToString(await ArtistPage({ params }))
    const dom = new DOMParser().parseFromString(html, 'text/html')
    const heads = Array.from(dom.querySelectorAll('h2')).map(
      (node) => node.textContent,
    )

    expect(heads).toEqual([ARTIST_COPY.pastTitle])
  })
})
