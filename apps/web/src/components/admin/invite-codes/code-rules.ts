/**
 * The invite-codes admin's pure rules (5b): what a code's row says.
 */
import type { AdminInviteCode } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { StatusKind } from '@/components/admin/primitives';
import { DENVER_TIME_ZONE } from '@/lib/time';
import type { InviteStatus } from '@/lib/poster/poster-rule';

const COPY = ADMIN_COPY.codesPage;

/** Status chip tones, from `07/invite-codes`. */
export const STATUS_KIND: Record<InviteStatus, StatusKind> = {
  active: 'success',
  full: 'neutral',
  expired: 'warning',
  revoked: 'danger',
};

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: DENVER_TIME_ZONE,
});

/** "Feb 1", in Mountain Time. */
export const shortDate = (iso: string): string =>
  SHORT_DATE.format(new Date(iso));

/** A poster is any code with more than one seat; the prefix is never stored. */
export const codeLabel = (
  code: Pick<AdminInviteCode, 'label' | 'maxUses'>,
): string | null =>
  code.maxUses > 1 ? COPY.posterLabel(code.label) : code.label;

export const makerName = (code: Pick<AdminInviteCode, 'createdByHandle'>) =>
  code.createdByHandle ? `@${code.createdByHandle}` : COPY.formerAdmin;
