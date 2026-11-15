import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const get = vi.fn();
const authedGet = vi.fn();
vi.mock('@/lib/api', () => ({
  publicApiClient: { get },
  apiClient: { get: authedGet },
}));

// The viewer: signed out unless a test sets a user.
const session = vi.hoisted(() => ({
  current: { userId: null as string | null, token: 'tok_viewer' },
}));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({
    userId: session.current.userId,
    getToken: async () => session.current.token,
  }),
}));

const connection = vi.fn(async () => {});
vi.mock('next/server', () => ({ connection }));

const { getFeatureFlags, isFeatureEnabled } =
  await import('./feature-flags.js');

describe('server-side getFeatureFlags', () => {
  beforeEach(() => {
    get.mockReset();
    authedGet.mockReset();
    session.current = { userId: null, token: 'tok_viewer' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // The hole this closes: a flag at Me or Beta is on for some people only, so
  // a server-side read that does not forward the viewer's auth hands them the
  // signed-out map and a 404 on a page they should see.
  it('forwards the signed-in viewer token for a flag not on for everyone, and never lets Next share the answer', async () => {
    session.current = { userId: 'user_beta', token: 'tok_beta' };
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    });
    authedGet.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    });

    expect(await isFeatureEnabled('crews')).toBe(true);
    expect(authedGet).toHaveBeenCalledWith('/v1/flags', 'tok_beta', {
      cache: 'no-store',
    });
  });

  // The perf guard: a flag that is on for everyone, or any signed-out visitor,
  // costs the one cached read it always did. No per-viewer request.
  it('does not ask per viewer when the flag is on for everyone', async () => {
    session.current = { userId: 'user_any', token: 'tok_any' };
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    });
    expect(await isFeatureEnabled('release-notes')).toBe(true);
    expect(authedGet).not.toHaveBeenCalled();
  });

  it('gives a Me or Beta user the full map from getFeatureFlags', async () => {
    session.current = { userId: 'user_beta', token: 'tok_beta' };
    authedGet.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    });
    expect((await getFeatureFlags()).crews).toBe(true);
    expect(authedGet).toHaveBeenCalledWith('/v1/flags', 'tok_beta', {
      cache: 'no-store',
    });
  });

  it('reads the signed-out map for a visitor, cached 30s as before', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    });
    expect(await isFeatureEnabled('crews')).toBe(false);
    expect(get).toHaveBeenCalledWith('/v1/flags', {
      next: { revalidate: 30 },
    });
    expect(authedGet).not.toHaveBeenCalled();
  });

  // Vitest is not configured to restore mocks, so the console spy has to be
  // torn down by hand or it stacks across tests and files.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regression: production /crews served a build-time static 404 after the
  // flag was turned on. Reading a flag must opt the route into dynamic
  // rendering before anything else, or a gated page prerenders.
  it('opts the route into dynamic rendering before reading the flags', async () => {
    const order: string[] = [];
    connection.mockImplementationOnce(async () => {
      order.push('connection');
    });
    get.mockImplementationOnce(async () => {
      order.push('fetch');
      return {
        'spotify-sync': false,
        crews: true,
        'release-notes': true,
      };
    });

    await isFeatureEnabled('crews');

    expect(order).toEqual(['connection', 'fetch']);
  });

  // Next interrupts prerendering by throwing from connection(). That has to
  // propagate: swallowed by the fetch's fallback, it would return the defaults
  // and a flag-off build would bake the 404 again.
  it('lets the prerender interrupt propagate instead of falling back', async () => {
    const interrupt = new Error('DYNAMIC_SERVER_USAGE');
    connection.mockRejectedValueOnce(interrupt);

    await expect(isFeatureEnabled('crews')).rejects.toBe(interrupt);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns the map the API gave it', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    });
    await expect(isFeatureEnabled('crews')).resolves.toBe(true);
  });

  it('falls back to registry defaults when the fetch throws', async () => {
    get.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(getFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    });
  });

  it('falls back when the API returns a malformed body', async () => {
    get.mockResolvedValue({ crews: 'yes' });
    await expect(isFeatureEnabled('crews')).resolves.toBe(false);
  });
});
