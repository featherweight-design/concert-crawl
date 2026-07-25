// All customer-facing strings for the Spotify connect flow + Connections
// settings (#763 PR 5). Copy lifted verbatim from the design handoff mocks
// (design/design_handoff_spotify_sync/) with the two READINESS polish fixes
// applied: "Denver" capitalized in the empty-state eyebrow, and the
// first-watch nudge glyph is an eye (watching), not a heart.
// Voice: Sour Patch — recognition, never surveillance.

// Oxford-comma list join for the detail attribution strip: "X", "X and Y",
// "X, Y, and Z".
const formatArtistList = (artists: readonly string[]): string => {
  if (artists.length <= 1) return artists[0] ?? ''
  if (artists.length === 2) return `${artists[0]} and ${artists[1]}`
  return `${artists.slice(0, -1).join(', ')}, and ${artists[artists.length - 1]}`
}

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
  // Not in the mocks: the post-OAuth-return POST runs the first sync inline
  // (a few seconds), so the return flow needs a visible in-flight state.
  connectPending: {
    eyebrow: 'SPOTIFY · LINKING',
    title: 'Pulling your taste over…',
    body: 'Asking Spotify which artists you love. Takes a few seconds.',
    ariaLabel: 'Linking Spotify',
  },
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
    moreChipAria: (count: number) =>
      `Show ${count} more recognized artist${count === 1 ? '' : 's'}`,
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
    accountFallback: 'spotify.com',
    artistsLabel: 'Artists we know',
    artistsValue: (artists: number) => `${artists}`,
    artistsDenverSuffix: (denver: number) => ` · ${denver} play Denver`,
    lastSyncedLabel: 'Last synced',
    lastSyncedNever: '—',
    syncingValue: 'Syncing…',
    autoWatchLabel: 'Auto-watch matches',
    // Web Push toggle (#763 PR 9). Label matches the R2 surface name locked
    // in the taste-filter upsell ("New-show alerts"); the state notes aren't
    // in the mocks (real-browser constraints), written in the same voice.
    pushLabel: 'New-show alerts',
    pushAria: 'Push alerts when your artists add Denver shows',
    pushDenied:
      "Notifications are blocked for us in this browser. Allow them in your browser's site settings, then flip this on.",
    pushPromptDismissed:
      'No worries — flip this on whenever you change your mind and allow notifications.',
    pushUnsupported: "This browser can't do push notifications.",
    pushIosInstall:
      'On iPhone, push needs the app on your Home Screen first — Share → Add to Home Screen, then flip this on.',
    pushError: "Couldn't update push alerts — give it another try in a second.",
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
    // Copy variant for the API `code: 'no_external_account'` branch —
    // Clerk has no Spotify link because the OAuth flow silently failed
    // (most often a Spotify dev-mode allowlist miss). Actionable copy
    // pointing the user back at Spotify's grant screen instead of the
    // generic "not picking up" body.
    noExternalAccountTitle: "Spotify didn't finish signing you in.",
    noExternalAccountBody:
      'Complete the Spotify sign-in and grant access, then try again.',
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
  // "Following" highlighting on browse/detail surfaces (#763 PR 6, from the
  // follow-highlight.jsx mock). Neutral + Spotify-marked — never --accent,
  // which stays reserved for Watching.
  followHighlight: {
    chip: 'Following',
    // Screen-reader context for the visual "Following" chip/badge — the bare
    // word is ambiguous without the Spotify mark.
    chipAria: 'You follow this artist on Spotify',
    // Detail strip: "You follow X on Spotify" / "You follow X and Y on
    // Spotify" / "You follow X, Y, and Z on Spotify". The mock shows the
    // single-artist form; the list join extends it for multi-match bills.
    strip: (artists: readonly string[]) =>
      `You follow ${formatArtistList(artists)} on Spotify`,
  },
  // Taste filter chip + upsell (#763 PR 7, from the taste-filter.jsx mock).
  // The chip is the one locked-visible surface in the entitlements matrix —
  // free/supporter viewers see it locked and tapping opens the upsell.
  tasteFilter: {
    chip: 'Following',
    // A11y: the locked chip stays operable (it opens the upsell), so the
    // paid state is conveyed by this label alone — no aria-disabled.
    chipLockedAria: 'Following filter, paid',
    chipAria: 'Filter to artists you follow',
    banner: (count: number) => `${count} Denver shows by artists you follow`,
    bannerSingular: '1 Denver show by artists you follow',
    // Empty state when the filter is on but no Spotify is linked — the API
    // returns an empty 200 for entitled viewers with zero follow rows, so
    // without this the page shows a generic "no hits" with no way forward.
    emptyNotConnected: {
      eyebrow: 'Following · not linked',
      title: "We can't see your artists yet.",
      body: "The Following filter runs on your Spotify follows, and nothing's linked right now. Connect and this view fills itself in.",
      primaryCta: 'Connect Spotify',
      secondaryCta: 'Browse everything instead',
    },
    upsell: {
      eyebrow: 'TASTE FILTER · PREMIUM',
      title: 'Slice the whole calendar by your taste.',
      // Body renders with the middle segment bolded (mock: <b>Following</b>).
      bodyBeforeBold:
        'Filtering Denver down to just the artists you follow is a paid perk. Connecting Spotify and spotting the odd ',
      bodyBold: 'Following',
      bodyAfterBold: ' tag stays free — this is the power tool.',
      bullets: [
        {
          head: 'Following',
          sub: 'Filter any view to your artists in one tap',
        },
        {
          head: 'Taste picks',
          sub: "A 'based on your taste' shelf on browse",
        },
        {
          head: 'New-show alerts',
          sub: 'Push + a weekly Denver digest',
        },
      ],
      cta: 'See plans',
      footer: 'PREMIUM $5/MO · FOUNDER $3 LOCKED',
      ariaLabel: 'Taste filter is a paid feature',
      dismissAria: 'Dismiss',
    },
  },
  // "Based on your taste" shelf pinned atop Browse (#763 PR 8, from the
  // discovery-surface.jsx mock). Premium + connected only.
  discovery: {
    title: 'Based on your taste',
    eyebrow: (count: number) => `${count} PICKS · REFRESHED WEEKLY`,
    eyebrowSingular: '1 PICK · REFRESHED WEEKLY',
    // Reason chip labels — richer than follows alone, so reasons vary.
    reasonTopFive: 'In your top 5',
    reasonTop: 'You play them a lot',
    reasonFollowed: 'Following',
    // Screen-reader context — the bare chip label is ambiguous without the
    // Spotify mark.
    reasonAriaPrefix: 'Picked because: ',
    priceTba: 'tba',
    venueDateSeparator: ' · ',
    listAria: 'Shows picked for your taste',
    allShowsDivider: 'All Denver shows',
    empty: {
      eyebrow: 'QUIET MONTH',
      title: 'Your artists are lying low.',
      body: 'Nobody from your taste has a Denver date this month. We refresh picks weekly — or dig through everything yourself.',
      cta: 'Browse all shows',
    },
    failure: {
      eyebrow: 'TASTE ON PAUSE',
      title: "Can't read your taste right now.",
      body: 'Your Spotify link needs a refresh, so picks are paused. Your saved shows are untouched — reconnect to bring taste back.',
      primaryCta: 'Reconnect Spotify',
      secondaryCta: 'Browse all shows',
    },
    // Cold-hydration/mid-session-upgrade loading state — entitled + connected
    // + picks pending. Reserves the shelf footprint so real data lands with
    // zero shift. Timeout chip after 8s per the design handoff.
    loading: {
      eyebrow: 'READING YOUR SPOTIFY FOLLOWS…',
      eyebrowTimeout: 'TAKING LONGER THAN USUAL',
      ariaLabel: 'Loading picks based on your taste',
      timeout: {
        eyebrow: 'STILL TUNING',
        title: 'Picks are taking a beat.',
        retryCta: 'Retry',
      },
    },
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
