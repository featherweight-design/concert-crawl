// overflow-data.jsx — the elements that had no slot, as real inventory. R2.
//
// Adds two fields to the row-data.jsx show shape, plus two statuses. All are
// optional and simply absent on the ~79% of events that don't carry them.
//
//   tourName      string | null   — "One of Those Nights Tour". 8.1% of upcoming.
//   fallbackTitle string | null   — pre-extraction event title. 16.2%, shrinking.
//   status        + "cancelled" | "postponed"                    1.3%
//
// ▲ R2: the field is `fallbackTitle` (production naming), and `artist` is NOT
// nullable — the crawler already falls the title through into `artist` when it
// can't resolve one. So "BASS BINGO" arrives as the artist, and the fallback
// title never has to render. R1's nullable-artist branch is gone.
//
// ▲ R2: the rows with a fallen-through title have NO genres and NO Spotify
// match, because production won't have them — that's what makes them the
// zero-chip population, and it's the height case R1's fixtures hid.
//
// Copy is verbatim from the production samples in the brief.

const O_TOUR = [
  { id: "dwllrs", artist: "DWLLRS", tourName: "One of Those Nights Tour",
    venue: "Larimer Lounge", dateISO: "2026-09-18T19:00:00Z", dateLabel: "Fri, Sep 18", showTime: "8:00 PM",
    supports: [], genres: ["indie"], following: true, watching: false, status: "live",
    price: { amount: 24, isFloor: false, source: "primary", observedAt: "2026-08-13T09:00:00Z" },
    saved: { at: "2026-07-20T14:00:00Z", price: 28 } },
  { id: "memba", artist: "MEMBA", tourName: "360 IN THE ROUND Album Release Party",
    venue: "Meow Wolf Denver", dateISO: "2026-09-26T19:00:00Z", dateLabel: "Sat, Sep 26", showTime: "9:00 PM",
    supports: ["Kotek"], genres: ["electronic"], following: false, watching: true, status: "live",
    price: { amount: 32, isFloor: true, source: "community", observedAt: "2026-08-04T09:00:00Z" },
    saved: { at: "2026-07-28T14:00:00Z", price: 32 } },
  { id: "ninevicious", artist: "Nine Vicious", tourName: "A TOUR",
    venue: "Globe Hall", dateISO: "2026-10-02T19:00:00Z", dateLabel: "Fri, Oct 2", showTime: "8:00 PM",
    supports: [], genres: ["punk"], following: false, watching: false, status: "live",
    price: { amount: 18, isFloor: false, source: "primary", observedAt: "2026-08-13T09:00:00Z" }, saved: null },
];

const O_LEGACY = [
  // Redundant with the artist line, plus supports the crawler later extracted.
  { id: "shwayze", artist: "Shwayze", fallbackTitle: "Shwayze with Claire Wright",
    venue: "Bluebird Theater", dateISO: "2026-09-11T19:00:00Z", dateLabel: "Fri, Sep 11", showTime: "8:00 PM",
    supports: ["Claire Wright"], genres: ["hip-hop"], following: false, watching: false, status: "live",
    price: { amount: 35, isFloor: true, source: "resale", observedAt: "2026-08-01T09:00:00Z" }, saved: null },
  // ▲ Title fell through into `artist`. No Spotify match, no genre → zero chips.
  { id: "bassbingo", artist: "BASS BINGO", fallbackTitle: "BASS BINGO",
    venue: "Larimer Lounge", dateISO: "2026-08-20T19:00:00Z", dateLabel: "Thu, Aug 20", showTime: "9:00 PM",
    supports: [], genres: [], following: false, watching: false, status: "live",
    price: { amount: 12, isFloor: false, source: "primary", observedAt: "2026-08-12T09:00:00Z" }, saved: null },
  { id: "mainiak", artist: "MAINIAK", fallbackTitle: "MAINIAK",
    venue: "Globe Hall", dateISO: "2026-08-29T19:00:00Z", dateLabel: "Sat, Aug 29", showTime: "8:00 PM",
    supports: [], genres: [], following: false, watching: true, status: "postponed",
    price: null, saved: { at: "2026-07-30T14:00:00Z", price: 20 } },
];

