// Verbatim voice-passed copy from design/design_handoff_pwa_cluster/pwa-data.jsx.
// Do not rewrite — the strings passed the #782 Sour Patch voice bar during the
// design brief workshop (2026-07-18) and were locked in the READINESS review
// (verdict 🟢 Green).

export const INSTALL_COPY = {
  slotLabel: 'Install',
  slotAria: 'Install Concert Crawl',
  sheet: {
    eyebrow: 'Add to Home Screen',
    title: 'Put Concert Crawl on your home screen',
    sub: "Safari won't do it for you on iPhone — here's the 10-second version.",
    steps: [
      {
        icon: 'share',
        num: '1',
        label: 'Tap Share',
        detail: "The square-with-an-arrow, down in Safari's toolbar.",
      },
      {
        icon: 'plus',
        num: '2',
        label: 'Scroll to “Add to Home Screen”',
        detail: "It's a few rows down, past the AirDrop stuff.",
      },
      {
        icon: 'home',
        num: '3',
        label: 'Tap Add',
        detail: 'Top-right corner. Now it opens full-screen, no address bar.',
      },
    ],
    done: 'Got it',
  },
  dismissAria: 'Dismiss install prompt',
  dismissNote:
    "We'll quit asking. You can still add it from Settings whenever.",
} as const

export const OFFLINE_COPY = {
  pillLabel: 'Offline · cached OK',
  pillAria: "You're offline. Cached shows are still available.",
  fallback: {
    eyebrow: 'No signal',
    title: "You're offline — here's what you can still see.",
    sub: "The shows you've already looked at are saved on your phone. Live prices and anything new will load when you're back.",
    retry: 'Try again',
    shortcutsLabel: 'Saved on your phone',
    authNote:
      "Your account stuff (watchlist, settings) needs a connection — it'll be back when you are.",
    empty: {
      title: 'Nothing cached yet.',
      sub: "First visit, or a fresh phone? There's nothing saved to show offline yet. Hit retry once you've got signal and we'll start keeping the shows you browse.",
      link: 'Back to cached content',
    },
  },
} as const
