import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPage,
  fetchPageHttp,
  CrawlFetchError,
  CrawlSelectorTimeoutError,
} from './fetcher.js'
import type {
  Browser,
  BrowserContext,
  Page,
  Request,
  Response,
  Route,
} from 'playwright'
import * as robots from './robots.js'

// jitter(0) = 0, so tests that pass crawlDelayMs 0 never wait. Pinning random
// keeps any test that does pass a delay deterministic.
// Every redirect hop clears robots.txt; allowed unless a test says otherwise.
let isAllowedSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  isAllowedSpy = vi.spyOn(robots, 'isAllowedOrSkip').mockResolvedValue(true)
})
afterEach(() => {
  vi.restoreAllMocks()
})

// Playwright signals selector timeouts by error name, not by class.
function makeTimeoutError(message: string): Error {
  const err = new Error(message)
  err.name = 'TimeoutError'
  return err
}

// A Playwright response for `url`, reached through `redirectedFrom` (oldest
// hop first) when given.
function makeResponse(
  status: number,
  url = 'https://example.com',
  redirectedFrom: string[] = [],
): Response {
  let previous: Request | null = null
  for (const hop of redirectedFrom) {
    const prior = previous
    previous = {
      url: () => hop,
      redirectedFrom: () => prior,
    } as unknown as Request
  }
  const head = previous
  return {
    status: () => status,
    url: () => url,
    request: () => ({ redirectedFrom: () => head }),
  } as unknown as Response
}

function makeMockPage(overrides: Partial<Page> = {}): Page {
  return {
    on: vi.fn(),
    route: vi.fn().mockResolvedValue(undefined),
    mainFrame: vi.fn().mockReturnValue('main-frame'),
    goto: vi.fn().mockResolvedValue(makeResponse(200)),
    waitForSelector: vi.fn().mockResolvedValue(null),
    content: vi.fn().mockResolvedValue('<html><body>loaded</body></html>'),
    url: vi.fn().mockReturnValue('https://example.com'),
    ...overrides,
  } as unknown as Page
}

function makeMockBrowser(page: Page): Browser {
  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as BrowserContext
  return {
    newContext: vi.fn().mockResolvedValue(context),
  } as unknown as Browser
}

describe('fetchPage — navigation timeout', () => {
  it('navigates with a 60-second timeout', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)
    await fetchPage('https://example.com', browser, 0)
    expect(page.goto).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ timeout: 60_000 }),
    )
  })

  it('passes the waitUntil strategy to page.goto when no selector is provided', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)
    await fetchPage('https://example.com', browser, 0, 'load')
    expect(page.goto).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ waitUntil: 'load' }),
    )
  })
})

