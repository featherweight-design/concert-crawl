/**
 * The merge panel's two reads (admin 4b E4): the pick list,
 * `GET /v1/admin/events/:id/merge-candidates`, and the compare step,
 * `GET /v1/admin/events/:id/merge-preview?source=` (`:id` is the row KEPT).
 * Every payload is checked with Zod at this boundary, so a shape drift fails
 * as a failed call, never as a wrong number on a destructive screen. The
 * write is E4-c's.
 */
import { z } from 'zod';
import { adminFetch } from '@/lib/api';
import { anySignal, type GetToken } from '../../invite-codes/codes-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
/** A hung request must not leave the panel spinning. */
const REQUEST_TIMEOUT_MS = 20_000;

const sourceSchema = z.enum(['manual', 'crawled']);

/** The admin who added a hand-added listing; null for a crawled row, or an admin with no handle. */
const addedBySchema = z.object({ handle: z.string() }).nullable();

const candidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  showTime: z.string().nullable(),
  manual: z.boolean(),
  hidden: z.boolean(),
  source: sourceSchema,
  addedBy: addedBySchema,
  watchers: z.number(),
  /** One night by the crawl's own rule, so the pick list leads with it. */
  likely: z.boolean(),
});
export type MergeCandidate = z.infer<typeof candidateSchema>;

const lineupItemSchema = z.object({
  name: z.string(),
  role: z.enum(['headliner', 'support']),
  position: z.number(),
  artistId: z.string().nullable(),
  slug: z.string().nullable(),
  unsure: z.boolean(),
});
export type MergeLineupItem = z.infer<typeof lineupItemSchema>;

const priceSchema = z.object({
  min: z.string().nullable(),
  max: z.string().nullable(),
});
export type MergePrice = z.infer<typeof priceSchema>;

const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  showTime: z.string().nullable(),
  venueId: z.string().nullable(),
  venueName: z.string().nullable(),
  source: sourceSchema,
  manual: z.boolean(),
  createdBy: z.string().nullable(),
  addedBy: addedBySchema,
  hidden: z.boolean(),
  status: z.string(),
  lineup: z.array(lineupItemSchema),
  price: priceSchema,
  watchers: z.number(),
  concerts: z.number(),
  submittedPrices: z.number(),
  reports: z.object({
    total: z.number(),
    /** Open event reports by kind (4b#16): artist reports never move. */
    byKind: z.record(z.string(), z.number()),
  }),
});
export type MergeListing = z.infer<typeof listingSchema>;

const previewSchema = z.object({
  keptId: z.string(),
  sourceId: z.string(),
  move: z.boolean(),
  kept: listingSchema,
  other: listingSchema,
  sameVenue: z.boolean(),
  sameDay: z.boolean(),
  sameNight: z.boolean(),
  after: z.object({ watchers: z.number(), price: priceSchema }),
  /** Blank fields the kept row takes from the other. */
  fills: z.array(z.string()),
  /** Blank fields the merge leaves blank. */
  skipped: z.array(z.string()),
});
export type MergePreview = z.infer<typeof previewSchema>;

const envelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});
const refusalSchema = z.object({
  success: z.literal(false),
  error: z.literal('not_mergeable'),
  reason: z.string(),
});

/** Why the API will not merge these two, as its 409 names it. */
export type NotMergeable = 'same_id' | 'past_mismatch' | 'other';

export type PreviewResult =
  | { kind: 'preview'; preview: MergePreview }
  | { kind: 'not-mergeable'; reason: NotMergeable }
  | { kind: 'not-found' };

/** A call cut off by REQUEST_TIMEOUT_MS, as opposed to the caller's abort. */
export class MergeTimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'MergeTimeoutError';
  }
}

const send = async (
  getToken: GetToken,
  path: string,
  init: { signal?: AbortSignal | undefined; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> => {
  const { signal, body: payload } = init;
  const token = await getToken();
  if (!token) throw new Error('no token');
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    const res = await adminFetch(`${API_BASE}${path}`, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      signal: signal ? anySignal([signal, timeout]) : timeout,
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch (err) {
      if (timeout.aborted || signal?.aborted) throw err;
    }
    return { status: res.status, body };
  } catch (err) {
    // Only our own clock is a timeout: the caller's abort stays as it is.
    if (timeout.aborted && !signal?.aborted) throw new MergeTimeoutError();
    throw err;
  }
};

const dataOf = <T extends z.ZodType>(
  reply: { status: number; body: unknown },
  data: T,
): z.infer<T> => {
  const envelope = envelopeSchema.safeParse(reply.body);
  const parsed = envelope.success ? data.safeParse(envelope.data.data) : null;
  if (reply.status >= 400 || !parsed?.success) {
    throw new Error(`status ${reply.status}`);
  }
  return parsed.data;
};

/** The reason a 409 carries, or `other` when it names none we know. */
const reasonOf = (body: unknown): NotMergeable => {
  const refusal = refusalSchema.safeParse(body);
  if (!refusal.success) return 'other';
  const { reason } = refusal.data;
  return reason === 'same_id' || reason === 'past_mismatch' ? reason : 'other';
};

export const mergeApi = (getToken: GetToken) => ({
  /** The other live listings at this venue on this date, likeliest first. */
  candidates: async (
    id: string,
    signal?: AbortSignal,
  ): Promise<MergeCandidate[]> =>
    dataOf(
      await send(
        getToken,
        `/v1/admin/events/${encodeURIComponent(id)}/merge-candidates`,
        { signal },
      ),
      z.object({ candidates: z.array(candidateSchema) }),
    ).candidates,

  /** What keeping `keptId` and merging `sourceId` into it would do. */
  preview: async (
    keptId: string,
    sourceId: string,
    signal?: AbortSignal,
  ): Promise<PreviewResult> => {
    const query = new URLSearchParams({ source: sourceId });
    const reply = await send(
      getToken,
      `/v1/admin/events/${encodeURIComponent(keptId)}/merge-preview?${query.toString()}`,
      { signal },
    );
    if (reply.status === 404) return { kind: 'not-found' };
    if (reply.status === 409) {
      return { kind: 'not-mergeable', reason: reasonOf(reply.body) };
    }
    return { kind: 'preview', preview: dataOf(reply, previewSchema) };
  },

  /**
   * Merge `sourceId` into `targetId`: the source is deleted, its Watchers,
   * prices and reports move to the target. Always silent (`notifyWatchers`
   * false: a de-duplication tells nobody) and never a relocation. A refusal
   * (past_mismatch, time_taken, a row gone) is `refused`; a transport
   * failure or a timeout throws.
   */
  merge: async (
    sourceId: string,
    targetId: string,
  ): Promise<'merged' | 'refused'> => {
    const reply = await send(
      getToken,
      `/v1/admin/events/${encodeURIComponent(sourceId)}/merge`,
      { body: { targetId, notifyWatchers: false } },
    );
    return reply.status >= 200 && reply.status < 300 ? 'merged' : 'refused';
  },
});
