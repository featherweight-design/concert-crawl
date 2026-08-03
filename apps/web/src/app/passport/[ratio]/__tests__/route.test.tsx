import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const getTokenMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: getTokenMock }),
}))

const fetchMeMock = vi.fn()
vi.mock('@/lib/users', () => ({ fetchMe: fetchMeMock }))

const fetchHistoryMock = vi.fn()
vi.mock('@/lib/history', () => ({ fetchHistory: fetchHistoryMock }))

const { GET } = await import('@/app/passport/[ratio]/route')

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public')
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])

// The route fetches its fonts from its own origin; a node test has none, so
// `fetch` is redirected at the bundled files — the same bytes prod would serve.
const originalFetch = globalThis.fetch
const serveFontsFromDisk = (): void => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const buffer = await readFile(path.join(PUBLIC_DIR, url.pathname))
    return new Response(buffer, { status: 200 })
  })
}

// Only the fields the route reads. Annotating as UserProfileResponse would
// force thirty irrelevant nulls without testing anything more.
const profile = { handle: '@huey', theme: 'jade' }

const historyShow = (index: number) => ({
  eventId: `event-${index}`,
  artist: `Artist ${index}`,
  venueName: 'Bluebird Theater',
  venueSlug: 'bluebird-theater',
  neighborhood: null,
  date: '2026-03-14',
  dateLabel: 'Sat, Mar 14',
  showTime: '8:00 PM',
  priceFinal: 28,
  genre: 'punk',
  attendingAt: '2026-03-15T02:00:00Z',
})

const call = (url: string, ratio: string) =>
  GET(new Request(url), { params: Promise.resolve({ ratio }) })

// The success cases rasterise a real 1080×1080 PNG through satori, which runs
// 1.5–4s here and slower on a loaded CI box — the 5s default made them flake.
// The error cases return before any render and keep the default.
const RENDER_TIMEOUT_MS = 30_000

describe('GET /passport/[ratio]', () => {
  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  beforeEach(() => {
    vi.clearAllMocks()
    serveFontsFromDisk()
    getTokenMock.mockResolvedValue('test-token')
    fetchMeMock.mockResolvedValue(profile)
    fetchHistoryMock.mockResolvedValue({
      data: { shows: [historyShow(1), historyShow(2)], stats: {} },
      locked: false,
    })
  })

  it(
    'renders a square PNG',
    async () => {
      const response = await call('http://localhost/passport/square', 'square')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('image/png')
      const body = Buffer.from(await response.arrayBuffer())
      expect(body.subarray(0, 4)).toEqual(PNG_MAGIC)
    },
    RENDER_TIMEOUT_MS,
  )

  // A `public` header here would let any shared cache or proxy hand one
  // person's attended shows to the next requester of the same URL.
  it(
    'never lets a personal card into a shared cache',
    async () => {
      const response = await call('http://localhost/passport/square', 'square')

      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBe('private, max-age=300')
      expect(cacheControl).not.toContain('public')
      expect(cacheControl).not.toContain('s-maxage')
      // `private` says nothing about the browser's own cache, whose key is the
      // URL alone — on a shared device the next account would be handed the
      // previous one's card until the five minutes expired.
      expect(response.headers.get('Vary')).toBe('Cookie')
    },
    RENDER_TIMEOUT_MS,
  )

  it('401s without a session rather than rendering an anonymous passport', async () => {
    getTokenMock.mockResolvedValue(null)

    const response = await call('http://localhost/passport/square', 'square')

    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(fetchHistoryMock).not.toHaveBeenCalled()
  })

  it('400s an unknown ratio without spending a session or an API call', async () => {
    const response = await call('http://localhost/passport/story', 'story')

    expect(response.status).toBe(400)
    expect(getTokenMock).not.toHaveBeenCalled()
    expect(fetchMeMock).not.toHaveBeenCalled()
  })

  // Concert History is a Supporter feature, so the card drawn from it is too.
  it('403s a locked history rather than rendering an empty passport', async () => {
    fetchHistoryMock.mockResolvedValue({ data: null, locked: true })

    const response = await call('http://localhost/passport/square', 'square')

    expect(response.status).toBe(403)
  })

  it('502s a data outage rather than throwing behind an <img>', async () => {
    fetchHistoryMock.mockRejectedValue(new Error('upstream down'))

    const response = await call('http://localhost/passport/square', 'square')

    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it(
    'renders a passport for an account with nothing attended yet',
    async () => {
      fetchHistoryMock.mockResolvedValue({
        data: { shows: [], stats: {} },
        locked: false,
      })

      const response = await call('http://localhost/passport/square', 'square')

      expect(response.status).toBe(200)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'renders for an account with no handle set',
    async () => {
      fetchMeMock.mockResolvedValue({ handle: null, theme: 'electric' })

      const response = await call('http://localhost/passport/square', 'square')

      expect(response.status).toBe(200)
    },
    RENDER_TIMEOUT_MS,
  )

  it(
    'accepts a theme override and ignores an unknown one',
    async () => {
      const overridden = await call(
        'http://localhost/passport/square?theme=amber',
        'square',
      )
      expect(overridden.status).toBe(200)

      const bogus = await call(
        'http://localhost/passport/square?theme=__proto__',
        'square',
      )
      expect(bogus.status).toBe(200)
    },
    RENDER_TIMEOUT_MS,
  )
})
