'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AvatarRing } from '@/components/settings/AvatarRing';
import { CCMark } from '@/components/brand/cc-mark';
import { CCWordmark } from '@/components/brand/cc-wordmark';
import { useModalDialog } from '@/lib/hooks/useModalDialog';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import type { QrPath } from '@/lib/poster/poster-rule';
import { SHARE_APP_COPY } from './definitions/copy';
import type { TicketFace } from './ShareTicket';

const COPY = SHARE_APP_COPY;

// Full screen is a white page whatever the theme, so the code scans in a dark
// venue (design_handoff_share_app README, decision 5). Its paper, ink and the
// page's own text colours are fixed, and the brand parts that read the theme
// are pinned to the Light values through the custom properties below.
const PAGE_PAPER = '#ffffff'; // fwd-allow-hex: board art colour
const PAGE_INK = '#070a1a'; // fwd-allow-hex: board art colour
const PAGE_SUBTLE = '#4a5578'; // fwd-allow-hex: board art colour
const PAGE_FAINT = '#8a94b0'; // fwd-allow-hex: board art colour
const PAGE_ACTION = '#0a7c99'; // fwd-allow-hex: board art colour
const PAGE_ACCENT = '#d92d7a'; // fwd-allow-hex: board art colour
const PAGE_TILE = '#f4f6fb'; // fwd-allow-hex: board art colour

const PAGE_VARS = {
  '--fg': PAGE_INK,
  '--bg': PAGE_TILE,
  '--accent': PAGE_ACCENT,
} as React.CSSProperties;

export interface ShareFullScreenProps {
  open: boolean;
  onClose: () => void;
  /** `open` mode has no code and no joined line. */
  personal: boolean;
  qr: QrPath;
  ariaLabel: string;
  shownUrl: string;
  /** Who joined with the code; null when there is nothing to count. */
  joined: { count: number; faces: readonly TicketFace[] } | null;
}

/**
 * The QR on a white page, as large as the screen allows. It keeps the screen
 * awake while it is up (where the browser can) and gives that back on Done.
 * No web page can raise the screen's brightness, so the foot line asks.
 */
export const ShareFullScreen = ({
  open,
  onClose,
  personal,
  qr,
  ariaLabel,
  shownUrl,
  joined,
}: ShareFullScreenProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useWakeLock(open);
  useModalDialog(ref, open, onClose);

  if (!open || typeof document === 'undefined') return null;

  const joinedLine =
    joined === null || joined.count === 0
      ? null
      : joined.count === 1
        ? COPY.fullscreenJoinedOne
        : COPY.fullscreenJoinedCount(joined.count);
  const title = personal ? COPY.fullscreenTitle : COPY.fullscreenTitleOpen;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="share-fullscreen"
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]"
      style={{ ...PAGE_VARS, background: PAGE_PAPER, color: PAGE_INK }}
    >
      <div className="-mx-1 flex h-11 shrink-0 items-center justify-between">
        <span className="flex items-center gap-2.5" aria-hidden="true">
          <span className="overflow-hidden rounded-lg border border-black/10">
            <CCMark size={30} />
          </span>
          <CCWordmark size={22} />
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-end border-0 bg-transparent px-1 text-[17px] font-extrabold"
          style={{ color: PAGE_ACTION }}
        >
          {COPY.fullscreenDone}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-6">
        <h2 className="m-0 text-center text-[38px] font-black leading-[1.05] tracking-[-0.03em] max-[360px]:text-[32px]">
          {title}
        </h2>
        {/* The screen width less the 56px of side padding, kept inside the
            height so a landscape phone still fits it. */}
        <svg
          role="img"
          aria-label={ariaLabel}
          data-testid="share-fullscreen-qr"
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          shapeRendering="crispEdges"
          className="mt-9 block aspect-square h-auto w-[min(100%,calc(100dvh-340px))] min-w-[200px] max-w-[420px]"
        >
          <rect width={qr.size} height={qr.size} fill={PAGE_PAPER} />
          <path d={qr.path} fill={PAGE_INK} />
        </svg>
        <span
          className="mt-8 max-w-full break-all text-center font-mono text-[15px] font-semibold tracking-[0.02em]"
          style={{ color: PAGE_SUBTLE }}
        >
          {shownUrl}
        </span>
        {joinedLine !== null && joined !== null && (
          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden="true" className="flex items-center">
              {joined.faces.slice(0, 4).map((face, index) => (
                <span key={index} className="-ml-1 first:ml-0">
                  <AvatarRing
                    handle={face.handle}
                    avatarColor={face.avatarColor}
                    avatarSecondColor={face.avatarSecondColor}
                    size={30}
                    cutout={PAGE_PAPER}
                  />
                </span>
              ))}
            </span>
            <span
              className="text-[17px] font-semibold"
              style={{ color: PAGE_SUBTLE }}
            >
              {joinedLine}
            </span>
          </div>
        )}
      </div>

      <p
        className="m-0 shrink-0 text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: PAGE_FAINT }}
      >
        {COPY.fullscreenNote}
      </p>
    </div>,
    document.body,
  );
};
