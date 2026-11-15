/**
 * The admin event Delete (E5-b): the DELETE call and the words for its
 * refusals, shared by the Events row ⋯, Event edit's ⋯ and the legacy editor
 * so all three say the same thing. The guard is the API's
 * (`apps/api/src/routes/admin/lib/event-delete.ts`): a crawled show is 409
 * `not_manual`, a show something depends on is 409 `has_dependents` with
 * the counts.
 */
import { ApiError, apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.eventDelete;

export interface EventDependentCounts {
  watchers: number;
  concerts: number;
  submittedPrices: number;
  redirects: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** The four counts, any one missing or malformed read as 0. */
export const dependentCountsOf = (value: unknown): EventDependentCounts => {
  const record = isRecord(value) ? value : {};
  const countOf = (key: keyof EventDependentCounts) => {
    const count = record[key];
    return isCount(count) ? count : 0;
  };
  return {
    watchers: countOf('watchers'),
    concerts: countOf('concerts'),
    submittedPrices: countOf('submittedPrices'),
    redirects: countOf('redirects'),
  };
};

/**
 * The sentence for DELETE /v1/admin/events/:id's two 409s, or null for any
 * other failure, so a caller never shows the raw code.
 */
export const deleteRefusalMessage = (err: unknown): string | null => {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  if (err.message === 'not_manual') return COPY.notManual;
  if (err.message === 'has_dependents') {
    const body = isRecord(err.body) ? err.body : {};
    return COPY.hasDependents(dependentCountsOf(body['counts']));
  }
  return null;
};

/** The route's own 404: the show is already gone, which is what was asked. */
export const isEventAlreadyGone = (err: unknown): boolean =>
  err instanceof ApiError &&
  err.status === 404 &&
  err.message === 'Event not found';

/**
 * DELETE /v1/admin/events/:id. The route's own 404 (another tab or a double
 * submit got there first) resolves, since the show is gone as asked; any
 * other failure throws its ApiError, refusals included.
 */
export const deleteEvent = async (
  getToken: () => Promise<string | null>,
  id: string,
): Promise<void> => {
  const token = await getToken();
  if (!token) throw new ApiError(401, 'Unauthorized');
  try {
    await apiClient.delete(`/v1/admin/events/${encodeURIComponent(id)}`, token);
  } catch (err: unknown) {
    if (isEventAlreadyGone(err)) {
      console.info('deleteEvent: already gone', { id });
      return;
    }
    throw err;
  }
};
