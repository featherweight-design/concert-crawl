import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const del = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: { delete: (...args: unknown[]) => del(...args) },
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
const {
  bulkDeleteResultOf,
  bulkDeleteSummary,
  deleteEvent,
  deleteRefusalMessage,
  dependentCountsOf,
} = await import('./event-delete');

const COPY = ADMIN_COPY.eventDelete;

const refusal = (message: string, body?: unknown) =>
  new ApiError(409, message, undefined, undefined, undefined, undefined, body);

beforeEach(() => {
  del.mockReset();
});

describe('deleteRefusalMessage', () => {
  it('says not_manual in words', () => {
    expect(deleteRefusalMessage(refusal('not_manual'))).toBe(COPY.notManual);
  });

  it('names the counts on has_dependents', () => {
    expect(
      deleteRefusalMessage(
        refusal('has_dependents', {
          success: false,
          error: 'has_dependents',
          counts: {
            watchers: 2,
            concerts: 1,
            submittedPrices: 0,
            redirects: 0,
          },
        }),
      ),
    ).toBe('Can’t delete: it has 2 Watchers and 1 Concert.');
  });

  it('is null for an unknown 409, another status, or not an ApiError', () => {
    expect(deleteRefusalMessage(refusal('past_locked'))).toBeNull();
    expect(deleteRefusalMessage(new ApiError(500, 'not_manual'))).toBeNull();
    expect(deleteRefusalMessage(new Error('not_manual'))).toBeNull();
  });
});

describe('dependentCountsOf', () => {
  it('reads the four counts', () => {
    expect(
      dependentCountsOf({
        watchers: 1,
        concerts: 2,
        submittedPrices: 3,
        redirects: 4,
      }),
    ).toEqual({ watchers: 1, concerts: 2, submittedPrices: 3, redirects: 4 });
  });

  it('reads a missing, negative, fractional or non-number count as 0', () => {
    expect(
      dependentCountsOf({ watchers: -1, concerts: 1.5, submittedPrices: '2' }),
    ).toEqual({ watchers: 0, concerts: 0, submittedPrices: 0, redirects: 0 });
    expect(dependentCountsOf(null)).toEqual({
      watchers: 0,
      concerts: 0,
      submittedPrices: 0,
      redirects: 0,
    });
  });
});

describe('deleteEvent', () => {
  const getToken = () => Promise.resolve('token');

  it('sends the DELETE', async () => {
    del.mockResolvedValue(undefined);
    await deleteEvent(getToken, 'evt-1');
    expect(del).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token');
  });

  it('resolves on the route’s own 404: the show is already gone', async () => {
    del.mockRejectedValue(new ApiError(404, 'Event not found'));
    await expect(deleteEvent(getToken, 'evt-1')).resolves.toBeUndefined();
  });

  it('throws any other 404, and a refusal', async () => {
    del.mockRejectedValue(new ApiError(404, 'Not Found'));
    await expect(deleteEvent(getToken, 'evt-1')).rejects.toThrow('Not Found');
    del.mockRejectedValue(refusal('not_manual'));
    await expect(deleteEvent(getToken, 'evt-1')).rejects.toThrow('not_manual');
  });
});

describe('bulkDeleteResultOf', () => {
  it('reads the response, dropping fields the summary doesn’t use', () => {
    expect(
      bulkDeleteResultOf({
        count: 1,
        deletedIds: ['evt-1'],
        skipped: [
          {
            id: 'evt-2',
            reason: 'has_dependents',
            counts: { watchers: 1 },
          },
        ],
        missing: [],
      }),
    ).toEqual({
      count: 1,
      skipped: [{ id: 'evt-2', reason: 'has_dependents' }],
      missing: [],
    });
  });

  it.each([
    ['null', null],
    ['no count', { skipped: [], missing: [] }],
    ['a negative count', { count: -1, skipped: [], missing: [] }],
    ['skipped not a list', { count: 0, skipped: {}, missing: [] }],
    [
      'a skip with no id',
      { count: 0, skipped: [{ reason: 'x' }], missing: [] },
    ],
    ['missing ids not text', { count: 0, skipped: [], missing: [1] }],
  ])('throws on a malformed response (%s)', (_label, value) => {
    expect(() => bulkDeleteResultOf(value)).toThrow();
  });
});

describe('bulkDeleteSummary', () => {
  it('counts each reason, an unknown one under its own line', () => {
    expect(
      bulkDeleteSummary(
        bulkDeleteResultOf({
          count: 2,
          skipped: [
            { id: 'evt-3', reason: 'not_manual' },
            { id: 'evt-4', reason: 'has_dependents' },
            { id: 'evt-5', reason: 'locked_by_merge' },
          ],
          missing: ['evt-6'],
        }),
      ),
    ).toBe(
      'Deleted 2 shows. Skipped 3: 1 crawled, 1 with Watchers, Concerts, Submitted prices or merges, 1 for another reason. 1 show was already gone.',
    );
  });

  it('says nothing was deleted when nothing was', () => {
    expect(bulkDeleteSummary({ count: 0, skipped: [], missing: [] })).toBe(
      'Nothing deleted.',
    );
  });
});
