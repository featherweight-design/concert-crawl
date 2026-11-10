import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const get = vi.fn();
vi.mock('@/lib/api', () => ({ publicApiClient: { get } }));

const connection = vi.fn(async () => {});
vi.mock('next/server', () => ({ connection }));

const { getFeatureFlags, isFeatureEnabled } =
  await import('./feature-flags.js');

describe('server-side getFeatureFlags', () => {
  beforeEach(() => {
    get.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
      return { 'spotify-sync': false, crews: true, 'release-notes': true };
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
