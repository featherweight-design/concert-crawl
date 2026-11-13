import { describe, expect, it, vi } from 'vitest';
import { makeMusicBrainzLookup } from './musicbrainz.js';

const reply = (artists: unknown[]) =>
  vi.fn(async () => Response.json({ artists }));

describe('makeMusicBrainzLookup', () => {
  it('is true for an exact name, ignoring case and spacing, or an alias', async () => {
    const lookup = makeMusicBrainzLookup({
      fetchImpl: reply([
        { name: 'Other Act' },
        { name: 'Iron  &  Wine', aliases: [{ name: 'Iron and Wine' }] },
      ]),
      sleepImpl: async () => {},
    });
    expect(await lookup('iron & wine')).toBe(true);
  });

  it('is false for a near match', async () => {
    const lookup = makeMusicBrainzLookup({
      fetchImpl: reply([{ name: 'Nas & Damian Marley' }]),
      sleepImpl: async () => {},
    });
    expect(await lookup('Nas & The Roots')).toBe(false);
  });

  it('sends the bot user agent and no email, and asks once per name', async () => {
    const fetchImpl = reply([{ name: 'Nas' }]);
    const lookup = makeMusicBrainzLookup({
      fetchImpl,
      sleepImpl: async () => {},
    });
    await lookup('Nas');
    await lookup('NAS');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({
      'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    });
    expect(JSON.stringify(init?.headers)).not.toContain('@');
  });

  it('waits at least a second between calls', async () => {
    // Well past the first call's window, so only the second call has to wait.
    let clock = 1_000_000;
    const sleeps: number[] = [];
    const lookup = makeMusicBrainzLookup({
      fetchImpl: reply([]),
      now: () => clock,
      sleepImpl: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
    });
    await lookup('A');
    await lookup('B');
    expect(sleeps.length).toBe(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(1000);
  });

  it('reads "&" and "+" as one joiner', async () => {
    const lookup = makeMusicBrainzLookup({
      fetchImpl: reply([{ name: 'for KING & COUNTRY' }]),
      sleepImpl: async () => {},
    });
    expect(await lookup('for KING + COUNTRY')).toBe(true);
  });

  it('retries a busy server after 2, 5 and 10 seconds, then reads it as unknown', async () => {
    const sleeps: number[] = [];
    const fetchImpl = vi.fn(async () => new Response('busy', { status: 503 }));
    const lookup = makeMusicBrainzLookup({
      fetchImpl,
      sleepImpl: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(await lookup('Nas')).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(sleeps.filter((ms) => ms >= 2000)).toEqual([2000, 5000, 10000]);
    expect(lookup.stats).toEqual({ found: 0, notFound: 0, unavailable: 1 });
  });

  it('answers after a busy reply when a retry succeeds, and counts found and not found', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ artists: [{ name: 'Nas' }] }))
      .mockResolvedValueOnce(Response.json({ artists: [] }));
    const lookup = makeMusicBrainzLookup({
      fetchImpl,
      sleepImpl: async () => {},
    });
    expect(await lookup('Nas')).toBe(true);
    expect(await lookup('Nobody')).toBe(false);
    expect(lookup.stats).toEqual({ found: 1, notFound: 1, unavailable: 0 });
  });

  it('reads a failed call as UNKNOWN (null, never false), and asks again next time', async () => {
    // Each lookup makes four asks (one try, three retries) before giving up.
    const fetchImpl = vi.fn();
    for (let ask = 0; ask < 4; ask += 1) {
      fetchImpl.mockRejectedValueOnce(new Error('timeout'));
    }
    for (let ask = 0; ask < 4; ask += 1) {
      fetchImpl.mockResolvedValueOnce(new Response('busy', { status: 503 }));
    }
    fetchImpl.mockResolvedValueOnce(
      Response.json({ artists: [{ name: 'Nas' }] }),
    );
    const lookup = makeMusicBrainzLookup({
      fetchImpl,
      sleepImpl: async () => {},
    });
    expect(await lookup('Nas')).toBeNull();
    expect(await lookup('Nas')).toBeNull();
    expect(await lookup('Nas')).toBe(true);
  });
});
