import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  adminFetch: (...args: unknown[]) => adminFetch(...args),
}));

import { KEEP_CRAWLED } from './merge-fixtures';
import { mergeApi } from './merge-api';

const reply = (status: number, body: unknown) =>
  ({ status, json: async () => body }) satisfies Pick<
    Response,
    'status' | 'json'
  >;

const api = mergeApi(async () => 'token');

// A block body on purpose: see add-show-api.test.ts.
beforeEach(() => {
  adminFetch.mockReset();
});

describe('mergeApi.candidates', () => {
  it('reads the pick list', async () => {
    const candidate = {
      id: 'e2',
      title: 'Other',
      date: '2026-11-12',
      showTime: null,
      manual: true,
      hidden: false,
      source: 'manual',
      addedBy: { handle: 'dlo' },
      watchers: 3,
      likely: true,
    };
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: { candidates: [candidate] } }),
    );
    await expect(api.candidates('e1')).resolves.toEqual([candidate]);
    const [url, init] = adminFetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/v1\/admin\/events\/e1\/merge-candidates$/);
    expect(init.headers.Authorization).toBe('Bearer token');
  });

  it('throws on a payload that drifted', async () => {
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: { candidates: [{ id: 'e2' }] } }),
    );
    await expect(api.candidates('e1')).rejects.toThrow();
  });
});

describe('mergeApi.preview', () => {
  it('asks with the kept id in the path and the source in the query', async () => {
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: KEEP_CRAWLED }),
    );
    await expect(api.preview('e-crawled', 'e-manual')).resolves.toEqual({
      kind: 'preview',
      preview: KEEP_CRAWLED,
    });
    const [url] = adminFetch.mock.calls[0] ?? [];
    expect(url).toMatch(
      /\/v1\/admin\/events\/e-crawled\/merge-preview\?source=e-manual$/,
    );
  });

  it('names why a 409 refuses', async () => {
    adminFetch.mockResolvedValue(
      reply(409, {
        success: false,
        error: 'not_mergeable',
        reason: 'past_mismatch',
      }),
    );
    await expect(api.preview('a', 'b')).resolves.toEqual({
      kind: 'not-mergeable',
      reason: 'past_mismatch',
    });
  });

  it('reads a 404 as not found and a 500 as a failure', async () => {
    adminFetch.mockResolvedValueOnce(
      reply(404, { success: false, error: 'Event not found' }),
    );
    await expect(api.preview('a', 'b')).resolves.toEqual({ kind: 'not-found' });
    adminFetch.mockResolvedValueOnce(reply(500, { success: false }));
    await expect(api.preview('a', 'b')).rejects.toThrow();
  });
});
