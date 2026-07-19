// All customer-facing strings for the Spotify connect flow + Connections
// settings (#763 PR 5). Copy lifted verbatim from the design handoff mocks
// (design/design_handoff_spotify_sync/) with the two READINESS polish fixes
// applied: "Denver" capitalized in the empty-state eyebrow, and the
// first-watch nudge glyph is an eye (watching), not a heart.
// Voice: Sour Patch — recognition, never surveillance.

export const SPOTIFY_COPY = {
  connectEntry: {
    sectionTitle: 'Connections',
    sectionSub:
      "Link a service and we'll tune your browsing to what you already love. One thing so far.",
    serviceName: 'Spotify',
    notConnected: 'Not connected',
    pitch:
      "Bring over the artists you already follow and play the most. We'll flag their Denver shows the moment they land.",
    cta: 'Connect Spotify',
    footer: 'READ-ONLY · UNLINK ANYTIME · WE NEVER SEE YOUR PASSWORD',
  },
  oauthHandoff: {
    eyebrow: 'HANDING OFF TO SPOTIFY',
    title: "You'll log in on Spotify's page — not ours.",
    body: "We ask Spotify one question: which artists do you love? Here's exactly what that does and doesn't mean.",
    continueCta: 'Continue to Spotify',
    cancelCta: 'Cancel',
    ariaLabel: 'Connect Spotify',
  },
  honestyRail: [
    {
      head: 'We never see your password.',
      sub: "You log in on Spotify's own page. We just get a yes.",
      icon: 'lock',
    },
    {
      head: 'Read-only. Your top & followed artists.',
      sub: 'No playlists changed, nothing posted, nothing played.',
      icon: 'eye',
    },
    {
      head: 'Unlink anytime, one tap.',
      sub: 'Disconnect wipes the token and the taste match on the spot.',
      icon: 'broken-link',
    },
  ],
  connectSuccess: {
    eyebrow: 'SPOTIFY · LINKED',
    title: 'Got it. We know your taste now.',
    // Rendered with bold counts injected around the numbers.
    bodyBeforeArtists: "Here's what you told Spotify you love — ",
    bodyArtistsSuffix: ' artists',
    bodyBetween: ', and ',
    bodyAfterDenver: ' of them play Denver.',
    statArtists: 'ARTISTS',
    statDenver: 'PLAY DENVER',
    statSynced: 'SYNCED',
    statSyncedValue: 'Now',
    recognizedLabel: 'WE RECOGNIZED',
    moreChip: (count: number) => `+${count} more`,
    cta: 'See my Denver shows',
    ariaLabel: 'Spotify linked',
  },
  autoWatchSheet: {
    eyebrow: (count: number) => `${count} ARTISTS PLAY DENVER`,
    eyebrowSingular: '1 ARTIST PLAYS DENVER',
    title: 'Want us to watch these for you?',
    body: '"Watching" a show means you get a heads-up on new dates and price drops. Your call how eager we are.',
    optionAuto: {
      head: 'Auto-watch matching shows',
      sub: (count: number) =>
        `We'll add all ${count} to your Watching list now, and any new match automatically. Undo any single one anytime.`,
    },
    optionHighlight: {
      head: 'Just highlight them',
      sub: "We'll mark matching shows with a 'You follow' badge as you browse. You decide what to watch.",
      defaultPill: 'DEFAULT',
    },
    ctaAuto: (count: number) => `Auto-watch ${count} shows`,
    ctaAutoSingular: 'Auto-watch 1 show',
    ctaHighlight: 'Highlight as I browse',
    footer: 'CHANGE THIS ANYTIME IN SETTINGS ▸ CONNECTIONS',
    ariaLabel: 'Auto-watch matching shows?',
    dismissAria: 'Dismiss',
  },
  connectedCard: {
    serviceName: 'Spotify',
    linkedPill: 'LINKED',
    accountSuffix: ' · spotify.com',
    artistsLabel: 'Artists we know',
    artistsValue: (artists: number) => `${artists}`,
    artistsDenverSuffix: (denver: number) => ` · ${denver} play Denver`,
    lastSyncedLabel: 'Last synced',
    syncingValue: 'Syncing…',
    autoWatchLabel: 'Auto-watch matches',
    refreshCta: 'Refresh my taste',
    refreshingCta: 'Syncing…',
    disconnectCta: 'Disconnect',
    footerIdle:
      'Refresh pulls your latest top & followed artists — we also refresh quietly on our own about once a week.',
    footerRefreshing:
      'Checking Spotify for anything new since your last sync. Takes a few seconds.',
    rateLimited: 'Taste was refreshed recently — try again in a few minutes.',
    autoWatchAria: 'Auto-watch matching shows',
  },
  disconnectConfirm: {
    title: 'Unlink Spotify?',
    body: "No hard feelings. Here's exactly what happens the second you tap it:",
    bullets: [
      {
        head: 'We drop the connection.',
        sub: 'Your Spotify token is deleted — we forget how to reach it.',
      },
      {
        head: 'Taste highlights switch off.',
        sub: "No more 'You follow' flags. Your browsing goes back to plain.",
      },
      {
        head: "Shows you're watching stay.",
        sub: 'Anything you already saved is yours — unlinking never touches it.',
      },
    ],
    confirmCta: 'Unlink Spotify',
    keepCta: 'Keep it linked',
    ariaLabel: 'Unlink Spotify?',
  },
  emptyDenverMatch: {
    eyebrow: (count: number) => `${count} artists · 0 in Denver`,
    title: "We got your taste. Denver didn't — yet.",
    body: (count: number) =>
      `None of your ${count} artists have a Denver date on the books right now. The second one does, it jumps to the top of your list.`,
    primaryCta: 'Watch for my artists',
    secondaryCta: 'Browse everything instead',
    ariaLabel: 'No Denver matches yet',
  },
  failConnectDown: {
    eyebrow: 'spotify · no answer',
    title: "Spotify's not picking up.",
    body: "Nothing you did — their side just isn't answering right now. Nothing was linked, so there's nothing to undo.",
    primaryCta: 'Try again',
    secondaryCta: 'Maybe later',
    ariaLabel: 'Spotify connection failed',
  },
  failTokenRefresh: {
    eyebrow: 'sync · lost the thread',
    title: 'We lost the Spotify thread.',
    body: "Your link expired and Spotify wants a fresh hello. Your saved shows are safe — we just can't spot new matches until you reconnect.",
    primaryCta: 'Reconnect Spotify',
    secondaryCta: 'Not now',
  },
  failExternalRevoke: {
    eyebrow: "link · cut on spotify's side",
    title: 'You unlinked us over on Spotify.',
    body: "Totally fair — and it worked. We've cleared the connection here too. Want back in? It's one tap.",
    primaryCta: 'Reconnect Spotify',
    secondaryCta: 'Leave it unlinked',
  },
  revokeBanner: {
    token: {
      head: 'Sync paused — link expired',
      sub: 'Reconnect to spot new matches again.',
    },
    revoke: {
      head: "Unlinked from Spotify's side",
      sub: 'We cleared it here too. Reconnect anytime.',
    },
    cta: 'Reconnect',
    regionAria: 'Spotify connection notice',
  },
  firstWatchNudge: {
    eyebrow: 'NICE — FIRST ONE SAVED',
    title: 'Want the rest picked for your taste?',
    body: "Link Spotify and we'll surface shows from the artists you already play — no more scrolling past them.",
    primaryCta: 'Connect Spotify',
    secondaryCta: 'Not now',
    dismissAria: 'Dismiss',
    ariaLabel: 'Connect Spotify suggestion',
  },
} as const
