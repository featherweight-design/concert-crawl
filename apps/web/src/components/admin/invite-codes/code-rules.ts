/**
 * The invite-codes admin's pure rules (5b): what a code's row says, what a new
 * code is suggested from, and which expiry choice a form starts on.
 */
import {
  CUSTOM_INVITE_CODE_MAX_LENGTH,
  RESERVED_INVITE_CODE_PREFIX,
  isCustomInviteCode,
  type Role,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { StatusKind } from '@/components/admin/primitives';
import { DENVER_TIME_ZONE } from '@/lib/time';
import type { ListedInviteCode } from './codes-api';
import {
  inviteStatus,
  isPosterCode,
  parseSeats,
  type InviteStatus,
} from '@/lib/poster/poster-rule';

const COPY = ADMIN_COPY.codesPage;

/** Longest custom code the API takes. */
export const MAX_CODE_LENGTH = CUSTOM_INVITE_CODE_MAX_LENGTH;

/** Status chip tones, from `07/invite-codes`. */
export const STATUS_KIND: Record<InviteStatus, StatusKind> = {
  active: 'success',
  full: 'neutral',
  expired: 'warning',
  revoked: 'danger',
};

/** The Posters tab's count: live or full codes with more than one seat. */
export const countPosters = (
  codes: readonly ListedInviteCode[],
  now: Date,
): number =>
  codes.filter((code) => {
    const status = inviteStatus(code, now);
    return isPosterCode(code) && (status === 'active' || status === 'full');
  }).length;

/** An ended code is one Reactivate can bring back; Full is not ended. */
export const isEnded = (status: InviteStatus): boolean =>
  status === 'revoked' || status === 'expired';

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: DENVER_TIME_ZONE,
});

/** "Feb 1", in Mountain Time. */
export const shortDate = (iso: string): string =>
  SHORT_DATE.format(new Date(iso));

/** A member's own share code (the share sheet's), not an admin's. */
export const isMemberCode = (code: Pick<ListedInviteCode, 'kind'>): boolean =>
  code.kind === 'member';

/**
 * Read-only here: Edit, Add seats and Reactivate are not offered. A member's
 * share code (PATCH answers 409 `member_code`), and a kind this build doesn't
 * know, whose rules it can't assume.
 */
export const isReadOnlyCode = (code: Pick<ListedInviteCode, 'kind'>): boolean =>
  code.kind !== 'admin';

/**
 * A poster is any admin code with more than one seat; the prefix is never
 * stored. A member's own share code is not a poster whatever its seat cap, and
 * a kind this build doesn't know shows its stored label as it is.
 */
export const codeLabel = (
  code: Pick<
    ListedInviteCode,
    'label' | 'maxUses' | 'kind' | 'createdByHandle'
  >,
): string | null => {
  // A member's own share code reads as whose it is: "Personal · @mira".
  if (isMemberCode(code)) return COPY.memberLabel(code.createdByHandle);
  return isPosterCode(code) ? COPY.posterLabel(code.label) : code.label;
};

/**
 * Who made it. A member code with no handle is someone who hasn't picked one
 * yet, never a former admin: the code ends with the account.
 */
export const makerName = (
  code: Pick<ListedInviteCode, 'createdByHandle'> &
    Partial<Pick<ListedInviteCode, 'kind'>>,
) => {
  if (code.createdByHandle) return `@${code.createdByHandle}`;
  return code.kind === 'member' ? COPY.panel.noHandle : COPY.formerAdmin;
};

/**
 * The seat cap to draw, or null when there is none to show. A member code's
 * 10,000 is a ceiling, not a limit anyone set, so it reads "N joined" with no
 * cap, as the share sheet draws an unlimited code.
 */
export const seatCap = (
  code: Pick<ListedInviteCode, 'kind' | 'maxUses'>,
): number | null => (isMemberCode(code) ? null : code.maxUses);

/** What a code's ⋯ menu offers, in drawn order. */
export type CodeAction =
  'copy' | 'poster' | 'joined' | 'edit' | 'revoke' | 'reactivate';

/**
 * The actions a code offers. A read-only code (a member's share code, or a
 * kind this build doesn't know) keeps Copy link, See who joined and Revoke,
 * and never offers Edit or Reactivate. The API refuses an edit to a member
 * code (PATCH, 409 `member_code`) but not yet a reactivate: that guard is a
 * backend follow-up, so this page is what keeps Reactivate off a member code.
 */
