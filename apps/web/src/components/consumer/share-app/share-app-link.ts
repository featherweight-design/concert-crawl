// What the Share Concert Crawl sheet points at, as pure rules: one place that
// decides the QR text, the line printed under it and the link that is copied or
// handed to the system sheet, so the three can never disagree.

import { posterJoinUrl } from '@/lib/poster/poster-rule';
import type { MeInviteResponse } from '@concert-crawl/types';

export type ShareAppMode = 'invite' | 'open';

export interface ShareAppLink {
  /** What the QR encodes: all caps, so it fits the QR's alphanumeric mode. */
  qrText: string;
  /** The line printed under the QR, scheme off, for reading aloud or typing. */
  shownUrl: string;
  /** What Copy link and the system sheet send: lowercase except the code. */
  shareUrl: string;
  /** True only when the link carries this person's own code. */
  personal: boolean;
}

const hostOf = (origin: string): string => origin.replace(/^https?:\/\//, '');

/**
 * The link for a sheet. A code is used only in invite mode and only while it is
 * live: after launch, or once an admin has turned the code off, the link is the
 * plain site and carries nothing (no code, no query, no user id).
 */
export const shareAppLink = (
  origin: string,
  mode: ShareAppMode,
  invite: Pick<MeInviteResponse, 'code' | 'revoked'> | null,
): ShareAppLink => {
  if (mode === 'invite' && invite !== null && !invite.revoked) {
    return {
      qrText: posterJoinUrl(origin, invite.code),
      shownUrl: `${hostOf(origin)}/i/${invite.code}`,
      shareUrl: `${origin}/i/${invite.code}`,
      personal: true,
    };
  }
  return {
    qrText: origin.toUpperCase(),
    shownUrl: hostOf(origin),
    shareUrl: origin,
    personal: false,
  };
};
