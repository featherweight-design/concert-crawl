import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPage,
  fetchPageHttp,
  CrawlFetchError,
  CrawlSelectorTimeoutError,
} from './fetcher.js'
import type { Browser, BrowserContext, Page, Response } from 'playwright'

// jitter(0) = Math.floor(random * 1000) - 500; with random=0.5 → 0ms delay
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
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

function makeMockPage(overrides: Partial<Page> = {}): Page {
  return {
    on: vi.fn(),
    goto: vi
      .fn()
      .mockResolvedValue({ status: () => 200 } as unknown as Response),
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
      goto: vi
        .fn()
        .mockResolvedValue({ status: () => 403 } as unknown as Response),
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
    mockFetch.mockResolvedValue({
      status: 200,
      url: 'https://example.com/redirected',
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
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      'HTTP 404',
    )
  })
})
