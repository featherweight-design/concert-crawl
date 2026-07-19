// #1061 / #1062 post-watch permission-sheet dismissal store.
//
// Separate from install-dismissal (which follows a 30-day quiet → retire
// state machine) because the post-watch sheet has different UX rules:
// once the user says "Not now" or dismisses via Escape / scrim tap, the
// sheet never returns automatically. Manual re-enable path is Settings →
// Notifications.

const KEY = 'cc-push-postwatch-dismissed'

export const hasDismissedPostWatchAsk = (): boolean => {
  // Wrap the whole read in try/catch — merely accessing localStorage can
  // throw SecurityError in Safari private mode / restricted iframes, and
  // JSON isn't involved so nothing else needs a guard.
  try {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(KEY) === '1'
  } catch (readErr) {
    console.warn('post-watch-dismissal: read failed', readErr)
    return false
  }
}

export const markPostWatchAskDismissed = (): void => {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, '1')
  } catch (writeErr) {
    // Quota-exceeded or disabled storage — no-op so a failed persist can't
    // break the click handler. Worst case: the sheet fires again on the
    // next Watch; user can dismiss it a second time.
    console.warn('post-watch-dismissal: write failed', writeErr)
  }
}
