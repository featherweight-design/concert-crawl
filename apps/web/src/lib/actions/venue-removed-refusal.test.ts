import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiModule from '@/lib/api';

// A venue removed at its request is refused Show, Resume crawling and crawl
// edits by the API (409, code `venue_removed`). The refusal must come back as
// a value carrying the API's message, because a server action's thrown message
// is redacted in production. Anything else still throws.

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: () => Promise.resolve('token-1') }),
  currentUser: () => Promise.resolve(null),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { apiPatch, apiDelete } = vi.hoisted(() => ({
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

// The real ApiError, so the refusal is read off the body as the API sends it.
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: apiPatch,
    delete: apiDelete,
  },
}));

const { ApiError } = await import('@/lib/api');
const { activateVenue, resumeCrawling, updateVenue } = await import('./venues');

const REFUSAL =
  'This venue asked us to remove its data, so it stays off the site.';

/** The API's `venueRemovedBody`, as `readResponse` throws it. */
const removedError = () =>
  new ApiError(409, REFUSAL, 'venue_removed', undefined, undefined, undefined, {
    success: false,
    error: REFUSAL,
    code: 'venue_removed',
  });

beforeEach(() => {
  apiPatch.mockReset().mockResolvedValue({});
  apiDelete.mockReset().mockResolvedValue({});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe.each([
  ['activateVenue', () => activateVenue('venue-1'), apiPatch],
  ['resumeCrawling', () => resumeCrawling('venue-1'), apiDelete],
])('%s', (_name, run, call) => {
  it('says ok when the API takes it', async () => {
    await expect(run()).resolves.toEqual({ ok: true });
  });

  it('returns a venue_removed refusal as a value, with its message', async () => {
    call.mockRejectedValue(removedError());
    await expect(run()).resolves.toEqual({ ok: false, error: REFUSAL });
  });

  it('still throws a 409 with another code', async () => {
    call.mockRejectedValue(
      new ApiError(
        409,
        'Something else',
        'other',
        undefined,
        undefined,
        undefined,
        {
          success: false,
          error: 'Something else',
          code: 'other',
        },
      ),
    );
    await expect(run()).rejects.toThrow('Something else');
  });

  it('still throws any other failure', async () => {
    call.mockRejectedValue(new ApiError(500, 'Boom'));
    await expect(run()).rejects.toThrow('Boom');
  });
});

describe('updateVenue', () => {
  it('sends a venue_removed refusal to the banner, not the slug input', async () => {
    apiPatch.mockRejectedValue(removedError());
    await expect(updateVenue('venue-1', new FormData())).resolves.toEqual({
      success: false,
      error: REFUSAL,
    });
  });

  it('still reads any other 409 as a slug clash', async () => {
    apiPatch.mockRejectedValue(new ApiError(409, 'Slug taken'));
    await expect(updateVenue('venue-1', new FormData())).resolves.toEqual({
      success: false,
      error: 'Slug already in use',
      field: 'slug',
    });
  });
});
