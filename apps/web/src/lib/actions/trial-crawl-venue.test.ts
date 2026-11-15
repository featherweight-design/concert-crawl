import { beforeEach, describe, expect, it, vi } from 'vitest';

// trialCrawlVenue posts `{ trial: true }` and hands the API's three 409
// refusals back as a value; anything else throws.

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: () => Promise.resolve('token-1') }),
  currentUser: () => Promise.resolve(null),
}));

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath }));

const { apiPost } = vi.hoisted(() => ({ apiPost: vi.fn() }));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: apiPost, delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public code?: string,
    ) {
      super(message);
    }
  },
}));

const { ApiError } = await import('@/lib/api');
const { trialCrawlVenue } = await import('./venues');

beforeEach(() => {
  apiPost.mockReset().mockResolvedValue({ triggerId: 't-1' });
  revalidatePath.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('trialCrawlVenue', () => {
  it('posts { trial: true } to the venue crawl route, and refreshes its pages', async () => {
    await expect(trialCrawlVenue('venue-1')).resolves.toEqual({ ok: true });
    expect(apiPost).toHaveBeenCalledWith('/v1/admin/crawl/venue-1', 'token-1', {
      trial: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/venues');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/venues/venue-1');
  });

  it.each([
    'trial_pending',
    'blocked',
    'not_paused',
    'robots_disallowed',
  ] as const)('returns a 409 %s as its code', async (code) => {
    apiPost.mockRejectedValue(new ApiError(409, 'refused', code));
    await expect(trialCrawlVenue('venue-1')).resolves.toEqual({
      ok: false,
      code,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the 400 (hidden or unverified, no code) as not_crawlable', async () => {
    apiPost.mockRejectedValue(
      new ApiError(400, 'Venue must be active and verified to crawl'),
    );
    await expect(trialCrawlVenue('venue-1')).resolves.toEqual({
      ok: false,
      code: 'not_crawlable',
    });
  });

  it('rethrows a 409 it doesn’t know, and any other failure', async () => {
    const removed = new ApiError(409, 'removed', 'venue_removed');
    apiPost.mockRejectedValueOnce(removed);
    await expect(trialCrawlVenue('venue-1')).rejects.toBe(removed);
    const down = new ApiError(500, 'down');
    apiPost.mockRejectedValueOnce(down);
    await expect(trialCrawlVenue('venue-1')).rejects.toBe(down);
  });
});
