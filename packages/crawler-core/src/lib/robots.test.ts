import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAllowed } from './robots.js'

const USER_AGENT = 'ConcertCrawl/1.0'

describe('robots.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when robots.txt disallows nothing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('User-agent: *\nAllow: /', { status: 200 }),
    )
    const result = await isAllowed(
      'https://allow-test.example/events',
      USER_AGENT,
    )
    expect(result).toBe(true)
  })

  it('returns false when robots.txt disallows all paths', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('User-agent: *\nDisallow: /', { status: 200 }),
    )
    const result = await isAllowed(
      'https://disallow-test.example/events',
      USER_AGENT,
    )
    expect(result).toBe(false)
  })

  it('returns false when ConcertCrawl user-agent is specifically disallowed', async () => {
    const robotsTxt = [
      'User-agent: *',
      'Allow: /',
      '',
      'User-agent: ConcertCrawl',
      'Disallow: /',
    ].join('\n')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(robotsTxt, { status: 200 }),
    )
    const result = await isAllowed(
      'https://specific-disallow.example/events',
      USER_AGENT,
    )
    expect(result).toBe(false)
  })

  it('returns true (fail open) when robots.txt fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const result = await isAllowed(
      'https://fetch-error.example/events',
      USER_AGENT,
    )
    expect(result).toBe(true)
  })

  it('returns true (fail open) when robots.txt returns non-200 status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not found', { status: 404 }),
    )
    const result = await isAllowed(
      'https://not-found.example/events',
      USER_AGENT,
    )
    expect(result).toBe(true)
  })

  it('caches the robots.txt result — fetch called only once for same domain', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('User-agent: *\nAllow: /', { status: 200 }),
      )
    await isAllowed('https://cache-test.example/events', USER_AGENT)
    await isAllowed('https://cache-test.example/other-page', USER_AGENT)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('allows a path not listed under Disallow', async () => {
    const robotsTxt = ['User-agent: *', 'Disallow: /admin'].join('\n')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(robotsTxt, { status: 200 }),
    )
    const result = await isAllowed(
      'https://partial-disallow.example/events',
      USER_AGENT,
    )
    expect(result).toBe(true)
  })
})
