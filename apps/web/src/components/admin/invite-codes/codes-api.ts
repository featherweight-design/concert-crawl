/**
 * The invite-codes admin's calls, from the browser with the Clerk token, as
 * the artists page makes them. Every payload is checked with a type guard
 * before it's used (the web app carries no Zod), so a shape drift fails into
 * Couldn't load or the save-failed toast rather than drawing bad rows.
 */
import {
  isRole,
  type AdminInviteCode,
  type InviteCode,
  type InviteCodeRedemption,
  type InviteCodeRedemptionsResponse,
  type Role,
} from '@concert-crawl/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = '/v1/admin/invite-codes';
/** How long a call may hang before it fails into Couldn't load or the toast. */
const REQUEST_TIMEOUT_MS = 15_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isRoleOrNull = (value: unknown): value is Role | null =>
  value === null || isRole(value);

export const isInviteCode = (value: unknown): value is InviteCode =>
  isRecord(value) &&
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

export const isAdminInviteCode = (value: unknown): value is AdminInviteCode =>
  isInviteCode(value) &&
  isRecord(value) &&
  isTextOrNull(value['createdByHandle']) &&
  isTextOrNull(value['lastUsedAt']);

const isRedemption = (value: unknown): value is InviteCodeRedemption =>
  isRecord(value) &&
  isText(value['userId']) &&
  isTextOrNull(value['handle']) &&
  isRoleOrNull(value['role']) &&
  isText(value['redeemedAt']);

/** A payload that isn't the route's documented shape. Never shown as text. */
class ShapeError extends Error {}

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

/** The envelope's `data`, unchecked; each caller narrows it with a guard. */
const call = async (
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
    throw new ShapeError(`status ${res.status}`);
  }
  return body['data'];
};

/** One code back from a write. */
const oneCode = async (pending: Promise<unknown>): Promise<InviteCode> => {
  const data = await pending;
  if (!isInviteCode(data)) throw new ShapeError('code');
  return data;
};

export const codesApi = (getToken: GetToken) => ({
  list: async (): Promise<AdminInviteCode[]> => {
    const data = await call(getToken, BASE);
    if (!Array.isArray(data) || !data.every(isAdminInviteCode))
      throw new ShapeError('codes');
    return data;
  },
  /** The People tab's count. */
  peopleTotal: async (): Promise<number> => {
    const data = await call(getToken, '/v1/admin/users?limit=1');
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
    return { data: data['data'], total: data['total'] };
  },
});

export type CodesApi = ReturnType<typeof codesApi>;
