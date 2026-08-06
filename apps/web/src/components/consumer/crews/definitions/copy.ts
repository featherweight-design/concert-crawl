// Concert Crews (#1226) — every customer-facing string on the crews
// destination, the create sheet, and the crew home with its sheets. The
// notifications copy and the Browse lens add their own keys as they land.
//
// "Crew" is the noun. Never "group", "squad", "circle", "friends list", and
// never a synonym for Watching: a crew is people, Watching is shows.
//
// The gate block is NOT lifted from the design handoff. Its tier names were
// illustrative; the shipped strings interpolate the tier the entitlements
// matrix actually resolves, so a repriced or renamed tier can never leave a
// stale name on a paywall.

import { CREW_MEMBER_CAP } from '@concert-crawl/types'

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

  // The crew home. "See it in Browse" is deliberately absent: the lens it
  // pointed at is not built yet, and a control that opens nothing is worse
  // than no control.
  detail: {
    tabsLabel: 'Crew sections',
    upcomingTitle: 'Coming up',
    upcomingSub: "One of you said yes. That's enough to put it here.",
    pastTitle: 'Been there',
    pastSub:
      'Nights at least two of you were at. Solo shows stay in your Concerts.',
    pastStat: (count: number) =>
      `${count} ${plural(count, 'night', 'nights')} together`,
    rosterTitle: "Who's in",
    invite: 'Invite people',
    options: 'Crew options',
    // Mono meta, so the uppercase is in the string rather than in CSS.
    keeperEyebrow: 'YOU KEEP IT',
    mutedEyebrow: 'MUTED',
    spots: (count: number) => `${count} / ${CREW_MEMBER_CAP} SPOTS`,
    together: (others: number) => `you + ${others}`,
    // Tense is the whole point of the split: nobody "went" to a show that
    // hasn't happened, and nobody is "going" to one that has.
    going: (count: number) => `${count} going`,
    went: (count: number) => `${count} went`,
  },

  roster: {
    you: 'You',
    keeper: 'Keeper',
    noHandle: 'No handle yet',
    // #762's rule: never render a person the app can't honestly name.
    noHandleHelp: "They haven't picked a handle. We won't make one up.",
    joined: (when: string) => `Joined ${when}`,
    // The relative halves of `joined`, kept here rather than in the formatter
    // so every word on the roster row is in one file.
    joinedToday: 'today',
    joinedYesterday: 'yesterday',
    joinedDaysAgo: (days: number) => `${days} days ago`,
    remove: 'Remove',
    leave: 'Leave crew',
    newPatch: 'New patch',
    newPatchBody:
      'Pulls a different patch for the whole crew. Everyone sees the change.',
    newPatchCta: 'Pull a new one',
    newPatchKeep: 'Keep this one',
    delete: 'Delete crew',
    nowEyebrow: 'NOW',
    newEyebrow: 'NEW',
  },

  invite: {
    title: 'Invite people',
    sub: (crew: string) =>
      `Drop this in the group chat where you already talk about ${crew}.`,
    copy: 'Copy link',
    copied: 'Copied.',
    // Days are counted off the invite's own expiresAt, never a literal.
    expiry: (days: number) =>
      `Expires in ${days} ${plural(days, 'day', 'days')}`,
    expiryHelp:
      "Links go stale on their own so a forwarded one can't follow you around.",
    revoke: 'Retire this link',
    revoked: 'Link retired. Make a new one whenever.',
    newLink: 'New link',
    seatsLeft: (left: number) => `${left} OF ${CREW_MEMBER_CAP} SPOTS LEFT`,
    seatsFull: `${CREW_MEMBER_CAP} OF ${CREW_MEMBER_CAP} SPOTS`,
    failed: "Couldn't sort the link out. Try again.",
  },

  // Destructive flows. Sober, no cheek.
  confirm: {
    leaveTitle: (crew: string) => `Leave ${crew}?`,
    leaveBody:
      'You lose the crew and the shared history. They keep going without you.',
    leaveCta: 'Leave crew',
    removeTitle: (handle: string) => `Remove ${handle}?`,
    removeBody: 'They lose the crew and its history. They can be invited back.',
    removeCta: 'Remove',
    deleteTitle: (crew: string) => `Delete ${crew}?`,
    deleteBody:
      "The roster and the shared history go with it, for everyone. Nights stay in each person's own Concerts.",
    deleteCta: 'Delete crew',
    handoffTitle: 'Pass the crew on first',
    handoffBody:
      'You keep this one, so it needs a new keeper before you go. Pick someone.',
    handoffCta: 'Pass it on',
    // The keeper is the last member: there is nobody to hand it to, so this
    // names the only real outcome instead of offering a choice that cannot
    // happen.
    lastOneTitle: (crew: string) => `You're the last one in ${crew}.`,
    lastOneBody:
      'There is nobody to hand it to, so leaving means deleting it. The nights you went stay in your Concerts.',
    lastOneCta: 'Delete crew',
    lastOneAlt: 'Invite someone instead',
    never: 'Never mind',
    working: 'Working…',
    failed: "That didn't go through. Try again.",
  },

  empty: {
    eyebrow: 'NOBODY YET',
    title: 'No crews yet.',
    body: 'A crew is four friends and a group chat. We handle the calendar part.',
    // The shared EmptyState rail counts events by default, which means nothing
    // here.
    rail: '0 crews',

    crewOfOneEyebrow: 'CREW OF ONE',
    crewOfOneTitle: 'Party of one.',
    crewOfOneBody: 'You made a crew. Now the hard part: telling people.',

    // Not 'COMING UP' / 'BEEN THERE': the selected tab renders directly above
    // and already says both.
    noUpcomingEyebrow: 'NO PLANS',
    noUpcomingTitle: "Nobody's committed.",
    noUpcomingBody: 'Not one of you has said yes to anything yet. Bold.',
    noUpcomingRail: '0 shows',

    noPastEyebrow: 'CLEAN SLATE',
    noPastTitle: 'No history yet.',
    noPastBody: 'Go to a show together and it lands here. Two of you, minimum.',
    noPastRail: '0 nights',

    // 'ROSTER FULL' said the title's job; the eyebrow only places you.
    atCapEyebrow: 'ROSTER',
    atCapTitle: "This crew's full.",
    atCapBody: `${CREW_MEMBER_CAP} is the cap. Start another crew for the overflow.`,
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
    loadingCrew: 'OPENING THE CREW…',
    // Distinct from the list's NO SIGNAL: one crew failed, not the whole page.
    errCrewEyebrow: 'CONNECTION',
    errCrewTitle: "Couldn't open this crew.",
    errCrewBody: "The crew is fine. The connection isn't. Give it another go.",
  },

  a11y: {
    // The patch itself is decorative; the row's accessible name is the crew.
    memberNoHandle: 'Crew member without a handle',
    // Appended to the button's own label, so it must not restate it:
    // the accessible name reads "Start a crew, paid feature".
    gatedCreate: 'paid feature',
    reroll: 'Pull a new patch',
    options: 'Crew options',
    close: 'Close',
  },
} as const
