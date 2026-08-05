// notifications-data.jsx — #737 in-app notification surface · R2
//
// R2 CHANGES
//   • Rekeyed to the REAL closed set — eight dot-namespaced categories from
//     packages/push/src/notification-categories.ts (the brief's Q2 four-key
//     underscore list was wrong; R1 built faithfully to it and therefore
//     matched zero production rows).
//   • Item field `type` → `category`. In the DB `type` is a different enum
//     (admin_alert | user_notification) and the collision would mislead.
//   • Added `actionUrl` — whole-row-clickable was locked in R1 but the
//     navigation target was never modeled. Contest rows write /events/{id}.
//   • Fixtures rebuilt at PRODUCTION TITLE LENGTH (~35–80 chars), not the
//     ~21-char titles R1 invented. See the ⚠ note on VOICE below.
//
// ⚠ WHO OWNS WHICH STRINGS
//   NOTIF_COPY (below) owns the panel CHROME — empty, loading, error, labels,
//   dividers, buttons. That is Design's.
//   Per-row `title` / `body` are written by the BACKEND writers, not the panel.
//   The fixtures here are modeled on the shipped templates for LAYOUT TRUTH.
//   contest.* row titles are the shipped strings verbatim — one role-neutral
//   title per action, with the admin's free-text reason as the body. R1's
//   per-role voiced variants are dropped: the neutral titles already match the
//   Phase 8.5 "price update, not a callout" lock, so no writer change is owed.
//   Build against apps/api/src/lib/contest-notifications.ts, not these strings.
//
// CCMark is a verbatim copy of browse-home.jsx's CCMark (source of truth per
// CLAUDE.md). Do not restyle.

function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
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

// ── Glyphs — 16px stroke set, currentColor, no fills ─────────────
const GLYPH = {
  pricedrop: <><path d="M2.5 7.2V2.5H7.2L13.5 8.8 8.8 13.5 2.5 7.2z" stroke="currentColor"
    strokeWidth="1.5" strokeLinejoin="round"/><circle cx="5.4" cy="5.4" r="1" fill="currentColor"/>
    <path d="M9.4 7.6v3.2m0 0l-1.3-1.3m1.3 1.3l1.3-1.3" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round"/></>,
  cancelled: <><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5.8 5.8l4.4 4.4m0-4.4l-4.4 4.4" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round"/></>,
  postponed: <><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 4.6V8l2.4 1.6" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round"/></>,
  soldout: <><rect x="2" y="4.6" width="12" height="7.4" rx="1.6" stroke="currentColor"
    strokeWidth="1.4"/><path d="M2.6 13.4L13.4 3.2" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round"/></>,
  backonsale: <><path d="M13.2 8a5.2 5.2 0 11-1.7-3.85" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round"/><path d="M13.4 2.2v2.9h-2.9" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round"/></>,
  // contest.resolved — a price dispute settled. Balance scale, never a ticket:
  // two numbers were weighed, nobody won a prize.
  resolved: <><path d="M8 3.4v10.1M5.6 13.5h4.8M3 5.9h10" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round"/><path d="M3 5.9L1.5 9.1a1.9 1.9 0 003 0L3 5.9zM13 5.9l-1.5 3.2a1.9 1.9 0 003 0L13 5.9z"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="3.4" r="1.1" fill="currentColor"/></>,
  // contest.needs_info — the same dispute flow, but it's asking you something.
  needsinfo: <><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6.4 6.3a1.7 1.7 0 113 1.1c-.6.5-.9.8-.9 1.5" stroke="currentColor"
    strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8.4" cy="11.2" r="0.85" fill="currentColor"/></>,
  // spotify.new_show — signal arcs off a node, never the Spotify logo itself.
  spotify: <><circle cx="4.6" cy="11.4" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8.4 10.2a5.4 5.4 0 00-1.5-3.8M11.1 11.1A8.2 8.2 0 006.9 3.7M13.6 11.8A10.9 10.9 0 006.8 1.4"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  bell: <><path d="M4 7a4 4 0 118 0c0 2.6.7 3.7 1.3 4.3a.4.4 0 01-.3.7H3a.4.4 0 01-.3-.7C3.3 10.7 4 9.6 4 7z"
    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.6 13.6a1.6 1.6 0 002.8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
};

