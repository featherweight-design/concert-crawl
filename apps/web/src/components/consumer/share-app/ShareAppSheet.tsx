'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Share } from 'lucide-react';
import { BottomSheet } from '@/components/pwa/BottomSheet';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { SIGNAL_TO_ACCENT } from '@/components/settings/definitions/styles';
import { track } from '@/lib/analytics';
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport';
import { asAvatarColor, useMeInvite } from '@/lib/queries/use-me-invite';
import {
  canSystemShare,
  copyLink,
  shareLink,
  type ShareCapabilities,
} from '@/lib/share/destinations';
import { siteOrigin } from '@/lib/share/site-origin';
import { SHARE_APP_COPY } from './definitions/copy';
import { qrPath } from '@/lib/poster/poster-rule';
import { shareAppLink, type ShareAppMode } from './share-app-link';
import { ShareTicket, type TicketBody, type TicketLower } from './ShareTicket';

const COPY = SHARE_APP_COPY;
const SHARE_COPY = CONSUMER_COPY.share;

/** How long the Copy link press reads "Link copied" before it goes back. */
export const COPIED_MS = 2000;

/** The desktop dialog is 440px wide on the boards. */
const DIALOG_WIDTH = 440;

type PressStatus = 'copied' | 'shareFailed' | 'copyFailed' | null;

export interface ShareAppSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * `invite` before launch (the QR carries the person's own code) and `open`
   * after it (a plain link, no code, and the API is never called). The web
   * decides this with `isPublicBrowseEnabled()`; the API cannot see the flag.
   */
  mode: ShareAppMode;
  /** Injected so every branch is reachable from a test. Defaults to `navigator`. */
  capabilities?: ShareCapabilities;
}

/**
 * Share Concert Crawl: the QR ticket and its presses.
 *
 * Built on `components/pwa/BottomSheet` unchanged, so the focus trap, Escape,
 * return-focus and the sheet-on-phone, dialog-on-desktop switch are the live
 * ones. Phone leads with Share…, desktop with Copy link; Share… shows on
 * desktop only where the browser has it.
 */
