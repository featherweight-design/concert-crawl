import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Metadata } from 'next'

// Mocks precede the dynamic import of page.tsx so the module under test
// resolves them. Same shape as ./page.test.tsx.
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: () => {
    throw new Error('NEXT_REDIRECT')
  },
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: null }),
}))

const mockPublicGet = vi.fn()
vi.mock('@/lib/api', () => ({
  publicApiClient: { get: (path: string) => mockPublicGet(path) },
}))

vi.mock('@/components/consumer/event-detail', () => ({
  PublicEventDetail: () => null,
}))

const EVENT_ID = '11111111-1111-4111-8111-111111111111'
const ORIGIN = 'https://concertcrawl.app'

const event = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  // A plain YYYY-MM-DD, which is what the API returns and what the display
  // layer anchors to UTC noon before formatting.
  date: '2026-03-13',
  showTime: '20:00',
  venue: {
    name: 'Bluebird Theater',
    city: 'Denver',
    timezone: 'America/Denver',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', ORIGIN)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockPublicGet.mockImplementation((path: string) =>
    path.endsWith('/related')
      ? Promise.resolve({ data: [] })
      : Promise.resolve(event),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const loadMetadata = async () => (await import('../page')).generateMetadata

const forId = async (id: string) => {
  const generateMetadata = await loadMetadata()
  return generateMetadata({ params: Promise.resolve({ id }) })
}

/**
 * The first OG image, narrowed to the descriptor form.
 *
 * `Metadata['openGraph']['images']` is a union of string | URL | descriptor |
 * arrays of those, so every field the assertions read has to be proven present
 * rather than cast — a cast here would let the metadata silently degrade to a
 * bare string url and still pass.
 */
interface OgImageDescriptor {
  url: string
  width: number
  height: number
  alt: string
}

const isOgImageDescriptor = (
  candidate: unknown,
): candidate is OgImageDescriptor =>
  typeof candidate === 'object' &&
  candidate !== null &&
  'url' in candidate &&
  typeof candidate.url === 'string' &&
  'width' in candidate &&
  typeof candidate.width === 'number' &&
  'height' in candidate &&
  typeof candidate.height === 'number' &&
  'alt' in candidate &&
  typeof candidate.alt === 'string'

const ogImage = (meta: Metadata): OgImageDescriptor => {
  const images = meta.openGraph?.images
  if (!Array.isArray(images)) {
    throw new Error('expected openGraph.images to be an array')
  }
  const [first] = images
  if (!isOgImageDescriptor(first)) {
    throw new Error('expected a full OG image descriptor')
  }
  return first
}

/**
 * `Metadata['twitter']` is a union over card types, and only some members
 * declare `card` — reading it off the union is a type error. Narrowing rather
 * than casting means the assertion fails loudly if the card type ever
 * degrades to one that carries no `card` at all.
 */
const twitterCard = (meta: Metadata): string => {
  const { twitter } = meta
  if (twitter === undefined || twitter === null || !('card' in twitter)) {
    throw new Error('expected twitter metadata declaring a card type')
  }
  const { card } = twitter
  if (typeof card !== 'string') {
    throw new Error('expected the twitter card type to be a string')
  }
  return card
}

// The `link` shape is 1200×628 — the locked handoff value, not 630.
const LINK_WIDTH = 1200
const LINK_HEIGHT = 628

describe('/e/[id] — unfurl metadata (#72)', () => {
  it('points the card image at the link-shaped poster route', async () => {
    const image = ogImage(await forId(EVENT_ID))

    expect(image.url).toBe(`${ORIGIN}/share/${EVENT_ID}/link`)
  })

  // A relative OG image is silently ignored by every crawler — they fetch it
  // with no page context to resolve it against.
  it('emits an absolute image url', async () => {
    const image = ogImage(await forId(EVENT_ID))

    expect(() => new URL(image.url)).not.toThrow()
    expect(new URL(image.url).origin).toBe(ORIGIN)
  })

  it('declares the card dimensions so the unfurl reserves the right box', async () => {
    const image = ogImage(await forId(EVENT_ID))

    expect(image.width).toBe(LINK_WIDTH)
    expect(image.height).toBe(LINK_HEIGHT)
  })

  it('describes the card as "{artist} at {venue}, {date}"', async () => {
    const image = ogImage(await forId(EVENT_ID))

    expect(image.alt).toBe('Snakebite Revival at Bluebird Theater, FRI, MAR 13')
  })

  it('asks Twitter/X for the large card', async () => {
    const meta = await forId(EVENT_ID)

    expect(twitterCard(meta)).toBe('summary_large_image')
    expect(meta.twitter?.images).toEqual([`${ORIGIN}/share/${EVENT_ID}/link`])
  })

  it('names the show in the title rather than the route', async () => {
    const meta = await forId(EVENT_ID)

    expect(meta.title).toBe('Snakebite Revival at Bluebird Theater')
    expect(meta.openGraph?.title).toBe('Snakebite Revival at Bluebird Theater')
  })

  it('canonicalises the url to the public mirror, not the protected page', async () => {
    const meta = await forId(EVENT_ID)

    expect(meta.openGraph?.url).toBe(`${ORIGIN}/e/${EVENT_ID}`)
  })

  // generateMetadata runs before the page. 404-ing here would cost a second
  // fetch to reach the 404 the page already renders.
  it('returns bare metadata for a non-UUID id without calling the API', async () => {
    const meta = await forId('not-a-uuid')

    expect(meta).toEqual({})
    expect(mockPublicGet).not.toHaveBeenCalled()
  })

  it('returns bare metadata when the event cannot be fetched', async () => {
    mockPublicGet.mockRejectedValue(new Error('boom'))

    const meta = await forId(EVENT_ID)

    expect(meta).toEqual({})
  })
})
