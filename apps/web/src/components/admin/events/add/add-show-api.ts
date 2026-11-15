/**
 * Add a show's calls (4b-3), from the browser with the admin's token:
 * `POST /v1/admin/events`, the warning's `GET /v1/admin/events/duplicate`, the
 * venue list and the artist search. Every payload is checked with Zod at this
 * boundary, so a shape drift fails as a failed call, never as a bad field.
 */
import { z } from 'zod';
import { adminFetch } from '@/lib/api';
import type { GetToken } from '../../invite-codes/codes-api';
import {
  ADD_SHOW_ERROR_CODES,
  type AddShowErrorCode,
} from '@concert-crawl/types';
import type { AddShowBody } from './add-show-rules';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
/** A hung request must not leave Add show spinning (rule 10). */
const REQUEST_TIMEOUT_MS = 20_000;

const envelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

const venueSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  active: z.boolean(),
});
export type PickVenue = z.infer<typeof venueSchema>;

const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  matchStatus: z.string(),
});
export type ArtistSuggestion = { id: string; name: string };

const duplicateSchema = z.object({
  id: z.string(),
  title: z.string(),
  showTime: z.string().nullable(),
  manual: z.boolean(),
  hidden: z.boolean(),
});
export type DuplicateShow = z.infer<typeof duplicateSchema>;

const codeSchema = z.enum(ADD_SHOW_ERROR_CODES);
const issueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});
const invalidSchema = z.object({
  success: z.literal(false),
  error: z.object({ issues: z.array(issueSchema) }),
});
const duplicateShowSchema = z.object({
  success: z.literal(false),
  error: z.literal('duplicate_show'),
  existingId: z.string(),
});

/** A field the API refused, by the top-level body key it names. */
export interface FieldIssue {
  field: string;
  code: AddShowErrorCode;
}

/**
 * The create's outcomes. `invalid` with no issues is a refusal the form can't
 * pin on a field (an id the API's own schema rejected, say): a form-level
 * error. `timeout` means the request was cut off at REQUEST_TIMEOUT_MS, so
 * the server may still have saved the show: see `findCreated`.
 */
export type CreateResult =
  | { kind: 'created'; id: string }
  | { kind: 'invalid'; issues: FieldIssue[] }
  | { kind: 'duplicate'; existingId: string }
  | { kind: 'timeout' };

/** A call cut off by REQUEST_TIMEOUT_MS, as opposed to the caller's abort. */
export class AddShowTimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'AddShowTimeoutError';
  }
}

/** `HH:MM` and `HH:MM:SS` compare as the same time, as the API's do. */
const timeKey = (value: string | null): string | null =>
  value === null ? null : value.padEnd(8, ':00');

const send = async (
  getToken: GetToken,
  path: string,
  init: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<{ status: number; body: unknown }> => {
  const token = await getToken();
  if (!token) throw new Error('no token');
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    const res = await adminFetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal:
        init.signal && typeof AbortSignal.any === 'function'
          ? AbortSignal.any([init.signal, timeout])
          : (init.signal ?? timeout),
    });
    const body: unknown = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (err) {
    // Only our own clock: the caller's abort (a newer keystroke) stays as is.
    if (timeout.aborted && !init.signal?.aborted)
      throw new AddShowTimeoutError();
    throw err;
  }
};

/** The data of a successful read, or a throw. */
const read = async <T extends z.ZodType>(
  pending: Promise<{ status: number; body: unknown }>,
  data: T,
): Promise<z.infer<T>> => {
  const { status, body } = await pending;
  const envelope = envelopeSchema.safeParse(body);
  const parsed = envelope.success ? data.safeParse(envelope.data.data) : null;
  if (status >= 400 || !parsed?.success) throw new Error(`status ${status}`);
  return parsed.data;
};

/** Issues whose message is a known code, keyed by the body field they name. */
export const fieldIssuesOf = (
  issues: readonly z.infer<typeof issueSchema>[],
): FieldIssue[] =>
  issues.flatMap((issue) => {
    const code = codeSchema.safeParse(issue.message);
    const [field] = issue.path;
    return code.success && typeof field === 'string'
      ? [{ field, code: code.data }]
      : [];
  });

