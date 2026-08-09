// Every customer-facing string on My shows ▸ Artists (native following PR 6).
//
// Sourced from design/design_handoff_native_following/nf-following.jsx and
// nf-desktop.jsx, then given a copy pass. Placeholders until copy-review runs.
//
// The locked vocabulary applies: an artist is FOLLOWED, a show is WATCHED, and
// the container is "My shows". Nothing here says "saved".

export const MY_SHOWS_ARTISTS_COPY = {
  /** Desktop h1. Mobile takes its heading from the sub-tab bar instead. */
  pageTitle: 'Artists',

  /**
   * The list could not be read. Never the empty state: "nobody on your list"
   * is a claim about the account, and a failed fetch cannot make it.
   */
  error: "Couldn't load your artists. Refresh and we'll try again.",

  groups: {
    /** Group 1. Uppercased by CSS, so it is written in sentence case here. */
    dated: (count: number) => `${count} playing Denver`,
    undated: (count: number) => `Nothing on the books · ${count}`,
    /** Per-row line where group 2 would otherwise show a date. */
    noDates: 'No dates announced',
  },

  /** Per-row provenance mark. The word, not a sentence. */
  source: {
    spotify: 'Spotify',
  },

  find: {
    title: 'Find artists to follow',
    body: "Search by name, or browse who's playing Denver soon.",
  },

  alerts: {
    title: 'Alerts for these artists',
    /** Reads the live notification preferences, never a guess. */
    state: (push: boolean, digest: boolean) =>
      `Push ${push ? 'on' : 'off'} · weekly digest ${digest ? 'on' : 'off'}`,
    /** Dense desktop button in the group-heading row. */
    short: 'Alerts',
  },

  /**
   * Footnote under the list when any follow arrived from Spotify. The point is
   * the reassurance, not the count: unfollowing here is local.
   */
  spotifyFootnote: (count: number) =>
    count === 1
      ? "One of these came in from Spotify. Unfollowing here won't touch your Spotify library."
      : `${count} of these came in from Spotify. Unfollowing here won't touch your Spotify library.`,

  empty: {
    eyebrow: 'No one yet',
    headline: 'Nobody on your list.',
    body: "Follow an artist and we'll tell you the moment they book a Denver date. Even the ones who only come through once a year.",
    /** Entitled: the real next move is search. */
    primary: 'Find artists to follow',
    /**
     * Locked: following is the thing they can't do yet, so the primary move
     * becomes the one that always works. The upgrade offer lives on the
     * follow control itself, not in a second pitch here.
     */
    primaryLocked: "See who's playing Denver",
    secondary: "Follow from a show you're watching",
  },
} as const
