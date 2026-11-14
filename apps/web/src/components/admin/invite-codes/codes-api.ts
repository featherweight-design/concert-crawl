/**
 * The invite-codes admin's calls, from the browser with the Clerk token, as
 * the artists page makes them. Every payload is checked with a type guard
 * before it's used (the web app carries no Zod), so a shape drift fails into
 * Couldn't load or the save-failed toast rather than drawing bad rows.
 */
import {
  AVATAR_COLORS,
  isRole,
  type AdminInviteCode,
  type AvatarColor,
  type InviteCode,
  type InviteCodeRedemption,
  type InviteCodeRedemptionsResponse,
  type Role,
} from '@concert-crawl/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = '/v1/admin/invite-codes';
/** How long a call may hang before it fails into Couldn't load or the toast. */
const REQUEST_TIMEOUT_MS = 15_000;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isText = (value: unknown): value is string =>
  typeof value === 'string';
export const isTextOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';
export const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isRoleOrNull = (value: unknown): value is Role | null =>
  value === null || isRole(value);

const isCodeKind = (value: unknown): value is InviteCode['kind'] =>
  value === 'admin' || value === 'member';

/** A code's kind here: one this build knows, or `unknown` for one it doesn't. */
export type ListedKind = InviteCode['kind'] | 'unknown';

/**
 * A code as this page holds it. Same as the API's type except that a kind this
 * build doesn't know is kept, as `unknown`, rather than failing the list or a
 * write: the page treats it as read-only, as it does a member code.
 */
export type ListedCode = Omit<InviteCode, 'kind'> & { kind: ListedKind };
export type ListedInviteCode = Omit<AdminInviteCode, 'kind'> & {
  kind: ListedKind;
};

/**
 * Fills a code's `kind` before the guard reads it. An API from before member
 * codes sends none, and every code was an admin's then; a string this build
 * doesn't know becomes `unknown`. Anything else (a number, say) is left for
 * the guard to refuse.
 */
const withKind = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const kind = value['kind'];
  if (kind === undefined) return { ...value, kind: 'admin' };
  if (isText(kind) && !isCodeKind(kind)) return { ...value, kind: 'unknown' };
  return value;
};

const isListedKind = (value: unknown): value is ListedKind =>
  isCodeKind(value) || value === 'unknown';

/** The fields every code carries, `kind` aside. */
const hasCodeFields = (value: Record<string, unknown>): boolean =>
  isText(value['id']) &&
  isText(value['code']) &&
  isText(value['createdBy']) &&
  isText(value['createdAt']) &&
  isTextOrNull(value['usedBy']) &&
  isTextOrNull(value['usedAt']) &&
  isTextOrNull(value['expiresAt']) &&
  isTextOrNull(value['revokedAt']) &&
  isTextOrNull(value['revokedBy']) &&
  isTextOrNull(value['label']) &&
  isCount(value['maxUses']) &&
  isCount(value['useCount']);

const isListedCodeShape = (value: unknown): value is ListedCode =>
  isRecord(value) && isListedKind(value['kind']) && hasCodeFields(value);

const isListedInviteCodeShape = (value: unknown): value is ListedInviteCode =>
  isRecord(value) &&
  isTextOrNull(value['createdByHandle']) &&
  isTextOrNull(value['lastUsedAt']) &&
  isListedCodeShape(value);

/**
 * One code from the API: a missing `kind` reads as admin, one this build
 * doesn't know as `unknown`. Null if malformed.
 */
export const inviteCodeFrom = (value: unknown): ListedCode | null => {
  const code = withKind(value);
  return isListedCodeShape(code) ? code : null;
};

/** One list row from the API, as `inviteCodeFrom`; null if malformed. */
export const adminInviteCodeFrom = (
  value: unknown,
): ListedInviteCode | null => {
  const code = withKind(value);
  return isListedInviteCodeShape(code) ? code : null;
};

/**
 * Is this an admin's code, so Edit, Add seats and Reactivate apply? A member's
 * share code and a kind this build doesn't know are read-only here.
 */
export const isAdminCode = (
  code: ListedInviteCode,
): code is ListedInviteCode & AdminInviteCode & { kind: 'admin' } =>
  code.kind === 'admin';

/**
 * A person's avatar colour as the API sends it. Read leniently: a payload
 * from before the colours existed, or a token this build doesn't know, reads
 * as "not chosen" (the house signal-to-accent pair) instead of failing the page.
 */
export const avatarColorOrNull = (value: unknown): AvatarColor | null =>
  AVATAR_COLORS.find((color) => color === value) ?? null;

type RedemptionRow = Omit<
  InviteCodeRedemption,
  'avatarColor' | 'avatarSecondColor'
