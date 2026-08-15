// Mixed sources, so check which one a string belongs to before editing it.
//
// The push strings are verbatim from
// design/design_handoff_pwa_cluster/pwa-data.jsx PUSH_COPY.settings — do not
// rewrite; they passed the #782 Sour Patch voice bar during the design brief
// workshop (2026-07-18) and were locked in the READINESS review.
//
// Everything under `artists` is native following and is NOT design-locked: it
// was written here and passed the copy-review skill. Ordinary copy-review rules
// apply to it. Each block below says which it is.

export const NOTIFICATIONS_COPY = {
  heading: 'Notifications',
  master: 'Push notifications',
  masterOnDetail: 'On for this device',
  masterOffDetail: 'Off',
  // Native following. The artist group sits ABOVE the watch group so the list
  // reads in funnel order: an artist announces a date, you watch it, the price
  // moves. Copy passed the copy-review skill in apply mode on the branch that
  // added it; the design prototype's strings were placeholders.
  artists: {
    heading: 'Artists you follow',
    alerts: {
      label: 'New show alerts',
      // The one fact the interface cannot carry: these are event-driven, so
      // there is no schedule to wait for and no digest to compare them to.
      detail:
        'An artist you follow books a Denver date. Sent when we find it, not on a schedule.',
    },
    autoWatch: {
      label: 'Add them to Watching for me',
      detail: 'Off means you get the ping and decide yourself.',
    },
    digest: {
      label: 'Weekly digest',
      // MONDAY, matching the shipped `concert-crawl-spotify-weekly` cron
      // (`30 15 * * 1`, 15:30 UTC). The design prototype said Friday in two
      // places and was wrong; nothing in this epic moves the cron.
      detail:
        'One email Monday morning with everything your artists have coming up.',
    },
    // Rendered uppercase in CSS so the accessible name stays readable.
    newBadge: 'New',
    locked: {
      title: 'New show alerts',
      detail:
        'Following artists is part of Premium. Upgrade and these switch on.',
      cta: 'See Premium',
    },
    // Only for a connected user: the same switches govern Spotify-sourced
    // artists, so nobody goes hunting for a second set in Connections.
    spotifyNote:
      'These cover artists from Spotify too. One set of switches, whatever filled the list.',
  },
  // #1572. Its own group, outside the push master AND outside the entitlement
  // gate the digest sits behind: an opt-out we are obliged to offer cannot
  // live under an upgrade card. Copy passed the copy-review skill in apply
  // mode on the handoff branch.
  productEmail: {
    heading: 'Email from us',
    label: 'News, offers, and the occasional nudge',
    onDetail: 'Rare. A discount, or a heads-up when a gift is running out.',
    offDetail: 'Off. Nothing from us but billing.',
    // Obligation class: it explains why billing has no switch instead of
    // asserting a rule, which is the whole reason it is prose and not a row.
    billingFootnote:
      "Billing email always sends: receipts, a failed charge, a card about to expire. Those aren't news, they're your subscription talking, and missing one is how people lose a plan without knowing why.",
  },
  watching: {
    heading: "Shows you're watching",
  },
  subs: [
    {
      key: 'watch',
      label: 'Watch updates',
      detail:
        "Price drops, sell-outs, date changes, cancellations. For shows you're watching.",
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
    sub: "You (or your phone) told the browser no, and we can't override that. Only you can. Flip it back on in your browser's site settings, then come back here.",
    link: 'How to unblock notifications',
    linkHref: 'https://support.mozilla.org/en-US/kb/push-notifications-firefox',
    badge: 'Blocked',
  },
  iosHint:
    "On iPhone, notifications only work from the home-screen app, which you've got. Nice.",
  iosNeedsInstallHint:
    'On iPhone, notifications only work when Concert Crawl is added to your Home Screen. Tap Install (top right) to add it.',
  // #1226 PR-7. Crew activity is bell-only, so this block sits OUTSIDE the
  // push master switch: muting a crew has nothing to do with whether push is
  // on, and burying it under a switch most users leave off would make it
  // unreachable. One row per crew, because a mute is per crew.
  crew: {
    heading: 'Crew activity',
    detail:
      'Crew news only ever shows up in your bell, never as a push. Mute a crew to keep it out of there too.',
    empty: "You're not in a crew yet.",
    loadError: "Couldn't load your crews. Refresh the page to try again.",
    /** The switch is ON when the crew is UNMUTED — a switch reads as "am I getting this". */
    rowLabel: (name: string) => `Crew activity for ${name}`,
    on: 'In your bell',
    off: 'Muted',
  },
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
  // #1130 fix — visible error banner when the toggle pipeline fails. Prior
  // behavior was a silent console.warn, which read to the user as "the
  // toggle does nothing." Three distinct messages so ops can distinguish
  // client-side (subscribe error, usually server 503) from write-through
  // (patch error) from unexpected throws.
  toggleError: {
    // `subscribeToPush` returns { status: 'error' } for a bunch of things:
    // server 503 (VAPID missing), missing client-side VAPID key, no
    // service worker registered, browser subscribe rejection. Keep the
    // copy neutral so it reads honestly regardless of which end failed.
    subscribe:
      "Couldn't turn on push right now. Something went wrong wiring up notifications. Try again in a minute; if it keeps failing, something's off on our end.",
    // Rollback via unsubscribeFromPush is best-effort and can itself
    // fail (caught + logged). The wording reflects that we attempted
    // to roll back rather than that we definitely did.
    patch:
      "Saved the subscription but couldn't record your preference. We tried to undo it. Please try again.",
    generic:
      'Something went sideways turning that on. Try again; if it keeps happening let us know.',
    // Any of the preference switches below the master one. They write nothing
    // but a boolean, so there is no rollback to describe, only a retry.
    preference: "Couldn't save that switch. Flip it again in a moment.",
  },
} as const
