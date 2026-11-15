'use client';

import { FORMER_ADMIN_NAME } from '@concert-crawl/types';
import { RelTime } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DENVER_TIME_ZONE } from '@/lib/time';

const COPY = ADMIN_COPY.featureFlags.drawer;

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: DENVER_TIME_ZONE,
});

/** "Nov 9", in Mountain Time. */
export const shortDate = (iso: string): string =>
  SHORT_DATE.format(new Date(iso));

const DAY_MS = 24 * 60 * 60 * 1000;

/** Within a day it reads "20h ago"; older, "Nov 9" (the History column). */
export const WhenCell = ({ iso }: { iso: string }) =>
  Date.now() - new Date(iso).getTime() < DAY_MS ? (
    <RelTime iso={iso} />
  ) : (
    <time dateTime={iso}>{shortDate(iso)}</time>
  );

/** "@theo.wav"; the former-admin fallback and a missing handle read as words. */
export const mention = (handle: string | null): string => {
  if (handle === null) return COPY.noHandle;
  if (handle === FORMER_ADMIN_NAME) return handle;
  return `@${handle}`;
};

/**
 * The Clerk role as the drawer names it; an unknown role is shown as it is.
 * Null (Clerk could not be read) says nothing rather than guessing Member.
 */
export const roleLabel = (role: string | null): string | null => {
  if (role === null) return null;
  switch (role) {
    case 'user':
    case 'beta':
    case 'admin':
    case 'sub_admin':
    case 'promoter':
      return COPY.roles[role];
    default:
      return role;
  }
};
