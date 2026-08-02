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

  // Follow — ONE affordance, one mental model (autoWatch semantics).
  // A show is WATCHED; an artist is FOLLOWED. "Watching" below names the
  // destination list a follow feeds, not the artist relationship.
  follow: 'Follow',
  following: 'Following',
  followPitch: 'Every show they book lands in your Watching.',
  followPitchActive: 'Their shows land in your Watching.',
  // DELTA vs the handoff: `followSignedOut` ("Sign in to follow") is dropped.
  // #794 locked the identical-pixels rule — a signed-out visitor sees the same
  // control a signed-in one does, and the sign-in happens on activation. A
  // different visible label would leak auth state back into the layout.
  followSignedOutPitch:
    "Following needs an account. Everything else here doesn't.",
  followAria: (name: string) =>
    `Follow ${name} — every show they book is added to your Watching`,
  followingAria: (name: string) =>
    `Following ${name}. Activate to stop following.`,
  // DELTA vs the handoff: new. The visible label stays "Follow" for a
  // signed-out visitor (above), so the accessible name is where we tell the
  // truth about what activation actually does.
  followSignedOutAria: (name: string) => `Follow ${name} — sign in to follow`,

  // History line — prose. `since` is DATA (crawl start), never hardcoded here,
  // so a licensed backfill changes the number without touching this string.
  historyNone: (since: string) =>
    `First time we've caught them. Our crawl only goes back to ${since}, so that's not saying much.`,
  historyOne: (venue: string, since: string) =>
    `We've caught them once — ${venue}. That's everything since ${since}, which is as far back as our map goes.`,
  historyMany: (count: number, venues: string, since: string) =>
    `${count} shows on our map — ${venues}. That's since ${since}; anything earlier they played, we missed.`,

  // Past shows — crawl data only. #1170 blocks deep history and setlists; this
  // is the modest version, and it says out loud where it stops.
  pastTitle: 'Previously',
  pastNote: (since: string) =>
    `Our record starts when the crawl did, ${since}. Older gigs exist; we just weren't there.`,

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
  playerNoneSub:
    "Doesn't mean much — plenty of good bands aren't. Their shows are below.",
  // The same fact minus the pointer, for when the player is the last block on
  // the page and there is nothing below it to point at.
  playerNoneSubLast: "Doesn't mean much — plenty of good bands aren't.",
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
    'No dates booked that we can see. Follow them and the next one shows up in your Watching without you checking.',
  emptyBodyFollowing:
    "No dates booked that we can see. You're following, so the next one lands in your Watching on its own.",

  // Loading
  loadingArtist: 'Finding them…',

  // A11y
  pageAria: (name: string) => `Artist page for ${name}`,
  showsListAria: (name: string) => `Upcoming shows for ${name}`,
  pastListAria: (name: string) => `Past shows we've recorded for ${name}`,
} as const