const O_STATUS = [
  { id: "cancelled", artist: "Kelly Lee Owens", tourName: "Dreamstate Tour",
    venue: "Ophelia's Electric Soapbox", dateISO: "2026-09-03T19:00:00Z", dateLabel: "Thu, Sep 3", showTime: "8:00 PM",
    supports: [], genres: ["electronic"], following: true, watching: true, status: "cancelled",
    price: { amount: 30, isFloor: false, source: "primary", observedAt: "2026-08-11T09:00:00Z" },
    saved: { at: "2026-06-30T14:00:00Z", price: 30 } },
  { id: "postponed", artist: "Balthvs", fallbackTitle: "BALTHVS (rescheduled)",
    venue: "Mission Ballroom", dateISO: "2026-10-17T19:00:00Z", dateLabel: "Sat, Oct 17", showTime: "7:00 PM",
    supports: ["Combo Chimbita"], genres: ["psych"], following: false, watching: false, status: "postponed",
    price: { amount: 41, isFloor: true, source: "community", observedAt: "2026-08-09T09:00:00Z" }, saved: null },
  // ▲ The live bug this pass fixes: production checks soldout before cancelled,
  // so this show currently reads "Sold out".
  { id: "bothstates", artist: "Chalk Hands", tourName: "Don't Wait Tour",
    venue: "Hi-Dive", dateISO: "2026-09-30T19:00:00Z", dateLabel: "Wed, Sep 30", showTime: "8:00 PM",
    supports: [], genres: ["post-rock"], following: false, watching: true, status: "cancelled",
    price: { amount: 22, isFloor: false, source: "primary", observedAt: "2026-08-10T09:00:00Z" },
    saved: { at: "2026-07-05T14:00:00Z", price: 22 }, alsoSoldOut: true },
];

// ▲ The zero-chip population — no genre, no Spotify match. On Browse these have
// no line 4 at all, which is where the "two heights" claim broke.
const O_SPARSE = [
  O_LEGACY[1],
  O_LEGACY[2],
  { id: "panther", artist: "Panther Hollow", venue: "Hi-Dive",
    dateISO: "2026-09-09T19:00:00Z", dateLabel: "Wed, Sep 9", showTime: "8:00 PM",
    supports: [], genres: [], following: false, watching: false, status: "live",
    price: { amount: 15, isFloor: false, source: "primary", observedAt: "2026-08-13T09:00:00Z" }, saved: null },
];

// A mixed list in roughly production proportions — 3 of 11 rows carry one of
// the three elements, and 2 of 11 are zero-chip rows.
const O_MIXED = [
  window.R_SHOWS[0],
  O_TOUR[0],
  O_LEGACY[1],
  O_LEGACY[0],
  window.R_SHOWS[2],
  O_TOUR[1],
  O_SPARSE[2],
  O_STATUS[0],
  window.R_SHOWS[4],
  window.R_SHOWS[1],
  window.R_SHOWS[5],
];

// ▲ R3.3 · genre fixtures. The reorder only DOES anything when the primary genre
// is outside the picked bucket — see the note in genre-pair.jsx. One of each:
const O_GENRE = [
  // Both genres in the jazz bucket → the reorder is a no-op. This is Masego,
  // i.e. the act the request was about.
  { id: "masego2", artist: "Masego", venue: "Ogden Theatre",
    dateISO: "2026-09-24T19:00:00Z", dateLabel: "Thu, Sep 24", showTime: "8:00 PM",
    supports: [], genres: ["funk", "soul"], following: true, watching: false, status: "live",
    price: { amount: 45, isFloor: false, source: "primary", observedAt: "2026-08-13T09:00:00Z" }, saved: null },
  // Primary genre OUTSIDE the jazz bucket → the reorder fires: soul leads.
  { id: "crossbucket", artist: "Ric Wilson", venue: "Larimer Lounge",
    dateISO: "2026-10-08T19:00:00Z", dateLabel: "Thu, Oct 8", showTime: "8:30 PM",
    supports: [], genres: ["hip-hop", "soul"], following: false, watching: false, status: "live",
    price: { amount: 26, isFloor: false, source: "primary", observedAt: "2026-08-13T09:00:00Z" }, saved: null },
];

const O_ALL = [...O_TOUR, ...O_LEGACY, ...O_STATUS];

Object.assign(window, { O_TOUR, O_LEGACY, O_STATUS, O_SPARSE, O_GENRE, O_MIXED, O_ALL });
