import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ApiModule from '@/lib/api';
import type * as FallbackArtModule from '@/lib/share/fallback-art';

const getMock = vi.fn();
// The real `ApiError` comes through: the route's 404-vs-502 split turns on
// `instanceof`, so a stand-in class would make that branch untestable.
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  publicApiClient: { get: getMock },
}));

// The flat IdentityArt render, spied on but real unless a test says otherwise.
const frameArtMock = vi.fn<typeof FallbackArtModule.identityArtDataUri>();
vi.mock('@/lib/share/fallback-art', async (importOriginal) => {
  const real = await importOriginal<typeof FallbackArtModule>();
  frameArtMock.mockImplementation(real.identityArtDataUri);
  return { identityArtDataUri: frameArtMock };
});

const { ApiError } = await import('@/lib/api');

const { GET } = await import('@/app/share/[eventId]/[ratio]/route');

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../../public');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const EVENT_ID = '11111111-2222-4333-8444-555555555555';

// The route fetches its fonts from its own origin. In a node test there is no
// origin, so `fetch` is redirected at the bundled files — the same bytes the
// edge would have served.
const originalFetch = globalThis.fetch;
const serveFontsFromDisk = (): void => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const buffer = await readFile(path.join(PUBLIC_DIR, url.pathname));
    return new Response(buffer, { status: 200 });
  });
};

// Deliberately not annotated as `EventDetailResponse`: the route only reads the
// handful of fields `toPosterEvent` maps, and annotating would force either a
// cast or forty irrelevant nulls. If the mapper starts reading a new field, the
// render assertions below fail — which is the signal we actually want.
const event = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  date: '2026-03-14',
  showTime: '20:00',
  venue: {
    id: 'venue-1',
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
    city: 'Denver',
    websiteUrl: null,
    timezone: 'America/Denver',
  },
  ticketPriceMin: '28.00',
  ticketPriceOpenedAt: 40,
  priceStatus: 'live',
};

const call = (
  url: string,
  params: { eventId: string; ratio: string },
  init: RequestInit = {},
) => GET(new Request(url, init), { params: Promise.resolve(params) });

const digest = async (response: Response): Promise<string> =>
  createHash('sha256')
    .update(Buffer.from(await response.arrayBuffer()))
    .digest('hex');

