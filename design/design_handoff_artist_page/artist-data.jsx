// artist-data.jsx — Artist Page (#1115) · copy, fixtures, headless model
//
// ARTIST_COPY is the externalized string set, ready to lift into
// definitions/copy.ts. Artist names, venue names, dates and counts are DATA —
// they never live in here.
//
// Honesty rail: every string on this page has to survive the fact that we only
// partially know this artist. Nothing here may imply a complete record, a
// notification promise, or a relationship with the artist's own Spotify account.

// ── Brand mark — VERBATIM COPY of CCMark from browse-home.jsx ────────────────
// Source of truth: browse-home.jsx `function CCMark`. Do not restyle — colors
// come from theme tokens (--bg / --accent / --signal). Copied (not imported) so
// this handoff loads standalone; keep in sync if the source mark ever changes.
function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// ── Copy ────────────────────────────────────────────────────────────────────
const ARTIST_COPY = {
  // Chrome
  backLabel: "Back",
  crumbRoot: "Browse",

  // Follow — ONE affordance, one mental model (autoWatch semantics)
  follow: "Follow",
  following: "Following",
  followPitch: "Every show they book lands in your Watching.",
  followPitchActive: "Their shows land in your Watching.",
  followSignedOut: "Sign in to follow",
  followSignedOutPitch: "Following needs an account. Everything else here doesn't.",
  followAria: (name) => `Follow ${name} — every show they book is added to your Watching`,
  followingAria: (name) => `Following ${name}. Activate to stop following.`,

  // History line — prose. `since` is DATA (crawl start), never hardcoded here,
  // so a licensed backfill changes the number without touching this string.
  historyNone: (since) =>
    `First time we've caught them. Our crawl only goes back to ${since}, so that's not saying much.`,
  historyOne: (venue, since) =>
    `We've caught them once — ${venue}. That's everything since ${since}, which is as far back as our map goes.`,
  historyMany: (n, venues, since) =>
    `${n} shows on our map — ${venues}. That's since ${since}; anything earlier they played, we missed.`,
  // Past shows — crawl data only. #1170 blocks deep history and setlists; this
  // is the modest version, and it says out loud where it stops.
  pastTitle: "Previously",
  pastNote: (since) =>
    `Our record starts when the crawl did, ${since}. Older gigs exist; we just weren't there.`,

  // Player / embed
  playerRail: "Player · Spotify",
  playerRailThirdParty: "third party",
  playerShelfTitle: "Have a listen",
  playerPreviewNote: "30-second previews. Full tracks if you're signed into Spotify.",
  playerLoading: "Loading the player…",
  playerSkip: "Skip player, go to shows",
  playerTitle: (name) => `Spotify player for ${name}`,
  playerNoneRail: "No player",
  playerNone: "We don't have them on Spotify.",
  playerNoneSub: "Doesn't mean much — plenty of good bands aren't. Their shows are below.",

  // Upcoming shows
  upcomingTitle: "Upcoming",
  showCount: (n) => `${n} show${n === 1 ? "" : "s"}`,
  residencyRun: (n) => `${n}-night run`,
  // Same unit as the section-head count: shows, never groups.
  showAll: (n) => `Show all ${n} shows`,
  showFewer: "Show fewer",
  priceUnknown: "Price TBD",

  // Empty upcoming — first-class, the conversion moment
  emptyTitle: "Nothing on the calendar.",
  emptyBody: "No dates booked that we can see. Follow them and the next one shows up in your Watching without you checking.",
  emptyBodyFollowing: "No dates booked that we can see. You're following, so the next one lands in your Watching on its own.",

  // Loading
  loadingArtist: "Finding them…",

  // A11y
  pageAria: (name) => `Artist page for ${name}`,
  showsListAria: (name) => `Upcoming shows for ${name}`,
  pastListAria: (name) => `Past shows we've recorded for ${name}`,
};

// ── Crawl window — DATA, not copy. One value, one place. ────────────────────
const CRAWL_SINCE = "March 2026";

