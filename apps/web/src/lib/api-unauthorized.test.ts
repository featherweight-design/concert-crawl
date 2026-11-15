import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminFetch, apiClient, onApiUnauthorized } from './api';

const respond = (status: number, body: unknown = { success: false }) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('onApiUnauthorized', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fires when an apiClient call answers 401, and carries on throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401)));
    const listener = vi.fn();
    const off = onApiUnauthorized(listener);
    await expect(apiClient.get('/v1/admin/x', 'token')).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it('fires for adminFetch, which is plain fetch otherwise', async () => {
    const res = respond(401);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
    const listener = vi.fn();
    const off = onApiUnauthorized(listener);
    await expect(adminFetch('/api/admin/x')).resolves.toBe(res);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it('stays quiet for every other status, a 403 included', async () => {
    const listener = vi.fn();
    const off = onApiUnauthorized(listener);
    for (const status of [200, 403, 404, 500]) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(respond(status, { success: status === 200 })),
      );
      await adminFetch('/api/admin/x');
      await apiClient.get('/v1/admin/x', 'token').catch(() => undefined);
    }
    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it('stops telling a listener once it unsubscribes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401)));
    const listener = vi.fn();
    onApiUnauthorized(listener)();
    await adminFetch('/api/admin/x');
    expect(listener).not.toHaveBeenCalled();
  });
});
