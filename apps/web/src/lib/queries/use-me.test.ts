// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { UserProfileResponse } from '@concert-crawl/types';

const fetchMe = vi.hoisted(() => vi.fn());
vi.mock('@/lib/users', () => ({ fetchMe }));

import { fetchMeShared, meQueryKey } from './use-me';

const PROFILE = { handle: 'huey' } as UserProfileResponse;

const setup = () => ({
  client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  getToken: vi.fn(() => Promise.resolve<string | null>('tok')),
});

beforeEach(() => {
  fetchMe.mockReset().mockResolvedValue(PROFILE);
});

describe('fetchMeShared', () => {
  it('makes one request when four readers ask at once', async () => {
    const { client, getToken } = setup();

    const results = await Promise.all([
      fetchMeShared(client, 'user_1', getToken),
      fetchMeShared(client, 'user_1', getToken),
      fetchMeShared(client, 'user_1', getToken),
      fetchMeShared(client, 'user_1', getToken),
    ]);

    expect(fetchMe).toHaveBeenCalledTimes(1);
    expect(fetchMe).toHaveBeenCalledWith('tok');
    for (const result of results) expect(result).toBe(PROFILE);
  });

  it('serves a later reader from the cache while it is fresh', async () => {
    const { client, getToken } = setup();

    await fetchMeShared(client, 'user_1', getToken);
    await fetchMeShared(client, 'user_1', getToken);

    expect(fetchMe).toHaveBeenCalledTimes(1);
  });

  it('reads again after the profile is invalidated', async () => {
    const { client, getToken } = setup();
    await fetchMeShared(client, 'user_1', getToken);

    await client.invalidateQueries({ queryKey: meQueryKey('user_1') });
    await fetchMeShared(client, 'user_1', getToken);

    expect(fetchMe).toHaveBeenCalledTimes(2);
  });

  it('keeps one account from reading the previous account profile', async () => {
    const { client, getToken } = setup();

    await fetchMeShared(client, 'user_1', getToken);
    await fetchMeShared(client, 'user_2', getToken);

    expect(fetchMe).toHaveBeenCalledTimes(2);
  });

  it('throws on a missing token rather than caching it as the profile', async () => {
    const { client } = setup();
    const noToken = vi.fn(() => Promise.resolve<string | null>(null));

    await expect(fetchMeShared(client, 'user_1', noToken)).rejects.toThrow(
      /token unavailable/,
    );
    expect(fetchMe).not.toHaveBeenCalled();
    expect(client.getQueryData(meQueryKey('user_1'))).toBeUndefined();
  });
});
