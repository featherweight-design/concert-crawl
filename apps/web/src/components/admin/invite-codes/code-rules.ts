/**
 * The invite-codes admin's pure rules (5b): what a code's row says, what a new
 * code is suggested from, and which expiry choice a form starts on.
 */
import {
  CUSTOM_INVITE_CODE_MAX_LENGTH,
  RESERVED_INVITE_CODE_PREFIX,
  isCustomInviteCode,
  type AdminInviteCode,
  type Role,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { StatusKind } from '@/components/admin/primitives';
import { DENVER_TIME_ZONE } from '@/lib/time';
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
  codes: readonly AdminInviteCode[],
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

/**
 * A poster is any admin code with more than one seat; the prefix is never
 * stored. A member's own share code is not a poster whatever its seat cap.
 */
export const codeLabel = (
  code: Pick<AdminInviteCode, 'label' | 'maxUses' | 'kind'>,
): string | null =>
  isPosterCode(code) ? COPY.posterLabel(code.label) : code.label;

export const makerName = (code: Pick<AdminInviteCode, 'createdByHandle'>) =>
  code.createdByHandle ? `@${code.createdByHandle}` : COPY.formerAdmin;

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
