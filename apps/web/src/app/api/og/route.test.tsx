import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const PUBLIC_DIR = path.resolve(__dirname, '../../../../public')

// The route fetches its faces from its own origin, which no test has. The
// loader is the seam: it is injected into `loadShareFonts`, so the fetch is
// what gets stubbed rather than the font module itself — that keeps the real
// parsing and the real "one missing face fails the render" rule in the test.
const realFont = async (assetPath: string): Promise<ArrayBuffer> => {
  const buffer = await readFile(path.join(PUBLIC_DIR, assetPath))
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('GET /api/og', () => {
  it('answers a session-free crawler with a PNG', async () => {
    mockFetch.mockImplementation(async (input: URL | Request | string) => {
      const url = input instanceof URL ? input.pathname : String(input)
      const data = await realFont(new URL(url, 'http://localhost').pathname)
      return new Response(data, { status: 200 })
    })
    const { GET } = await import('./route')

    const response = await GET(new Request('http://localhost/api/og'))
    const body = Buffer.from(await response.arrayBuffer())

    expect(response.status).toBe(200)
    expect(body.subarray(0, 4)).toStrictEqual(PNG_MAGIC)
    // A day at the edge. The art only changes when we ship, and the crawler
    // that re-fetches is cheap; only failures are uncacheable.
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=0, s-maxage=86400, must-revalidate',
    )
  })

  // A 500 here renders as a broken image inside somebody else's post, and a
  // cached one outlives its cause — so the failure is an explicit status with
  // `no-store`, never a throw.
  it('fails with 502 and no-store when a face cannot be fetched', async () => {
    mockFetch.mockResolvedValue(new Response('nope', { status: 404 }))
    const { GET } = await import('./route')

    const response = await GET(new Request('http://localhost/api/og'))

    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).toBe('share fonts unavailable')
  })
})
