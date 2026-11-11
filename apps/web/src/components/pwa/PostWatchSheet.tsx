'use client';

// #1062 post-watch permission ask. Fires ~500ms after a user's first
// successful Watch commit when they haven't dismissed the prompt before
// AND haven't already opted in globally. Two variants:
//
// - default: modern browsers (mobile Safari standalone, Chrome, Firefox)
//   can call Notification.requestPermission() directly from the CTA.
// - ios: iOS Safari not-installed → push isn't available at all. The
//   CTA opens IosHowToSheet so the user can add to Home Screen first.

import { BottomSheet } from './BottomSheet';
import { POST_WATCH_COPY } from './definitions/copy';
import {
  EYEBROW_STYLE,
  PWA_GRADIENT,
  SHEET_PRIMARY_CLASS,
} from './definitions/styles';

interface PostWatchSheetProps {
  open: boolean;
  onClose: () => void;
  onTurnOn: () => void | Promise<void>;
  variant?: 'default' | 'ios';
}

const BellIcon = () => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 3a6 6 0 00-6 6v3.5c0 .78-.32 1.52-.87 2.07L4 15.5V17h16v-1.5l-1.13-1.13A2.93 2.93 0 0118 12.5V9a6 6 0 00-6-6z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 20a2.5 2.5 0 005 0"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const PostWatchSheet = ({
  open,
  onClose,
  onTurnOn,
  variant = 'default',
}: PostWatchSheetProps) => {
  const isIos = variant === 'ios';
  const copy = isIos ? POST_WATCH_COPY.ios : POST_WATCH_COPY.default;
  const srTitle = isIos
    ? POST_WATCH_COPY.srTitleIos
    : POST_WATCH_COPY.srTitleDefault;

  return (
    <BottomSheet open={open} onClose={onClose} title={srTitle}>
      <div className="flex flex-col gap-3">
        <div
          className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl border text-accent"
          style={{
            borderColor: 'color-mix(in oklab, var(--accent) 50%, transparent)',
            background: 'color-mix(in oklab, var(--accent) 14%, transparent)',
          }}
        >
          <BellIcon />
        </div>
        <span className="text-accent" style={EYEBROW_STYLE}>
          {copy.eyebrow}
        </span>
        <h3 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
          {copy.title}
        </h3>
        <p className="text-[15px] leading-relaxed text-fg-muted">{copy.sub}</p>
        <div className="mt-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => void onTurnOn()}
            className={SHEET_PRIMARY_CLASS}
            style={{ background: PWA_GRADIENT }}
          >
            {isIos
              ? POST_WATCH_COPY.ios.showMe
              : POST_WATCH_COPY.default.turnOn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-[15px] font-semibold text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            {copy.notNow}
          </button>
        </div>
        {!isIos && (
          <p
            className="mt-1 text-center text-[10px] tracking-[0.02em] text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {POST_WATCH_COPY.default.footnote}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