interface DuplicateParams {
  venueId: string;
  date: string;
  title: string;
}

const readDuplicates = async (
  getToken: GetToken,
  params: DuplicateParams,
  signal?: AbortSignal,
): Promise<DuplicateShow[]> => {
  const query = new URLSearchParams({ ...params });
  const data = await read(
    send(getToken, `/v1/admin/events/duplicate?${query.toString()}`, {
      signal,
    }),
    z.object({ duplicates: z.array(duplicateSchema) }),
  );
  return data.duplicates;
};

export const addShowApi = (getToken: GetToken) => ({
  /** Every venue not taken down, by name; hidden ones carry `active: false`. */
  venues: (): Promise<PickVenue[]> =>
    read(send(getToken, '/v1/admin/venues'), z.array(venueSchema)),

  /** Artists whose name holds `search`, for the lineup's suggestions. */
  artists: async (
    search: string,
    signal?: AbortSignal,
  ): Promise<ArtistSuggestion[]> => {
    // A blank search would list the first six artists, which suggests nothing.
    if (search.trim() === '') return [];
    const query = new URLSearchParams({
      search,
      limit: '6',
      upcoming: 'false',
    });
    const rows = await read(
      send(getToken, `/v1/admin/artists?${query.toString()}`, { signal }),
      z.array(artistSchema),
    );
    return rows
      .filter((row) => row.matchStatus !== 'not_an_artist')
      .map(({ id, name }) => ({ id, name }));
  },

  /** Shows already at the venue that night, the likeliest first. */
  duplicates: (
    params: DuplicateParams,
    signal?: AbortSignal,
  ): Promise<DuplicateShow[]> => readDuplicates(getToken, params, signal),

  /**
   * The create. A refusal, the exact-key 409 and a timeout come back as
   * results; anything else (offline, a 500, a drifted reply) throws for Save
   * failed. On `timeout` the POST may still have committed, so the form must
   * not offer a plain retry (it would 409 and the show would look lost): it
   * calls `findCreated(body)` first and opens the show when that finds it,
   * and only shows Save failed with a retry when it comes back null.
   */
  create: async (body: AddShowBody): Promise<CreateResult> => {
    let sent: { status: number; body: unknown };
    try {
      sent = await send(getToken, '/v1/admin/events', {
        method: 'POST',
        body,
      });
    } catch (err) {
      if (err instanceof AddShowTimeoutError) return { kind: 'timeout' };
      throw err;
    }
    const { status, body: reply } = sent;
    if (status === 400) {
      const invalid = invalidSchema.safeParse(reply);
      // Issues with no known code still refuse the body: a form-level error.
      if (invalid.success)
        return {
          kind: 'invalid',
          issues: fieldIssuesOf(invalid.data.error.issues),
        };
    }
    if (status === 409) {
      const dup = duplicateShowSchema.safeParse(reply);
      if (dup.success)
        return { kind: 'duplicate', existingId: dup.data.existingId };
    }
    const envelope = envelopeSchema.safeParse(reply);
    const created = z
      .object({ id: z.string() })
      .safeParse(envelope.success ? envelope.data.data : null);
    if (status !== 201 || !created.success) throw new Error(`status ${status}`);
    return { kind: 'created', id: created.data.id };
  },

  /**
   * After a `timeout` from `create`, the show that POST may have saved: the
   * id of the one show added by hand at that venue that night with exactly
   * this title and show time, read through the duplicate warning's call.
   * Null when there is none (the save never landed: offer the retry) or more
   * than one (ambiguous: leave it to the duplicate warning). Throws when the
   * read itself fails, for Save failed.
   */
  findCreated: async (
    body: AddShowBody,
    signal?: AbortSignal,
  ): Promise<string | null> => {
    const rows = await readDuplicates(
      getToken,
      { venueId: body.venueId, date: body.date, title: body.title },
      signal,
    );
    const exact = rows.filter(
      (row) =>
        row.manual &&
        row.title === body.title &&
        timeKey(row.showTime) === timeKey(body.showTime),
    );
    return exact.length === 1 && exact[0] ? exact[0].id : null;
  },
});

export type AddShowApi = ReturnType<typeof addShowApi>;
