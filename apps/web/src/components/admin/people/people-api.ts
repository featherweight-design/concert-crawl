/**
 * The People list's call (`GET /v1/admin/people`), from the browser with the
 * Clerk token, through the invite-codes admin's `call`. The payload is checked
 * with type guards, so a shape drift fails into Couldn't load.
 */
import { isRole, type Role } from '@concert-crawl/types';
import {
  call,
  isCount,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';

export interface AdminPerson {
  id: string;
  handle: string | null;
  emailMasked: string;
  role: Role;
  createdAt: string | null;
  lastActiveAt: string | null;
  watching: number;
  isTestAccount: boolean;
}

export interface PeoplePage {
  people: AdminPerson[];
  /** Everyone the filters match, across every page. */
  total: number;
  /** Everyone by role, whatever the filters. */
  counts: Record<string, number>;
  /** The API stopped reading accounts at its cap. */
  truncated: boolean;
}

export interface PeopleQuery {
  search: string;
  role?: Role;
  /** An invite code's id: only the people who joined with it. */
  code?: string;
  limit: number;
  offset: number;
}

const isPerson = (value: unknown): value is AdminPerson =>
  isRecord(value) &&
  isText(value['id']) &&
  isTextOrNull(value['handle']) &&
  isText(value['emailMasked']) &&
  isRole(value['role']) &&
  isTextOrNull(value['createdAt']) &&
  isTextOrNull(value['lastActiveAt']) &&
  isCount(value['watching']) &&
  typeof value['isTestAccount'] === 'boolean';

const isCounts = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every(isCount);

export const peopleApi = (getToken: GetToken) => ({
  list: async (query: PeopleQuery): Promise<PeoplePage> => {
    const params = new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    });
    if (query.search) params.set('search', query.search);
    if (query.role) params.set('role', query.role);
    if (query.code) params.set('code', query.code);
    const data = await call(getToken, `/v1/admin/people?${params}`);
    if (
      !isRecord(data) ||
      !Array.isArray(data['people']) ||
      !data['people'].every(isPerson) ||
      !isCount(data['total']) ||
      !isCounts(data['counts']) ||
      typeof data['truncated'] !== 'boolean'
    )
      throw new Error('people');
    return {
      people: data['people'],
      total: data['total'],
      counts: data['counts'],
      truncated: data['truncated'],
    };
  },
});

export type PeopleApi = ReturnType<typeof peopleApi>;
