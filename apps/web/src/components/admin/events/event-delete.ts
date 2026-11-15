/**
 * The admin event Delete (E5-b): the DELETE call and the words for its
 * refusals, shared by the Events row ⋯, Event edit's ⋯, the Review page and
 * the legacy editor so all four say the same thing. The guard is the API's
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

/** DELETE /v1/admin/events/:id. Throws the ApiError, refusals included. */
export const deleteEvent = async (
  getToken: () => Promise<string | null>,
  id: string,
): Promise<void> => {
  const token = await getToken();
  if (!token) throw new ApiError(401, 'Unauthorized');
  await apiClient.delete(`/v1/admin/events/${encodeURIComponent(id)}`, token);
};

export type BulkSkipReason = 'not_manual' | 'has_dependents';

/** POST /v1/admin/events/bulk/delete's `data`, narrowed. */
export interface BulkDeleteResult {
  count: number;
  skipped: { id: string; reason: BulkSkipReason }[];
  missing: string[];
}

/**
 * Narrows the bulk response. A malformed one reads as nothing skipped, with
 * the count it carries (0 when even that is missing), so the summary never
 * claims a refusal the API didn't send.
 */
export const bulkDeleteResultOf = (value: unknown): BulkDeleteResult => {
  const record = isRecord(value) ? value : {};
  const count = isCount(record['count']) ? record['count'] : 0;
  const skippedRaw = Array.isArray(record['skipped']) ? record['skipped'] : [];
  const skipped = skippedRaw.flatMap(
    (entry: unknown): BulkDeleteResult['skipped'] => {
      if (!isRecord(entry) || typeof entry['id'] !== 'string') return [];
      const id = entry['id'];
      const reason = entry['reason'];
      if (reason === 'not_manual') return [{ id, reason }];
      if (reason === 'has_dependents') return [{ id, reason }];
      return [];
    },
  );
  const missingRaw = Array.isArray(record['missing']) ? record['missing'] : [];
  const missing = missingRaw.filter(
    (id: unknown): id is string => typeof id === 'string',
  );
  return { count, skipped, missing };
};

/** "Deleted 3 shows. Skipped 2: 1 crawled, 1 with Watchers…" */
export const bulkDeleteSummary = (result: BulkDeleteResult): string => {
  const bulk = COPY.bulk;
  const notManual = result.skipped.filter(
    (entry) => entry.reason === 'not_manual',
  ).length;
  const dependents = result.skipped.length - notManual;
  const reasons = [
    ...(notManual > 0 ? [bulk.notManual(notManual)] : []),
    ...(dependents > 0 ? [bulk.hasDependents(dependents)] : []),
  ];
  return [
    bulk.deleted(result.count),
    ...(reasons.length > 0
      ? [bulk.skipped(result.skipped.length, reasons)]
      : []),
    ...(result.missing.length > 0 ? [bulk.missing(result.missing.length)] : []),
  ].join(' ');
};
