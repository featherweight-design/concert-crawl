// The toasts a past-attendance edit raises (edit-concerts handoff: removed_m,
// addendum 3: removed-d, removed-no-undo-m). Built once here so the Concerts
// list and the event page cannot drift.

import { toast } from 'sonner';
import { actionToastOptions, TOAST_ICON_SIZE } from '@/lib/action-toast';
import { GOING_COPY } from '../definitions/copy';

export const ATTENDANCE_TOAST_MS = 6000;

// One toast at a time: a new one carries this id, so it replaces the last
// rather than stacking (addendum 3, ruling 7).
const ATTENDANCE_TOAST_ID = 'attendance';

const CheckIcon = () => (
  <svg
    width={TOAST_ICON_SIZE}
    height={TOAST_ICON_SIZE}
    viewBox="0 0 18 18"
    fill="none"
    stroke="var(--success, #5ee08a)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3.5 9.5l3.6 3.6 7.4-8" />
  </svg>
);

/**
 * The house Undo toast (`04/removed-d`): the check, the dark elevated card and
 * the shared action ink (`actionToastOptions`), for ~6s. Watching's No longer listed dismiss raises it
 * too, under its own id, so the two lists never replace each other's toast.
 */
export const showUndoToast = ({
  id,
  message,
  undoLabel,
  onUndo,
}: {
  id: string;
  message: string;
  undoLabel: string;
  onUndo: (() => void) | null;
}) =>
  toast(message, {
    id,
    icon: <CheckIcon />,
    duration: ATTENDANCE_TOAST_MS,
    ...actionToastOptions,
    action: onUndo ? { label: undoLabel, onClick: onUndo } : undefined,
  });

/** "{artist} is out of your Concerts." with Undo, or without when `onUndo` is null. */
export const showRemovedToast = ({
  artist,
  onUndo,
}: {
  artist: string;
  onUndo: (() => void) | null;
}) =>
  showUndoToast({
    id: ATTENDANCE_TOAST_ID,
    message: GOING_COPY.toast.removed(artist),
    undoLabel: GOING_COPY.toast.undo,
    onUndo,
  });

/**
 * "Stamped. {artist} is in your Concerts." with a link on to the Passport, or
 * with an Undo where the reader stays put (the Add sheet, add-tapped-d).
 */
export const showStampedToast = (
  // One action or the other, never neither or both.
  input: { artist: string } & (
    | { onOpenPassport: () => void; onUndo?: never }
    | { onUndo: () => void; onOpenPassport?: never }
  ),
) =>
  toast(GOING_COPY.toast.stamped(input.artist), {
    id: ATTENDANCE_TOAST_ID,
    icon: <CheckIcon />,
    duration: ATTENDANCE_TOAST_MS,
    ...actionToastOptions,
    action: input.onUndo
      ? { label: GOING_COPY.toast.undo, onClick: input.onUndo }
      : { label: GOING_COPY.toast.openPassport, onClick: input.onOpenPassport },
  });

export const showAttendanceError = (kind: 'save' | 'undo') =>
  toast.error(
    kind === 'save' ? GOING_COPY.toast.saveFailed : GOING_COPY.toast.undoFailed,
    { id: ATTENDANCE_TOAST_ID },
  );
