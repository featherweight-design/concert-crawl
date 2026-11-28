import { beforeEach, describe, expect, it, vi } from 'vitest';

// testCrawlVenue posts `{ test: true }`. A 409 test_pending that names the
// queued test is picked up (the page was left mid-test and reopened); a 409
// without the id, from an API that predates it, stays a refusal.

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: () => Promise.resolve('token-1') }),
  currentUser: () => Promise.resolve(null),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { apiPost } = vi.hoisted(() => ({ apiPost: vi.fn() }));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: apiPost, delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public code?: string,
      public zodIssues?: unknown,
      public reason?: string,
      public field?: string,
      public body?: unknown,
    ) {
      super(message);
    }
  },
}));

const { ApiError } = await import('@/lib/api');
const { testCrawlVenue } = await import('./venues');

beforeEach(() => {
  apiPost.mockReset().mockResolvedValue({ triggerId: 't-1' });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('testCrawlVenue', () => {
  it('posts { test: true } and returns the new trigger', async () => {
    await expect(testCrawlVenue('venue-1')).resolves.toEqual({
      ok: true,
      triggerId: 't-1',
    });
    expect(apiPost).toHaveBeenCalledWith('/v1/admin/crawl/venue-1', 'token-1', {
      test: true,
    });
  });

  it('picks up the queued test a test_pending refusal names', async () => {
    apiPost.mockRejectedValue(
      new ApiError(
        409,
        'queued',
        'test_pending',
        undefined,
        undefined,
        undefined,
        {
          triggerId: 't-queued',
        },
      ),
    );
    await expect(testCrawlVenue('venue-1')).resolves.toEqual({
      ok: true,
      triggerId: 't-queued',
    });
  });

  it('keeps test_pending a refusal when the API names no trigger', async () => {
    apiPost.mockRejectedValue(new ApiError(409, 'queued', 'test_pending'));
    await expect(testCrawlVenue('venue-1')).resolves.toEqual({
      ok: false,
      code: 'test_pending',
    });
  });

  it('returns the other coded refusals as their code', async () => {
    apiPost.mockRejectedValue(new ApiError(409, 'refused', 'not_draft'));
    await expect(testCrawlVenue('venue-1')).resolves.toEqual({
      ok: false,
      code: 'not_draft',
    });
  });
});
