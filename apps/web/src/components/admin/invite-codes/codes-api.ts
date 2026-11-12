/**
 * The invite-codes admin's calls, from the browser with the Clerk token, as
 * the artists page makes them.
 */
import type { AdminInviteCode } from '@concert-crawl/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = '/v1/admin/invite-codes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export type GetToken = () => Promise<string | null>;

const call = async <T>(getToken: GetToken, path: string): Promise<T> => {
  const token = await getToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body: unknown = await res.json().catch(() => null);
  const record = isRecord(body) ? body : {};
  if (!res.ok || record['success'] !== true) {
    const error = record['error'];
    throw new Error(
      typeof error === 'string' ? error : `Request failed (${res.status})`,
    );
  }
  // The envelope's payload is the route's documented shape; the fetch can't
  // check it, so this is the one boundary cast, as in `apiClient`.
  return record['data'] as T;
};

export const codesApi = (getToken: GetToken) => ({
  list: () => call<AdminInviteCode[]>(getToken, BASE),
  /** The People tab's count. */
  peopleTotal: () =>
    call<{ total: number }>(getToken, '/v1/admin/users?limit=1').then(
      (res) => res.total,
    ),
});

export type CodesApi = ReturnType<typeof codesApi>;
