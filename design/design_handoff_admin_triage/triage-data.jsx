// triage-data.jsx — severity model, condition config, and fixtures.
//
// SEVERITY MODEL (#1215 §4.3 — five conditions, no wall of red)
// Three bands, not five. The band answers "how sure are we, and how much is it
// costing right now?" — which is also the order Hugh should work in.
//
//   hard    · danger   · Blocked, Crawl failing
//             The crawl is not running. Zero new events. Certain, and the venue
//             is producing nothing until it's fixed.
//   loss    · warning  · Went dark, Coverage gap
//             The crawl runs and reports success while quietly dropping events.
//             Certain that data is missing; the site is still up, so nothing is
//             on fire — but this is the shape that stayed invisible for weeks.
//   suspect · accent-2 · Ceiling suspected
//             A pattern that is usually a pagination ceiling but is sometimes a
//             venue that genuinely has 20 shows. Needs a human look, not a fix.
//
// Only two of five conditions are ever red, so red keeps meaning "not running."
// accent-2 is defined in all nine production themes; the third band uses it so
// "suspected" never borrows --signal, which is the action colour.

const SEVERITY = {
  hard: { rank: 0, ink: "var(--danger)" },
  loss: { rank: 1, ink: "var(--warning)" },
  suspect: { rank: 2, ink: "var(--accent-2, var(--accent))" },
};
const BAND_KEYS = ["hard", "loss", "suspect"];

function sevTint(tier) {
  const ink = SEVERITY[tier].ink;
  return {
    ink,
    fill: `color-mix(in oklab, ${ink} 14%, transparent)`,
    edge: `color-mix(in oklab, ${ink} 34%, transparent)`,
  };
}

// glyph + band + where the row deep-links. Labels live in triage-copy.jsx.
const CONDITION_META = {
  blocked: { tier: "hard", glyph: "blocked", action: "openVenue" },
  failed: { tier: "hard", glyph: "failed", action: "openRun" },
  wentDark: { tier: "loss", glyph: "wentDark", action: "openRun" },
  coverage: { tier: "loss", glyph: "coverage", action: "openVenue" },
  ceiling: { tier: "suspect", glyph: "ceiling", action: "openDiagnostics" },
};

// Derived ordering, locked by §3.5: severity band first, then persistence
// (longest-standing first). `days` is the sort key; `dur` is the display value.
function orderFaults(list) {
  return [...list].sort((a, b) => {
    const r = SEVERITY[CONDITION_META[a.condition].tier].rank - SEVERITY[CONDITION_META[b.condition].tier].rank;
    return r !== 0 ? r : b.days - a.days;
  });
}

