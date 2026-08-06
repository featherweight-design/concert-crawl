// Concert Crews (#1226) — every customer-facing string on the crews
// destination and the create sheet. PR-4 scope only; crew home, invites,
// notifications and the Browse lens add their own keys as they land.
//
// "Crew" is the noun. Never "group", "squad", "circle", "friends list", and
// never a synonym for Watching: a crew is people, Watching is shows.
//
// The gate block is NOT lifted from the design handoff. Its tier names were
// illustrative; the shipped strings interpolate the tier the entitlements
// matrix actually resolves, so a repriced or renamed tier can never leave a
// stale name on a paywall.

const plural = (count: number, one: string, many: string): string =>
  count === 1 ? one : many

export const CREWS_COPY = {
  list: {
    title: 'Crews',
    eyebrow: 'YOUR PEOPLE',
    subtitle:
      "Small, invite-only, and the only place we'll tell you what your people are up to.",
    create: 'Start a crew',
    memberCount: (count: number) =>
      `${count} ${plural(count, 'member', 'members')}`,
    upcomingMeta: (count: number) =>
      count === 0
        ? 'Nothing upcoming'
        : `${count} ${plural(count, 'show', 'shows')} coming up`,
    justYou: 'Just you so far',
    // Announced, never rendered: the new row appears silently otherwise.
    created: (name: string) => `${name} is ready.`,
  },

  empty: {
    eyebrow: 'NOBODY YET',
    title: 'No crews yet.',
    body: 'A crew is four friends and a group chat. We handle the calendar part.',
    // The shared EmptyState rail counts events by default, which means nothing
    // here.
    rail: '0 crews',
  },

  create: {
    title: 'Start a crew',
    sub: "Name it something they'll recognize in a group chat.",
    nameLabel: 'Crew name',
    namePlace: 'Thursdays',
    // "The artwork stays put" lived here too, two elements below rerollHelp
    // saying the same thing.
    nameHelp: 'You can change this later.',
    submit: 'Make the crew',
    submitting: 'Making the crew…',
    artNote: "Every crew gets its own patch. This one's yours.",
    reroll: 'New patch',
    rerollHelp:
      "Don't like it? Pull another. Renaming won't change it; only this will.",
    failed: "Couldn't start that crew. Try again.",
    close: 'Close',
  },

  // Tier name and price both come from unlockTierFor('crews'), never a literal.
  gate: {
    eyebrow: (tierName: string) => tierName.toUpperCase(),
    title: 'Starting one is the paid part.',
    body: 'Joining one is free, forever. Nobody hits a paywall on your invite link.',
    cta: (tierName: string) => `Pick ${tierName}`,
    ctaFallback: 'See the plans',
    lapsed: (tierName: string) =>
      `Your crews all still work. Starting another one needs ${tierName} again.`,
    comparison: (tierName: string, priceText: string) =>
      `${tierName} · ${priceText}`,
  },

  net: {
    loading: 'ROUNDING UP YOUR PEOPLE…',
    errEyebrow: 'NO SIGNAL',
    errTitle: "Couldn't load your crews.",
    errBody:
      "That's on us, not you. Your crews are fine. We just can't reach them this second.",
    retry: 'Try again',
  },

  a11y: {
    // The patch itself is decorative; the row's accessible name is the crew.
    memberNoHandle: 'Crew member without a handle',
    // Appended to the button's own label, so it must not restate it:
    // the accessible name reads "Start a crew, paid feature".
    gatedCreate: 'paid feature',
    reroll: 'Pull a new patch',
  },
} as const