function NGlyph({ name, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">{GLYPH[name]}</svg>;
}

// ── CATEGORY_MAP — the real eight (Zod union, closed set) ────────
//
// R2 SYSTEM: ink encodes VALENCE, glyph encodes EVENT.
// R1 gave each category its own ink, which doesn't survive eight entries —
// you run out of distinguishable tokens and the color stops meaning anything.
// Splitting the two jobs scales and actually says something at a glance:
//
//   --danger    bad news you can't act on      watch.cancelled
//   --warning   changed on you / closing       watch.postponed · watch.soldout
//   --success   good news                      watch.backonsale · watch.pricedrop
//   --fg-muted  a neutral verdict              contest.resolved
//   --signal    a task — you owe a reply       contest.needs_info
//   --accent    discovery, not your shows      spotify.new_show
//
// So watch.* is deliberately NOT collapsed: cancelled and backonsale are
// opposite news and reading them as one gray "Watching" class was an artifact
// of the brief's four-key vocabulary, not a decision. The glyph still tells
// you which event it is; the ink tells you whether to wince.
//
// contest.resolved stays neutral per the Phase 8.5 lock — "disputes are price
// updates, not callouts", loser archived, nobody penalized. contest.needs_info
// diverges to --signal on purpose: neutrality governs VERDICTS, and this isn't
// one. It's the admin asking you for more detail, so it takes the CTA color
// like any other outstanding task. Same family, same glyph language, different
// job.
const CATEGORY_MAP = {
  "watch.cancelled":    { label: "Cancelled",   ink: "var(--danger)",   glyph: "cancelled",  verb: "Show cancelled" },
  "watch.postponed":    { label: "Moved",       ink: "var(--warning)",  glyph: "postponed",  verb: "Show moved" },
  "watch.soldout":      { label: "Sold out",    ink: "var(--warning)",  glyph: "soldout",    verb: "Show sold out" },
  "watch.backonsale":   { label: "Back on",     ink: "var(--success)",  glyph: "backonsale", verb: "Tickets back on sale" },
  "watch.pricedrop":    { label: "Price drop",  ink: "var(--success)",  glyph: "pricedrop",  verb: "Price drop" },
  "contest.resolved":   { label: "Price check", ink: "var(--fg-muted)", glyph: "resolved",   verb: "Price check result" },
  "contest.needs_info": { label: "Needs you",   ink: "var(--signal)",   glyph: "needsinfo",  verb: "Price check needs you" },
  "spotify.new_show":   { label: "Spotify",     ink: "var(--accent)",   glyph: "spotify",    verb: "New Denver date" },
};
const CATEGORY_KEYS = Object.keys(CATEGORY_MAP);
// Unknown category from a future writer → neutral bell row, never a blank tile.
const CATEGORY_FALLBACK = { label: "Update", ink: "var(--fg-muted)", glyph: "bell", verb: "Update" };
const catOf = (category) => CATEGORY_MAP[category] || CATEGORY_FALLBACK;

// One representative per valence, for the anatomy boards.
const VALENCE_SAMPLE = ["watch.cancelled", "watch.postponed", "watch.backonsale",
  "contest.resolved", "contest.needs_info", "spotify.new_show"];

// ── Copy — panel CHROME only. Lift into definitions/copy.ts ──────
// Voice: Sour Patch. Cheek + honesty rail + warmth. Grep-clean of
// "last chance", "we miss you", "fraud", "users", "event".
const NOTIF_COPY = {
  bellLabel: (n) => n > 0 ? `Notifications, ${n} unread` : "Notifications",
  pipLabel: "You've got unread notifications",
  panelTitle: "What you missed",
  panelSub: (n) => n === 1 ? "1 new" : `${n} new`,
  markAll: "Mark all read",
  markedAll: "All caught up.",
  seeAll: (n) => n > 1 ? `See all ${n}` : "See it",
  menuRow: "Notifications",
  menuBack: "Menu",
  closeLabel: "Close notifications",
  loadMore: "Older notifications",
  loading: "Checking what you missed…",
  loadingVisible: "Catching up…",
  slowRetry: "Still loading. Try again?",
  error: "Couldn't reach the crawl.",
  errorBody: "Poll failed. Nothing's lost — it's all still on the server.",
  errorAction: "Retry",
  emptyTitle: "All quiet.",
  emptyBody: "Nothing's dropped, moved, or sold out on you yet. We'll make noise when it does.",
  emptyHint: "Watch a show and this fills up fast.",
  emptyAction: "Find something to watch",
  endOfList: "That's everything. Denver's been calm.",
  today: "Today",
  yesterday: "Yesterday",
  unreadTag: "New",
  segments: { shows: "Shows", alerts: "Alerts", prices: "Prices" },
};

// ── Time helpers ─────────────────────────────────────────────────
const NOW = new Date("2026-07-24T20:10:00-06:00");
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

function relTime(iso, now = NOW) {
  const d = new Date(iso), diff = now - d;
  if (diff < 55 * MIN) return `${Math.max(1, Math.round(diff / MIN))}m`;
  if (diff < 22 * HOUR) return `${Math.round(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function relTimeLong(iso, now = NOW) {
  const d = new Date(iso), diff = now - d;
  if (diff < 55 * MIN) return `${Math.max(1, Math.round(diff / MIN))} minutes ago`;
  if (diff < 22 * HOUR) return `${Math.round(diff / HOUR)} hours ago`;
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)} days ago`;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
function dayKey(iso, now = NOW) {
  const d = new Date(iso);
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const delta = Math.round((startOf(now) - startOf(d)) / DAY);
  if (delta <= 0) return NOTIF_COPY.today;
  if (delta === 1) return NOTIF_COPY.yesterday;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function groupByDay(items, now = NOW) {
  const out = [];
  for (const it of items) {
    const k = dayKey(it.at, now);
    if (!out.length || out[out.length - 1].key !== k) out.push({ key: k, items: [] });
    out[out.length - 1].items.push(it);
  }
  return out;
}
// Single source for the row's accessible name — display and speech can't drift.
function itemLabel(n) {
  return `${catOf(n.category).verb}. ${n.title} ${n.body || ""} ${relTimeLong(n.at)}${n.read ? "" : ". Unread"}`.replace(/\s+/g, " ").trim();
}

// ── Fixtures ─────────────────────────────────────────────────────
// Titles are at PRODUCTION LENGTH. The backonsale and contest titles are the
// shipped templates; the rest are modeled on them pending a read of
// packages/push/src/definitions/copy.ts. Bodies for contest.* are admin
// free-text, so they vary in length by definition — the long one is the case
// the layout has to survive.
const N = (id, category, at, title, body, read = false, actionUrl = "/events/e1") =>
  ({ id, category, at, title, body, read, actionUrl });

const NOTIF_FIXTURES = {
  fresh: [
    N("n1", "watch.pricedrop", "2026-07-24T18:35:00-06:00",
      "The price for Geese at Bluebird Theater dropped from $41 to $28.",
      "Cheapest it's been since the on-sale."),
    N("n2", "watch.postponed", "2026-07-24T16:02:00-06:00",
      "Wednesday at Mission Ballroom has moved from August 9 to October 2.",
      "Your ticket still works. Same room, new night."),
    N("n3", "spotify.new_show", "2026-07-24T11:20:00-06:00",
      "MJ Lenderman just announced a Denver date at the Ogden Theatre.",
      "October 14. You follow them on Spotify."),
    N("n4", "contest.resolved", "2026-07-23T21:14:00-06:00",
      "Your price submission was reviewed.",
      "Two fans corroborated $52 for Chat Pile at Gothic Theatre, so that's what's showing now. The earlier number is archived, not deleted.", true),
    N("n5", "watch.soldout", "2026-07-23T09:48:00-06:00",
      "Militarie Gun at Larimer Lounge is sold out.",
      "Gone in about four hours. Resale's already ugly.", true),
  ],
  one: [
    N("n1", "watch.pricedrop", "2026-07-24T18:35:00-06:00",
      "The price for Geese at Bluebird Theater dropped from $41 to $28.",
      "Cheapest it's been since the on-sale."),
  ],
  read: [
    N("n2", "watch.postponed", "2026-07-24T16:02:00-06:00",
      "Wednesday at Mission Ballroom has moved from August 9 to October 2.",
      "Your ticket still works. Same room, new night.", true),
    N("n4", "contest.resolved", "2026-07-23T21:14:00-06:00",
      "Your price submission was reviewed.",
      "The $52 didn't get corroborated, so Chat Pile stays at $40. No ding — prices move.", true),
    N("n5", "watch.soldout", "2026-07-23T09:48:00-06:00",
      "Militarie Gun at Larimer Lounge is sold out.",
      "Gone in about four hours. Resale's already ugly.", true),
  ],
  empty: [],
};

// Every one of the eight, for the category board and the worst-case stress test.
NOTIF_FIXTURES.allCategories = [
  N("c1", "watch.cancelled", "2026-07-24T19:00:00-06:00",
    "Snõõper at Hi-Dive on September 12 has been cancelled.",
    "The venue says refunds go back automatically. Nothing for you to do."),
  N("c2", "watch.postponed", "2026-07-24T16:02:00-06:00",
    "Wednesday at Mission Ballroom has moved from August 9 to October 2.",
    "Your ticket still works. Same room, new night."),
  N("c3", "watch.soldout", "2026-07-24T13:10:00-06:00",
    "Militarie Gun at Larimer Lounge is sold out.",
    "Gone in about four hours. Resale's already ugly."),
  N("c4", "watch.backonsale", "2026-07-24T11:40:00-06:00",
    "Tickets for Hurray for the Riff Raff at Gothic Theatre just went back on sale.",
    "A release went back to the box office. Probably won't last."),
  N("c5", "watch.pricedrop", "2026-07-24T09:15:00-06:00",
    "The price for Geese at Bluebird Theater dropped from $41 to $28.",
    "Cheapest it's been since the on-sale."),
  N("c6", "contest.resolved", "2026-07-23T21:14:00-06:00",
    "Your price submission was reviewed.",
    "Two fans corroborated $52 for Chat Pile at Gothic Theatre, so that's what's showing now. The earlier number is archived, not deleted."),
  N("c7", "contest.needs_info", "2026-07-23T18:02:00-06:00",
    "More info requested on your price submission.",
    "We couldn't match the vendor you listed. Add where you saw it and this goes back in the queue."),
  N("c8", "spotify.new_show", "2026-07-23T10:00:00-06:00",
    "MJ Lenderman just announced a Denver date at the Ogden Theatre.",
    "October 14. You follow them on Spotify."),
];

NOTIF_FIXTURES.backfill = [
  ...NOTIF_FIXTURES.fresh.slice(0, 3),
  N("b1", "contest.resolved", "2026-07-23T21:14:00-06:00",
    "Your price submission was reviewed.",
    "Two fans corroborated $52 for Chat Pile at Gothic Theatre, so that's what's showing now.", true),
  N("b2", "watch.soldout", "2026-07-23T09:48:00-06:00",
    "Militarie Gun at Larimer Lounge is sold out.",
    "Gone in about four hours. Resale's already ugly.", true),
  N("b3", "watch.pricedrop", "2026-07-22T19:30:00-06:00",
    "The price for Hurray for the Riff Raff at Gothic Theatre dropped from $38 to $32.",
    "Small drop, still a drop.", true),
  N("b4", "spotify.new_show", "2026-07-22T13:05:00-06:00",
    "Ekko Astral just announced a Denver date at Hi-Dive.",
    "September 3. You follow them on Spotify.", true),
  N("b5", "watch.postponed", "2026-07-21T17:41:00-06:00",
    "Doors for Snõõper at Hi-Dive moved from 8pm to 7pm.",
    "Hi-Dive being Hi-Dive.", true),
  N("b6", "contest.needs_info", "2026-07-20T10:00:00-06:00",
    "More info requested on your price submission.",
    "We couldn't match the vendor you listed. Add where you saw it and this goes back in the queue.", true),
  N("b7", "watch.cancelled", "2026-07-19T15:22:00-06:00",
    "Been Stellar at Marquis Theater on August 21 has been cancelled.",
    "Refunds go back automatically.", true),
];

const unreadCount = (items) => items.filter((n) => !n.read).length;

Object.assign(window, {
  CCMark, NGlyph, GLYPH,
  CATEGORY_MAP, CATEGORY_KEYS, CATEGORY_FALLBACK, catOf, VALENCE_SAMPLE,
  NOTIF_COPY, NOTIF_FIXTURES, NOW,
  relTime, relTimeLong, dayKey, groupByDay, itemLabel, unreadCount,
});