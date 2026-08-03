// Panel CHROME copy for the in-app notification surface (#737), lifted
// verbatim from design_handoff_in_app_notifications/notifications-data.jsx
// (NOTIF_COPY, R2).
//
// ⚠ SCOPE: this object owns the panel's own words — empty, loading, error,
// dividers, buttons, labels. It does NOT own a row's `title` / `body`: those
// are written by the backend fan-outs (packages/push/src/definitions/copy.ts,
// apps/api/src/lib/contest-notifications.ts) and are rendered verbatim from
// the API. The panel composes no sentences about a notification.
//
// Some keys below are consumed by the chrome PR (avatar, user menu, inbox
// strip) rather than by the panel body. Four keys that no surface ever read —
// pipLabel, slowRetry, emptyHint, unreadTag — were deleted in the editorial
// copy pass, so this object now tracks what ships rather than the full design
// copy deck. (`loadingVisible` had no render site in the handoff either; it
// now labels the load-more button in-flight — see its use site in NotifBody.)

export const NOTIFICATIONS_COPY = {
  bellLabel: (count: number): string =>
    count > 0 ? `Notifications, ${count} unread` : 'Notifications',
  panelTitle: 'What you missed',
  panelSub: (count: number): string => (count === 1 ? '1 new' : `${count} new`),
  markAll: 'Mark all read',
  markedAll: 'All caught up.',
  seeAll: (count: number): string =>
    count > 1 ? `See all ${count}` : 'See it',
  menuRow: 'Notifications',
  menuBack: 'Menu',
  closeLabel: 'Close notifications',
  loadMore: 'Older notifications',
  loading: 'Checking what you missed…',
  loadingVisible: 'Catching up…',
  error: "Couldn't reach the crawl.",
  errorBody: "Poll failed. Nothing's lost: it's all still on the server.",
  errorAction: 'Retry',
  /**
   * A read mutation that failed and rolled back. Without this the count snaps
   * back to where it was and the button reads as if it undid itself.
   */
  actionFailed: "That didn't stick. Nothing changed. Try again.",
  emptyTitle: 'All quiet.',
  emptyBody:
    "Nothing's dropped, moved, or sold out on you yet. We'll make noise when it does.",
  emptyAction: 'Find something to watch',
  endOfList: "That's everything. Denver's been calm.",
  today: 'Today',
  yesterday: 'Yesterday',
  segments: { shows: 'Shows', alerts: 'Alerts', prices: 'Prices' },
} as const

/** Where the empty-state CTA sends someone with nothing to catch up on. */
export const NOTIFICATIONS_EMPTY_ACTION_HREF = '/events'
