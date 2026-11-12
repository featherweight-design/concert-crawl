'use client';

import { QrCode, RefreshCw } from 'lucide-react';
import type { AvatarColor } from '@concert-crawl/types';
import { AvatarRing } from '@/components/settings/AvatarRing';
import type { QrPath } from '@/lib/poster/poster-rule';
import { SHARE_APP_COPY } from './definitions/copy';

const COPY = SHARE_APP_COPY;

// A QR has to scan in every theme and in a dark room, so its paper and ink are
// fixed rather than themed: Light must not turn the modules pale.
const QR_PAPER = '#ffffff'; // fwd-allow-hex: board art colour
const QR_INK = '#070a1a'; // fwd-allow-hex: board art colour

/** The QR tile's side: 204px of code in 6px of paper, 184px of code at 320. */
const TILE = 'h-[196px] w-[196px] min-[360px]:h-[216px] min-[360px]:w-[216px]';

export interface TicketFace {
  handle: string | null;
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
}

export type TicketBody =
  | { kind: 'loading' }
  | { kind: 'error'; onRetry: () => void }
  | { kind: 'ready'; qr: QrPath; ariaLabel: string; shownUrl: string };

export type TicketLower =
  | { kind: 'joined'; count: number; faces: readonly TicketFace[] }
  | { kind: 'off' }
  /** The label and a bar, held while the code is made or has failed. */
  | { kind: 'pending' }
  /** After launch there is no code to count, so no lower half. */
  | { kind: 'none' };

/**
 * The QR drawn as a ticket: the code above a perforation, who joined with it
 * below. The body keeps one height through loading, error and ready, so
 * nothing jumps when the code lands.
 */
export const ShareTicket = ({
  body,
  lower,
}: {
  body: TicketBody;
  lower: TicketLower;
}) => (
  <div
    data-testid="share-ticket"
    className="relative overflow-hidden rounded-[18px] border border-border bg-surface-1"
  >
    <div className="flex flex-col items-center px-4 pb-4 pt-[18px]">
      <TicketBodyView body={body} />
    </div>
    {lower.kind !== 'none' && (
      <div className="relative border-t-[1.5px] border-dashed border-border-strong px-[18px] pb-4 pt-3.5">
        <Notch side="left" />
        <Notch side="right" />
        <LowerView lower={lower} />
      </div>
    )}
  </div>
);

const Notch = ({ side }: { side: 'left' | 'right' }) => (
  <span
    aria-hidden="true"
    className={`absolute -top-[9px] h-[18px] w-[18px] rounded-full border border-border bg-[var(--sheet-bg)] ${
      side === 'left' ? '-left-[9px]' : '-right-[9px]'
    }`}
  />
);

const TicketBodyView = ({ body }: { body: TicketBody }) => {
  if (body.kind === 'loading') {
    return (
      <>
        <div
          role="status"
          className={`flex flex-col items-center justify-center gap-2.5 rounded-[14px] bg-surface-3 ${TILE}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="animate-spin"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="var(--fg-muted)"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            <path
              d="M8 2a6 6 0 016 6"
              fill="none"
              stroke="var(--fg-muted)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[13px] text-fg-muted">{COPY.loading}</span>
        </div>
        <span className="mt-3.5 h-3 w-3/5 rounded-[5px] bg-surface-3" />
      </>
    );
  }
  if (body.kind === 'error') {
    return (
      <div
        role="status"
        className="flex min-h-[244px] w-[196px] flex-col items-center justify-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-border-strong p-[18px] text-center min-[360px]:w-[216px]"
      >
        <QrCode size={28} strokeWidth={1.5} className="text-fg-subtle" />
        <span className="text-[13.5px] leading-[1.45] text-fg-muted">
          {COPY.error}
        </span>
        <button
          type="button"
          onClick={body.onRetry}
          className="inline-flex h-11 cursor-pointer items-center gap-[7px] rounded-xl border border-border-strong bg-transparent px-4 text-sm font-bold text-fg"
        >
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
          {COPY.retry}
        </button>
      </div>
    );
  }
  return (
    <>
      <div
        className="rounded-[14px] p-1.5"
        style={{ background: QR_PAPER }}
        data-testid="share-qr"
      >
        <svg
          role="img"
          aria-label={body.ariaLabel}
          viewBox={`0 0 ${body.qr.size} ${body.qr.size}`}
          shapeRendering="crispEdges"
          className="block h-[184px] w-[184px] min-[360px]:h-[204px] min-[360px]:w-[204px]"
        >
          <rect width={body.qr.size} height={body.qr.size} fill={QR_PAPER} />
          <path d={body.qr.path} fill={QR_INK} />
        </svg>
      </div>
      <span className="mt-3 max-w-full break-all text-center font-mono text-[10.5px] min-[360px]:text-[11.5px] font-semibold tracking-[0.04em] text-fg-muted">
        {body.shownUrl}
      </span>
    </>
  );
};

const LABEL_CLASS =
  'font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-fg-subtle';

const LowerView = ({
  lower,
}: {
  lower: Exclude<TicketLower, { kind: 'none' }>;
}) => {
  if (lower.kind === 'off') {
    return (
      <p role="status" className="m-0 text-[13px] leading-[1.45] text-fg-muted">
        {COPY.offCode}
      </p>
    );
  }
  if (lower.kind === 'pending') {
    return (
      <div className="opacity-50">
        <span className={LABEL_CLASS}>{COPY.joinedLabel}</span>
        <div className="mt-1.5 h-3.5 w-[70px] rounded-[5px] bg-surface-3" />
      </div>
    );
  }
  const { count, faces } = lower;
  const more = count - faces.length;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className={LABEL_CLASS}>{COPY.joinedLabel}</span>
        <div className="mt-[3px] text-[15px] font-extrabold text-fg">
          {count === 0
            ? COPY.joinedNone
            : count === 1
              ? COPY.joinedOne
              : COPY.joinedCount(count)}
        </div>
        {count === 0 && (
          <div className="mt-px text-[12.5px] text-fg-muted">
            {COPY.joinedNoneSub}
          </div>
        )}
      </div>
      {/* The strip says nothing the count has not: it is for the eye. */}
      <div aria-hidden="true" className="flex shrink-0 items-center pl-1">
        {count === 0
          ? [0, 1, 2].map((seat) => (
              <span
                key={seat}
                className="-ml-1.5 h-7 w-7 rounded-full border-[1.5px] border-dashed border-border-strong bg-surface-1"
              />
            ))
          : faces.map((face, index) => (
              <span key={index} className="-ml-1">
                <AvatarRing
                  handle={face.handle}
                  avatarColor={face.avatarColor}
                  avatarSecondColor={face.avatarSecondColor}
                  size={28}
                  cutout="var(--surface-1)"
                />
              </span>
            ))}
        {more > 0 && (
          <span className="-ml-1 flex h-7 min-w-7 items-center justify-center rounded-[14px] bg-surface-3 px-[7px] font-mono text-[10px] font-bold text-fg-muted shadow-[0_0_0_2px_var(--surface-1)]">
            {COPY.joinedMore(more)}
          </span>
        )}
      </div>
    </div>
  );
};
