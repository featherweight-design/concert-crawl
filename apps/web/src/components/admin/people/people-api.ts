/**
 * The People list's call (`GET /v1/admin/people`), from the browser with the
 * Clerk token, through the invite-codes admin's `call`. The payload is checked
 * with type guards, so a shape drift fails into Couldn't load.
 */
import { isRole, type PersonJoinSource, type Role } from '@concert-crawl/types';
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
  /** How they came in: a code, a poster, the founder window or a test account. */
  joinSource: PersonJoinSource | null;
}

export interface PeoplePage {
  people: AdminPerson[];
  /** Everyone the filters match, across every page. */
  total: number;
  /**
   * Everyone by role, whatever the filters, test accounts left out (ruling
   * #4); `test` counts the test accounts on their own.
   */
  counts: Record<string, number>;
  /** The API stopped reading accounts at its cap. */
  truncated: boolean;
}

export interface PeopleQuery {
  search: string;
  role?: Role;
  /** An invite code, as written or its id: only the people who joined with it. */
  code?: string;
  /** `only` is the Test accounts chip; left out, test accounts are left out. */
  test?: 'only';
  limit: number;
  offset: number;
}

const JOIN_KINDS = ['code', 'poster', 'member', 'founder', 'test'] as const;

const isJoinKind = (value: unknown): value is PersonJoinSource['kind'] =>
  JOIN_KINDS.some((kind) => kind === value);

/**
 * A row's join source, or null. A kind this build doesn't know (the API may
 * add one) reads as no source, so JOINED falls back to the date rather than
 * the whole list failing into Couldn't load.
 */
export const joinSourceFrom = (value: unknown): PersonJoinSource | null =>
  isRecord(value) &&
  isJoinKind(value['kind']) &&
  isTextOrNull(value['code']) &&
  isTextOrNull(value['label'])
    ? { kind: value['kind'], code: value['code'], label: value['label'] }
    : null;

type PersonRow = Omit<AdminPerson, 'joinSource'> & { joinSource?: unknown };

const isPersonRow = (value: unknown): value is PersonRow =>
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
    if (query.test) params.set('test', query.test);
    const data = await call(getToken, `/v1/admin/people?${params}`);
    if (
      !isRecord(data) ||
      !Array.isArray(data['people']) ||
      !data['people'].every(isPersonRow) ||
      !isCount(data['total']) ||
      !isCounts(data['counts']) ||
      typeof data['truncated'] !== 'boolean'
    )
      throw new Error('people');
    return {
      people: data['people'].map((row) => ({
        ...row,
        joinSource: joinSourceFrom(row.joinSource),
      })),
      total: data['total'],
      counts: data['counts'],
      truncated: data['truncated'],
    };
  },
});

export type PeopleApi = ReturnType<typeof peopleApi>;