// ── History model ───────────────────────────────────────────────────────────
// Source-agnostic: takes a count + a venue list + the crawl-window label.
// A licensed backfill changes `since` and `count`; the treatment is untouched.
//
// CONTRACT: `history` and `past` describe the SAME SET — every past show our
// crawl recorded for this artist. One query feeds both: the prose is the claim,
// the list is the evidence, so `history.count` MUST equal `past.length` and
// `history.venues` must be drawn from `past`. If they diverge, the page states
// one number and then contradicts it one block later.
function historyLine(history, since = CRAWL_SINCE) {
  const n = history ? history.count : 0;
  const venues = (history && history.venues) || [];
  // No venue on a count of 1 → fall back to the zero phrasing rather than
  // emitting "We've caught them once — once."
  if (!n) return ARTIST_COPY.historyNone(since);
  if (n === 1 && !venues[0]) return ARTIST_COPY.historyNone(since);
  if (n === 1) return ARTIST_COPY.historyOne(venues[0], since);
  return ARTIST_COPY.historyMany(n, joinList(venues), since);
}
function joinList(arr) {
  if (!arr || !arr.length) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} & ${arr[arr.length - 1]}`;
}

// ── Shows model ─────────────────────────────────────────────────────────────
// Chronological is the default. A run auto-groups: RESIDENCY_MIN+ shows at the
// same venue on consecutive-ish dates collapse into one venue group, so a
// 5-night stand doesn't read as five unrelated shows.
//
// CLUSTERED, not first-vs-last: a band can play a 5-night stand in August and
// come back to the same room in November. Measuring the whole venue's span
// would fail to group either one. We walk the venue's dates in order and cut a
// new cluster whenever the GAP between consecutive dates exceeds the window;
// each cluster is then judged on its own, on BOTH count and total span.
const RESIDENCY_MIN = 3;
const RESIDENCY_WINDOW = 21;   // max gap BETWEEN nights, and max span of one run
const SHOWS_VISIBLE = 5;

const DAY = 86400000;
const d0 = (iso) => new Date(iso + "T00:00:00").getTime();

function groupShows(shows) {
  const byVenue = {};
  for (const s of shows) (byVenue[s.venue] = byVenue[s.venue] || []).push(s);
  const items = [];
  for (const [venue, list] of Object.entries(byVenue)) {
    const sorted = [...list].sort((a, b) => d0(a.iso) - d0(b.iso));
    let cluster = [sorted[0]];
    // Two tests, not one. The GAP test above decides where a cluster ENDS; this
    // SPAN test decides whether the cluster earns the word "run". Gap alone
    // would let three nights 21 days apart each read as a "3-night run" across
    // six weeks, which is a tour, not a residency.
    const isRun = () => cluster.length >= RESIDENCY_MIN &&
      (d0(cluster[cluster.length - 1].iso) - d0(cluster[0].iso)) / DAY <= RESIDENCY_WINDOW;
    const flush = () => {
      if (isRun()) {
        items.push({ kind: "run", venue, city: cluster[0].city, shows: cluster });
      } else {
        for (const s of cluster) items.push({ kind: "one", ...s });
      }
    };
    for (let i = 1; i < sorted.length; i++) {
      if ((d0(sorted[i].iso) - d0(sorted[i - 1].iso)) / DAY <= RESIDENCY_WINDOW) {
        cluster.push(sorted[i]);
      } else { flush(); cluster = [sorted[i]]; }
    }
    flush();
  }
  items.sort((a, b) => d0(a.kind === "run" ? a.shows[0].iso : a.iso)
    - d0(b.kind === "run" ? b.shows[0].iso : b.iso));
  return items;
}

function fmtDate(iso) {
  const d = new Date(iso + "T20:00:00");
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
  };
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const S = (iso, venue, city, price) => ({ iso, venue, city, price });

const ARTISTS = {
  // 1 · Populated, Spotify-known
  known: {
    name: "Nightjar Choir",
    slug: "nightjar-choir",
    spotifyId: "3TVXtAsR1Inumwj472S9r4",
    photo: true,
    supporting: false,
    history: { count: 4, venues: ["Larimer Lounge", "Globe Hall", "the Bluebird"] },
    past: [
      S("2026-06-21", "Larimer Lounge", "Denver"),
      S("2026-05-09", "Globe Hall", "Denver"),
      S("2026-04-18", "Bluebird Theater", "Denver"),
      S("2026-03-28", "Larimer Lounge", "Denver"),
    ],
    shows: [
      S("2026-08-14", "Bluebird Theater", "Denver", 28),
      S("2026-09-02", "Globe Hall", "Denver", 22),
      S("2026-10-19", "Fox Theatre", "Boulder", null),
    ],
  },
  // 2 · Populated, no Spotify presence (also serves unresolved matches)
  fallback: {
    name: "Wax Harbour",
    slug: "wax-harbour",
    spotifyId: null,
    photo: false,
    history: { count: 2, venues: ["Hi-Dive", "Lost Lake"] },
    past: [
      S("2026-06-02", "Hi-Dive", "Denver"),
      S("2026-04-11", "Lost Lake Lounge", "Denver"),
    ],
    shows: [
      S("2026-08-08", "Hi-Dive", "Denver", 15),
      S("2026-08-29", "Lost Lake Lounge", "Denver", 15),
    ],
  },
  // 3a · No upcoming shows, Spotify-known
  emptyKnown: {
    name: "Slow Kingdom",
    slug: "slow-kingdom",
    spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ",
    photo: true,
    history: { count: 1, venues: ["Mission Ballroom"] },
    past: [S("2026-05-30", "Mission Ballroom", "Denver")],
    shows: [],
  },
  // 3b · No upcoming shows, fallback
  emptyFallback: {
    name: "Cassette Sunday",
    slug: "cassette-sunday",
    spotifyId: null,
    photo: false,
    history: { count: 0, venues: [] },
    past: [],
    shows: [],
  },
  // 4 · Many upcoming — a residency + a couple of one-offs
  many: {
    name: "The Cold Fronts",
    slug: "the-cold-fronts",
    spotifyId: "6l3HvQ5sa6mXTsMTB19rO5",
    photo: true,
    history: { count: 9, venues: ["Ophelia's", "Larimer Lounge", "the Bluebird"] },
    past: [
      S("2026-07-02", "Larimer Lounge", "Denver"),
      S("2026-06-28", "Bluebird Theater", "Denver"),
      S("2026-06-14", "Ophelia's Electric Soapbox", "Denver"),
      S("2026-05-23", "Bluebird Theater", "Denver"),
      S("2026-05-16", "Ophelia's Electric Soapbox", "Denver"),
      S("2026-05-01", "Larimer Lounge", "Denver"),
      S("2026-04-22", "Larimer Lounge", "Denver"),
      S("2026-04-05", "Ophelia's Electric Soapbox", "Denver"),
      S("2026-03-14", "Bluebird Theater", "Denver"),
    ],
    // 5-night run + 6 one-offs = 7 items, so the truncation control renders.
    // The Nov return to Ophelia's proves clustered grouping: same venue, far
    // outside the window, correctly NOT folded into the August run.
    shows: [
      S("2026-08-05", "Ophelia's Electric Soapbox", "Denver", 25),
      S("2026-08-06", "Ophelia's Electric Soapbox", "Denver", 25),
      S("2026-08-07", "Ophelia's Electric Soapbox", "Denver", 25),
      S("2026-08-08", "Ophelia's Electric Soapbox", "Denver", 30),
      S("2026-08-09", "Ophelia's Electric Soapbox", "Denver", 30),
      S("2026-08-22", "Gothic Theatre", "Englewood", 34),
      S("2026-09-11", "Mission Ballroom", "Denver", 42),
      S("2026-09-27", "Belly Up", "Aspen", null),
      S("2026-10-10", "Fox Theatre", "Boulder", 26),
      S("2026-10-24", "Globe Hall", "Denver", 20),
      S("2026-11-14", "Ophelia's Electric Soapbox", "Denver", 28),
    ],
  },
};

Object.assign(window, {
  CCMark, ARTIST_COPY, CRAWL_SINCE, ARTISTS,
  historyLine, joinList, groupShows, fmtDate,
  RESIDENCY_MIN, RESIDENCY_WINDOW, SHOWS_VISIBLE,
});
