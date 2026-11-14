import { z } from 'zod';

/**
 * `GET /v1/admin/crawl/batches`, checked at the boundary, keeping only the
 * fields the batch list reads. The paging fields ride beside `data`, so this
 * reads the whole body rather than through `apiClient`, which unwraps `data`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
/** How long the list may hang before it fails into Couldn't load. */
const REQUEST_TIMEOUT_MS = 15_000;

const countsSchema = z.object({
  ok: z.number(),
  notOk: z.number(),
  unchanged: z.number(),
  skipped: z.number(),
  total: z.number(),
  failed: z.number(),
  blocked: z.number(),
});

const batchSchema = z.object({
  key: z.string(),
  kind: z.enum(['nightly', 'by_hand']),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  night: z.string().nullable(),
  venueCount: z.number(),
  counts: countsSchema,
  eventsFound: z.number(),
  pending: z.number(),
  didntStart: z.boolean(),
  costUsd: z.number(),
  linkKey: z.string(),
  crawlAll: z.boolean(),
  venueName: z.string().nullable(),
  actorHandle: z.string().nullable(),
  retry: z.object({ at: z.string() }).nullable(),
});
export type BatchRow = z.infer<typeof batchSchema>;

const pageSchema = z.object({
  success: z.literal(true),
  data: z.array(z.unknown()),
  hasMore: z.boolean(),
  nextBefore: z.string().nullable(),
});

export interface BatchPage {
  rows: BatchRow[];
  hasMore: boolean;
  nextBefore: string | null;
}

/**
 * A page, or null when the body isn't one. A row this build can't read is
 * dropped on its own; the cursor is the API's, so a dropped row never moves it.
 * More pages need both the flag and a cursor.
 */
export const parseBatchPage = (raw: unknown): BatchPage | null => {
  const page = pageSchema.safeParse(raw);
  if (!page.success) return null;
  const rows = page.data.data.flatMap((row) => {
    const parsed = batchSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  const { hasMore, nextBefore } = page.data;
  return {
    rows,
    hasMore: hasMore && nextBefore !== null,
    nextBefore: hasMore ? nextBefore : null,
  };
};

/** The list's filter, as the API names it. */
export const BATCH_FILTERS = ['all', 'nightly', 'by_hand', 'not_ok'] as const;
export type BatchFilter = (typeof BATCH_FILTERS)[number];

/** The query for one page: the filter, the page size, and the cursor if any. */
export const batchesPath = (
  filter: BatchFilter,
  limit: number,
  before: string | null,
): string => {
  const query = new URLSearchParams({ kind: filter, limit: String(limit) });
  if (before !== null) query.set('before', before);
  return `/v1/admin/crawl/batches?${query.toString()}`;
};

export const fetchBatchPage = async (
  getToken: () => Promise<string | null>,
  path: string,
): Promise<BatchPage> => {
  const token = await getToken();
  if (!token) throw new Error('No session token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body: unknown = await res.json().catch(() => null);
  const page = res.ok ? parseBatchPage(body) : null;
  if (page === null) throw new Error(`crawl batches: status ${res.status}`);
  return page;
};
