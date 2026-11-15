/**
 * The admin event Delete (E5-b): the DELETE call and the words for its
 * refusals, shared by the Events row ⋯, Event edit's ⋯, the Review page and
 * the legacy editor so all four say the same thing. The guard is the API's
 * (`apps/api/src/routes/admin/lib/event-delete.ts`): a crawled show is 409
 * `not_manual`, a show something depends on is 409 `has_dependents` with
 * the counts.
 */
import { z } from 'zod';
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

/**
 * POST /v1/admin/events/bulk/delete's `data`. A skip's `reason` stays any
 * string: one this build doesn't know is still a skipped row, and the summary
 * counts it under a generic line rather than dropping it.
 */
const bulkDeleteSchema = z.object({
  count: z.number().int().nonnegative(),
  skipped: z.array(z.object({ id: z.string(), reason: z.string() })),
  missing: z.array(z.string()),
});

export type BulkDeleteResult = z.infer<typeof bulkDeleteSchema>;

/**
 * The bulk response, checked. A malformed one throws, so the caller shows its
 * generic failure rather than a summary the API never sent.
 */
export const bulkDeleteResultOf = (value: unknown): BulkDeleteResult => {
  const parsed = bulkDeleteSchema.safeParse(value);
  if (!parsed.success) {
    console.warn('bulkDeleteResultOf: malformed response', {
      issues: parsed.error.issues,
    });
    throw new Error('bulk delete: malformed response');
  }
  return parsed.data;
};

/** "Deleted 3 shows. Skipped 2: 1 crawled, 1 with Watchers…" */
export const bulkDeleteSummary = (result: BulkDeleteResult): string => {
  const bulk = COPY.bulk;
  const counted = (reason: string) =>
    result.skipped.filter((entry) => entry.reason === reason).length;
  const notManual = counted('not_manual');
  const dependents = counted('has_dependents');
  const other = result.skipped.length - notManual - dependents;
  const reasons = [
    ...(notManual > 0 ? [bulk.notManual(notManual)] : []),
    ...(dependents > 0 ? [bulk.hasDependents(dependents)] : []),
    ...(other > 0 ? [bulk.other(other)] : []),
  ];
  return [
    bulk.deleted(result.count),
    ...(reasons.length > 0
      ? [bulk.skipped(result.skipped.length, reasons)]
      : []),
    ...(result.missing.length > 0 ? [bulk.missing(result.missing.length)] : []),
  ].join(' ');
};
