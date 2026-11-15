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
  type AddShowBody,
  type AddShowErrorCode,
} from './add-show-rules';

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

export type CreateResult =
  | { kind: 'created'; id: string }
  | { kind: 'invalid'; issues: FieldIssue[] }
  | { kind: 'duplicate'; existingId: string };

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

export const addShowApi = (getToken: GetToken) => ({
  /** Every venue not taken down, by name; hidden ones carry `active: false`. */
  venues: (): Promise<PickVenue[]> =>
    read(send(getToken, '/v1/admin/venues'), z.array(venueSchema)),

  /** Artists whose name holds `search`, for the lineup's suggestions. */
  artists: async (
    search: string,
    signal?: AbortSignal,
  ): Promise<ArtistSuggestion[]> => {
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
  duplicates: async (
    params: { venueId: string; date: string; title: string },
    signal?: AbortSignal,
  ): Promise<DuplicateShow[]> => {
    const query = new URLSearchParams(params);
    const data = await read(
      send(getToken, `/v1/admin/events/duplicate?${query.toString()}`, {
        signal,
      }),
      z.object({ duplicates: z.array(duplicateSchema) }),
    );
    return data.duplicates;
  },

  /**
   * The create. A field refusal and the exact-key 409 come back as results;
   * anything else (offline, a 500, a drifted reply) throws for Save failed.
   */
  create: async (body: AddShowBody): Promise<CreateResult> => {
    const { status, body: reply } = await send(getToken, '/v1/admin/events', {
      method: 'POST',
      body,
    });
    if (status === 400) {
      const invalid = invalidSchema.safeParse(reply);
      const issues = invalid.success
        ? fieldIssuesOf(invalid.data.error.issues)
        : [];
      if (issues.length > 0) return { kind: 'invalid', issues };
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
});

export type AddShowApi = ReturnType<typeof addShowApi>;
