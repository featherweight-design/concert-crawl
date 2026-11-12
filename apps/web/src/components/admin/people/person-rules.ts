/**
 * The person page's pure rules (5a, `07/person`): what the head, the role
 * caption, the Account rows, Recent and the Undo toast say, and which role
 * changes ask first.
 */
import type { PersonDetail, PersonRecent, Role } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { shortDate } from '../invite-codes/code-rules';
import { lastActiveLabel } from './people-rules';
import type { SettableRole } from './person-api';

const COPY = ADMIN_COPY.personPage;
const ROLES = ADMIN_COPY.peoplePage.roles;

/** The segment, left to right, as `07/person` draws it. */
export const ROLE_SEGMENT: readonly SettableRole[] = [
  'user',
  'beta',
  'promoter',
  'admin',
];

/** "@mira.k", or the list's line for someone with no handle yet. */
export const personName = (person: Pick<PersonDetail, 'handle'>): string =>
  person.handle ? `@${person.handle}` : ADMIN_COPY.codesPage.panel.noHandle;

/** "with code REDROCKS", "as a founder"; null when the source is unknown. */
const joinedWith = (person: PersonDetail): string | null => {
  const source = person.joinSource;
  if (!source) return null;
  if (source.kind === 'founder') return COPY.joinedAs.founder;
  if (source.kind === 'test') return COPY.joinedAs.test;
  if (!source.code) return null;
  return source.kind === 'poster'
    ? COPY.joinedAs.poster(source.code)
    : COPY.joinedAs.code(source.code);
};

/** The head line: "Joined Oct 2 with code REDROCKS · active 2h ago". */
export const headLine = (person: PersonDetail, now: Date): string => {
  const joined = person.createdAt
    ? COPY.joined(shortDate(person.createdAt), joinedWith(person))
    : null;
  const active = lastActiveLabel(person.lastActiveAt, now);
  return [joined, active && COPY.active(active)].filter(Boolean).join(' · ');
};

/** The phone's line under the handle: "Active 2h ago". */
export const phoneActiveLine = (
  person: PersonDetail,
  now: Date,
): string | null => {
  const active = lastActiveLabel(person.lastActiveAt, now);
  return active ? ADMIN_COPY.peoplePage.active.phone(active) : null;
};

/**
 * The caption beside the segment. Ruling #8: the role alone ("Beta"), with
 * no "since" and no setter, as the API carries neither.
 */
export const roleCaption = (role: Role): string =>
  COPY.roleCaption(ROLES[role]);

/**
 * Ruling #25: making an admin asks first, and so does taking Admin away.
 * Every other change applies at once, with Undo.
 */
export const asksFirst = (from: Role, to: SettableRole): boolean =>
  from !== to && (to === 'admin' || from === 'admin');

/** The Undo toast's second line; drawn only for leaving Beta. */
export const roleToastBody = (from: Role, to: Role): string | null => {
  if (from === 'beta') return COPY.toast.betaOff;
  if (to === 'beta') return COPY.toast.betaOn;
  return null;
};

/** "Signs in with": methods comma-joined (ruling #10). */
export const signInLabel = (methods: readonly string[]): string | null =>
  methods.length > 0 ? methods.join(', ') : null;

/** "REDROCKS · 1 of 23 who joined with it"; the phone shows the code alone. */
export const inviteCodeLabel = (
  person: PersonDetail,
  isPhone: boolean,
): string | null => {
  const source = person.joinSource;
  // A member's share code reads as a code does (`code` and `member` alike).
  if (
    !source?.code ||
    (source.kind !== 'code' &&
      source.kind !== 'member' &&
      source.kind !== 'poster')
  )
    return null;
  if (isPhone || person.codeRedeemerCount === null) return source.code;
  return COPY.inviteCodeCount(source.code, person.codeRedeemerCount);
};

/** "$35", "$35.50": whole dollars drop the cents. */
const dollars = (amount: string): string => {
  const value = Number(amount);
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
};

/** One Recent line: "Submitted $35–$65 for Ninth Key at Gothic Theatre". */
export const recentLine = (item: PersonRecent): string => {
  switch (item.kind) {
    case 'price': {
      const range =
        item.priceMax && item.priceMax !== item.priceMin
          ? `${dollars(item.priceMin)}–${dollars(item.priceMax)}`
          : dollars(item.priceMin);
      return COPY.recent.price(range, item.artist, item.venueName);
    }
    case 'feedback':
      return COPY.recent.feedback(item.message);
    case 'report': {
      const lines: Record<string, (subject: string) => string> =
        item.about === 'artist' ? COPY.recent.artist : COPY.recent.event;
      return (lines[item.reason] ?? COPY.recent.other)(item.subject);
    }
  }
};
