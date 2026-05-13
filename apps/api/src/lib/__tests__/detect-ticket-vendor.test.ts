import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectTicketVendor } from '../detect-ticket-vendor.js'

afterEach(() => vi.restoreAllMocks())

const mockFetch = (html: string) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(html).buffer,
    }),
  )

describe('detectTicketVendor', () => {
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })
})