describe('fetchPage — waitForSelector', () => {
  it('calls page.waitForSelector and forces domcontentloaded when selector is provided', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)

    await fetchPage(
      'https://example.com',
      browser,
      0,
      'networkidle',
      '.event-card',
    )

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    expect(page.waitForSelector).toHaveBeenCalledWith('.event-card', {
      timeout: 30_000,
    })
  })

  it('does not call waitForSelector when no selector is provided', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)

    await fetchPage('https://example.com', browser, 0, 'networkidle')

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'networkidle',
      timeout: 60_000,
    })
    expect(page.waitForSelector).not.toHaveBeenCalled()
  })

  it('throws CrawlFetchError before calling waitForSelector when response is 403', async () => {
    const page = makeMockPage({
      goto: vi.fn().mockResolvedValue(makeResponse(403)),
    })
    const browser = makeMockBrowser(page)

    await expect(
      fetchPage(
        'https://example.com',
        browser,
        0,
        'networkidle',
        '.event-card',
      ),
    ).rejects.toThrow('HTTP 403')
    expect(page.waitForSelector).not.toHaveBeenCalled()
  })

  it('captures the rendered html on the error when waitForSelector times out', async () => {
    const page = makeMockPage({
      waitForSelector: vi
        .fn()
        .mockRejectedValue(
          makeTimeoutError('page.waitForSelector: Timeout 30000ms exceeded.'),
        ),
      content: vi.fn().mockResolvedValue('<html><body>challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/blocked'),
    })
    const browser = makeMockBrowser(page)

    const err = await fetchPage(
      'https://example.com',
      browser,
      0,
      'networkidle',
      '.event-card',
    ).catch((caught: unknown) => caught)

    if (!(err instanceof CrawlSelectorTimeoutError)) {
      throw new Error('expected a CrawlSelectorTimeoutError')
    }
    expect(err.html).toBe('<html><body>challenge</body></html>')
    expect(err.finalUrl).toBe('https://example.com/blocked')
    expect(err.httpStatus).toBe(200)
    expect(err.selector).toBe('.event-card')
    expect(err.message).toContain('Timeout 30000ms exceeded')
    expect(err.message).toContain('.event-card')
    expect(err.message).toContain('https://example.com/blocked')
  })

  it('still throws when the page content is unreadable after a selector timeout', async () => {
    const page = makeMockPage({
      waitForSelector: vi.fn().mockRejectedValue(makeTimeoutError('Timeout')),
      content: vi.fn().mockRejectedValue(new Error('page closed')),
    })
    const browser = makeMockBrowser(page)

    const err = await fetchPage(
      'https://example.com',
      browser,
      0,
      'networkidle',
      '.event-card',
    ).catch((caught: unknown) => caught)

    if (!(err instanceof CrawlSelectorTimeoutError)) {
      throw new Error('expected a CrawlSelectorTimeoutError')
    }
    expect(err.html).toBeNull()
  })

  it('returns html and status on success', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)

    const result = await fetchPage('https://example.com', browser, 0)

    expect(result.html).toBe('<html><body>loaded</body></html>')
    expect(result.httpStatus).toBe(200)
    expect(result.finalUrl).toBe('https://example.com')
  })
})

describe('fetchPage — robots.txt on redirects and navigations', () => {
  it('discards the page when a server redirect passed through a disallowed URL', async () => {
    const page = makeMockPage({
      goto: vi
        .fn()
        .mockResolvedValue(
          makeResponse(200, 'https://example.com/final', [
            'https://example.com',
            'https://example.com/private',
          ]),
        ),
    })
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.endsWith('/private'),
    )

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page), 0),
    ).rejects.toThrow('robots.txt disallows redirect target')
    expect(page.content).not.toHaveBeenCalled()
  })

  it('aborts a main-frame navigation the page starts to a disallowed URL', async () => {
    const page = makeMockPage()
    await fetchPage('https://example.com', makeMockBrowser(page), 0)
    const handler = vi.mocked(page.route).mock.calls[0]?.[1] as (
      route: Route,
    ) => Promise<void>
    isAllowedSpy.mockResolvedValueOnce(false)
    const route = {
      request: () => ({
        isNavigationRequest: () => true,
        frame: () => 'main-frame',
        url: () => 'https://example.com/private',
      }),
      continue: vi.fn(),
      abort: vi.fn(),
    } as unknown as Route

    await handler(route)

    expect(route.abort).toHaveBeenCalled()
    expect(route.continue).not.toHaveBeenCalled()
  })
})

describe('fetchPageHttp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the URL with the ConcertCrawl user agent', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 200,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('<html>events</html>'),
    } as unknown as Response)

    await fetchPageHttp('https://example.com', 0)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
        }),
      }),
    )
  })

  it('returns html, httpStatus, and finalUrl on success', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: '/redirected' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('<html>event content</html>'),
      } as unknown as Response)

    const result = await fetchPageHttp('https://example.com', 0)

    expect(result).toEqual({
      html: '<html>event content</html>',
      httpStatus: 200,
      finalUrl: 'https://example.com/redirected',
    })
  })

  it('throws CrawlFetchError on 403', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 403,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      CrawlFetchError,
    )
  })

  it('throws CrawlFetchError on 429', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 429,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      CrawlFetchError,
    )
  })

  it('throws a generic Error on other 4xx', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 404,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      'HTTP 404',
    )
  })

  it('does not follow a redirect robots.txt disallows', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers({ location: 'https://other.example/private' }),
    } as unknown as Response)
    isAllowedSpy.mockResolvedValueOnce(false)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      'robots.txt disallows redirect target https://other.example/private',
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(isAllowedSpy).toHaveBeenCalledWith(
      'https://other.example/private',
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    )
  })
})
