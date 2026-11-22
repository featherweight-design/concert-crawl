import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPassportRenderCache } from '@/lib/passport/render-cache';
import {
  planPassportCard,
  type PassportCardInput,
} from '@/lib/passport/render-card';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../public');
const ORIGIN = 'https://staging.example.test';

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  const buffer = await readFile(path.join(PUBLIC_DIR, url.pathname));
  return new Response(buffer, { status: 200 });
});

const show = {
  eventId: 'event-1',
  artist: 'Artist 1',
  artistPhotoUrl: null,
  venueName: 'Bluebird Theater',
  venueSlug: 'bluebird-theater',
  neighborhood: null,
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: '20:00:00',
  date: '2026-03-14',
  dateLabel: 'Sat, Mar 14',
  showTime: '8:00 PM',
  priceFinal: 28,
  genre: 'punk',
  attendingAt: '2026-03-15T02:00:00Z',
};

const input: PassportCardInput = {
  ratio: 'square',
  userId: 'user_a',
  handle: '@huey',
  profileTheme: 'jade',
  themeOverride: undefined,
  past: [show],
};

describe('planPassportCard', () => {
  beforeEach(() => {
    clearPassportRenderCache();
    fetchMock.mockClear();
    globalThis.fetch = fetchMock;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('keys a card the same whether the theme is stored or requested', () => {
    // The page warms with the stored theme; the browser then asks with
    // `?theme=<live theme>`. They must land on one entry.
    const warmed = planPassportCard(input);
    const requested = planPassportCard({ ...input, themeOverride: 'jade' });
    expect(requested.key).toBe(warmed.key);
  });

  it('keys a different theme, account or stamp list differently', () => {
    const base = planPassportCard(input).key;
    expect(
      planPassportCard({ ...input, themeOverride: 'electric' }).key,
    ).not.toBe(base);
    expect(planPassportCard({ ...input, userId: 'user_b' }).key).not.toBe(base);
    expect(planPassportCard({ ...input, past: [] }).key).not.toBe(base);
  });

  it('renders once: a request after the warm-up draws nothing new', async () => {
    const warmed = await planPassportCard(input).render(ORIGIN);
    const fontFetches = fetchMock.mock.calls.length;
    expect(fontFetches).toBeGreaterThan(0);

    const requested = await planPassportCard({
      ...input,
      themeOverride: 'jade',
    }).render(ORIGIN);
    expect(requested).toBe(warmed);
    expect(fetchMock.mock.calls.length).toBe(fontFetches);
  }, 30_000);
});
