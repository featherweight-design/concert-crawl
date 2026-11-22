import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPassportRenderCache,
  matchesEtag,
  passportCacheKey,
  renderOnce,
} from '../render-cache';

const parts = {
  userId: 'user_a',
  ratio: 'square',
  handle: '@huey',
  year: 2026,
  tokens: { signal: '#fff' },
  shows: [{ id: 'e1' }],
};

const bytes = (): ArrayBuffer => new ArrayBuffer(4);

describe('passportCacheKey', () => {
  it('is stable for the same contents', () => {
    expect(passportCacheKey(parts)).toBe(passportCacheKey({ ...parts }));
  });

  it('changes when a stamp is added', () => {
    const more = { ...parts, shows: [...parts.shows, { id: 'e2' }] };
    expect(passportCacheKey(more)).not.toBe(passportCacheKey(parts));
  });

  it('never matches across users with identical contents', () => {
    const other = { ...parts, userId: 'user_b' };
    expect(passportCacheKey(other)).not.toBe(passportCacheKey(parts));
  });

  it('changes with theme and year', () => {
    expect(passportCacheKey({ ...parts, tokens: { signal: '#000' } })).not.toBe(
      passportCacheKey(parts),
    );
    expect(passportCacheKey({ ...parts, year: 2027 })).not.toBe(
      passportCacheKey(parts),
    );
  });
});

describe('renderOnce', () => {
  beforeEach(clearPassportRenderCache);

  it('renders once for repeat and concurrent requests', async () => {
    const render = vi.fn(async () => bytes());
    const [one, two] = await Promise.all([
      renderOnce('k', render),
      renderOnce('k', render),
    ]);
    await renderOnce('k', render);
    expect(render).toHaveBeenCalledTimes(1);
    expect(one).toBe(two);
  });

  it('does not store a failed render', async () => {
    const render = vi
      .fn<() => Promise<ArrayBuffer>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(bytes());
    await expect(renderOnce('k', render)).rejects.toThrow('boom');
    await renderOnce('k', render);
    expect(render).toHaveBeenCalledTimes(2);
  });
});

describe('matchesEtag', () => {
  it('matches strong, weak and listed tags', () => {
    expect(matchesEtag('"a"', '"a"')).toBe(true);
    expect(matchesEtag('W/"a"', '"a"')).toBe(true);
    expect(matchesEtag('"b", "a"', '"a"')).toBe(true);
    expect(matchesEtag('"b"', '"a"')).toBe(false);
    expect(matchesEtag(null, '"a"')).toBe(false);
  });
});
