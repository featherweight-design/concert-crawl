import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CRAWL_DELAY_CAP_MS,
  CrawlSkipError,
  checkRobots,
  getCrawlDelayMs,
  isAiUseAllowed,
  isAllowed,
  isAllowedOrSkip,
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

  it('does not crawl when the robots.txt fetch throws (RFC 9309 unreachable)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const verdict = await checkRobots(
      'https://fetch-error.example/events',
      USER_AGENT,
    )
    expect(verdict.status).toBe('unreachable')
    expect(
      await isAllowed('https://fetch-error.example/events', USER_AGENT),
    ).toBe(false)
  })

  it('does not crawl when robots.txt returns a server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad gateway', { status: 502 }),
    )
    const verdict = await checkRobots(
      'https://server-error.example/events',
      USER_AGENT,
    )
    expect(verdict).toEqual({ status: 'unreachable', reason: 'HTTP 502' })
  })

  it('treats a 429 on robots.txt as unreachable, not as absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Slow down', { status: 429 }),
    )
    const verdict = await checkRobots(
      'https://rate-limited.example/events',
      USER_AGENT,
    )
    expect(verdict.status).toBe('unreachable')
  })

  it('allows the crawl when robots.txt does not exist (4xx)', async () => {
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

  describe('cache expiry', () => {
    const HOUR = 60 * 60 * 1000
    const respond = (body: string, status = 200) =>
      new Response(body, { status })

    it('reuses an entry within the hour and refetches once it expires', async () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(respond('User-agent: *\nAllow: /'))
        .mockResolvedValueOnce(respond('User-agent: *\nDisallow: /'))
      const url = 'https://ttl-policy.example/events'

      expect(await isAllowed(url, USER_AGENT)).toBe(true)
      now.mockReturnValue(1_000_000 + HOUR - 1)
      expect(await isAllowed(url, USER_AGENT)).toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      // The site tightened its policy; we pick it up at expiry.
      now.mockReturnValue(1_000_000 + HOUR)
      expect(await isAllowed(url, USER_AGENT)).toBe(false)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('recovers from a cached unreachable verdict at expiry', async () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(5_000_000)
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(respond('', 503))
        .mockResolvedValueOnce(respond('User-agent: *\nAllow: /'))
      const url = 'https://ttl-recover.example/events'

      expect((await checkRobots(url, USER_AGENT)).status).toBe('unreachable')
      now.mockReturnValue(5_000_000 + HOUR)
      expect((await checkRobots(url, USER_AGENT)).status).toBe('allowed')
    })
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

    it('keeps a group going across a blank line (RFC 9309)', async () => {
      mockRobots(['User-agent: ConcertCrawl', '', 'Disallow: /events'])
      const result = await isAllowed(
        'https://blank-in-group.example/events',
        USER_AGENT,
      )
      expect(result).toBe(false)
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

    it('returns null when the site asks for more than the cap, so the run skips it', () => {
      expect(resolveCrawlDelayMs(3_000, 300_000)).toBeNull()
    })

    it('honours a site delay exactly at the cap', () => {
      expect(resolveCrawlDelayMs(3_000, CRAWL_DELAY_CAP_MS)).toBe(
        CRAWL_DELAY_CAP_MS,
      )
    })

    it('logs when a site delay exceeds the cap', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      resolveCrawlDelayMs(3_000, 300_000, { venueId: 'venue-1' })
      const logged = logSpy.mock.calls.map(([line]) => String(line))
      expect(logged).toContainEqual(
        JSON.stringify({
          event: 'robots.crawl_delay_exceeds_cap',
          venueId: 'venue-1',
          requestedMs: 300_000,
          capMs: CRAWL_DELAY_CAP_MS,
        }),
      )
    })

    it('does not log when the site delay is within the cap', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      resolveCrawlDelayMs(3_000, 10_000)
      expect(logSpy).not.toHaveBeenCalled()
    })

    it("caps our own per-venue delay, which is our choice rather than the site's", () => {
      // A venue configured above the cap must not smuggle a longer delay
      // through just because robots.txt was silent.
      expect(resolveCrawlDelayMs(60_000, null)).toBe(CRAWL_DELAY_CAP_MS)
    })
  })

  describe('Allow precedence (RFC 9309)', () => {
    function mockRobots(lines: string[]): void {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(lines.join('\n'), { status: 200 }),
      )
    }

    it('lets a longer Allow override a shorter Disallow', async () => {
      mockRobots(['User-agent: *', 'Disallow: /', 'Allow: /events'])
      expect(
        await isAllowed('https://longer-allow.example/events/1', USER_AGENT),
      ).toBe(true)
    })

    it('lets a longer Disallow override a shorter Allow', async () => {
      mockRobots(['User-agent: *', 'Allow: /', 'Disallow: /events'])
      expect(
        await isAllowed('https://longer-disallow.example/events', USER_AGENT),
      ).toBe(false)
    })

    it('resolves an equal-length tie in favour of Allow', async () => {
      // The VenuePilot shape (#1016): a Cloudflare-managed `*` group granting
      // `Allow: /` and a separate hand-written `*` group with `Disallow: /`.
      // RFC 9309 combines both groups and the tie goes to Allow.
      mockRobots([
        'User-agent: *',
        'Allow: /',
        '',
        'User-agent: *',
        'Disallow: /',
      ])
      expect(
        await isAllowed('https://equal-tie.example/graphql', USER_AGENT),
      ).toBe(true)
    })

    it('matches a * wildcard inside a rule path', async () => {
      mockRobots(['User-agent: *', 'Disallow: /*/private'])
      expect(
        await isAllowed('https://wildcard.example/shows/private', USER_AGENT),
      ).toBe(false)
      expect(
        await isAllowed('https://wildcard.example/shows/public', USER_AGENT),
      ).toBe(true)
    })

    it('anchors a rule ending in $', async () => {
      mockRobots(['User-agent: *', 'Disallow: /events$'])
      expect(await isAllowed('https://anchor.example/events', USER_AGENT)).toBe(
        false,
      )
      expect(
        await isAllowed('https://anchor.example/events/1', USER_AGENT),
      ).toBe(true)
    })

    it('matches a percent-encoded unreserved character as its literal', async () => {
      mockRobots(['User-agent: *', 'Disallow: /foo/bar/baz'])
      expect(
        await isAllowed('https://pct.example/foo/bar/%62%61%7A', USER_AGENT),
      ).toBe(false)
    })

    it('keeps an escaped reserved character distinct from its literal', async () => {
      mockRobots(['User-agent: *', 'Disallow: /a/b'])
      expect(
        await isAllowed('https://pct-reserved.example/a%2fb', USER_AGENT),
      ).toBe(true)
    })

    it('matches a rule written with a literal non-ASCII path', async () => {
      mockRobots(['User-agent: *', 'Disallow: /café'])
      expect(
        await isAllowed('https://pct-unicode.example/caf%C3%A9', USER_AGENT),
      ).toBe(false)
    })

    it('does not let a Sitemap line split a run of User-agent lines', async () => {
      mockRobots([
        'User-agent: ConcertCrawl',
        'Sitemap: https://sitemap-group.example/sitemap.xml',
        'User-agent: *',
        'Disallow: /private',
      ])
      expect(
        await isAllowed('https://sitemap-group.example/private', USER_AGENT),
      ).toBe(false)
    })

    it('handles a rule with a character outside the BMP', async () => {
      mockRobots(['User-agent: *', 'Disallow: /events/🎵'])
      expect(
        await isAllowed(
          'https://pct-emoji.example/events/%F0%9F%8E%B5',
          USER_AGENT,
        ),
      ).toBe(false)
      expect(
        await isAllowed('https://pct-emoji.example/other', USER_AGENT),
      ).toBe(true)
    })

    it('matches a hostile wildcard rule in linear time', async () => {
      mockRobots(['User-agent: *', `Disallow: /${'*a'.repeat(16)}b`])
      const started = Date.now()
      expect(
        await isAllowed(`https://redos.example/${'a'.repeat(80)}`, USER_AGENT),
      ).toBe(true)
      expect(Date.now() - started).toBeLessThan(500)
    })

    it('keeps wildcard and anchor semantics', async () => {
      mockRobots(['User-agent: *', 'Disallow: /a*b*c$', 'Disallow: /x*'])
      const check = (path: string) =>
        isAllowed(`https://glob.example${path}`, USER_AGENT)
      expect(await check('/a-b-c')).toBe(false)
      expect(await check('/abc')).toBe(false)
      expect(await check('/a-b-c-d')).toBe(true)
      expect(await check('/a-c')).toBe(true)
      expect(await check('/xyz')).toBe(false)
    })

    it('ranks rules by their normalized length', async () => {
      // `/%65%76` is `/ev`: three characters, shorter than `/events`.
      mockRobots(['User-agent: *', 'Allow: /%65%76', 'Disallow: /events'])
      expect(
        await isAllowed('https://pct-length.example/events', USER_AGENT),
      ).toBe(false)
    })

    it('matches the query string as part of the path', async () => {
      mockRobots(['User-agent: *', 'Disallow: /events?page='])
      expect(
        await isAllowed('https://query.example/events?page=2', USER_AGENT),
      ).toBe(false)
    })
  })

  describe('isAllowedOrSkip', () => {
    it('throws a skip, not a disallow, when robots.txt is unreachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Unavailable', { status: 503 }),
      )
      await expect(
        isAllowedOrSkip('https://skip-503.example/events', USER_AGENT),
      ).rejects.toBeInstanceOf(CrawlSkipError)
    })

    it('returns false for an explicit disallow', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('User-agent: *\nDisallow: /', { status: 200 }),
      )
      expect(
        await isAllowedOrSkip('https://skip-disallow.example/x', USER_AGENT),
      ).toBe(false)
    })
  })

  describe('isAiUseAllowed', () => {
    function mockRobots(lines: string[]): void {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(lines.join('\n'), { status: 200 }),
      )
    }

    it('allows AI use when no rule addresses an AI crawler', async () => {
      mockRobots(['User-agent: *', 'Disallow: /admin'])
      expect(
        await isAiUseAllowed('https://no-ai-rules.example/events', USER_AGENT),
      ).toBe(true)
    })

    it('refuses AI use when ClaudeBot is disallowed, even though we are allowed', async () => {
      // The Black Box shape (#1295).
      mockRobots([
        'User-agent: ClaudeBot',
        'User-agent: Claude-Web',
        'Disallow: /',
        '',
        'User-agent: *',
        'Allow: /',
      ])
      const url = 'https://claudebot-blocked.example/events'
      expect(await isAllowed(url, USER_AGENT)).toBe(true)
      expect(await isAiUseAllowed(url, USER_AGENT)).toBe(false)
    })

    it('applies a wildcard disallow to AI agents when only we are exempted', async () => {
      mockRobots([
        'User-agent: *',
        'Disallow: /',
        '',
        'User-agent: ConcertCrawl',
        'Allow: /',
      ])
      const url = 'https://only-us-exempt.example/events'
      expect(await isAllowed(url, USER_AGENT)).toBe(true)
      expect(await isAiUseAllowed(url, USER_AGENT)).toBe(false)
    })

    it('refuses AI use for an anthropic-ai disallow on the page path only', async () => {
      mockRobots(['User-agent: anthropic-ai', 'Disallow: /events'])
      expect(
        await isAiUseAllowed('https://scoped-ai.example/events', USER_AGENT),
      ).toBe(false)
      expect(
        await isAiUseAllowed('https://scoped-ai.example/about', USER_AGENT),
      ).toBe(true)
    })

    it('refuses AI use when a group that applies to us signals ai-input=no', async () => {
      mockRobots([
        'User-agent: *',
        'Content-Signal: search=yes, ai-input=no',
        'Allow: /',
      ])
      expect(
        await isAiUseAllowed('https://signal-no.example/events', USER_AGENT),
      ).toBe(false)
    })

    it('allows AI use when the only signal is ai-train=no', async () => {
      // We do not train on page text, so the training signal is not about us.
      mockRobots([
        'User-agent: *',
        'Content-Signal: search=yes, ai-train=no',
        'Allow: /',
      ])
      expect(
        await isAiUseAllowed('https://train-no.example/events', USER_AGENT),
      ).toBe(true)
    })

    it('allows AI use when robots.txt does not exist', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not found', { status: 404 }),
      )
      expect(
        await isAiUseAllowed('https://no-robots-ai.example/events', USER_AGENT),
      ).toBe(true)
    })
  })
})
