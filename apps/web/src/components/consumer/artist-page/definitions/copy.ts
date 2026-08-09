// Every customer-facing string on the artist page (#1115), lifted verbatim
// from design/design_handoff_artist_page/artist-data.jsx.
//
// Honesty rail: every string here has to survive the fact that we only
// partially know this artist. Nothing may imply a complete record, a
// notification promise, or a relationship with the artist's own Spotify
// account.
//
// Artist names, venue names, dates and counts are DATA — they never live here.

export const ARTIST_COPY = {
  // Chrome
  // DELTA vs the handoff: `backLabel` ("Back") is not duplicated here. The
  // back chip is shared with event detail and venue profile, so its accessible
  // name lives once in BACK_CHIP_COPY.label.
  crumbRoot: 'Browse',
  // The breadcrumb <nav> landmark needs a description of the landmark, not the
  // text of its first link — a screen reader announces "<label> navigation".
  crumbAria: 'Breadcrumb',

  // Follow — ONE affordance, one mental model.
  // A show is WATCHED; an artist is FOLLOWED. These are separate concepts and
  // this copy never conflates them.
  //
  // ⚠️ Nothing here may promise that following an artist puts their shows in
  // your Watching. The fan-out now reaches every follow source, but auto-watch
  // is a per-connection preference that a manual follower has never set, and
  // it coalesces to false — deliberately, so that following can never silently
  // mutate Watching (see packages/crawler-core/src/lib/artist-fanout, and
  // issue #1306, which is the scope call behind it).
  // The staging walk for Gate 5 followed an artist with two upcoming shows and
  // /watching still read "0 shows". The behaviour stays; the claim goes.
  follow: 'Follow',
  following: 'Following',
  followPitch: 'Marks them as one of yours. Their dates live on this page.',
  // "You're following." is dropped: the button directly above this line already
  // reads "Following", and a caption that restates the control it sits under is
  // the redundancy rule 1 forbids (copy-audit 02-monetization-artist).
  followPitchActive: 'Their dates live on this page.',
  // DELTA vs the handoff: `followSignedOut` ("Sign in to follow") is dropped.
  // #794 locked the identical-pixels rule — a signed-out visitor sees the same
  // control a signed-in one does, and the sign-in happens on activation. A
  // different visible label would leak auth state back into the layout.
  followSignedOutPitch:
    "Following needs an account. Everything else here doesn't.",
  followAria: (name: string) => `Follow ${name}`,
  followingAria: (name: string) =>
    `Following ${name}. Activate to stop following.`,
  // DELTA vs the handoff: new. The visible label stays "Follow" for a
  // signed-out visitor (above), so the accessible name is where we tell the
  // truth about what activation actually does.
  followSignedOutAria: (name: string) => `Follow ${name}: sign in to follow`,
  // The locked control keeps the visible label "Follow" and the accessible
  // name "Follow <artist>" — same reasoning as the signed-out case, and the
  // handoff draws the same button. That name alone promises a follow that will
  // not happen, so this sentence is where the gate is told. It is referenced by
  // aria-describedby, never rendered visibly.
  followGate: 'Following artists is a Premium feature. Opens upgrade options.',

  // History line — prose. `since` is DATA (crawl start), never hardcoded here,
  // so a licensed backfill changes the number without touching this string.
  historyNone: (since: string) =>
    `First time we've caught them. We only started looking in ${since}.`,
  historyOne: (venue: string) => `We've caught them once: ${venue}.`,
  historyMany: (count: number, venues: string) =>
    `${count} shows on our map: ${venues}.`,

  // Past shows — crawl data only. #1170 blocks deep history and setlists; this
  // is the modest version, and it says out loud where it stops.
  pastTitle: 'Previously',
  pastNote: (since: string) =>
    `Concert Crawl started crawling in ${since}. Shows before that aren't tracked.`,

  // Player / embed (rendered by PR-F; the strings land here with the rest).
  playerRail: 'Player · Spotify',
  playerRailThirdParty: 'third party',
  playerShelfTitle: 'Have a listen',
  playerPreviewNote:
    "30-second previews. Full tracks if you're signed into Spotify.",
  // DELTA vs the handoff: `playerLoading` is dropped. Gate 1 finding 4 dropped
  // the EmbedLoading clock — the Spotify iframe paints its own skeleton, so
  // ours would stack a second one on top of it, and no PR builds the state.
  playerSkip: 'Skip player, go to shows',
  playerTitle: (name: string) => `Spotify player for ${name}`,
  playerNoneRail: 'No player',
  playerNone: "We don't have them on Spotify.",
  // The pointer clause ("Their shows are below.") is dropped: the shows are
  // visibly below, so it labelled the obvious, and carrying it forced a second
  // key for the case where the player is the last block on the page.
  playerNoneSub: "Doesn't mean much. Plenty of good bands aren't.",
  // DELTA vs the handoff: new. The player is a <section>; an unlabelled region
  // is a landmark a screen reader can only announce as "region".
  playerAria: (name: string) => `Player for ${name}`,

  // Upcoming shows
  upcomingTitle: 'Upcoming',
  showCount: (count: number) => `${count} show${count === 1 ? '' : 's'}`,
  residencyRun: (count: number) => `${count}-night run`,
  // Same unit as the section-head count: shows, never groups.
  showAll: (count: number) => `Show all ${count} shows`,
  showFewer: 'Show fewer',
  priceUnknown: 'Price TBD',

  // Empty upcoming — first-class, the conversion moment (rendered by PR-F).
  emptyTitle: 'Nothing on the calendar.',
  emptyBody:
    'No dates booked that we can see. Follow them and check back. This page is where the next one turns up.',
  emptyBodyFollowing:
    "No dates booked that we can see. You're following, so check back. This page is where the next one turns up.",

  // Loading
  loadingArtist: 'Finding them…',

  // A11y
  pageAria: (name: string) => `Artist page for ${name}`,
  showsListAria: (name: string) => `Upcoming shows for ${name}`,
  pastListAria: (name: string) => `Past shows we've recorded for ${name}`,
} as const
