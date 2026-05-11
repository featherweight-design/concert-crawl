import { describe, it, expect, vi } from 'vitest'
import { fetchPage } from './fetcher.js'
import type { Browser, BrowserContext, Page, Response } from 'playwright'

function makeMockPage(overrides: Partial<Page> = {}): Page {
  return {
    on: vi.fn(),
    goto: vi.fn().mockResolvedValue({ status: () => 200 } as unknown as Response),
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

    await fetchPage('https://example.com', browser, 0, 'networkidle', '.event-card')

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
      goto: vi.fn().mockResolvedValue({ status: () => 403 } as unknown as Response),
    })
    const browser = makeMockBrowser(page)

    await expect(
      fetchPage('https://example.com', browser, 0, 'networkidle', '.event-card'),
    ).rejects.toThrow('HTTP 403')
    expect(page.waitForSelector).not.toHaveBeenCalled()
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
