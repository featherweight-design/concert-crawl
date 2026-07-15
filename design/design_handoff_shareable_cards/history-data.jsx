// history-data.jsx — Concert History (Supporter feature)
//
// **Source of truth:** a show enters History when the user has explicitly
// marked it as "I'm going!" *and* the show date has passed. Watching is
// **not** a proxy for attendance — that's a tracking action (price /
// reminders). Self-reported attendance is the opt-in step that promotes
// the row into the keepsake list.
//
// Shape:
//   goingMarkedAt — ISO timestamp; when the user pressed "I'm going!".
//                   Server-authoritative. A row is only in History if this
//                   is non-null AND dateISO is in the past.
//   genre         — single-word genre tag, used by passport "top genre"
//   priceFinal?   — last face-price observed before the show locked
//
// **What we do NOT collect (v1):** no post-show "Did you go?" prompt. We
// ask in advance via the Watching nudge, then trust the answer. The
// inverse — "actually no, refund the night" — is a settings micro-action,
// not a primary surface.
//
// Demo "now" is anchored 6mo ahead of the Watching demo so the same artist
// catalog flips cleanly to past tense.

const H_NOW = new Date("2026-10-29T22:00:00Z");

function h_relTime(iso) {
  if (!iso) return "";
  const ms = H_NOW - new Date(iso);
  const day = Math.round(ms / (24 * 3600 * 1000));
  if (day < 1)   return "today";
  if (day < 7)   return `${day}d ago`;
  if (day < 30)  return `${Math.round(day / 7)}w ago`;
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

// Bucket key for grouping. Past-facing, so chronologically descending:
// "This month" → "Last month" → "<Month YYYY>" for everything older.
function h_groupForDate(iso) {
  const d = new Date(iso);
  const now = H_NOW;
  const sameMonth = d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  if (sameMonth) return "thisMonth";

  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  if (d.getUTCFullYear() === lastMonth.getUTCFullYear() && d.getUTCMonth() === lastMonth.getUTCMonth()) {
    return "lastMonth";
  }

  // Older — "Month YYYY" (drop year if it matches current year)
  const monthName = d.toLocaleString("en-US", { month: "long", timeZone: "America/Denver" });
  if (d.getUTCFullYear() === now.getUTCFullYear()) return monthName;
  return `${monthName} ${d.getUTCFullYear()}`;
}

const H_GROUP_LABEL = {
  thisMonth: "This month",
  lastMonth: "Last month",
};
const H_GROUP_ORDER = ["thisMonth", "lastMonth"];

// ── Sample data ───────────────────────────────────────────────
// 18 shows across ~14 months. Variety in venue (10 unique), genre (6),
// and price (free → $95) so the passport math has real numbers behind it.

const H_SHOWS = [
  // ── This month (Oct 2026)
  { id: "h01", artist: "Geese",                venue: "Larimer Lounge",   neighborhood: "Denver",   dateISO: "2026-10-21T03:00:00Z", dateLabel: "Mon, Oct 20",  showTime: "8:00 PM", priceFinal: 28, genre: "Indie rock",  goingMarkedAt: "2026-10-21T05:30:00Z" },
  { id: "h02", artist: "Mannequin Pussy",      venue: "Bluebird",         neighborhood: "Denver",   dateISO: "2026-10-15T03:00:00Z", dateLabel: "Wed, Oct 14",  showTime: "8:00 PM", priceFinal: 38, genre: "Punk",        goingMarkedAt: "2026-10-15T05:30:00Z" },
  { id: "h03", artist: "Amyl and The Sniffers",venue: "Gothic",           neighborhood: "Englewood",dateISO: "2026-10-08T03:00:00Z", dateLabel: "Wed, Oct 7",   showTime: "9:00 PM", priceFinal: 24, genre: "Punk",        goingMarkedAt: "2026-10-08T06:00:00Z" },

  // ── Last month (Sep 2026)
  { id: "h04", artist: "Wednesday",            venue: "Hi-Dive",          neighborhood: "Denver",   dateISO: "2026-09-28T03:00:00Z", dateLabel: "Sun, Sep 27",  showTime: "8:00 PM", priceFinal: 22, genre: "Indie rock",  goingMarkedAt: "2026-09-28T05:30:00Z" },
  { id: "h05", artist: "Fontaines D.C.",       venue: "Mission Ballroom", neighborhood: "Denver",   dateISO: "2026-09-19T02:00:00Z", dateLabel: "Fri, Sep 18",  showTime: "8:00 PM", priceFinal: 67, genre: "Post-punk",   goingMarkedAt: "2026-09-19T05:00:00Z" },
  { id: "h06", artist: "Wild Pink",            venue: "Hi-Dive",          neighborhood: "Denver",   dateISO: "2026-09-12T02:00:00Z", dateLabel: "Fri, Sep 11",  showTime: "8:00 PM", priceFinal: 22, genre: "Indie rock",  goingMarkedAt: "2026-09-12T05:30:00Z" },
  { id: "h07", artist: "Snail Mail",           venue: "Ogden",            neighborhood: "Denver",   dateISO: "2026-09-04T02:00:00Z", dateLabel: "Thu, Sep 3",   showTime: "8:00 PM", priceFinal: 41, genre: "Indie rock",  goingMarkedAt: "2026-09-04T05:00:00Z" },

  // ── Aug 2026
  { id: "h08", artist: "Electric Callboy",     venue: "Red Rocks",        neighborhood: "Morrison", dateISO: "2026-08-23T01:00:00Z", dateLabel: "Fri, Aug 22",  showTime: "7:00 PM", priceFinal: 55, genre: "Metal",       goingMarkedAt: "2026-08-23T05:00:00Z" },
  { id: "h09", artist: "MJ Lenderman",         venue: "Bluebird",         neighborhood: "Denver",   dateISO: "2026-08-15T03:00:00Z", dateLabel: "Thu, Aug 14",  showTime: "8:00 PM", priceFinal: 32, genre: "Indie rock",  goingMarkedAt: "2026-08-15T05:30:00Z" },
  { id: "h10", artist: "Caroline Polachek",    venue: "Mission Ballroom", neighborhood: "Denver",   dateISO: "2026-08-02T02:00:00Z", dateLabel: "Fri, Aug 1",   showTime: "8:30 PM", priceFinal: 58, genre: "Pop",         goingMarkedAt: "2026-08-02T05:30:00Z" },

  // ── Jul 2026
  { id: "h11", artist: "Big Thief",            venue: "Red Rocks",        neighborhood: "Morrison", dateISO: "2026-07-19T01:00:00Z", dateLabel: "Fri, Jul 18",  showTime: "7:30 PM", priceFinal: 75, genre: "Folk",        goingMarkedAt: "2026-07-19T05:00:00Z" },
  { id: "h12", artist: "Black Country, New Road", venue: "Ogden",         neighborhood: "Denver",   dateISO: "2026-07-12T02:00:00Z", dateLabel: "Fri, Jul 11",  showTime: "8:00 PM", priceFinal: 44, genre: "Post-rock",   goingMarkedAt: "2026-07-12T05:30:00Z" },

  // ── Jun 2026
  { id: "h13", artist: "Geese",                venue: "Larimer Lounge",   neighborhood: "Denver",   dateISO: "2026-06-21T03:00:00Z", dateLabel: "Sat, Jun 20",  showTime: "8:00 PM", priceFinal: 26, genre: "Indie rock",  goingMarkedAt: "2026-06-21T05:30:00Z" },
  { id: "h14", artist: "Phoebe Bridgers",      venue: "Ball Arena",       neighborhood: "Denver",   dateISO: "2026-06-04T02:00:00Z", dateLabel: "Wed, Jun 3",   showTime: "7:30 PM", priceFinal: 95, genre: "Indie rock",  goingMarkedAt: "2026-06-04T05:30:00Z" },

  // ── May 2026
  { id: "h15", artist: "Godspeed You! Black Emperor", venue: "Ogden",     neighborhood: "Denver",   dateISO: "2026-05-09T02:00:00Z", dateLabel: "Sat, May 9",   showTime: "8:30 PM", priceFinal: 42, genre: "Post-rock",   goingMarkedAt: "2026-05-09T06:00:00Z" },
  { id: "h16", artist: "King Gizzard & The Lizard Wizard", venue: "Mission Ballroom", neighborhood: "Denver", dateISO: "2026-05-04T02:00:00Z", dateLabel: "Mon, May 4", showTime: "8:00 PM", priceFinal: 71, genre: "Psych rock", goingMarkedAt: "2026-05-04T05:30:00Z" },

  // ── Apr 2026 — first month any of these were tracked
  { id: "h17", artist: "Amyl and The Sniffers",venue: "Gothic",           neighborhood: "Englewood",dateISO: "2026-04-30T03:00:00Z", dateLabel: "Tue, Apr 29",  showTime: "9:00 PM", priceFinal: 22, genre: "Punk",        goingMarkedAt: "2026-04-30T05:30:00Z" },
  { id: "h18", artist: "Mannequin Pussy",      venue: "Bluebird",         neighborhood: "Denver",   dateISO: "2026-04-08T03:00:00Z", dateLabel: "Tue, Apr 7",   showTime: "8:00 PM", priceFinal: 38, genre: "Punk",        goingMarkedAt: "2026-04-08T05:30:00Z" },
];

// ── Upcoming watched shows (for the Watching-nudge demo) ─────
// A handful of upcoming shows the user is *watching* (price/reminder
// tracking) — three of them sit inside the 7-day nudge window where the
// "Still going?" prompt fires. `goingMarkedAt` is null on all of them
// until the user commits via the CTA.
const H_UPCOMING = [
  // ── Nudge window (≤7 days)
  { id: "u01", artist: "Wednesday",        venue: "Hi-Dive",           neighborhood: "Denver",  dateISO: "2026-11-02T03:00:00Z", dateLabel: "Sun, Nov 1",  showTime: "8:00 PM", currentPrice: 22, savedPrice: 24, sourceKind: "primary",   status: "live",    genre: "Indie rock",  goingMarkedAt: null, savedAt: "2026-10-12T19:00:00Z" },
  { id: "u02", artist: "Mannequin Pussy",  venue: "Bluebird",          neighborhood: "Denver",  dateISO: "2026-11-04T03:00:00Z", dateLabel: "Tue, Nov 3", showTime: "8:00 PM", currentPrice: 38, savedPrice: 48, sourceKind: "primary",   status: "live",    genre: "Punk",        goingMarkedAt: null, savedAt: "2026-10-08T19:00:00Z" },
  { id: "u03", artist: "Caroline Polachek",venue: "Mission Ballroom",  neighborhood: "Denver",  dateISO: "2026-11-05T02:00:00Z", dateLabel: "Wed, Nov 4", showTime: "8:30 PM", currentPrice: 58, savedPrice: 58, sourceKind: "primary",   status: "live",    genre: "Pop",         goingMarkedAt: "2026-10-22T17:00:00Z", savedAt: "2026-10-04T19:00:00Z" },
  // ── Outside the window
  { id: "u04", artist: "Black Country, New Road", venue: "Ogden",      neighborhood: "Denver",  dateISO: "2026-11-15T02:00:00Z", dateLabel: "Sat, Nov 14", showTime: "8:00 PM", currentPrice: 44, savedPrice: 44, sourceKind: "primary",   status: "live",    genre: "Post-rock",   goingMarkedAt: null, savedAt: "2026-10-01T19:00:00Z" },
  { id: "u05", artist: "Geese",            venue: "Larimer Lounge",    neighborhood: "Denver",  dateISO: "2026-12-04T03:00:00Z", dateLabel: "Thu, Dec 3", showTime: "8:00 PM", currentPrice: 28, savedPrice: 28, sourceKind: "primary",   status: "live",    genre: "Indie rock",  goingMarkedAt: null, savedAt: "2026-09-25T19:00:00Z" },
];
function h_daysUntil(iso) { return Math.round((new Date(iso) - H_NOW) / (1000 * 60 * 60 * 24)); }
function h_isInNudgeWindow(show) {
  const d = h_daysUntil(show.dateISO);
  return d >= 0 && d <= 7 && !show.goingMarkedAt;
}

// Sliced subsets for canvas convenience
const H_SHOWS_NONE = [];
const H_SHOWS_LIGHT = H_SHOWS.slice(0, 3);   // 3 nights — first month of using product
const H_SHOWS_MID   = H_SHOWS.slice(0, 8);   // ~half a year
const H_SHOWS_POWER = H_SHOWS;               // all 18

// ── Stats helpers ─────────────────────────────────────────────
// All passport math derives from this. Single source of truth.
function h_stats(shows) {
  if (!shows || shows.length === 0) {
    return {
      nights: 0, venues: 0, artists: 0, topGenre: null, topVenue: null,
      first: null, last: null, totalSpent: 0,
    };
  }
  const venues  = new Set(shows.map(s => s.venue));
  const artists = new Set(shows.map(s => s.artist));
  const genreCounts = {};
  const venueCounts = {};
  let spent = 0;
  shows.forEach(s => {
    genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    venueCounts[s.venue] = (venueCounts[s.venue] || 0) + 1;
    if (s.priceFinal) spent += s.priceFinal;
  });
  const topGenre = Object.entries(genreCounts).sort((a,b) => b[1] - a[1])[0];
  const topVenue = Object.entries(venueCounts).sort((a,b) => b[1] - a[1])[0];
  const sortedByDate = [...shows].sort((a,b) => new Date(a.dateISO) - new Date(b.dateISO));
  return {
    nights: shows.length,
    venues: venues.size,
    artists: artists.size,
    topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
    topVenue: topVenue ? { name: topVenue[0], count: topVenue[1] } : null,
    first: sortedByDate[0],
    last: sortedByDate[sortedByDate.length - 1],
    totalSpent: spent,
  };
}

// Bucket helper — chronologically descending (most recent first).
// This month → Last month → "<Month YYYY>" months in descending order.
function h_groupBuckets(shows) {
  const map = new Map();
  shows.forEach(s => {
    const key = h_groupForDate(s.dateISO);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  });
  // ensure rows inside each bucket are also descending
  for (const arr of map.values()) {
    arr.sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
  }
  const out = [];
  H_GROUP_ORDER.forEach(k => {
    if (map.has(k)) {
      out.push({ key: k, label: H_GROUP_LABEL[k], shows: map.get(k) });
      map.delete(k);
    }
  });
  // Remaining keys are month-name strings; sort by first show's date descending
  const remaining = [...map.entries()]
    .map(([k, v]) => ({ key: k, label: k, shows: v, sort: new Date(v[0].dateISO).getTime() }))
    .sort((a, b) => b.sort - a.sort);
  remaining.forEach(r => out.push({ key: r.key, label: r.label, shows: r.shows }));
  return out;
}

// Per-show accent — picked deterministically from the artist hash so the same
// artist always reads as the same color across rows. Uses the 7-color brand
// set documented in NEXT_SESSION.md.
const H_ACCENTS = ["#7AE6FF", "#FF7BD4", "#FFE36B", "#A075FF", "#C9F26E", "#FFB838", "#5DD4D6"];
function h_accentFor(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return H_ACCENTS[Math.abs(h) % H_ACCENTS.length];
}

// A second hash bit picks a glyph kind for the stub stamp — 4 options keep
// the row pattern lively without becoming a glyph zoo.
const H_GLYPHS = ["star", "diamond", "ring", "triangle"];
function h_glyphFor(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = (h * 33) ^ name.charCodeAt(i);
  }
  return H_GLYPHS[Math.abs(h) % H_GLYPHS.length];
}

Object.assign(window, {
  H_NOW, H_SHOWS, H_SHOWS_NONE, H_SHOWS_LIGHT, H_SHOWS_MID, H_SHOWS_POWER,
  H_UPCOMING,
  H_GROUP_LABEL, H_GROUP_ORDER, H_ACCENTS,
  h_relTime, h_groupForDate, h_groupBuckets, h_stats, h_accentFor, h_glyphFor,
  h_daysUntil, h_isInNudgeWindow,
});
