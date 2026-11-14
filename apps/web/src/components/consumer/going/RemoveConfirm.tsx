'use client';

// "Didn't make it?": the confirm before a past night leaves Concerts
// (edit-concerts handoff: remove_sheet_m on phone, remove_dialog_d from sm).
//
// One component for both, because BottomSheet is already a bottom sheet below
// `sm` and a centred dialog from it. The Concerts list and the event page both
// open it and differ only in the footnote.

import type { HistoryShow } from '@concert-crawl/types';
import { BottomSheet } from '@/components/pwa/BottomSheet';
import { HistoryItem } from '@/components/consumer/history/HistoryItem';
import { GOING_COPY } from './definitions/copy';

const DIALOG_WIDTH = 480;

const noop = () => {};

interface RemoveConfirmProps {
  open: boolean;
  onClose: () => void;
  show: HistoryShow;
  /** Which "Changed your mind?" line sits under the buttons. */
  footnote: 'concerts' | 'show-page';
  onConfirm: () => void;
  /** A remove is in flight: the button reads "Removing…" and both buttons are inert. */
  pending?: boolean;
  /** The last remove failed: an inline error shows and the button reads "Try again". */
  failed?: boolean;
}

export const RemoveConfirm = ({
  open,
  onClose,
  show,
  footnote,
  onConfirm,
  pending = false,
  failed = false,
}: RemoveConfirmProps) => (
  <BottomSheet
    open={open}
    // Nothing dismisses it while a remove is in flight, so the answer lands
    // in a sheet that is still there.
    onClose={pending ? noop : onClose}
    title={GOING_COPY.remove.title}
    maxWidth={DIALOG_WIDTH}
    closeText={GOING_COPY.remove.cancel}
    // The eyebrow and Cancel share one row (`remove-busy-m`), and the desktop
    // dialog wears the gradient top edge (`event-past-remove-d`).
    eyebrow={GOING_COPY.eyebrow.past}
    eyebrowMuted
    edgeFromSm
  >
    <div className="flex flex-col gap-3 pt-1">
      {/* The sheet's own sr-only heading names the dialog; this is the drawn
          title, so it stays a plain element rather than a second heading. */}
      <span
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 900,
          fontSize: 25,
          letterSpacing: '-0.025em',
          color: 'var(--fg)',
        }}
      >
        {GOING_COPY.remove.title}
      </span>
      <p
        className="m-0"
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {GOING_COPY.remove.body}
      </p>

      <HistoryItem show={show} density="compact" preview />

      {failed && !pending && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            lineHeight: 1.4,
            color: 'var(--fg)',
            borderColor: 'color-mix(in oklab, var(--danger) 45%, transparent)',
            background: 'color-mix(in oklab, var(--danger) 10%, var(--bg))',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--danger)' }}>
            ✕
          </span>
          {GOING_COPY.remove.failed}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border-0 px-4 text-[15px] font-extrabold disabled:cursor-default disabled:opacity-60"
          style={{ background: 'var(--danger)', color: 'var(--bg)' }}
        >
          {pending
            ? GOING_COPY.remove.busy
            : failed
              ? GOING_COPY.remove.retry
              : GOING_COPY.remove.confirm}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-[var(--border-strong)] bg-transparent px-4 text-[15px] font-semibold text-[var(--fg)] disabled:cursor-default disabled:opacity-40"
        >
          {GOING_COPY.remove.keep}
        </button>
      </div>

      <p
        className="m-0 text-center uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'var(--fg-subtle)',
        }}
      >
        {footnote === 'concerts'
          ? GOING_COPY.remove.footnoteConcerts
          : GOING_COPY.remove.footnoteShowPage}
      </p>
    </div>
  </BottomSheet>
);
