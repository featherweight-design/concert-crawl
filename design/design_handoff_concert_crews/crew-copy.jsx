// crew-copy.jsx: every customer-facing string for Concert Crews (#1226).
//
// This file is the DESIGN MIRROR of what ships as `definitions/copy.ts`
// (`copy.crews.*`). Nothing in this handoff hardcodes a customer-facing string
// in JSX. Every surface reads from CREW_COPY, so the keys below are the ones
// eng lifts verbatim.
//
// Voice: Sour Patch. Brand presence + clear status. Cheeky on the empty and
// social states, dead sober on money, permissions, revocation and loss.
// Never "No results found". Never "Oopsie!".
//
// Interpolation: {crew} {inviter} {handle} {n} {artist} {days}.
// Pluralization is the caller's, via CREW_COPY.plural(n, one, many).

function crewPlural(n, one, many) { return n === 1 ? one : many; }

const CREW_COPY = {
  // ── Vocabulary ──────────────────────────────────────────────────────
  // "Crew" is the noun. Never "group", "squad", "circle", "friends list".
  // Never a synonym for Watching: a crew is people, Watching is shows.
  nav:            { crews: "Crews" },
  cap:            12,

  // ── Crews destination ───────────────────────────────────────────────
  list: {
    title:        "Crews",
    eyebrow:      "YOUR PEOPLE",
    subtitle:     "Small, invite-only, and the only place we'll tell you what your people are up to.",
    create:       "Start a crew",
    memberCount:  (n) => `${n} ${crewPlural(n, "member", "members")}`,
    upcomingMeta: (n) => n === 0 ? "Nothing upcoming" : `${n} ${crewPlural(n, "show", "shows")} coming up`,
    justYou:      "Just you so far",
  },
  detail: {
    upcomingTitle:   "Coming up",
    tabsLabel:       "Crew sections",
    upcomingSub:     "One of you said yes. That's enough to put it here.",
    pastTitle:       "Been there",
    pastSub:         "Nights at least two of you were at. Solo shows stay in your Concerts.",
    pastStat:        (n) => `${n} ${crewPlural(n, "night", "nights")} together`,
    rosterTitle:     "Who's in",
    seeLens:         "See it in Browse",
    invite:          "Invite people",
    together:        (n) => `you + ${n}`,
    onlyYou:         "just you",
    goingSummary:    (names, extra) =>
      extra > 0 ? `${names.join(", ")} + ${extra} more going` : `${names.join(", ")} going`,
    goingCount:      (n) => `${n} going`,
  },

  // ── Roster ──────────────────────────────────────────────────────────
  roster: {
    creator:      "Started it",
    you:          "You",
    noHandle:     "No handle yet",
    // #762's rule: never render a person the app can't honestly name. A
    // member without a handle is COUNTED, never invented a display name.
    noHandleHelp: "They haven't picked a handle. We won't make one up.",
    joined:       (rel) => `Joined ${rel}`,
    remove:       "Remove",
    leave:        "Leave crew",
    mute:         "Mute this crew",
    muted:        "Muted",
    rename:       "Rename crew",
    newPatch:     "New patch",
    newPatchBody: "Pulls a different patch for the whole crew. Everyone sees the change.",
    newPatchCta:  "Pull a new one",
    newPatchKeep: "Keep this one",
    del:          "Delete crew",
  },

  // ── Browse lens ─────────────────────────────────────────────────────
  lens: {
    chipResting:  "Crews",
    railEyebrow:  "CREW LENS",
    railCount:    (n) => `${n} ${crewPlural(n, "show", "shows")} your people are going to`,
    railClear:    "Clear",
    pickerTitle:  "Look through a crew",
    pickerSub:    "The calendar, filtered to shows one of them is going to.",
    pickerNone:   "Everyone",
    cardGoing:    (n) => `${n} going`,
  },

  // ── Create + invite ─────────────────────────────────────────────────
  create: {
    title:        "Start a crew",
    sub:          "Name it something they'll recognize in a group chat.",
    nameLabel:    "Crew name",
    namePlace:    "Thursdays",
    nameHelp:     "You can change this later. The artwork stays put.",
    submit:       "Make the crew",
    artNote:      "Every crew gets its own patch. This one's yours.",
    reroll:       "New patch",
    rerollHelp:   "Don't like it? Pull another. Renaming won't change it; only this will.",
  },
  gate: {
    // Tier names below are illustrative only. The build renders them from
    // unlockTierFor('crews'); see the copy-review table in the eng plan.
    eyebrow:      "SUPPORTER",
    title:        "Starting one is the paid part.",
    body:         "Joining one is free, forever. Nobody hits a paywall on your invite link.",
    cta:          "Pick Supporter",
    later:        "Not now",
    lapsed:       "Your crews all still work. Starting another one needs Supporter again.",
  },
  invite: {
    title:        "Invite people",
    sub:          (crew) => `Drop this in the group chat where you already talk about ${crew}.`,
    copy:         "Copy link",
    copied:       "Copied.",
    expiry:       (days) => `Expires in ${days} ${crewPlural(days, "day", "days")}`,
    expiryHelp:   "Links go stale after 7 days so a forwarded one can't follow you around.",
    revoke:       "Retire this link",
    revokeConfirm:"Retire it? Anyone still holding it gets a dead end.",
    revoked:      "Link retired. Make a new one whenever.",
    newLink:      "New link",
    seatsLeft:    (n) => `${n} of ${12} spots left`,
  },

  // ── Signed-out invite landing ───────────────────────────────────────
  // Shows crew IDENTITY only. Never a show, never a date, never who's going:
  // a forwarded link must not publish anyone's plans.
  landing: {
    eyebrow:      "YOU'RE INVITED",
    title:        (inviter, crew) => `${inviter} wants you in ${crew}.`,
    titleNoName:  (crew) => `You're invited to ${crew}.`,
    body:         (n) => `${n} ${crewPlural(n, "person is", "people are")} already in. Concert Crawl is free, and so is joining a crew.`,
    privacy:      "We're not showing you what they're going to until you're in. That's the point of a crew.",
    cta:          (crew) => `Join ${crew}`,
    haveAccount:  "Already have an account? Sign in",
  },
  linkDead: {
    expiredTitle: "This link's gone stale.",
    expiredBody:  "Invites expire after 7 days. Ask whoever sent it for a fresh one.",
    revokedTitle: "This link was retired.",
    revokedBody:  "Someone in the crew pulled it. Ask them for a new one. No hard feelings.",
    fullTitle:    "This crew's full.",
    fullBody:     "Twelve is the cap. Any more and it stops being your people and starts being a group project.",
    browse:       "Browse shows instead",
  },

  // ── Empty states · Sour Patch, per the Hybrid empty-state voice ────
  empty: {
    noCrewsTitle:   "No crews yet.",
    noCrewsBody:    "A crew is four friends and a group chat. We handle the calendar part.",
    crewOfOneTitle: "Party of one.",
    crewOfOneBody:  "You made a crew. Now the hard part: telling people.",
    noUpcomingTitle:"Nobody's committed.",
    noUpcomingBody: "Not one of you has said yes to anything yet. Bold.",
    noPastTitle:    "No history yet.",
    noPastBody:     "Go to a show together and it lands here. Two of you, minimum. Otherwise it's just your night.",
    lensEmptyTitle: "Your people are homebodies.",
    lensEmptyBody:  (crew) => `Nobody in ${crew} is going to anything yet. Nudge them.`,
    atCapTitle:     "This crew's full.",
    atCapBody:      "Twelve is the cap. Start another crew for the overflow.",
  },

  // ── Event detail · the crew going line (attached to Going) ──────────
  // Key stays `rail` for continuity with copy.crews.rail.* already in flight.
  rail: {
    crewGoing:    (names, extra) =>
      extra > 0 ? `${names.join(", ")} + ${extra} more going` : `${names.join(", ")} going`,
    crewGoingCount: (n) => `${n} from your crews going`,
    watching:     (n) => `${n} watching`,
    nobody:       "Nobody you know yet.",
  },

  // ── Notifications · bell only, never push (brief §3.11) ────────────
  notif: {
    going:        (handle, artist) => `${handle} is going to ${artist}.`,
    goingNoName:  (artist) => `Someone in your crew is going to ${artist}.`,
    joined:       (handle, crew) => `${handle} joined ${crew}.`,
    joinedNoName: (crew) => `Someone new joined ${crew}.`,
    left:         (handle, crew) => `${handle} left ${crew}.`,
    invited:      (inviter, crew) => `${inviter} added you to ${crew}.`,
    muteAction:   "Mute this crew",
    mutedToast:   (crew) => `Muted ${crew}. It'll be here when you care again.`,
    unmute:       "Unmute",
  },

  // ── Destructive + confirmations · sober, no cheek ──────────────────
  confirm: {
    leaveTitle:   (crew) => `Leave ${crew}?`,
    leaveBody:    "You'll lose the lens and the shared history. They keep going without you.",
    leaveCta:     "Leave crew",
    removeTitle:  (handle) => `Remove ${handle}?`,
    removeBody:   "They lose the crew and its history. They can be invited back.",
    removeCta:    "Remove",
    deleteTitle:  (crew) => `Delete ${crew}?`,
    deleteBody:   "The roster and the shared history go with it, for everyone. Nights stay in each person's own Concerts.",
    deleteCta:    "Delete crew",
    handoffTitle: "Pass the crew on first",
    handoffBody:  "You started it, so it needs a new keeper before you go. Pick someone.",
    // Creator is the last member: there is nobody to hand it to. Don't offer a
    // handoff that can't happen; say what the only real option is.
    lastOneTitle: (crew) => `You're the last one in ${crew}.`,
    lastOneBody:  "There's nobody to hand it to, so leaving means deleting it. The nights you went stay in your Concerts.",
    lastOneCta:   "Delete crew",
    lastOneAlt:   "Invite someone instead",
    never:        "Never mind",
  },

  // ── a11y strings ────────────────────────────────────────────────────
  a11y: {
    patch:        (crew) => `${crew} crew artwork`,
    reroll:       "Pull a new patch",
    lensOn:       (crew) => `Crew lens on: ${crew}. Showing shows a member is going to.`,
    lensOff:      "Crew lens off. Showing all shows.",
    memberNoHandle:"Crew member without a handle",
    goingList:    (names) => `Going: ${names.join(", ")}`,
    // Chrome labels. These live here for the same reason every other string
    // does: eng lifts one file. The R4 em-dash sweep dropped `crewActivity` and
    // `close`, which quietly pushed three call sites back onto inline strings.
    // `search` is added in the same pass: it was inline from the start.
    close:        "Close",
    search:       "Search",
    crewActivity: (crew) => `${crew} crew activity`,
  },

  // ── Network states (B4) ────────────────────────────────────
  // Loading copy is deliberately near-silent. A skeleton already says
  // "loading", and a cheeky line you read for 400ms and then never again is
  // noise. Errors get the Sour Patch voice, because you're stuck there.
  net: {
    loadingCrews:   "Rounding up your people…",
    loadingCrew:    "Opening the crew…",
    loadingInvite:  "Checking the invite…",
    errListTitle:   "Couldn't load your crews.",
    errListBody:    "That's on us, not you. Your crews are fine. We just can't reach them this second.",
    errCrewTitle:   "Couldn't open this crew.",
    errCrewBody:    "The roster and the shows are still there. We just couldn't fetch them.",
    errInviteTitle: "Couldn't check this invite.",
    errInviteBody:  "Something on our end went sideways. The link is probably fine. Try again in a second.",
    retry:          "Try again",
    offlineTitle:   "You're offline.",
    offlineBody:    "Crews needs a connection to know who's going. We'll pick this up when you're back.",
  },

  plural: crewPlural,
};

Object.assign(window, { CREW_COPY, crewPlural });
