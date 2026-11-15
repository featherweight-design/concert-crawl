// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ anonymousRequest: mocks.get }));

import { loadIntentSubject, showEyebrow } from './intent-subject';

const ID = '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f';
const watch = (path = `/events/${ID}`, id = ID) => `${path}?intent=watch:${id}`;
const detail = {
  title: ' Static Dress ',
  date: '2026-11-14',
  venue: { name: 'Marquis' },
};

beforeEach(() => {
  mocks.get.mockReset();
});

describe('showEyebrow', () => {
  it('reads "Sat, Nov 14 · Marquis" from a calendar day, in no time zone', () => {
    expect(showEyebrow('2026-11-14', 'Marquis')).toBe('Sat, Nov 14 · Marquis');
  });

  it('falls back to the venue for a date it cannot read', () => {
    expect(showEyebrow('not a date', 'Marquis')).toBe('Marquis');
  });
});

describe('loadIntentSubject', () => {
  it('names a show a pending Watch is for, from the identity-free public read', async () => {
    mocks.get.mockResolvedValue(detail);
    expect(await loadIntentSubject(watch())).toEqual({
      kind: 'show',
      title: 'Static Dress',
      eyebrow: 'Sat, Nov 14 · Marquis',
    });
    expect(mocks.get).toHaveBeenCalledWith(
      `/v1/events/${ID}`,
      expect.objectContaining({ next: { revalidate: 300 } }),
    );
  });

  it('gives a slow lookup a deadline, so the page never waits on it', async () => {
    mocks.get.mockResolvedValue(detail);
    await loadIntentSubject(watch());
    const options = mocks.get.mock.calls[0]?.[1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal?.aborted).toBe(false);
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
    ['nothing'],
    ['/events'],
    // A show page with no pending Watch promises nothing, so it has no card.
    [`/events/${ID}`],
    [`/events/${ID}?tab=prices`],
    // A Watch for a different show than the page.
    [watch(`/events/${ID}`, '11111111-1111-4111-8111-111111111111')],
    // A verb that is not Watch.
    [`/events/${ID}?intent=follow:${ID}`],
    ['/crew/join/abc123'],
    ['/crews/9'],
    ['/venues/marquis'],
    ['/artists/tokimonsta'],
    [watch('/events/a/b')],
    [watch('/events/..%2F..')],
  ])('is generic, and asks nobody, for %s', async (path) => {
    expect(await loadIntentSubject(path === 'nothing' ? '' : path)).toEqual({
      kind: 'generic',
    });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('is generic, never an error, when the API fails or answers oddly', async () => {
    mocks.get.mockRejectedValueOnce(new Error('503'));
    expect(await loadIntentSubject(watch())).toEqual({ kind: 'generic' });
    mocks.get.mockResolvedValueOnce({ ...detail, title: '  ' });
    expect(await loadIntentSubject(watch())).toEqual({ kind: 'generic' });
    // A payload missing its venue is not a card either.
    mocks.get.mockResolvedValueOnce({ title: 'X', date: '2026-11-14' });
    expect(await loadIntentSubject(watch())).toEqual({ kind: 'generic' });
  });
});
