// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ publicApiClient: { get: mocks.get } }));

import { loadIntentSubject, showEyebrow } from './intent-subject';

beforeEach(() => mocks.get.mockReset());

describe('showEyebrow', () => {
  it('reads "FRI, NOV 14 · MARQUIS" from a calendar day, in no time zone', () => {
    expect(showEyebrow('2026-11-14', 'Marquis')).toBe('Fri, Nov 14 · Marquis');
  });

  it('falls back to the venue for a date it cannot read', () => {
    expect(showEyebrow('not a date', 'Marquis')).toBe('Marquis');
  });
});

describe('loadIntentSubject', () => {
  it('names a show from the public events route', async () => {
    mocks.get.mockResolvedValue({
      title: ' Static Dress ',
      date: '2026-11-14',
      venue: { name: 'Marquis' },
    });
    expect(await loadIntentSubject('/events/42?from=watch')).toEqual({
      kind: 'show',
      title: 'Static Dress',
      eyebrow: 'Fri, Nov 14 · Marquis',
    });
    expect(mocks.get).toHaveBeenCalledWith(
      '/v1/events/42',
      expect.objectContaining({ next: { revalidate: 300 } }),
    );
  });

  it('gives a slow lookup a deadline, so the page never waits on it', async () => {
    mocks.get.mockResolvedValue({
      artist: { name: 'X', slug: 'x' },
      shows: [],
    });
    await loadIntentSubject('/artists/x');
    const options = mocks.get.mock.calls[0]?.[1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal?.aborted).toBe(false);
  });

  it('names an artist and counts the upcoming dates', async () => {
    mocks.get.mockResolvedValue({
      artist: { name: 'TOKiMONSTA', slug: 'tokimonsta' },
      shows: [{}, {}],
    });
    expect(await loadIntentSubject('/artists/tokimonsta')).toEqual({
      kind: 'artist',
      name: 'TOKiMONSTA',
      dates: 2,
    });
    expect(mocks.get).toHaveBeenCalledWith(
      '/v1/artists/tokimonsta',
      expect.anything(),
    );
  });

  it.each([
    ['/watching', 'My shows'],
    ['/settings', 'Settings'],
    ['/crews', 'Crews'],
    ['/notifications', 'Notifications'],
  ])('names %s as a page without asking the API', async (path, page) => {
    expect(await loadIntentSubject(path)).toEqual({ kind: 'page', page });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '/events',
    '/crew/join/abc123',
    '/crews/9',
    '/venues/marquis',
    '/events/a/b',
    '/artists/Bad Slug',
    '/events/..%2F..',
  ])('is generic, and asks nobody, for %j', async (path) => {
    expect(await loadIntentSubject(path)).toEqual({ kind: 'generic' });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('is generic, never an error, when the API fails or answers oddly', async () => {
    mocks.get.mockRejectedValueOnce(new Error('503'));
    expect(await loadIntentSubject('/events/42')).toEqual({ kind: 'generic' });
    mocks.get.mockResolvedValueOnce({
      title: '  ',
      date: '2026-11-14',
      venue: { name: 'Marquis' },
    });
    expect(await loadIntentSubject('/events/42')).toEqual({ kind: 'generic' });
    mocks.get.mockResolvedValueOnce({
      artist: { name: '' },
      shows: [],
    });
    expect(await loadIntentSubject('/artists/x')).toEqual({ kind: 'generic' });
  });
});
