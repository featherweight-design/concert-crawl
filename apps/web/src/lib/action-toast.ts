// The one look for every toast that carries an action (B+ addendum 3, board
// 04/removed-d): the dark surface-3 pill with its action in signal cyan at
// weight 800. The shared <Toaster> is sonner's default light one, so a toast
// with an action spreads these options in rather than restyling it locally.
// Any new toast with an action uses this, so the action never drifts back to
// the accent pink.

import type { ExternalToast } from 'sonner';

/** The board's check and status icons sit at 16px beside the message. */
export const TOAST_ICON_SIZE = 16;

export const ACTION_TOAST_STYLE = {
  background: 'var(--surface-3)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
} satisfies NonNullable<ExternalToast['style']>;

export const TOAST_ACTION_STYLE = {
  background: 'transparent',
  color: 'var(--signal)',
  fontWeight: 800,
} satisfies NonNullable<ExternalToast['actionButtonStyle']>;

/** Spread into a toast's options when it has an action. */
export const actionToastOptions = {
  style: ACTION_TOAST_STYLE,
  actionButtonStyle: TOAST_ACTION_STYLE,
} satisfies Pick<ExternalToast, 'style' | 'actionButtonStyle'>;
