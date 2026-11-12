/**
 * The People list's pure rules (5a): what a row says, which chip asks the API
 * what, and where a person opens.
 */
import type { Role } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { StatusKind } from '@/components/admin/primitives';
import { DENVER_TIME_ZONE } from '@/lib/time';
import { shortDate } from '../invite-codes/code-rules';
import type {
  AdminPerson,
  PeopleApi,
  PeoplePage,
  PeopleQuery,
} from './people-api';

const COPY = ADMIN_COPY.peoplePage;

/** Rows per page; the API's most. */
export const PAGE_SIZE = 100;

export const CHIPS = ['everyone', 'beta', 'promoter', 'admin', 'test'] as const;
export type Chip = (typeof CHIPS)[number];

/** Where a person opens: the existing person page until 5a part C moves it. */
export const personHref = (userId: string): string =>
  `/admin/users/${encodeURIComponent(userId)}`;

/** People who joined with a code (5b's "See all N"), by the code as written. */
export const peopleWithCodeHref = (code: string): string =>
  `/admin/people?code=${encodeURIComponent(code)}`;

/**
 * The code a `?code=` names, as written: the param is the code ("REDROCKS"),
 * or its id on a link made before it was.
 */
export const codeNameFor = (
  param: string,
  codes: readonly { id: string; code: string }[] | null,
): string | null =>
  codes?.find(
    (each) =>
      each.id === param || each.code.toUpperCase() === param.toUpperCase(),
  )?.code ?? null;

/**
 * Role chip tones, from `07/people`: Beta signal, Admin accent, Member
 * neutral. Promoter and Staff are undrawn (🔸 in the design review): Staff
 * takes Admin's tone, as staff are admins; Promoter takes a tone of its own.
 */
export const ROLE_KIND: Record<Role, StatusKind> = {
  user: 'neutral',
  beta: 'signal',
  admin: 'accent',
  promoter: 'success',
  sub_admin: 'accent',
};

/** How they came in, as `07/people` writes it: "code REDROCKS", "founder". */
const joinSourceLabel = (person: AdminPerson): string | null => {
  const source = person.joinSource;
  if (!source) return null;
  if (source.kind === 'founder') return COPY.joined.founder;
  if (source.kind === 'test') return COPY.joined.test;
  if (!source.code) return null;
  return source.kind === 'poster'
    ? COPY.joined.poster(source.code)
    : COPY.joined.code(source.code);
};

/** JOINED: "Oct 2 · code REDROCKS", "Apr 23 · founder", or the date alone. */
export const joinedLabel = (person: AdminPerson): string | null => {
  const date = person.createdAt ? shortDate(person.createdAt) : null;
  const source = joinSourceLabel(person);
  return [date, source].filter(Boolean).join(' · ') || null;
};

const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: DENVER_TIME_ZONE,
});

/** "Now", "14m ago", "2h ago", "Yesterday" (Mountain Time), "3d ago". */
export const lastActiveLabel = (
  iso: string | null,
  now: Date,
): string | null => {
  if (!iso) return null;
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return COPY.active.now;
  if (minutes < 60) return COPY.active.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return COPY.active.hours(hours);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (DAY_KEY.format(then) === DAY_KEY.format(yesterday))
    return COPY.active.yesterday;
  return COPY.active.days(Math.floor(hours / 24));
};

/**
 * A chip's count. The API leaves test accounts out of the total and every
 * role (ruling #4), so Everyone, the People tab and the footer agree; Test
 * accounts reads `counts.test`.
 */
export const chipCount = (
  chip: Chip,
  counts: Record<string, number> | undefined,
): number | null => {
  if (!counts) return null;
  return counts[chip === 'everyone' ? 'total' : chip] ?? 0;
};

export interface PeopleFilters {
  search: string;
  chip: Chip;
  code: string | null;
}

/** One page of the list for the filters; Test accounts is `?test=only`. */
export const fetchPeople = (
  api: PeopleApi,
  filters: PeopleFilters,
  page: number,
): Promise<PeoplePage> => {
  let chip: Pick<PeopleQuery, 'role' | 'test'> = {};
  if (filters.chip === 'test') chip = { test: 'only' };
  else if (filters.chip !== 'everyone') chip = { role: filters.chip };
  return api.list({
    search: filters.search,
    ...(filters.code ? { code: filters.code } : {}),
    ...chip,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
};
