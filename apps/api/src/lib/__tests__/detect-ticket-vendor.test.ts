import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@concert-crawl/crawler-core/robots', () => ({
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  isAllowedOrSkip: vi.fn().mockResolvedValue(true),
  CrawlSkipError: class CrawlSkipError extends Error {},
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
  resolveCrawlDelayMs: vi.fn().mockReturnValue(3000),
}));
// Zero out the pause so the suite doesn't sleep; the delay it was asked for
// is asserted on the jitter call instead.
vi.mock('@concert-crawl/crawler-core/jitter', () => ({
  jitter: vi.fn().mockReturnValue(0),
}));

import { jitter } from '@concert-crawl/crawler-core/jitter';
import {
  checkRobots,
  isAllowedOrSkip,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots';
import {
  DETECT_MAX_REDIRECTS,
  detectTicketVendor,
} from '../detect-ticket-vendor.js';

const { jitter: realJitter } = await vi.importActual<
  typeof import('@concert-crawl/crawler-core/jitter')
>('@concert-crawl/crawler-core/jitter');

afterEach(() => vi.clearAllMocks());

const mockFetch = (html: string) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => new TextEncoder().encode(html).buffer,
    }),
  );

describe('detectTicketVendor', () => {
  it('does not fetch a site whose robots.txt disallows us', async () => {
    vi.mocked(checkRobots).mockResolvedValueOnce({ status: 'disallowed' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits the crawl delay between the robots.txt read and the page fetch', async () => {
    mockFetch('<p>nothing</p>');
    await detectTicketVendor('https://venue.example');
    expect(jitter).toHaveBeenCalledWith(3000);
  });

  it("paces at the venue's stored delay, as the crawl does", async () => {
    mockFetch('<p>nothing</p>');
    await detectTicketVendor('https://venue.example', 10_000);
    // The venue's 10 s, not a bare 3 s floor, is what robots.txt's
    // Crawl-delay (none here) is weighed against.
    expect(resolveCrawlDelayMs).toHaveBeenCalledWith(
      10_000,
      null,
      expect.anything(),
    );
  });

  it('paces each redirect hop at the resolved delay, not the 3 s floor', async () => {
    // The page wait resolves to 10 s; a hop must clear at least that long.
    vi.mocked(resolveCrawlDelayMs).mockReturnValueOnce(10_000);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: new Headers({ location: 'https://venue.example/home' }),
        body: null,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => new TextEncoder().encode('<p>x</p>').buffer,
      });
    vi.stubGlobal('fetch', fetchMock);
    await detectTicketVendor('https://venue.example', 3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // robots.txt → page, then page → hop: each wait goes through jitter.
    expect(jitter).toHaveBeenCalledTimes(2);
    expect(jitter).toHaveBeenNthCalledWith(1, 10_000);
    // The hop's floor handed to clearRedirect is the resolved 10 s.
    expect(vi.mocked(resolveCrawlDelayMs).mock.calls[1]?.[0]).toBe(10_000);
  });

  it('does not fetch a site whose Crawl-delay exceeds the cap', async () => {
    vi.mocked(resolveCrawlDelayMs).mockReturnValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns axs when AXS button class found', async () => {
    mockFetch('<button class="axs-btn">Buy</button>');
    expect(await detectTicketVendor('https://venue.example')).toBe('axs');
  });

  it('returns axs when axs.com link found', async () => {
    mockFetch('<a href="https://www.axs.com/events/123">Tickets</a>');
    expect(await detectTicketVendor('https://venue.example')).toBe('axs');
  });

  it('returns ticketmaster when ticketmaster.com link found', async () => {
    mockFetch('<a href="https://www.ticketmaster.com/event/456">Tickets</a>');
    expect(await detectTicketVendor('https://venue.example')).toBe(
      'ticketmaster',
    );
  });

  it('returns seatgeek when seatgeek.com link found', async () => {
    mockFetch('<a href="https://seatgeek.com/event/789">Tickets</a>');
    expect(await detectTicketVendor('https://venue.example')).toBe('seatgeek');
  });

  it('returns dice when dice.fm link found', async () => {
    mockFetch('<a href="https://dice.fm/event/abc">Tickets</a>');
    expect(await detectTicketVendor('https://venue.example')).toBe('dice');
  });

  it('returns eventbrite when eventbrite.com link found', async () => {
    mockFetch('<a href="https://www.eventbrite.com/e/event-123">Tickets</a>');
    expect(await detectTicketVendor('https://venue.example')).toBe(
      'eventbrite',
    );
  });

  it('returns unknown when no vendor signals found', async () => {
    mockFetch('<html><body>No ticket links here</body></html>');
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
  });

  it('returns unknown when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
  });

  it('returns unknown when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
      }),
    );
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
  });

  it('follows at most 3 redirect hops, then fails cleanly as unknown', async () => {
    // A site that redirects forever, one step deeper each time.
    const fetchMock = vi.fn(async (url: string) => ({
      ok: false,
      status: 302,
      headers: new Headers({ location: `${url}/next` }),
      body: null,
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
    // The page and its 3 allowed hops; the 4th target never goes out.
    expect(fetchMock).toHaveBeenCalledTimes(1 + DETECT_MAX_REDIRECTS);
    expect(DETECT_MAX_REDIRECTS).toBe(3);
  });

  it("fails cleanly as unknown, up front, when a hop's wait can't fit the budget", async () => {
    // The page redirects to a host whose Crawl-delay (resolved to 10 min)
    // dwarfs the detection's budget. The hop's wait must breach before it
    // starts, never sleep the 10 minutes, and the hop must never go out.
    vi.useFakeTimers();
    vi.mocked(jitter).mockImplementation(realJitter);
    vi.mocked(resolveCrawlDelayMs)
      .mockReturnValueOnce(3_000)
      .mockReturnValueOnce(600_000);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: new Headers({ location: 'https://slow-host.example/' }),
      body: null,
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const result = detectTicketVendor('https://venue.example', 3_000);
      // Past the page's own paced wait (at most 4 s), far short of the hop's.
      await vi.advanceTimersByTimeAsync(5_000);
      // Settled inside those 5 s of fake time, so the 10-minute wait never ran.
      expect(await result).toBe('unknown');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.mocked(jitter).mockImplementation(() => 0);
      vi.useRealTimers();
    }
  });

  it('paces the page at least 3 s after the robots.txt read on the real jitter', async () => {
    vi.useFakeTimers();
    vi.mocked(jitter).mockImplementation(realJitter);
    const requestedAt: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        requestedAt.push(Date.now());
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          arrayBuffer: async () => new TextEncoder().encode('<p>x</p>').buffer,
        };
      }),
    );
    try {
      const startedAt = Date.now();
      const result = detectTicketVendor('https://venue.example');
      await vi.advanceTimersByTimeAsync(5_000);
      expect(await result).toBe('unknown');
      expect(requestedAt[0]! - startedAt).toBeGreaterThanOrEqual(3_000);
    } finally {
      vi.mocked(jitter).mockImplementation(() => 0);
      vi.useRealTimers();
    }
  });

  it('does not follow a redirect robots.txt disallows', async () => {
    vi.mocked(isAllowedOrSkip).mockResolvedValueOnce(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: new Headers({ location: 'https://elsewhere.example/' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
