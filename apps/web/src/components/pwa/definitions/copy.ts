// Verbatim voice-passed copy from design/design_handoff_pwa_cluster/pwa-data.jsx
// INSTALL_COPY — do not rewrite; the strings passed the #782 Sour Patch voice bar
// during the design brief workshop (2026-07-18) and were locked in the READINESS
// review (verdict 🟢 Green).

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

// Kept for the Tier B offline banner; PR-B (#970) replaces this map with
// OFFLINE_COPY that mirrors the design handoff's OFFLINE_COPY.
export const PWA_COPY = {
  offlineBanner: 'You’re offline — showing recently loaded shows.',
  dismiss: 'Dismiss',
} as const
