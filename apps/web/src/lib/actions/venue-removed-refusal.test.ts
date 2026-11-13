import { beforeEach, describe, expect, it, vi } from 'vitest';

// A venue removed at its request is refused Show and Resume by the API (409
// venue_removed). The refusal must come back as a value carrying the API's
// message, because a server action's thrown message is redacted in production.

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: () => Promise.resolve('token-1') }),
  currentUser: () => Promise.resolve(null),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { apiPatch, apiDelete } = vi.hoisted(() => ({
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: apiPatch,
    delete: apiDelete,
  },
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
const { activateVenue, resumeCrawling } = await import('./venues');

const REFUSAL =
  'This venue asked us to remove its data, so it stays off the site.';

beforeEach(() => {
  apiPatch.mockReset().mockResolvedValue({});
  apiDelete.mockReset().mockResolvedValue({});
});

describe.each([
  ['activateVenue', () => activateVenue('venue-1'), apiPatch],
  ['resumeCrawling', () => resumeCrawling('venue-1'), apiDelete],
])('%s', (_name, run, call) => {
  it('says ok when the API takes it', async () => {
    await expect(run()).resolves.toEqual({ ok: true });
  });

  it("returns a venue_removed refusal's message", async () => {
    call.mockRejectedValue(new ApiError(409, REFUSAL, 'venue_removed'));
    await expect(run()).resolves.toEqual({ ok: false, error: REFUSAL });
  });

  it('still throws any other failure', async () => {
    call.mockRejectedValue(new ApiError(409, 'Something else', 'other'));
    await expect(run()).rejects.toThrow('Something else');
  });
});
