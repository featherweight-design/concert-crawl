/**
 * The invite-codes admin's calls, from the browser with the Clerk token, as
 * the artists page makes them. Every payload is checked with a type guard
 * before it's used (the web app carries no Zod), so a shape drift fails into
 * Couldn't load rather than drawing bad rows.
 */
import type { AdminInviteCode } from '@concert-crawl/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = '/v1/admin/invite-codes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isAdminInviteCode = (value: unknown): value is AdminInviteCode =>
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
  isTextOrNull(value['createdByHandle']) &&
  isTextOrNull(value['lastUsedAt']) &&
  isCount(value['maxUses']) &&
  isCount(value['useCount']);

/** A payload that isn't the route's documented shape. Never shown as text. */
class ShapeError extends Error {}

export type GetToken = () => Promise<string | null>;

/** The envelope's `data`, unchecked; each caller narrows it with a guard. */
const call = async (getToken: GetToken, path: string): Promise<unknown> => {
  const token = await getToken();
  if (!token) throw new ShapeError('no token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(body) || body['success'] !== true) {
    throw new ShapeError(`status ${res.status}`);
  }
  return body['data'];
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
});

export type CodesApi = ReturnType<typeof codesApi>;
