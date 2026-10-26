import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@concert-crawl/crawler-core/robots', () => ({
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  isAllowedOrSkip: vi.fn().mockResolvedValue(true),
  CrawlSkipError: class CrawlSkipError extends Error {},
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
  resolveCrawlDelayMs: vi.fn().mockReturnValue(3000),
}))
// Zero out the pause so the suite doesn't sleep; the delay it was asked for
// is asserted on the jitter call instead.
vi.mock('@concert-crawl/crawler-core/jitter', () => ({
  jitter: vi.fn().mockReturnValue(0),
}))

import { jitter } from '@concert-crawl/crawler-core/jitter'
import {
  checkRobots,
  isAllowedOrSkip,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots'
import { detectTicketVendor } from '../detect-ticket-vendor.js'

afterEach(() => vi.clearAllMocks())

const mockFetch = (html: string) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => new TextEncoder().encode(html).buffer,
    }),
  )

describe('detectTicketVendor', () => {
  it('does not fetch a site whose robots.txt disallows us', async () => {
    vi.mocked(checkRobots).mockResolvedValueOnce({ status: 'disallowed' })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('waits the crawl delay between the robots.txt read and the page fetch', async () => {
    mockFetch('<p>nothing</p>')
    await detectTicketVendor('https://venue.example')
    expect(jitter).toHaveBeenCalledWith(3000)
  })

  it('does not fetch a site whose Crawl-delay exceeds the cap', async () => {
    vi.mocked(resolveCrawlDelayMs).mockReturnValueOnce(null)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns axs when AXS button class found', async () => {
    mockFetch('<button class="axs-btn">Buy</button>')
    expect(await detectTicketVendor('https://venue.example')).toBe('axs')
  })

  it('returns axs when axs.com link found', async () => {
    mockFetch('<a href="https://www.axs.com/events/123">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('axs')
  })

  it('returns ticketmaster when ticketmaster.com link found', async () => {
    mockFetch('<a href="https://www.ticketmaster.com/event/456">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe(
      'ticketmaster',
    )
  })

  it('returns seatgeek when seatgeek.com link found', async () => {
    mockFetch('<a href="https://seatgeek.com/event/789">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('seatgeek')
  })

  it('returns dice when dice.fm link found', async () => {
    mockFetch('<a href="https://dice.fm/event/abc">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('dice')
  })

  it('returns eventbrite when eventbrite.com link found', async () => {
    mockFetch('<a href="https://www.eventbrite.com/e/event-123">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('eventbrite')
  })

  it('returns unknown when no vendor signals found', async () => {
    mockFetch('<html><body>No ticket links here</body></html>')
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })

  it('returns unknown when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })

  it('returns unknown when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
      }),
    )
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })

  it('does not follow a redirect robots.txt disallows', async () => {
    vi.mocked(isAllowedOrSkip).mockResolvedValueOnce(false)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: new Headers({ location: 'https://elsewhere.example/' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
