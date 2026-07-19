// watchers-data.jsx — #762 Who Else Is Watching
// Fixtures, deterministic avatar tone, the Sour Patch sentence builder, and the
// customer-facing copy map (keyed for lift into
// apps/web/src/components/consumer/definitions/copy.ts).
//
// Model note (design call, codebase-true): a "watcher" is named only if it has a
// handle. Beta anon users carry handle:null (see profile-settings SAMPLE_USER_ANON)
// — they can never be named, so they roll into the "+ N others" tail. When EVERY
// watcher is handle-less, the surface degrades to the honest count-only state.

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

// ── Avatar tone — deterministic, reuses the profile/UserMenu pattern ─────────
// Same four tones + same djb2 hash as MonogramPoster (profile-settings-screens).
// All four hold WCAG AA as coloured text on their own 22%-tint across Electric /
// Jade / Light — the tokens were chosen to double as fill + ink.
function w_hash(s) {
  let h = 5381; const str = String(s || "?");
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const W_TONES = ["signal", "accent", "success", "warning"];
function watcherTone(watcher) {
  return watcher.avatarColor || W_TONES[w_hash(watcher.handle || "anon") % W_TONES.length];
}
function watcherInitial(watcher) {
  if (!watcher.handle) return null; // anon → no letter, contributes to count only
  return (watcher.handle.replace(/[^a-z0-9]/gi, "")[0] || watcher.handle[0] || "?").toUpperCase();
}

// ── The Sour Patch sentence builder ─────────────────────────────────────────
// Named handles are capped (see NAMED_CAP + rationale in README). Returns
// structured parts so the surface can render handles in --fg and connective
// tissue in --fg-muted without string-splitting. Also usable headless for a11y.
//
// parts: array of { t:'name', v } | { t:'text', v }
// aria : the flat sentence a screen reader announces (one string, prose).
const NAMED_CAP = 3;

function buildWatchers(watchers) {
  const named = watchers.filter((w) => w.handle);
  const anon = watchers.length - named.length;
  const shown = named.slice(0, NAMED_CAP);
  const overflowNamed = named.length - shown.length;
  const others = overflowNamed + anon; // everyone we're not naming
  return { named, shown, others, total: watchers.length, anonOnly: named.length === 0 };
}

// Copy map — every customer-facing string lives here for copy.ts.
// Voice: Sour Patch — cheek + honesty rail + warmth. "in the crawl" is the warm
// brand handle for "other Concert Crawl users"; never "users" / "event".
const WATCHERS_COPY = {
  eyebrow: "Who else is watching",           // JetBrains Mono rail label
  loading: "Counting the crawl…",            // async fetch, visually-hidden + skeleton
  // Sentence tails, joined after the rendered handles:
  one:        "is watching this one.",       // 1 named
  areWatching: "are watching.",              // 2–3 named, no overflow
  plusOthers:  (n) => `+ ${n} more in the crawl, watching.`, // named + N others
  countOnly:   (n) => `${n} in the crawl are watching this one.`, // all-others-no-names
  countOnlyHonest: "No handles to drop yet — beta's early.",     // optional honesty rail under count-only
  rosterToggle: (n) => `see all ${n}`,       // expander affordance
  rosterHide:   "show fewer",
  rosterTitle:  "The crawl on this show",    // expanded roster header
  rosterOthers: (n) => `${n} other ${n === 1 ? "crawler" : "crawlers"}`, // anon summary row
  // Retired-count relocation (Q6): the "alerts on price + sold out" affordance
  // the old count tail carried now rides under the inactive Watch button.
  watchHint: "Watch to get pinged on price drops + sold-out.",
};

// Connective grammar for named lists: "a", "a & b", "a, b & c".
function joinNames(names) {
  // returns parts[] of {t:'name'|'text'}
  const p = [];
  names.forEach((n, i) => {
    if (i > 0) p.push({ t: "text", v: i === names.length - 1 ? " & " : ", " });
    p.push({ t: "name", v: n });
  });
  return p;
}

// ── Fixtures — one per brief §4 state ────────────────────────────────────────
// Handles are lowercase, Denver-ish; anon watchers are handle:null.
const W_MARISOL = { handle: "marisol", avatarColor: "accent" };
const W_DEV     = { handle: "dev_ftw", avatarColor: "signal" };
const W_PRIYA   = { handle: "priya",   avatarColor: "success" };
const W_JONAH   = { handle: "jonah",   avatarColor: "warning" };
const W_ANON    = { handle: null };

const WATCHER_FIXTURES = {
  // 1 named
  one: [W_MARISOL],
  // 2–3 named (no overflow)
  few: [W_MARISOL, W_DEV, W_PRIYA],
  // named + "and N others" (3 named shown, 11 more roll up: 1 named-overflow + 10 anon)
  many: [W_MARISOL, W_DEV, W_PRIYA, W_JONAH, ...Array.from({ length: 10 }, () => ({ ...W_ANON }))],
  // all-others-no-names (every watcher handle-less)
  anon: Array.from({ length: 14 }, () => ({ ...W_ANON })),
  // roster expansion sample (mix, for the "see all" state)
  roster: [W_MARISOL, W_DEV, W_PRIYA, W_JONAH, { handle: "sam" }, { handle: "otto" },
           ...Array.from({ length: 8 }, () => ({ ...W_ANON }))],
};

// Event context fixture (mirrors the event-detail-v2 EV2 shape).
const W_EVENT = {
  artist: "Sudan Archives",
  support: "Nuals",
  venue: "Larimer Lounge",
  venueShort: "Larimer",
  date: "Fri · Aug 14",
  doors: "8:00 PM",
  showTime: "9:00 PM",
  ages: "16+",
  genre: ["experimental", "r&b", "electronic"],
};

Object.assign(window, {
  CCMark, W_TONES, NAMED_CAP,
  w_hash, watcherTone, watcherInitial,
  buildWatchers, joinNames, WATCHERS_COPY,
  WATCHER_FIXTURES, W_EVENT,
});