// ── Fault fixtures ───────────────────────────────────────────────────
// `d` is the evidence payload; its shape is per-condition and matches the
// argument each TRIAGE_COPY.evidence.* function expects.
const F = {
  redrocks: {
    id: "f-redrocks", venue: "Red Rocks Amphitheatre", condition: "blocked",
    days: 12, dur: "12d",
    d: { status: 403, refusals: 9, lastSuccess: "Jul 18" },
  },
  larimer: {
    id: "f-larimer", venue: "Larimer Lounge", condition: "blocked",
    days: 2, dur: "2d",
    d: { status: 429, refusals: 4, lastSuccess: "Jul 28" },
  },
  marquis: {
    id: "f-marquis", venue: "Marquis Theater", condition: "failed",
    days: 4, dur: "4d",
    d: { failures: 6, errorClass: "parse_failure", pauseAt: 8 },
  },
  skylark: {
    id: "f-skylark", venue: "Skylark Lounge", condition: "failed",
    days: 0.4, dur: "9h",
    d: { failures: 2, errorClass: "timeout", pauseAt: 8 },
  },
  bluebird: {
    id: "f-bluebird", venue: "Bluebird Theater", condition: "wentDark",
    days: 6, dur: "6d",
    d: { count: 2, baselineCount: 12, avg: 11.4, pct: -82, window: 7, threshold: -60,
         series: [12, 11, 13, 11, 12, 10, 2] },
  },
  hidive: {
    id: "f-hidive", venue: "Hi-Dive", condition: "wentDark",
    days: 3, dur: "3d",
    d: { count: 4, baselineCount: 9, avg: 8.7, pct: -54, window: 7, threshold: -60,
         series: [9, 8, 9, 10, 8, 9, 4] },
  },
  globe: {
    id: "f-globe", venue: "Globe Hall", condition: "wentDark",
    days: 1, dur: "1d",
    d: { count: 1, baselineCount: 7, avg: 6.9, pct: -86, window: 7, threshold: -60,
         series: [7, 6, 8, 7, 7, 6, 1] },
  },
  cervantes: {
    id: "f-cervantes", venue: "Cervantes' Masterpiece", condition: "coverage",
    days: 8, dur: "8d",
    d: { matched: 9, expected: 14, wasWhen: "Jul 12" },
  },
  lostlake: {
    id: "f-lostlake", venue: "Lost Lake Lounge", condition: "coverage",
    days: 2, dur: "2d",
    d: { matched: 3, expected: 6, wasWhen: "Jul 27" },
  },
  gothic: {
    id: "f-gothic", venue: "Gothic Theatre", condition: "ceiling",
    days: 5, dur: "5d",
    d: { count: 20, runs: 5, was: 34, wasWhen: "June", series: [34, 31, 20, 20, 20, 20, 20] },
  },
  ogden: {
    id: "f-ogden", venue: "Ogden Theatre", condition: "ceiling",
    days: 1, dur: "1d",
    d: { count: 25, runs: 2, was: 41, wasWhen: "last week", series: [41, 38, 40, 39, 41, 25, 25] },
  },
  summit: {
    id: "f-summit", venue: "Summit", condition: "failed",
    days: 7, dur: "7d",
    d: { failures: 7, errorClass: "bot_detection", pauseAt: 8 },
  },
  fillmore: {
    id: "f-fillmore", venue: "Fillmore Auditorium", condition: "wentDark",
    days: 11, dur: "11d",
    d: { count: 3, baselineCount: 16, avg: 15.2, pct: -80, window: 7, threshold: -60,
         series: [16, 15, 16, 14, 16, 15, 3] },
  },
  meow: {
    id: "f-meow", venue: "Meow Wolf", condition: "coverage",
    days: 4, dur: "4d",
    d: { matched: 5, expected: 11, wasWhen: "Jul 25" },
  },
  levitt: {
    id: "f-levitt", venue: "Levitt Pavilion", condition: "ceiling",
    days: 3, dur: "3d",
    d: { count: 10, runs: 4, was: 22, wasWhen: "May", series: [22, 19, 10, 10, 10, 10, 10] },
  },
  mission: {
    id: "f-mission", venue: "Mission Ballroom", condition: "blocked",
    days: 5, dur: "5d",
    d: { status: 403, refusals: 6, lastSuccess: "Jul 25" },
  },
};

// ── Queue fixtures ───────────────────────────────────────────────────
const QUEUES = [
  { id: "q-flags", kind: "eventFlags", glyph: "flags", count: 12,
    breakdown: "Bluebird 5 · Gothic 4 · Ogden 3", action: "openReview" },
  { id: "q-prices", kind: "priceSubmissions", glyph: "prices", count: 4,
    breakdown: "Khruangbin @ Mission · Bright Eyes @ Bluebird · 2 more", action: "openSubmissions" },
];

// ── Scenarios (§4.5) ─────────────────────────────────────────────────
const SWEEP = { venues: 11, at: "3:02 AM", events: 89, next: "6:00 PM" };

const SCENARIOS = {
  both: {
    label: "Both tiers",
    faults: [F.bluebird, F.redrocks, F.gothic, F.cervantes, F.marquis],
    queues: QUEUES,
  },
  faultsOnly: {
    label: "Faults only",
    faults: [F.bluebird, F.redrocks, F.gothic],
    queues: [],
  },
  queuesOnly: {
    label: "Queues only",
    faults: [],
    queues: QUEUES,
  },
  empty: {
    label: "Empty · all clear",
    faults: [],
    queues: [],
  },
  one: {
    label: "One fault",
    faults: [F.bluebird],
    queues: [],
  },
  newOnly: {
    label: "The three new conditions",
    faults: [F.bluebird, F.cervantes, F.gothic],
    queues: [],
  },
  highVolume: {
    label: "High volume · 16 faults",
    faults: [F.redrocks, F.mission, F.larimer, F.summit, F.marquis, F.skylark,
             F.fillmore, F.cervantes, F.bluebird, F.meow, F.hidive, F.lostlake,
             F.globe, F.gothic, F.ogden, F.levitt],
    queues: QUEUES,
  },
};

// One row per condition, for the anatomy artboards.
const ONE_OF_EACH = [F.redrocks, F.marquis, F.bluebird, F.cervantes, F.gothic];

window.SEVERITY = SEVERITY;
window.BAND_KEYS = BAND_KEYS;
window.sevTint = sevTint;
window.CONDITION_META = CONDITION_META;
window.orderFaults = orderFaults;
window.FAULTS = F;
window.QUEUES = QUEUES;
window.SWEEP = SWEEP;
window.SCENARIOS = SCENARIOS;
window.ONE_OF_EACH = ONE_OF_EACH;
