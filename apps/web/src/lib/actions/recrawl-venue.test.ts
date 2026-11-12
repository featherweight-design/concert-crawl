import { beforeEach, describe, expect, it, vi } from 'vitest';

// recrawlVenue tells an API refusal of one venue (400, 409) from an error, so
// a bulk Re-crawl's toast can say which happened. It posts through the shared
// `triggerVenueCrawl`.

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
    ) {
      super(message);
    }
  },
}));

const { ApiError } = await import('@/lib/api');
const { recrawlVenue } = await import('./venues');

beforeEach(() => {
  apiPost.mockReset().mockResolvedValue({ triggerId: 't-1' });
  revalidatePath.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('recrawlVenue', () => {
  it('posts an empty body to the venue crawl route, and refreshes its pages', async () => {
    await expect(recrawlVenue('venue-1')).resolves.toEqual({ ok: true });
    expect(apiPost).toHaveBeenCalledWith(
      '/v1/admin/crawl/venue-1',
      'token-1',
      {},
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/venues');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/venues/venue-1');
  });

  it.each([400, 409])(
    'returns a %i as a refusal, logged as a warning',
    async (status) => {
      apiPost.mockRejectedValue(new ApiError(status, 'refused'));
      await expect(recrawlVenue('venue-1')).resolves.toEqual({
        ok: false,
        status,
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([404, 500, 503])(
    'returns a %i as an error, logged as one',
    async (status) => {
      apiPost.mockRejectedValue(new ApiError(status, 'failed'));
      await expect(recrawlVenue('venue-1')).resolves.toEqual({
        ok: false,
        status,
      });
      expect(console.error).toHaveBeenCalled();
    },
  );

  it('rethrows anything that is not an API reply', async () => {
    const network = new TypeError('fetch failed');
    apiPost.mockRejectedValue(network);
    await expect(recrawlVenue('venue-1')).rejects.toBe(network);
  });
});