export const codeActions = (
  code: Pick<ListedInviteCode, 'kind' | 'maxUses'>,
  status: InviteStatus,
): CodeAction[] => {
  const readOnly = isReadOnlyCode(code);
  if (isEnded(status)) {
    return readOnly ? ['copy', 'joined'] : ['copy', 'joined', 'reactivate'];
  }
  return [
    'copy',
    // The Posters tab can only pick a live code with a seat left.
    ...(isPosterCode(code) && status === 'active' ? ['poster' as const] : []),
    'joined',
    ...(readOnly ? [] : ['edit' as const]),
    'revoke',
  ];
};

/** A role worth naming beside a joiner; a plain member says nothing. */
export const roleLabel = (role: Role | null): string | null =>
  role && role !== 'user' ? COPY.panel.roles[role] : null;

/**
 * The code a label suggests: its letters and numbers, uppercased, cut to 20.
 * A label with no letters suggests nothing, and a derived "Poster ·" prefix
 * typed into it is dropped, as `07/new-code-in-flow` draws GLOBEHALL.
 */
export const suggestCode = (label: string): string => {
  if (!/[a-z]/i.test(label)) return '';
  const code = label
    .replace(/^\s*poster\s*·\s*/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, MAX_CODE_LENGTH);
  // Never suggest what the API refuses: under 4 characters, or a BETA start.
  return isCustomInviteCode(code) ? code : '';
};

/**
 * The label to store: trimmed, without a typed "Poster ·" prefix, which the
 * list derives (A3 5b r3) and would otherwise draw twice. Empty is null.
 */
export const cleanLabel = (typed: string): string | null =>
  typed.replace(/^\s*poster\s*·\s*/i, '').trim() || null;

/** A typed code's problem, or null: too short, or the reserved BETA start. */
export const codeProblem = (code: string): string | null => {
  if (code === '' || isCustomInviteCode(code)) return null;
  return code.startsWith(RESERVED_INVITE_CODE_PREFIX)
    ? COPY.form.codeReserved(RESERVED_INVITE_CODE_PREFIX)
    : COPY.form.codeRule;
};

/** What a typed code becomes: letters and numbers only, uppercased. */
export const cleanCode = (typed: string): string =>
  typed
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, MAX_CODE_LENGTH);

export type ExpiryChoice = 'keep' | 'never' | 'd7' | 'd30' | 'd90';

const DAYS: Record<Exclude<ExpiryChoice, 'keep' | 'never'>, number> = {
  d7: 7,
  d30: 30,
  d90: 90,
};

/** The expiry pills, in drawn order. `keep` leads only when it applies. */
export const EXPIRY_CHOICES: readonly Exclude<ExpiryChoice, 'keep'>[] = [
  'never',
  'd7',
  'd30',
  'd90',
];

/** True when the code has an exact expiry still ahead, which Keep offers. */
export const hasFutureExpiry = (expiresAt: string | null, now: Date) =>
  expiresAt != null && new Date(expiresAt) > now;

/**
 * Where an expiry picker starts: Keep when the code has a future exact expiry
 * (A3 r10, r13), else `otherwise`. Edit starts on Never; Reactivate on 7 days,
 * as `07/reactivate-a-code` draws it.
 */
export const initialExpiry = (
  expiresAt: string | null,
  now: Date,
  otherwise: ExpiryChoice,
): ExpiryChoice => (hasFutureExpiry(expiresAt, now) ? 'keep' : otherwise);

/**
 * The `expiresAt` to send for a choice: undefined leaves it as it is, null
 * means never.
 */
export const expiresAtFor = (
  choice: ExpiryChoice,
  now: Date,
): string | null | undefined => {
  if (choice === 'keep') return undefined;
  if (choice === 'never') return null;
  return new Date(now.getTime() + DAYS[choice] * 86_400_000).toISOString();
};

/** The seats a picker holds: a preset, or Other's typed count (null if bad). */
export const seatsFrom = (
  choice: `${number}` | 'other',
  typed: string,
): number | null => (choice === 'other' ? parseSeats(typed) : Number(choice));

/** The inline error for seats below what's used, or null when they fit. */
export const seatsFloorError = (seats: number | null, used: number) =>
  seats != null && seats < used ? COPY.form.seatsFloor(used) : null;