describe('GET /share/[eventId]/[ratio]', () => {
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    serveFontsFromDisk();
    getMock.mockResolvedValue(event);
  });

  it('renders a PNG with the locked cache headers', async () => {
    const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    );
    expect(response.headers.get('ETag')).toMatch(/^"share:/);
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.subarray(0, 4)).toEqual(PNG_MAGIC);
  }, 30_000);

  it('is byte-identical for identical requests', async () => {
    const url = `http://localhost/share/${EVENT_ID}/square`;
    const params = { eventId: EVENT_ID, ratio: 'square' };
    const first = await digest(await call(url, params));
    const second = await digest(await call(url, params));
    expect(first).toBe(second);
  }, 30_000);

  it('400s an unknown ratio without calling the API', async () => {
    const response = await call(`http://localhost/share/${EVENT_ID}/banner`, {
      eventId: EVENT_ID,
      ratio: 'banner',
    });
    expect(response.status).toBe(400);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('400s a malformed event id without calling the API', async () => {
    const response = await call('http://localhost/share/nope/story', {
      eventId: 'nope',
      ratio: 'story',
    });
    expect(response.status).toBe(400);
    expect(getMock).not.toHaveBeenCalled();
  });

  // Successes cache for a day. A failure inheriting an intermediary's default
  // would pin a broken image into a post long after the cause was fixed.
  it('never lets a failure be cached', async () => {
    getMock.mockRejectedValue(new ApiError(503, 'down'));
    const responses = [
      await call('http://localhost/share/nope/story', {
        eventId: 'nope',
        ratio: 'story',
      }),
      await call(`http://localhost/share/${EVENT_ID}/story`, {
        eventId: EVENT_ID,
        ratio: 'story',
      }),
    ];
    for (const response of responses) {
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });

  it('404s when the event does not exist', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'not found'));
    const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    });
    expect(response.status).toBe(404);
  });

  // A 404 here is cached for a day by `s-maxage`, so answering an outage with
  // one outlives the outage that caused it.
  it('502s rather than caching an outage as a missing event', async () => {
    for (const failure of [
      new ApiError(503, 'upstream down'),
      new Error('ECONNRESET'),
    ]) {
      getMock.mockRejectedValue(failure);
      const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
        eventId: EVENT_ID,
        ratio: 'story',
      });
      expect(response.status).toBe(502);
    }
  });

  it('502s rather than rendering in a substitute font', async () => {
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 404 }));
    const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    });
    expect(response.status).toBe(502);
  });

  it('304s a matching If-None-Match', async () => {
    const url = `http://localhost/share/${EVENT_ID}/link`;
    const params = { eventId: EVENT_ID, ratio: 'link' };
    const first = await call(url, params);
    const etag = first.headers.get('ETag') ?? '';
    const second = await call(url, params, {
      headers: { 'if-none-match': etag },
    });
    expect(second.status).toBe(304);
  }, 30_000);

  // A CDN in front of us may weaken the tag and send it among others; missing
  // the match re-renders a PNG we already have.
  it('304s a weak validator arriving in a list', async () => {
    const url = `http://localhost/share/${EVENT_ID}/link`;
    const params = { eventId: EVENT_ID, ratio: 'link' };
    const etag = (await call(url, params)).headers.get('ETag') ?? '';
    const second = await call(url, params, {
      headers: { 'if-none-match': `"stale", W/${etag}` },
    });
    expect(second.status).toBe(304);
  }, 30_000);

  // The B+ card is theme-independent, so a theme must not split the cache.
  it('varies the ETag by ratio but not by theme', async () => {
    const story = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    });
    const square = await call(`http://localhost/share/${EVENT_ID}/square`, {
      eventId: EVENT_ID,
      ratio: 'square',
    });
    const jade = await call(
      `http://localhost/share/${EVENT_ID}/story?theme=jade`,
      { eventId: EVENT_ID, ratio: 'story' },
    );
    expect(story.headers.get('ETag')).not.toBe(square.headers.get('ETag'));
    expect(jade.headers.get('ETag')).toBe(story.headers.get('ETag'));
  }, 30_000);

  // The mint's contentHash only moves with `state`, so a corrected artist or a
  // changed drop amount would otherwise keep serving yesterday's PNG for the
  // full s-maxage day.
  it('varies the ETag with every field drawn on the card', async () => {
    const tagFor = async (overrides: Record<string, unknown>) => {
      getMock.mockResolvedValue({ ...event, ...overrides });
      const response = await call(`http://localhost/share/${EVENT_ID}/link`, {
        eventId: EVENT_ID,
        ratio: 'link',
      });
      return response.headers.get('ETag');
    };
    const tags = [
      await tagFor({}),
      await tagFor({ artist: 'Snakebite Reviva' }),
      await tagFor({ showTime: '21:00' }),
      await tagFor({ date: '2026-03-15' }),
      await tagFor({ ticketPriceMin: '16.00' }),
    ];
    expect(new Set(tags).size).toBe(tags.length);
  }, 30_000);

  // The B+ boards draw no handle, so a signed share draws the same card.
  it('draws the same card for a signed share as an anonymous one', async () => {
    const anon = await digest(
      await call(`http://localhost/share/${EVENT_ID}/square`, {
        eventId: EVENT_ID,
        ratio: 'square',
      }),
    );
    const signed = await digest(
      await call(`http://localhost/share/${EVENT_ID}/square?by=hugh`, {
        eventId: EVENT_ID,
        ratio: 'square',
      }),
    );
    expect(anon).toBe(signed);
  }, 30_000);

  // A broken photo host costs the photo, never the card: IdentityArt draws.
  it('renders the fallback when the photo cannot be fetched', async () => {
    getMock.mockResolvedValue({
      ...event,
      artistPhotoUrl: 'https://photos.invalid/missing.jpg',
    });
    const response = await call(`http://localhost/share/${EVENT_ID}/link`, {
      eventId: EVENT_ID,
      ratio: 'link',
    });
    expect(response.status).toBe(200);
    // Usually transient, so held for a minute, and tagged apart from a card
    // that drew its photo.
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, s-maxage=60',
    );
    expect(response.headers.get('ETag')).toMatch(/:f"$/);
  }, 30_000);

  // Only a tilted card needs the art flattened first; Story draws it inline.
  it('renders the flat art for a no-photo Square and Wide, not for Story', async () => {
    for (const ratio of ['square', 'link', 'story']) {
      frameArtMock.mockClear();
      const response = await call(
        `http://localhost/share/${EVENT_ID}/${ratio}`,
        {
          eventId: EVENT_ID,
          ratio,
        },
      );
      expect(response.status).toBe(200);
      expect(frameArtMock).toHaveBeenCalledTimes(ratio === 'story' ? 0 : 1);
    }
  }, 60_000);

  // next/og renders lazily, so a failing flat render rejects late; it must
  // cost the flat art only, never the card.
  it('still draws the card when the flat art render fails', async () => {
    frameArtMock.mockRejectedValueOnce(new Error('resvg exploded'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await call(`http://localhost/share/${EVENT_ID}/square`, {
        eventId: EVENT_ID,
        ratio: 'square',
      });
      expect(response.status).toBe(200);
      const body = Buffer.from(await response.arrayBuffer());
      expect(body.subarray(0, 4)).toEqual(PNG_MAGIC);
    } finally {
      errors.mockRestore();
    }
  }, 30_000);

  it('draws a photo that loads, under the full cache life', async () => {
    const jpeg = await readFile(
      path.resolve(
        __dirname,
        '../../../../../../../../design/design_handoff_bplus_redesign/screens/07-more-screens/more-r3-share_shapes.jpg',
      ),
    );
    const diskFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) =>
        new URL(String(input)).hostname === 'photos.example.com'
          ? new Response(jpeg, { status: 200 })
          : diskFetch(input, init),
    );
    getMock.mockResolvedValue({
      ...event,
      artistPhotoUrl: 'https://photos.example.com/toki.jpg',
    });
    const response = await call(`http://localhost/share/${EVENT_ID}/square`, {
      eventId: EVENT_ID,
      ratio: 'square',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    );
    expect(response.headers.get('ETag')).toMatch(/:p"$/);
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.subarray(0, 4)).toEqual(PNG_MAGIC);
  }, 30_000);

  // "4 DAYS AWAY" is only true until the venue's midnight: the tag moves with
  // the day count, and no cache may hold the card past that midnight.
  it('keys and expires a countdown card on the venue’s day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      getMock.mockResolvedValue({ ...event, date: '2026-11-13' });
      const at = async (iso: string) => {
        vi.setSystemTime(new Date(iso));
        return call(`http://localhost/share/${EVENT_ID}/link`, {
          eventId: EVENT_ID,
          ratio: 'link',
        });
      };
      // 22:00 MST Nov 9, then 01:00 MST Nov 10.
      const before = await at('2026-11-10T05:00:00Z');
      const after = await at('2026-11-10T08:00:00Z');
      expect(before.headers.get('Cache-Control')).toBe(
        'public, max-age=3600, s-maxage=7200',
      );
      expect(before.headers.get('ETag')).not.toBe(after.headers.get('ETag'));
    } finally {
      vi.useRealTimers();
    }
  }, 30_000);

  // The countdown's day and the cache life come from one instant, taken after
  // the photo: a fallback card 30s before midnight lives 30s, not a minute.
  it('caps a fallback countdown card at the venue’s midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-11-10T06:59:30Z'));
      getMock.mockResolvedValue({
        ...event,
        date: '2026-11-13',
        artistPhotoUrl: 'https://photos.invalid/missing.jpg',
      });
      const response = await call(`http://localhost/share/${EVENT_ID}/link`, {
        eventId: EVENT_ID,
        ratio: 'link',
      });
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=30, s-maxage=30',
      );
      expect(response.headers.get('ETag')).toMatch(/:f"$/);
    } finally {
      vi.useRealTimers();
    }
  }, 30_000);

  it('ignores an implausible handle instead of drawing it', async () => {
    const anon = await digest(
      await call(`http://localhost/share/${EVENT_ID}/square`, {
        eventId: EVENT_ID,
        ratio: 'square',
      }),
    );
    const junk = await digest(
      await call(
        `http://localhost/share/${EVENT_ID}/square?by=${encodeURIComponent('<script>')}`,
        { eventId: EVENT_ID, ratio: 'square' },
      ),
    );
    expect(junk).toBe(anon);
  }, 30_000);
});