> & { avatarColor?: unknown; avatarSecondColor?: unknown };

const isRedemption = (value: unknown): value is RedemptionRow =>
  isRecord(value) &&
  isText(value['userId']) &&
  isTextOrNull(value['handle']) &&
  isRoleOrNull(value['role']) &&
  isText(value['redeemedAt']);

/** A payload that isn't the route's documented shape. Never shown as text. */
class ShapeError extends Error {
  constructor(
    message: string,
    /** The HTTP status when the API refused, so a caller can tell a 403 or 404. */
    public readonly status: number | null = null,
  ) {
    super(message);
  }
}

/** The status a failed `call` was refused with, or null when there wasn't one. */
export const refusedStatus = (err: unknown): number | null =>
  err instanceof ShapeError ? err.status : null;

/** A taken custom code: the 409 carries a free suggestion (`12/code-taken-d`). */
export class CodeTakenError extends Error {
  constructor(
    public readonly code: string,
    /** Null when the API found no free variant to offer. */
    public readonly suggestion: string | null,
  ) {
    super('code_taken');
    this.name = 'CodeTakenError';
  }
}

export interface CodeEdit {
  label?: string | null;
  maxUses?: number;
  expiresAt?: string | null;
}

export interface NewCode {
  label?: string;
  maxUses: number;
  expiresAt?: string;
  code?: string;
}

export type GetToken = () => Promise<string | null>;

/**
 * The envelope's `data`, unchecked; each caller narrows it with a guard. The
 * People list (`../people/people-api`) makes its calls through it too.
 */
export const call = async (
  getToken: GetToken,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<unknown> => {
  const token = await getToken();
  if (!token) throw new ShapeError('no token');
  const hasBody = init.body !== undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
    // A hung request must not trap the admin in a pending confirm.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body: unknown = await res.json().catch(() => null);
  if (
    res.status === 409 &&
    isRecord(body) &&
    body['error'] === 'code_taken' &&
    isText(body['code']) &&
    isTextOrNull(body['suggestion'])
  ) {
    throw new CodeTakenError(body['code'], body['suggestion']);
  }
  if (!res.ok || !isRecord(body) || body['success'] !== true) {
    throw new ShapeError(`status ${res.status}`, res.status);
  }
  return body['data'];
};

/** One code back from a write. */
const oneCode = async (pending: Promise<unknown>): Promise<ListedCode> => {
  const code = inviteCodeFrom(await pending);
  if (!code) throw new ShapeError('code');
  return code;
};

export const codesApi = (getToken: GetToken) => ({
  list: async (): Promise<ListedInviteCode[]> => {
    const data = await call(getToken, BASE);
    if (!Array.isArray(data)) throw new ShapeError('codes');
    const codes = data.map(adminInviteCodeFrom);
    // A malformed row fails the whole list into Couldn't load. An unknown
    // kind is not malformed: it is kept, as `unknown`, and drawn read-only.
    if (!codes.every((code): code is ListedInviteCode => code !== null))
      throw new ShapeError('codes');
    return codes;
  },
  /** The People tab's count, as the People list counts everyone. */
  peopleTotal: async (): Promise<number> => {
    const data = await call(getToken, '/v1/admin/people?limit=1');
    if (!isRecord(data) || !isCount(data['total']))
      throw new ShapeError('total');
    return data['total'];
  },
  create: (body: NewCode) =>
    oneCode(call(getToken, BASE, { method: 'POST', body })),
  edit: (id: string, body: CodeEdit) =>
    oneCode(call(getToken, `${BASE}/${id}`, { method: 'PATCH', body })),
  revoke: (id: string) =>
    oneCode(call(getToken, `${BASE}/${id}/revoke`, { method: 'POST' })),
  reactivate: (id: string, expiresAt: string | null | undefined) =>
    oneCode(
      call(getToken, `${BASE}/${id}/reactivate`, {
        method: 'POST',
        body: expiresAt === undefined ? {} : { expiresAt },
      }),
    ),
  redemptions: async (id: string): Promise<InviteCodeRedemptionsResponse> => {
    const data = await call(getToken, `${BASE}/${id}/redemptions?limit=5`);
    if (
      !isRecord(data) ||
      !isCount(data['total']) ||
      !Array.isArray(data['data']) ||
      !data['data'].every(isRedemption)
    )
      throw new ShapeError('redemptions');
    return {
      data: data['data'].map((row) => ({
        ...row,
        avatarColor: avatarColorOrNull(row.avatarColor),
        avatarSecondColor: avatarColorOrNull(row.avatarSecondColor),
      })),
      total: data['total'],
    };
  },
});

export type CodesApi = ReturnType<typeof codesApi>;
