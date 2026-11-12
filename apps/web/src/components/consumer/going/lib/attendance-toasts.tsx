// The toasts a past-attendance edit raises (edit-concerts handoff: removed_m,
// addendum 3: removed-d, removed-no-undo-m). Built once here so the Concerts
// list and the event page cannot drift.

import { toast } from 'sonner';
import { GOING_COPY } from '../definitions/copy';

export const ATTENDANCE_TOAST_MS = 6000;

// One toast at a time: a new one carries this id, so it replaces the last
// rather than stacking (addendum 3, ruling 7).
const ATTENDANCE_TOAST_ID = 'attendance';

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
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

// The shared toaster is the default light one; these draw the board's dark,
// elevated toast with the accent-coloured action.
const TOAST_STYLE = {
  background: 'var(--bg-elevated)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
} as const;

const ACTION_STYLE = {
  background: 'transparent',
  color: 'var(--accent)',
  fontWeight: 700,
} as const;

/** "{artist} is out of your Concerts." with Undo, or without when `onUndo` is null. */
export const showRemovedToast = ({
  artist,
  onUndo,
}: {
  artist: string;
  onUndo: (() => void) | null;
}) =>
  toast(GOING_COPY.toast.removed(artist), {
    id: ATTENDANCE_TOAST_ID,
    icon: <CheckIcon />,
    duration: ATTENDANCE_TOAST_MS,
    style: TOAST_STYLE,
    actionButtonStyle: ACTION_STYLE,
    action: onUndo
      ? { label: GOING_COPY.toast.undo, onClick: onUndo }
      : undefined,
  });

/** "Stamped. {artist} is in your Concerts." with a link on to the Passport. */
export const showStampedToast = ({
  artist,
  onOpenPassport,
}: {
  artist: string;
  onOpenPassport: () => void;
}) =>
  toast(GOING_COPY.toast.stamped(artist), {
    id: ATTENDANCE_TOAST_ID,
    icon: <CheckIcon />,
    duration: ATTENDANCE_TOAST_MS,
    style: TOAST_STYLE,
    actionButtonStyle: ACTION_STYLE,
    action: { label: GOING_COPY.toast.openPassport, onClick: onOpenPassport },
  });

export const showAttendanceError = (kind: 'save' | 'undo') =>
  toast.error(
    kind === 'save' ? GOING_COPY.toast.saveFailed : GOING_COPY.toast.undoFailed,
    { id: ATTENDANCE_TOAST_ID },
  );
