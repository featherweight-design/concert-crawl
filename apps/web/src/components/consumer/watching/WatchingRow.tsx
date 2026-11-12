'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { WatchingShow } from '@concert-crawl/types';
import { EventRow, fromWatchingShow } from '@/components/consumer/event-row';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { GoingNudge } from '@/components/consumer/going/GoingNudge';
import { isInNudgeWindow } from '@/lib/going/nudge-window';
import { markNudge, readNudgeState } from '@/lib/going/nudge-dismissal';
import type { NudgeOutcome } from '@/lib/going/nudge-dismissal';
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle';
import { isOptimisticWatchRow } from '@/lib/queries/optimistic-watch-row';
import { isDelisted } from '@/components/consumer/event-row/lib/row-status';

const COPY = CONSUMER_COPY.watching;

interface WatchingRowProps {
  show: WatchingShow;
  onRemove: (userEventId: string) => void;
  /**
   * Hides a No longer listed row for this viewer. Without it a delisted row
   * keeps the remove ×.
   */
  onDismiss?: (show: WatchingShow) => void;
}

// The live row's remove ×: a 12px glyph.
const REMOVE_GLYPH = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M1 1l10 10M11 1L1 11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// The No longer listed row's dismiss ×: the board's glyph (14px box, 16-unit
// view, 1.6 stroke). It is smaller than the remove × on purpose: measured on
// the board it draws about 8.4px of ink at a 1.4px stroke, against the remove
// ×'s 11.5px at 1.5px. Same colour, no opacity: it is never dimmed.
const DISMISS_GLYPH = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M4 4l8 8M12 4l-8 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface RowActionProps {
  label: string;
  onClick: () => void;
  glyph: ReactNode;
  testId?: string;
}

// The row's one action control. `data-row-action` lets the list hand focus
// back to it after a failed dismiss.
const RowAction = ({ label, onClick, glyph, testId }: RowActionProps) => (
  <button
    type="button"
    data-testid={testId}
    data-row-action=""
    aria-label={label}
    onClick={onClick}
    // A small paint box padded out to the 44px minimum target: the visible
    // control stays quiet without shrinking what a thumb has to hit.
    className="-m-2 flex h-11 w-11 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
  >
    {glyph}
  </button>
);

/**
 * Watching's row is `EventRow` plus the two things only this list has: the
 * remove control in the action gutter, and the going nudge below the row.
 * The nudge sits in the footer slot deliberately — it is outside the row's
 * four-line contract and spends none of the chip budget.
 */
export const WatchingRow = ({
  show,
  onRemove,
  onDismiss,
}: WatchingRowProps) => {
  const attending = useAttendingToggle();

  // `undefined` means "not read yet". The record lives in localStorage, so the
  // server render can't know it — starting at undefined keeps the first client
  // paint identical to the server's and avoids a hydration mismatch.
  const [answered, setAnswered] = useState<NudgeOutcome | null | undefined>(
    undefined,
  );
  // Keyed on the watch row, so unwatching and re-watching clears the answer and
  // the nudge is free to ask again.
  useEffect(() => {
    setAnswered(readNudgeState(show.userEventId));
  }, [show.userEventId]);

  // An optimistic row's id is a placeholder the server response replaces, so an
  // answer recorded against it would be forgotten the moment the real id lands
  // and the nudge would reappear. Hold it back for that one network hop.
  const nudging =
    answered === null &&
    !isOptimisticWatchRow(show.userEventId) &&
    isInNudgeWindow(show);

  const answer = (outcome: NudgeOutcome) => {
    markNudge(show.userEventId, outcome);
    setAnswered(outcome);
  };

  // A No longer listed row's × hides the row for this viewer instead of
  // unwatching (addendum 3, `02/nll-row-watching-m`: "the dismiss × stays").
  const dismiss = isDelisted(show.eventStatus, show.eventDelistedAt)
    ? onDismiss
    : undefined;

  return (
    <EventRow
      show={fromWatchingShow(show)}
      surface="watching"
      action={
        dismiss ? (
          <RowAction
            label={COPY.watchingItem.dismissAriaLabel(show.artist)}
            onClick={() => dismiss(show)}
            glyph={DISMISS_GLYPH}
            testId="watching-dismiss"
          />
        ) : (
          <RowAction
            label={COPY.watchingItem.removeAriaLabel(show.artist)}
            onClick={() => onRemove(show.userEventId)}
            glyph={REMOVE_GLYPH}
          />
        )
      }
      footer={
        nudging ? (
          <div className="mt-1.5">
            <GoingNudge
              show={show}
              onYes={() => {
                // Closes immediately — the mutation is optimistic, and re-asking
                // mid-flight would read as a failure. But the per-device record
                // is only written once the server agrees: persisting up front
                // would silently swallow a failed commitment and leave no way
                // to retry.
                setAnswered('going');
                attending.mutate(
                  { eventId: show.eventId, going: true },
                  {
                    onSuccess: () => markNudge(show.userEventId, 'going'),
                    onError: () => setAnswered(null),
                  },
                );
              }}
              onDismiss={() => answer('dismissed')}
            />
          </div>
        ) : null
      }
    />
  );
};
