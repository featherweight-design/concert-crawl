// The phone's Notifications page and the account menu hand each other two
// one-shot flags through sessionStorage, because the page is a route and the
// menu is state that lives in a provider above it.
//
//  - `from-menu`: the menu's Notifications row pushed the page, so the page's
//    `‹ Menu` can go back in history (a deep link has nothing to go back to).
//  - `reopen`: the page asked for the menu to be open when it lands.
//
// Every read is a take: it clears the flag, so a stale one can never reopen
// the menu on an unrelated visit. Storage can be blocked or throw, so every
// access is guarded and the flows degrade to Browse with the menu closed.

/** The phone Notifications page. Also what the pathname effects key off. */
export const NOTIFICATIONS_PAGE_HREF = '/me/notifications';

const FROM_MENU_KEY = 'cc_notifs_from_menu';
const REOPEN_KEY = 'cc_reopen_account_menu';

function set(key: string): void {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Blocked storage: the flow falls back to Browse with the menu closed.
  }
}

function take(key: string): boolean {
  try {
    const present = window.sessionStorage.getItem(key) === '1';
    if (present) window.sessionStorage.removeItem(key);
    return present;
  } catch {
    return false;
  }
}

export const markCameFromMenu = (): void => set(FROM_MENU_KEY);
export const takeCameFromMenu = (): boolean => take(FROM_MENU_KEY);
export const requestMenuReopen = (): void => set(REOPEN_KEY);
export const takeMenuReopen = (): boolean => take(REOPEN_KEY);
