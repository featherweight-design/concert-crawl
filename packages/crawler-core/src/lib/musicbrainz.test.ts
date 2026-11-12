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
    let clock = 0;
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

  it('reads a failed call as UNKNOWN (null, never false), and asks again next time', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ artists: [{ name: 'Nas' }] }));
    const lookup = makeMusicBrainzLookup({
      fetchImpl,
      sleepImpl: async () => {},
    });
    expect(await lookup('Nas')).toBeNull();
    expect(await lookup('Nas')).toBeNull();
    expect(await lookup('Nas')).toBe(true);
  });
});