export const ShareAppSheet = ({
  open,
  onClose,
  mode,
  capabilities,
}: ShareAppSheetProps) => {
  const [status, setStatus] = useState<PressStatus>(null);
  const isPhone = useIsMobileViewport();
  // Open mode has no code to make: the query stays off and the API is never
  // called.
  const invite = useMeInvite(mode === 'invite' && open);

  const caps: ShareCapabilities = useMemo(
    () =>
      capabilities ??
      (typeof navigator === 'undefined'
        ? {}
        : {
            ...(typeof navigator.share === 'function' && {
              share: navigator.share.bind(navigator),
            }),
            ...(navigator.clipboard !== undefined && {
              clipboard: navigator.clipboard,
            }),
          }),
    [capabilities],
  );

  // The sheet can stay mounted while closed; a stale "Link copied" or failure
  // line would greet the next opening.
  useEffect(() => {
    if (!open) setStatus(null);
  }, [open]);

  useEffect(() => {
    if (status !== 'copied') return;
    const timer = window.setTimeout(() => setStatus(null), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const origin = siteOrigin();
  const data = mode === 'invite' ? (invite.data ?? null) : null;
  const link = shareAppLink(origin, mode, data);
  // A refetch that fails behind a code already in hand is not a failure: the
  // code is for good, so the ticket keeps showing it.
  const failed =
    mode === 'invite' && data === null && invite.isError && !invite.isFetching;
  const pending = mode === 'invite' && data === null && !failed;
  const ready = !pending && !failed;

  // Drawn only once the code is in hand: the QR is never encoded for a link
  // that is about to change.
  const { qrText } = link;
  const qr = useMemo(() => (ready ? qrPath(qrText) : null), [ready, qrText]);

  let body: TicketBody;
  let lower: TicketLower;
  if (pending) {
    body = { kind: 'loading' };
    lower = { kind: 'pending' };
  } else if (failed || qr === null) {
    body = { kind: 'error', onRetry: () => void invite.refetch() };
    lower = { kind: 'pending' };
  } else {
    body = {
      kind: 'ready',
      qr,
      ariaLabel: link.personal ? COPY.qrAria : COPY.qrAriaOpen,
      shownUrl: link.shownUrl,
    };
    if (mode === 'open') lower = { kind: 'none' };
    else if (data?.revoked === true) lower = { kind: 'off' };
    else
      lower = {
        kind: 'joined',
        count: data?.joined.count ?? 0,
        faces: (data?.joined.faces ?? []).map((face) => ({
          handle: face.handle,
          avatarColor: asAvatarColor(face.avatarColor),
          avatarSecondColor: asAvatarColor(face.avatarSecondColor),
        })),
      };
  }

  // ⚠ Synchronous up to `share()`: navigator.share needs the click's transient
  // activation, and `shareLink` reaches it before its first await.
  const onSystemShare = () => {
    track('app_share_destination_selected', { destination: 'system' });
    void shareLink(caps, {
      title: COPY.eyebrowOpen,
      text: link.personal ? COPY.shareText : COPY.shareTextOpen,
      url: link.shareUrl,
    }).then((outcome) => {
      // A cancel says nothing; only a refusal points at Copy link.
      setStatus(
        outcome === 'failed' || outcome === 'unsupported'
          ? 'shareFailed'
          : null,
      );
    });
  };

  const onCopyLink = () => {
    track('app_share_destination_selected', { destination: 'copy-link' });
    void copyLink(caps, link.shareUrl).then((outcome) => {
      setStatus(outcome === 'shared' ? 'copied' : 'copyFailed');
    });
  };

  const canShare = canSystemShare(caps);
  const shareLeads = isPhone && canShare;
  const titleText = mode === 'invite' ? COPY.titleInvite : COPY.titleOpen;

  const sharePress = (primary: boolean) => (
    <Press
      primary={primary}
      disabled={!ready}
      onClick={onSystemShare}
      icon={<Share size={16} strokeWidth={2} aria-hidden="true" />}
      label={SHARE_COPY.destinations.systemShare}
    />
  );
  const copyPress = (primary: boolean) => (
    <Press
      primary={primary}
      disabled={!ready}
      onClick={onCopyLink}
      copied={status === 'copied'}
      icon={<Copy size={15} strokeWidth={1.75} aria-hidden="true" />}
      label={SHARE_COPY.destinations.copyLink}
    />
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={titleText}
      maxWidth={DIALOG_WIDTH}
    >
      {/* Grabber: decorative, phone only. The sheet closes by its X, Escape,
          the backdrop or a drag, all of which BottomSheet owns. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-sm bg-border-strong sm:hidden"
      />
      {/* BottomSheet's own close sits first in the row above; the eyebrow is
          pulled up into that row, and ignores the pointer so the close and the
          drag zone beneath it still work. */}
      <div className="pointer-events-none -mt-11 flex min-h-11 items-center">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-signal">
          {mode === 'invite' ? COPY.eyebrow : COPY.eyebrowOpen}
        </span>
      </div>
      <p className="m-0 mt-0.5 text-balance text-[26px] font-black leading-[1.08] tracking-[-0.03em] text-fg">
        {titleText}
      </p>
      <p className="m-0 mt-2 text-sm leading-normal text-fg-muted">
        {mode === 'invite' ? COPY.bodyInvite : COPY.bodyOpen}
      </p>

      <div className="mt-[18px]">
        <ShareTicket body={body} lower={lower} />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {shareLeads ? (
          <>
            {sharePress(true)}
            <div className="flex gap-2.5">{copyPress(false)}</div>
          </>
        ) : (
          <>
            {copyPress(true)}
            {canShare && sharePress(false)}
          </>
        )}
      </div>

      {/* Polite, and always mounted so a change is announced. */}
      <div role="status" aria-live="polite">
        {status === 'copied' && (
          <span className="sr-only">{SHARE_COPY.copyLinkDone}</span>
        )}
        {(status === 'shareFailed' || status === 'copyFailed') && (
          <p className="m-0 mt-[7px] flex items-start gap-[7px] text-[13px] leading-[1.45] text-danger">
            <span
              aria-hidden="true"
              className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold leading-none"
              style={{
                background:
                  'color-mix(in oklch, var(--danger) 16%, transparent)',
              }}
            >
              !
            </span>
            <span>
              {status === 'copyFailed' ? COPY.copyFailed : COPY.shareFailed}
            </span>
          </p>
        )}
      </div>
    </BottomSheet>
  );
};

const PRESS =
  'flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 text-[15px] disabled:cursor-default disabled:opacity-50';

/**
 * One press. `primary` wears the blue-to-pink fill and leads; the rest are
 * outlined. `copied` is the 2-second success state, in place of the label.
 */
const Press = ({
  primary,
  copied = false,
  disabled,
  onClick,
  icon,
  label,
}: {
  primary: boolean;
  copied?: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => {
  if (copied) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${PRESS} border font-extrabold text-success`}
        style={{
          background: 'color-mix(in oklch, var(--success) 12%, transparent)',
          borderColor: 'color-mix(in oklch, var(--success) 50%, transparent)',
        }}
      >
        <Check size={15} strokeWidth={2.6} aria-hidden="true" />
        {SHARE_COPY.copyLinkDone}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        primary
          ? `${PRESS} font-bold text-fg-on-accent`
          : `${PRESS} border border-border-strong bg-transparent font-bold text-fg`
      }
      style={
        primary
          ? {
              background: SIGNAL_TO_ACCENT,
              boxShadow:
                '0 8px 24px color-mix(in oklch, var(--signal) 20%, transparent)',
            }
          : undefined
      }
    >
      {icon}
      {label}
    </button>
  );
};
