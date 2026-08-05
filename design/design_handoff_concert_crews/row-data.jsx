// row-data.jsx — one show shape for every surface.
//
// The drift we're fixing started in the data: Browse rows carried `price` as a
// display string ("from $68"), Watching carried savedPrice/currentPrice/
// sourceKind/observedAt, and neither knew about the other. One shape now, with
// per-surface fields that are simply absent when they don't apply.
//
//   artist, venue, dateISO, dateLabel, showTime   — always
//   supports[]                                     — billing under the headliner
//   genres[]                                       — always
//   following                                      — artist-level (Spotify)
//   watching                                       — show-level
//   price { amount, isFloor, source, observedAt }  — null when unpriced
//     source: "primary" (crawled from the venue page — no chip) or one of
//     production's source_category values, "boxoffice" | "standard" | "resale"
//   saved { at, price }                            — Watching only
//   status: "live" | "soldout" | "presale"
//
// Nothing here is display copy. Formatting lives in the row.

const R_NOW = new Date("2026-08-03T19:00:00Z");

function r_relTime(iso) {
  if (!iso) return "";
  const min = Math.round((R_NOW - new Date(iso)) / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
function r_isStale(iso) {
  return iso ? (R_NOW - new Date(iso)) > 24 * 3600 * 1000 : false;
}
function r_usd(n) { return n == null ? "—" : `$${Math.round(n)}`; }
function r_delta(saved, current) {
  if (saved == null || current == null) return null;
  const d = current - saved;
  if (Math.abs(d) < 2) return { cls: "flat", text: "flat" };
  return { cls: d < 0 ? "drop" : "spike", text: (d > 0 ? "+$" : "−$") + Math.abs(Math.round(d)) };
}

// The show from the screenshots — the one that renders two different ways today.
const R_HERMANOS = {
  id: "hermanos",
  artist: "Hermanos Gutiérrez",
  venue: "Mission Ballroom",
  dateISO: "2026-10-03T19:00:00Z",
  dateLabel: "Sat, Oct 3",
  showTime: "7:00 PM",
  supports: ["Sunny War"],
  genres: ["latin", "folk"],
  following: true,
  watching: true,
  status: "live",
  price: { amount: 68, isFloor: true, source: "standard", observedAt: "2026-07-25T14:00:00Z" },
  saved: { at: "2026-07-10T14:00:00Z", price: 74 },
};

const R_HOLDFAST = {
  id: "holdfast",
  artist: "Holdfast.",
  venue: "Meow Wolf Denver",
  dateISO: "2026-08-15T19:00:00Z",
  dateLabel: "Sat, Aug 15",
  showTime: "8:00 PM",
  supports: ["hellocentral", "Jaguar Stevens"],
  genres: ["indie"],
  following: false,
  watching: false,
  status: "live",
  price: null,
  saved: null,
};

const R_SHOWS = [
  R_HOLDFAST,
  { id: "masego", artist: "Masego", venue: "Mission Ballroom", dateISO: "2026-09-08T19:00:00Z",
    dateLabel: "Tue, Sep 8", showTime: "7:00 PM", genres: ["funk", "soul"], supports: [],
    following: true, watching: false, status: "live", price: null, saved: null },
  { id: "fourtet", artist: "Four Tet", venue: "Mission Ballroom", dateISO: "2026-09-24T19:00:00Z",
    dateLabel: "Thu, Sep 24", showTime: "8:00 PM", genres: ["electronic"], supports: ["Anna Wall"],
    following: true, watching: true, status: "live",
    price: { amount: 52, isFloor: false, source: "primary", observedAt: "2026-08-03T09:00:00Z" },
    saved: { at: "2026-07-02T14:00:00Z", price: 61 } },
  R_HERMANOS,
  { id: "fkj", artist: "FKJ", venue: "Mission Ballroom", dateISO: "2026-10-29T19:00:00Z",
    dateLabel: "Thu, Oct 29", showTime: "8:00 PM", genres: ["electronic", "funk"], supports: [],
    following: true, watching: true, status: "soldout",
    price: { amount: 45, isFloor: false, source: "primary", observedAt: "2026-08-02T09:00:00Z" },
    saved: { at: "2026-06-19T14:00:00Z", price: 45 } },
  { id: "cassandra", artist: "Cassandra Jenkins", venue: "Globe Hall", dateISO: "2026-09-05T19:00:00Z",
    dateLabel: "Sat, Sep 5", showTime: "8:00 PM", genres: ["indie", "folk"], supports: [],
    following: false, watching: true, status: "live",
    price: { amount: 29, isFloor: false, source: "boxoffice", observedAt: "2026-08-03T09:00:00Z" },
    saved: { at: "2026-07-14T14:00:00Z", price: 29 } },
  { id: "geese", artist: "Geese", venue: "Larimer Lounge", dateISO: "2026-09-12T19:00:00Z",
    dateLabel: "Sat, Sep 12", showTime: "9:00 PM", genres: ["rock"], supports: ["Wombo", "Been Stellar"],
    following: false, watching: false, status: "presale", price: null, saved: null },
  { id: "longname", artist: "The Brian Jonestown Massacre", venue: "Bluebird Theater",
    dateISO: "2026-09-19T19:00:00Z", dateLabel: "Sat, Sep 19", showTime: "8:00 PM",
    supports: ["The Dandy Warhols"], genres: ["psych", "rock"], following: true, watching: true, status: "live",
    price: { amount: 38, isFloor: true, source: "resale", observedAt: "2026-07-28T09:00:00Z" },
    saved: { at: "2026-07-01T14:00:00Z", price: 33 } },
];

Object.assign(window, { R_NOW, r_relTime, r_isStale, r_usd, r_delta, R_SHOWS, R_HERMANOS, R_HOLDFAST });