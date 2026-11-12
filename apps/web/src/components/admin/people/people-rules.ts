/**
 * The People list's pure rules (5a): what a row says, which chip asks the API
 * what, and where a person opens.
 */
import type { Role } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { StatusKind } from '@/components/admin/primitives';
import { DENVER_TIME_ZONE } from '@/lib/time';
import { shortDate } from '../invite-codes/code-rules';
import type { AdminPerson, PeopleApi, PeoplePage } from './people-api';

const COPY = ADMIN_COPY.peoplePage;

/** Rows per page; the API's most. */
export const PAGE_SIZE = 100;
/** Pages the Test accounts sweep reads before it stops. */
const TEST_SWEEP_PAGES = 10;

export const CHIPS = ['everyone', 'beta', 'promoter', 'admin', 'test'] as const;
export type Chip = (typeof CHIPS)[number];

/** Where a person opens: the person page under People. */
export const personHref = (userId: string): string =>
  `/admin/people/${encodeURIComponent(userId)}`;

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

/**
 * JOINED: the date only. HOLD: #240 adds the join source ("code REDROCKS",
 * "poster HIDIVE", "founder", "test"), which this one function will add.
 */
export const joinedLabel = (person: AdminPerson): string | null =>
  person.createdAt ? shortDate(person.createdAt) : null;

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
 * A chip's count. HOLD: the counts include test accounts (ruling #4 wants
 * them left out), and Test accounts has none; #240 adds `counts.test`.
 */
export const chipCount = (
  chip: Chip,
  counts: Record<string, number> | undefined,
): number | null => {
  if (!counts || chip === 'test') return null;
  return counts[chip === 'everyone' ? 'total' : chip] ?? 0;
};

export interface PeopleFilters {
  search: string;
  chip: Chip;
  code: string | null;
}

/**
 * One page of the list for the filters. HOLD: the API has no test filter, so
 * Test accounts reads every page and keeps the test accounts; #240's
 * `?test=only` replaces the sweep.
 */
export const fetchPeople = async (
  api: PeopleApi,
  filters: PeopleFilters,
  page: number,
): Promise<PeoplePage> => {
  const base = {
    search: filters.search,
    ...(filters.code ? { code: filters.code } : {}),
    limit: PAGE_SIZE,
  };
  if (filters.chip !== 'test') {
    return api.list({
      ...base,
      ...(filters.chip === 'everyone' ? {} : { role: filters.chip }),
      offset: (page - 1) * PAGE_SIZE,
    });
  }
  const first = await api.list({ ...base, offset: 0 });
  // By id: the API's scan can refresh between pages and shift the order.
  const seen = new Map(first.people.map((person) => [person.id, person]));
  let truncated = first.truncated;
  for (let read = 1; read * PAGE_SIZE < first.total; read += 1) {
    if (read === TEST_SWEEP_PAGES) {
      truncated = true;
      break;
    }
    const next = await api.list({ ...base, offset: read * PAGE_SIZE });
    if (next.people.length === 0) break;
    for (const person of next.people) seen.set(person.id, person);
  }
  const tests = [...seen.values()].filter((person) => person.isTestAccount);
  return {
    ...first,
    people: tests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: tests.length,
    truncated,
  };
};
