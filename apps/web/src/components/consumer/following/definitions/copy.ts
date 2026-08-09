// Customer-facing strings for the follow surfaces outside the artist page
// (native following): the "My artists" scope chip, its scope banner, the
// three-mode browse shelf (PR 4), and the desktop search explainer rail
// (PR 5). One file so the follow promise is worded once, not per surface.
//
// Artist names, venue names, dates and counts are DATA — they never live here.
//
// ⚠️ Nothing here may promise that following an artist puts their shows in
// your Watching. Auto-watch is a per-connection preference a manual follower
// has never set (see ARTIST_COPY's note and issue #1306). Following surfaces
// dates; it does not move them anywhere.

export const FOLLOWING_COPY = {
  // ── Scope chip ────────────────────────────────────────────────────────
  // "My artists", not "taste" and not "following": the chip filters on
  // something you explicitly did, and the row it sits in already has a taste
  // chip that would otherwise read as its twin.
  chip: 'My artists',
  // The count rides the label only while the scope is on, so the resting chip
  // never advertises a number the user has to parse before deciding.
  chipActive: (count: number) => `My artists · ${count}`,
  // Deliberately parallel to the taste chip's aria, which is the same sentence
  // plus "on Spotify". The two chips sit in one row, so the only thing a
  // screen reader should hear between them is the source.
  //
  // The LOCKED chip reuses `chipAria` rather than carrying its own: the visible
  // label is identical when locked (the #794 identical-pixels rule), and a
  // second key holding the same sentence is just somewhere for drift to hide.
  chipAria: 'Filter to artists you follow',
  chipActiveAria: 'Filtered to artists you follow. Activate to clear.',
  // Referenced by aria-describedby, never rendered visibly. Because the locked
  // label says nothing about the gate, this sentence is the only place it is
  // told at all.
  chipGate:
    'Filtering to your artists is a Premium feature. Opens upgrade options.',

  // ── Scope banner (role="status") ──────────────────────────────────────
  // The count is SHOWS, not artists, matching the taste chip's banner beside
  // it and the number the list underneath actually contains. It is rendered
  // only when the API reports `followingApplied`, so the sentence can never
  // claim a scope the server declined to apply.
  banner: (count: number) => `${count} Denver shows by artists you follow`,
  bannerSingular: '1 Denver show by artists you follow',

  // ── Shelf · zero follows (starter) ────────────────────────────────────
  // No dismiss affordance and no apology. A shelf that can be dismissed on
  // day one is a shelf the audience it exists for never sees twice.
  starterEyebrow: 'Start here',
  starterTitle: 'Follow someone. Anyone.',
  // Does NOT re-say "follow an artist" — the title just did. What the body
  // owes is the payoff and what the cards below it are.
  starterBody:
    'We flag their Denver dates the moment they land. These are already on the books.',
  // There is no /artists index route and this epic does not add one, so every
  // "browse all artists" affordance points at search.
  starterAction: 'Browse all artists',

  // ── Shelf · one or more follows ───────────────────────────────────────
  // No "followed" after the count: "your artists" already said how they got
  // there, and · is the house metadata separator, so the number needs no verb.
  yoursEyebrow: (count: number) => `Your artists · ${count}`,
  // The ONLY difference between the `some` and `spotify` modes. Naming the
  // source once here is what stops Spotify becoming a second shelf.
  spotifyEyebrow: (count: number) =>
    `Your artists · ${count}, some from Spotify`,
  yoursTitle: 'Coming to Denver',
  // Opens browse scoped to your artists — the "all" view that exists today.
  yoursAction: 'All',

  // ── Shelf cards ───────────────────────────────────────────────────────
  shelfAria: 'Artists',
  cardNoDate: 'no date yet',
  // Venue and date are DATA; only the glue between them lives here.
  cardDateSeparator: ' · ',
  followAria: (name: string) => `Follow ${name}`,
  followingAria: (name: string) => `Following ${name}`,
  followGate: 'Following artists is a Premium feature. Opens upgrade options.',

  // ── Search results, desktop explainer rail ────────────────────────────
  // Desktop only. At 1080px the mobile footnote would be one lonely sentence
  // under a short list, and the explanation is what makes a viewer with no
  // follows act. Mobile carries the same case in the rows themselves.
  searchRailEyebrow: 'What following does',
  // Says what lands and what does not. Careful: following surfaces dates, it
  // never moves them into Watching.
  searchRailBody:
    "Follow an artist and we'll tell you the day they book a Denver date. No tour-wide noise, no email you didn't ask for.",
  // The no-dates case, stated once. An artist with nothing on the books is the
  // clearest reason to follow, so the rail names it rather than leaving the
  // muted row line to argue for itself. The second sentence is the part the
  // row cannot say: what an absence here does and does not mean.
  searchRailNoDates:
    "An artist with nothing booked is still worth following. Acts who have never played Denver aren't in here at all.",
} as const
