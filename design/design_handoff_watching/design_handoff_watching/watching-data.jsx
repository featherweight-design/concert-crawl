// watching-data.jsx — Phase 9 Saved/Watching surface
// Sample shows + helpers for the Watching surface. The shape extends the Phase 7
// price object with two additions:
//
//   savedAt:      ISO — when the user tapped "Watch" on the show
//   savedPrice:   number — face price observed at the moment they saved
//   priceTrail:   number[] — face-price history *since saved* (for the per-row sparkline)
//                            First entry === savedPrice; last entry === current face.
//
// Status taxonomy for a watched row:
//   "fresh"     — show hasn't moved much (<$2 swing); muted treatment
//   "drop"      — current < saved; success-tinted delta
//   "spike"     — current > saved; muted-warning delta (we don't paint screen red)
//   "soldout"   — vendor reports no inventory; row dimmed, SOLD OUT pill replaces price column
//   "stale"     — observedAt > 24h; warning dot on price, copy "as of …"
//   "noprice"   — never had a face; row stays in list but price column reads em-dash

const W_NOW = new Date("2026-04-29T19:00:00Z");  // demo "now"

function w_relTime(iso) {
  if (!iso) return "";
  const ms = W_NOW - new Date(iso);
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const hr  = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function w_formatUSD(n) {
  if (n == null) return "—";
  return `$${Math.round(n)}`;
}

function w_formatDelta(saved, current) {
  if (saved == null || current == null) return "";
  const d = current - saved;
  if (Math.abs(d) < 1) return "flat";
  return (d > 0 ? "+$" : "−$") + Math.abs(Math.round(d));
}

function w_classifyDelta(saved, current) {
  if (saved == null || current == null) return "noprice";
  const d = current - saved;
  if (Math.abs(d) < 2) return "fresh";
  return d < 0 ? "drop" : "spike";
}

// Days from now to show date. Negative = past (these get filtered server-side; we only
// keep them here for demo so we can preview the auto-archive boundary).
function w_daysUntil(iso) {
  return Math.round((new Date(iso) - W_NOW) / (1000 * 60 * 60 * 24));
}

function w_doorIn(iso) {
  const days = w_daysUntil(iso);
  if (days < 0) return null;                    // past — filter upstream
  if (days === 0) return "Tonight";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days}d`;
  if (days < 14) return "Next week";
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

// Bucket key for the default grouped layout. Tonight | This week | Next week | <Month>
function w_groupForDate(iso) {
  const days = w_daysUntil(iso);
  if (days < 0) return "past";
  if (days === 0) return "tonight";
  if (days < 7)   return "thisWeek";
  if (days < 14)  return "nextWeek";
  // Month name ("May", "June", …) for everything beyond next week
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long", timeZone: "America/Denver" });
}

const W_GROUP_LABEL = {
  tonight:  "Tonight",
  thisWeek: "This week",
  nextWeek: "Next week",
  later:    "Later",
  past:     "Past",
};

// Stable order: tonight → this/next week → months in chronological order. The
// caller passes the resolved key; for month strings the receiver sorts by date
// of first show in that bucket.
const W_GROUP_ORDER = ["tonight", "thisWeek", "nextWeek"];

// ── Sample data ───────────────────────────────────────────────
// 8 shows. Mix is intentional — drops, spikes, flat, sold-out, stale, no-price.

const W_SHOWS = [
  // 1 · Drop · saved 6 days ago, price slid down
  {
    id: "ec",
    artist: "Electric Callboy",
    venue: "Red Rocks",
    venueLong: "Red Rocks Amphitheatre",
    neighborhood: "Morrison, CO",
    dateISO: "2026-04-30T01:00:00Z",
    dateLabel: "Wed, Apr 29",
    showTime: "7:00 PM",
    savedAt: "2026-04-23T22:00:00Z",
    savedPrice: 62,
    currentPrice: 55,
    priceTrail: [62, 62, 60, 58, 58, 55, 55, 55],
    observedAt: "2026-04-29T16:00:00Z",
    sourceKind: "primary",
    status: "live",
  },
  // 2 · Tonight · price held, sparkline mostly flat
  {
    id: "amyl",
    artist: "Amyl and The Sniffers",
    venue: "Gothic",
    venueLong: "Gothic Theatre",
    neighborhood: "Englewood, CO",
    dateISO: "2026-04-30T03:00:00Z",
    dateLabel: "Tonight",
    showTime: "9:00 PM",
    savedAt: "2026-04-12T18:00:00Z",
    savedPrice: 24,
    currentPrice: 22,
    priceTrail: [24, 24, 23, 23, 24, 22, 22, 22],
    observedAt: "2026-04-29T15:30:00Z",
    sourceKind: "primary",
    status: "live",
  },
  // 3 · Big drop, freshly observed
  {
    id: "mp",
    artist: "Mannequin Pussy",
    venue: "Bluebird",
    venueLong: "Bluebird Theater",
    neighborhood: "Denver, CO",
    dateISO: "2026-05-07T03:00:00Z",
    dateLabel: "Thu, May 7",
    showTime: "8:00 PM",
    savedAt: "2026-04-20T19:00:00Z",
    savedPrice: 48,
    currentPrice: 38,
    priceTrail: [48, 48, 46, 44, 42, 40, 38, 38],
    observedAt: "2026-04-29T17:55:00Z",
    sourceKind: "primary",
    status: "live",
  },
  // 4 · Sold out (was watching anyway)
  {
    id: "geese",
    artist: "Geese",
    venue: "Larimer Lounge",
    venueLong: "Larimer Lounge",
    neighborhood: "Denver, CO",
    dateISO: "2026-05-12T03:00:00Z",
    dateLabel: "Tue, May 12",
    showTime: "8:00 PM",
    savedAt: "2026-04-18T19:00:00Z",
    savedPrice: 28,
    currentPrice: 28,
    priceTrail: [28, 28, 28, 28, 28, 28, 28, 28],
    observedAt: "2026-04-29T13:00:00Z",
    sourceKind: "primary",
    status: "soldout",
  },
  // 5 · Spike — resale market, +$22
  {
    id: "fontaines",
    artist: "Fontaines D.C.",
    venue: "Mission Ballroom",
    venueLong: "Mission Ballroom",
    neighborhood: "Denver, CO",
    dateISO: "2026-05-15T02:00:00Z",
    dateLabel: "Fri, May 15",
    showTime: "8:00 PM",
    savedAt: "2026-04-10T19:00:00Z",
    savedPrice: 45,
    currentPrice: 67,
    priceTrail: [45, 47, 50, 52, 55, 60, 64, 67],
    observedAt: "2026-04-29T18:00:00Z",
    sourceKind: "resale",
    status: "live",
  },
  // 6 · Stale — last observation >24h ago
  {
    id: "wild",
    artist: "Wild Pink",
    venue: "Hi-Dive",
    venueLong: "Hi-Dive",
    neighborhood: "Denver, CO",
    dateISO: "2026-05-22T02:00:00Z",
    dateLabel: "Fri, May 22",
    showTime: "8:00 PM",
    savedAt: "2026-04-15T19:00:00Z",
    savedPrice: 22,
    currentPrice: 22,
    priceTrail: [22, 22, 22, 22, 22, 22, 22, 22],
    observedAt: "2026-04-27T22:00:00Z",  // 2d ago
    sourceKind: "primary",
    status: "live",
  },
  // 7 · No price published yet (presale / fanclub / scrape block)
  {
    id: "phoebe",
    artist: "Phoebe Bridgers",
    venue: "Ball Arena",
    venueLong: "Ball Arena",
    neighborhood: "Denver, CO",
    dateISO: "2026-06-04T02:00:00Z",
    dateLabel: "Wed, Jun 3",
    showTime: "7:30 PM",
    savedAt: "2026-04-22T19:00:00Z",
    savedPrice: null,
    currentPrice: null,
    priceTrail: [],
    observedAt: "2026-04-29T12:00:00Z",
    sourceKind: "primary",
    status: "presale",
  },
  // 8 · Spike (small) — community submission, verified
  {
    id: "snail",
    artist: "Snail Mail",
    venue: "Ogden",
    venueLong: "Ogden Theatre",
    neighborhood: "Denver, CO",
    dateISO: "2026-06-19T02:00:00Z",
    dateLabel: "Thu, Jun 18",
    showTime: "8:00 PM",
    savedAt: "2026-04-05T19:00:00Z",
    savedPrice: 35,
    currentPrice: 41,
    priceTrail: [35, 35, 36, 38, 38, 40, 40, 41],
    observedAt: "2026-04-29T11:00:00Z",
    sourceKind: "community",
    status: "live",
  },
];

// Pre-sliced subsets for canvas convenience
const W_SHOWS_FEW  = W_SHOWS.slice(0, 3);
const W_SHOWS_NONE = [];

// Long-name stress test — the longest plausible artist name we'd realistically
// see ("Godspeed You! Black Emperor", "King Gizzard & The Lizard Wizard",
// "…And You Will Know Us by the Trail of Dead"). Used to verify that the
// Tonight chip + venue line don't break with extreme overflow.
const W_SHOWS_LONGNAMES = [
  {
    id: "longA",
    artist: "…And You Will Know Us by the Trail of Dead",
    venue: "Bluebird Theater",
    dateISO: "2026-04-30T03:00:00Z",
    dateLabel: "Tonight", showTime: "8:00 PM",
    savedAt: "2026-04-22T19:00:00Z",
    savedPrice: 32, currentPrice: 28,
    priceTrail: [32,32,30,30,28,28,28,28],
    observedAt: "2026-04-29T16:00:00Z",
    sourceKind: "primary", status: "live",
  },
  {
    id: "longB",
    artist: "King Gizzard & The Lizard Wizard",
    venue: "Mission Ballroom",
    dateISO: "2026-05-04T02:00:00Z",
    dateLabel: "Mon, May 4", showTime: "8:00 PM",
    savedAt: "2026-04-15T19:00:00Z",
    savedPrice: 55, currentPrice: 71,
    priceTrail: [55,55,58,62,65,68,70,71],
    observedAt: "2026-04-29T17:00:00Z",
    sourceKind: "resale", status: "live",
  },
  {
    id: "longC",
    artist: "Godspeed You! Black Emperor",
    venue: "Ogden Theatre",
    dateISO: "2026-05-09T02:00:00Z",
    dateLabel: "Sat, May 9", showTime: "8:30 PM",
    savedAt: "2026-04-18T19:00:00Z",
    savedPrice: 42, currentPrice: 42,
    priceTrail: [42,42,42,42,42,42,42,42],
    observedAt: "2026-04-29T18:00:00Z",
    sourceKind: "community", status: "live",
  },
  {
    id: "longD",
    artist: "Black Country, New Road",
    venue: "Gothic Theatre",
    dateISO: "2026-05-16T02:00:00Z",
    dateLabel: "Sat, May 16", showTime: "8:00 PM",
    savedAt: "2026-04-12T19:00:00Z",
    savedPrice: 38, currentPrice: 38,
    priceTrail: [38,38,38,38,38,38,38,38],
    observedAt: "2026-04-29T18:00:00Z",
    sourceKind: "primary", status: "live",
  },
];

// Counts for the digest header — "3 prices moved" copy.
function w_movedCount(shows) {
  return shows.filter(s => {
    const c = w_classifyDelta(s.savedPrice, s.currentPrice);
    return c === "drop" || c === "spike";
  }).length;
}

function w_droppedCount(shows) {
  return shows.filter(s => w_classifyDelta(s.savedPrice, s.currentPrice) === "drop").length;
}

Object.assign(window, {
  W_SHOWS, W_SHOWS_FEW, W_SHOWS_NONE, W_SHOWS_LONGNAMES,
  W_GROUP_LABEL, W_GROUP_ORDER,
  w_relTime, w_formatUSD, w_formatDelta, w_classifyDelta,
  w_daysUntil, w_doorIn, w_groupForDate,
  w_movedCount, w_droppedCount,
});
