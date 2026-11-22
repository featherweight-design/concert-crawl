// The account menu's Send feedback row carries a New pill until the fan first
// opens feedback from it (addendum-3 §6 row 3: "it goes on first open").
// Per device, in localStorage: the pill is a nudge, not account state.

const KEY = 'cc.feedback-menu-seen';

/** True once this device has opened feedback from the menu. */
export function hasSeenFeedbackMenu(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch (err) {
    console.warn('feedback-menu-seen: storage read blocked', err);
    // Storage blocked (privacy mode, sandboxed frame): show the pill.
    return false;
  }
}

export function markFeedbackMenuSeen(): void {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch (err) {
    console.warn('feedback-menu-seen: storage write blocked', err);
    // Storage blocked: the pill comes back next visit, which is harmless.
  }
}
