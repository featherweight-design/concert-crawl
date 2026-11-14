'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { track } from '@/lib/analytics';
import type { PassportShare } from './lib/use-passport-share';
import { PASSPORT_CTA_GLOW } from './definitions/styles';

const COPY = CONSUMER_COPY.passport;

export interface PassportActionsProps {
  /** The authenticated PNG route for this card; the Save link's fallback. */
  imageUrl: string;
  /** The card's fetch and share, shared with the phone top bar's icon. */
  share: PassportShare;
}

/**
 * Share and save for the Passport.
 *
 * Deliberately NOT `ShareSheet`: that sheet's whole configuration is the shape
 * picker and the public-mirror link, and the Passport has neither — one ratio,
 * and no public URL to copy. Two destinations do not need a bottom sheet.
 *
 * `systemShare` from `lib/share/destinations` is not reused either, because it
 * always attaches a URL — correct for a poster that must link back to the show,
 * wrong for a card whose only URL is behind the owner's session. The share
 * itself lives in `usePassportShare`.
 */
export const PassportActions = ({ imageUrl, share }: PassportActionsProps) => {
  const { file, objectUrl, failed, preparing, canShare } = share;

  return (
    <div className="flex flex-col items-stretch gap-2 lg:items-end">
      <div className="flex items-center gap-2.5">
        {/* Gated on file support, not on the sheet merely existing: this card
            has no URL to fall back to, so a button that cannot carry the image
            has nothing left to do but apologise. */}
        {canShare && (
          <button
            type="button"
            onClick={share.share}
            disabled={file === null}
            aria-busy={preparing}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-bold text-fg-on-accent disabled:opacity-60 lg:flex-none"
            style={{
              background:
                'linear-gradient(135deg, var(--signal), var(--cta-end))',
              boxShadow: PASSPORT_CTA_GLOW,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="18" cy="5" r="2.6" />
              <circle cx="6" cy="12" r="2.6" />
              <circle cx="18" cy="19" r="2.6" />
              <path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4" />
            </svg>
            {preparing ? COPY.preparingLabel : COPY.shareLabel}
          </button>
        )}
        {/* Always present. The OS sheet is missing on every desktop browser,
            so a save that depended on it would leave those users no way out.
            Falls back to the route so the link still works if the prefetch
            did not — slowly, but a slow download beats a dead one. */}
        <a
          href={objectUrl ?? imageUrl}
          download={COPY.downloadName}
          aria-busy={preparing}
          onClick={() =>
            track('passport_shared', { destination: 'save-image' })
          }
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-border-strong bg-surface-1 px-5 text-[15px] font-bold text-fg no-underline lg:flex-none"
        >
          {COPY.saveLabel}
        </a>
      </div>
      {failed && (
        <p role="status" className="text-xs text-fg-muted">
          {COPY.shareFailed}
        </p>
      )}
    </div>
  );
};
