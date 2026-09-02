import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CRAWL_DELAY_CAP_MS,
  getCrawlDelayMs,
  isAllowed,
  resolveCrawlDelayMs,
} from './robots.js'

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

  it('bounds the robots.txt fetch with an abort signal', async () => {
    // Runs before every crawl and outside the platform fetchers' deadline
    // budgets, so an unbounded request here hangs the nightly cron (#1199).
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('User-agent: *\nAllow: /', { status: 200 }),
      )
    await isAllowed('https://signal-test.example/events', USER_AGENT)
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
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

  // Every test needs its own hostname: the robots.txt cache is per-process and
  // lives for the whole file, so a reused host silently reads the earlier body.
  const mockRobots = (lines: string[]) =>
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(lines.join('\n'), { status: 200 }))

  describe('group parsing', () => {
    it('applies a directive whose group names several user-agents', async () => {
      // Agent lines accumulate into one group. Reading only the last one would
      // drop this Disallow, because BingBot matches neither us nor the wildcard.
      mockRobots([
        'User-agent: ConcertCrawl',
        'User-agent: BingBot',
        'Disallow: /events',
      ])
      const result = await isAllowed(
        'https://multi-agent-disallow.example/events',
        USER_AGENT,
      )
      expect(result).toBe(false)
    })

    it('does not treat a comment line as the end of a group', async () => {
      mockRobots([
        'User-agent: ConcertCrawl',
        '# be gentle, this box is small',
        'Disallow: /events',
      ])
      const result = await isAllowed(
        'https://comment-inside-group.example/events',
        USER_AGENT,
      )
      expect(result).toBe(false)
    })

    it('applies a group that names our full versioned user-agent', async () => {
      // Sites copy the UA out of their access logs verbatim, so the group is
      // often written `ConcertCrawl/1.0` rather than as the bare product token.
      mockRobots(['User-agent: ConcertCrawl/1.0', 'Disallow: /events'])
      const result = await isAllowed(
        'https://versioned-agent-disallow.example/events',
        USER_AGENT,
      )
      expect(result).toBe(false)
    })

    it('ignores an inline comment after a Disallow path', async () => {
      mockRobots(['User-agent: ConcertCrawl', 'Disallow: /events # heavy page'])
      const result = await isAllowed(
        'https://inline-comment-disallow.example/events',
        USER_AGENT,
      )
      expect(result).toBe(false)
    })

    it('lets a group written for us exempt us from the wildcard rules', async () => {
      // The specific group states no Disallow at all, which is the whole point:
      // it replaces the wildcard group rather than layering on top of it.
      mockRobots([
        'User-agent: *',
        'Disallow: /',
        '',
        'User-agent: ConcertCrawl',
        'Allow: /',
      ])
      const result = await isAllowed(
        'https://specific-exemption.example/events',
        USER_AGENT,
      )
      expect(result).toBe(true)
    })

    it('treats a blank line as the end of a group', async () => {
      mockRobots(['User-agent: ConcertCrawl', '', 'Disallow: /events'])
      const result = await isAllowed(
        'https://blank-ends-group.example/events',
        USER_AGENT,
      )
      expect(result).toBe(true)
    })
  })

  describe('getCrawlDelayMs', () => {
    it('returns null when robots.txt states no Crawl-delay', async () => {
      mockRobots(['User-agent: *', 'Disallow: /admin'])
      const result = await getCrawlDelayMs(
        'https://no-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBeNull()
    })

    it('returns null when robots.txt could not be fetched', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error'),
      )
      const result = await getCrawlDelayMs(
        'https://delay-fetch-error.example/events',
        USER_AGENT,
      )
      expect(result).toBeNull()
    })

    it('reads a wildcard Crawl-delay in milliseconds', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: 10'])
      const result = await getCrawlDelayMs(
        'https://wildcard-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(10_000)
    })

    it('prefers our own user-agent group over the wildcard group', async () => {
      mockRobots([
        'User-agent: *',
        'Crawl-delay: 10',
        '',
        'User-agent: ConcertCrawl',
        'Crawl-delay: 5',
      ])
      const result = await getCrawlDelayMs(
        'https://specific-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(5_000)
    })

    it('falls back to the wildcard group when ours states no delay', async () => {
      mockRobots([
        'User-agent: *',
        'Crawl-delay: 10',
        '',
        'User-agent: ConcertCrawl',
        'Disallow: /admin',
      ])
      const result = await getCrawlDelayMs(
        'https://specific-without-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(10_000)
    })

    it('accepts a fractional value', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: 0.5'])
      const result = await getCrawlDelayMs(
        'https://fractional-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(500)
    })

    it('treats a malformed value as absent rather than as zero', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: soon'])
      const result = await getCrawlDelayMs(
        'https://malformed-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBeNull()
    })

    it('treats a negative value as absent rather than as zero', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: -5'])
      const result = await getCrawlDelayMs(
        'https://negative-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBeNull()
    })

    it('ignores a later duplicate that would override the first valid value', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: 10', 'Crawl-delay: 1'])
      const result = await getCrawlDelayMs(
        'https://duplicate-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(10_000)
    })

    it('reads a delay whose group names several user-agents', async () => {
      mockRobots([
        'User-agent: ConcertCrawl',
        'User-agent: BingBot',
        'Crawl-delay: 10',
      ])
      const result = await getCrawlDelayMs(
        'https://multi-agent-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(10_000)
    })

    it('reads a delay separated from its user-agent by a comment', async () => {
      mockRobots([
        'User-agent: ConcertCrawl',
        '# be gentle, this box is small',
        'Crawl-delay: 10',
      ])
      const result = await getCrawlDelayMs(
        'https://commented-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(10_000)
    })

    it('reads a delay from a group naming our full versioned user-agent', async () => {
      mockRobots([
        'User-agent: *',
        'Crawl-delay: 10',
        '',
        'User-agent: ConcertCrawl/1.0',
        'Crawl-delay: 20',
      ])
      const result = await getCrawlDelayMs(
        'https://versioned-agent-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(20_000)
    })

    it('rounds a sub-millisecond fraction up, never down', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: 1.4004'])
      const result = await getCrawlDelayMs(
        'https://sub-ms-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(1_401)
    })

    it('reads a delay carrying an inline comment', async () => {
      mockRobots(['User-agent: *', 'Crawl-delay: 10 # seconds'])
      const result = await getCrawlDelayMs(
        'https://inline-comment-delay.example/events',
        USER_AGENT,
      )
      expect(result).toBe(10_000)
    })

    it('reuses the cached robots.txt from the isAllowed check', async () => {
      const fetchSpy = mockRobots(['User-agent: *', 'Crawl-delay: 10'])
      await isAllowed('https://delay-cache.example/events', USER_AGENT)
      await getCrawlDelayMs('https://delay-cache.example/events', USER_AGENT)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolveCrawlDelayMs', () => {
    it('keeps our own delay when robots.txt states none', () => {
      expect(resolveCrawlDelayMs(3_000, null)).toBe(3_000)
    })

    it('never speeds up below our own delay', () => {
      expect(resolveCrawlDelayMs(3_000, 1_000)).toBe(3_000)
    })

    it('slows down to the delay the site asked for', () => {
      expect(resolveCrawlDelayMs(3_000, 10_000)).toBe(10_000)
    })

    it('caps an extreme requested delay', () => {
      expect(resolveCrawlDelayMs(3_000, 300_000)).toBe(CRAWL_DELAY_CAP_MS)
    })

    it('logs when the cap bites, with the requested and applied values', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      resolveCrawlDelayMs(3_000, 300_000, { venueId: 'venue-1' })
      const logged = logSpy.mock.calls.map(([line]) => String(line))
      expect(logged).toContainEqual(
        JSON.stringify({
          event: 'robots.crawl_delay_capped',
          venueId: 'venue-1',
          requestedMs: 300_000,
          appliedMs: CRAWL_DELAY_CAP_MS,
        }),
      )
    })

    it('does not log when the cap does not bite', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      resolveCrawlDelayMs(3_000, 10_000)
      expect(logSpy).not.toHaveBeenCalled()
    })

    it('applies max before min, so our own delay is capped too', () => {
      // A venue configured above the cap must not smuggle a longer delay
      // through just because robots.txt was silent.
      expect(resolveCrawlDelayMs(60_000, null)).toBe(CRAWL_DELAY_CAP_MS)
    })
  })
})
