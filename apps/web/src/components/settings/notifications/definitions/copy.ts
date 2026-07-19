// Verbatim voice-passed copy from design/design_handoff_pwa_cluster/pwa-data.jsx
// PUSH_COPY.settings — do not rewrite; the strings passed the #782 Sour Patch
// voice bar during the design brief workshop (2026-07-18) and were locked in
// the READINESS review.

export const NOTIFICATIONS_COPY = {
  heading: 'Notifications',
  master: 'Push notifications',
  masterOnDetail: 'On — this device',
  masterOffDetail: 'Off',
  subs: [
    {
      key: 'watch',
      label: 'Watch updates',
      detail:
        "Price drops, sell-outs, date changes, cancellations — for shows you're watching.",
    },
    {
      key: 'price',
      label: 'Price drops',
      detail: 'A separate ping the moment a watched show gets cheaper.',
    },
  ] as const,
  empty: {
    title: 'No notifications yet.',
    sub: "Watch a show and we'll ask if you want a heads-up when its tickets or details change. Or flip this on now.",
    cta: 'Turn on notifications',
  },
  denied: {
    title: 'Notifications are blocked in your browser.',
    sub: "You (or your phone) told the browser no, and we can't override that — only you can. Flip it back on in your browser's site settings, then come back here.",
    link: 'How to unblock notifications',
    linkHref: 'https://support.mozilla.org/en-US/kb/push-notifications-firefox',
    badge: 'Blocked',
  },
  iosHint:
    "On iPhone, notifications only work from the home-screen app — which you've got. Nice.",
  iosNeedsInstallHint:
    'On iPhone, notifications only work when Concert Crawl is added to your Home Screen. Tap Install (top right) to add it.',
  loadError:
    "Couldn't load your notification settings. Refresh the page to try again.",
  // Shown when the master preference is on (from another device) but this
  // browser has no push subscription of its own. Copy stays neutral so the
  // user isn't asked to make a decision they've already made — the switch
  // is on globally; we're just wiring this device into the same setting.
  enableOnDevice: {
    sub: 'Notifications are on for your account, but not for this device yet.',
    cta: 'Enable on this device',
  },
} as const
