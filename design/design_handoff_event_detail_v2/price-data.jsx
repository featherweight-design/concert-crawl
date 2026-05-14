// price-data.jsx — Phase 7 sample data + tiny helpers
// Mirrors the shape coming from the admin's price snapshots
// (see admin-tables.jsx → AdminPricesPage).
//
// Each event may carry a `price` object:
//   {
//     face: 55,             // base ticket price (cheapest tier today, USD)
//     fees: 12.50,          // total fees on top — concise summary
//     feeBreakdown: [...],  // optional line-itemized fees, only shown on tap
//     openedAt: 50,         // face price at first observed snapshot
//     low14d: 50,           // 14-day low face
//     high14d: 58,          // 14-day high face
//     range14d: [50,...],   // sparkline data — only meaningful when we have history
//     observedAt: <iso>,    // most recent snapshot timestamp
//     source: "Mission Ballroom",       // human-readable source label
//     sourceUrl: "https://…",
//     sourceKind: "primary",            // see Trust hierarchy below
//     faceKnown: 45,                    // resale only: actual face when known
//     submitter: { handle, url, name }, // community / boxoffice
//     boxOfficeAction: "bought"|"saw",  // boxoffice only — see Trust hierarchy
//     boxOfficeMethod: "in-person"|"phone",
//     verification: { by, at },
//     status: "live" | "soldout" | "presale" | "tba",
//     tier: "from" | "fixed" | "range",
//     alternates: [                     // other sources for the same show,
//       { face, fees, source, sourceKind, ... },   // rendered as compact rows
//     ],
//   }
//
// ====================================================================
// Trust hierarchy  (May 13, 2026 — box-office tier added)
// ====================================================================
//
//   1. BOX OFFICE   sourceKind: "boxoffice"
//                   The gold standard. A fan went to (or called) the venue
//                   box office and saw the real face value, no fees.
//                   Has sub-tiers based on action × method:
//
//                   action="bought"  method="in-person"  → BOX OFFICE  (top)
//                   action="bought"  method="phone"      → BOX OFFICE  (verified purchase)
//                   action="saw"     method="in-person"  → BOX OFFICE  (saw at venue)
//                   action="saw"     method="phone"      → COMMUNITY   (“called & asked” —
//                                                          drops out of gold tier;
//                                                          treated as a community sub)
//
//                   Override rule: when a fresh (<14d) box-office submission exists,
//                   it ALWAYS wins the headline price slot regardless of what else
//                   is present (TM scrape, resale, other community subs). Everything
//                   else renders as `alternates` below the headline.
//
//   2. COMMUNITY    sourceKind: "community"
//                   Fan-reported number from a source that isn't the box office
//                   (or called-only “saw the price” submissions, see above).
//
//   3. RESALE       sourceKind: "resale"
//                   Secondary market — SeatGeek, StubHub, etc.
//
//   4. PRIMARY      sourceKind: "primary"
//                   Structured data we scraped from a venue's own site.
//                   Rare under the May-2026 strategy; included for completeness.
//
// Many events still won't have any price data. That's fine and intentional —
// the value prop is the show, not the price.

const PHASE7_EVENTS = {
  // ── Phase 7.2 — BOX OFFICE, gold-standard (bought in person) ──
  // The top of the trust hierarchy. Face value, no fees, fan went to
  // the venue and bought a ticket. Carries an `alternates` array so the
  // card can also show what TM/resale wants — fan has options.
  bigThief: {
    artist: "Big Thief",
    title: "Big Thief",
    venue: "Mission Ballroom",
    venueShort: "Mission",
    neighborhood: "RiNo, Denver",
    date: "Fri, May 22",
    doors: "7:00 PM",
    showTime: "8:00 PM",
    genre: ["indie folk"],
    ages: "All Ages",
    description: "Big Thief returns to Denver — Adrianne, Buck, Max, James in a room you can actually hear in.",
    price: {
      face: 42,
      fees: 0,            // box-office = no fees
      openedAt: 42,
      low14d:   42,
      high14d:  42,
      range14d: null,     // single data point — sparkline less meaningful
      observedAt: "2026-04-27T17:00:00Z",  // ~18h ago
      source: "Mission Ballroom box office",
      sourceUrl: null,
      sourceKind: "boxoffice",
      boxOfficeAction: "bought",       // bought a ticket
      boxOfficeMethod: "in-person",    // went to the venue
      submitter: { handle: "@hugh", url: "/u/hugh", name: "Hugh" },
      verification: {
        by: { handle: "@amelia", url: "/u/amelia", kind: "user" },
        at: "2026-04-28T06:30:00Z",
      },
      status: "live",
      tier: "fixed",
      alternates: [
        { source: "AXS",        sourceKind: "primary",   face: 42, fees: 14.50,
          sourceUrl: "https://example.com/tickets/bigthief-axs" },
        { source: "SeatGeek",   sourceKind: "resale",    face: 68, fees: 16.00, faceKnown: 42,
          sourceUrl: "https://example.com/tickets/bigthief-sg" },
      ],
    },
  },

  // ── Phase 7.2 — BOX OFFICE, called the venue + bought ──────────
  // Fan called the box office, locked in face value over the phone.
  // Still gold tier (bought), but attribution names the method.
  ldr: {
    artist: "Lana Del Rey",
    title: "Lana Del Rey",
    venue: "Red Rocks Amphitheatre",
    venueShort: "Red Rocks",
    neighborhood: "Morrison, CO",
    date: "Sun, Jun 14",
    doors: "6:30 PM",
    showTime: "7:30 PM",
    genre: ["alt pop"],
    ages: "All Ages",
    description: "Lana at Red Rocks. The kind of show people will mention in introductions for the rest of the year.",
    price: {
      face: 95,
      fees: 0,
      openedAt: 95,
      low14d:   95,
      high14d:  95,
      range14d: null,
      observedAt: "2026-04-28T04:00:00Z",  // ~7h ago
      source: "Red Rocks box office",
      sourceUrl: null,
      sourceKind: "boxoffice",
      boxOfficeAction: "bought",
      boxOfficeMethod: "phone",
      submitter: { handle: "@kel", url: "/u/kel", name: "Kel" },
      status: "live",
      tier: "fixed",
      alternates: [
        { source: "AXS",        sourceKind: "primary",   face: 95, fees: 31.00 },
        { source: "StubHub",    sourceKind: "resale",    face: 185, fees: 42.00, faceKnown: 95 },
      ],
    },
  },

  // ── Phase 7.2 — BOX OFFICE, saw price in person (didn't buy) ───
  // Per May-13 spec revision: SAW submissions — even at the box office —
  // are COMMUNITY tier. "Saw at the venue" and "Called and asked" are both
  // passive observations; only BOUGHT submissions earn the gold tier.
  // The community card surfaces the box-office origin in a context line.
  julien: {
    artist: "Julien Baker & TORRES",
    title: "Send a Prayer My Way",
    venue: "Gothic Theatre",
    venueShort: "Gothic",
    neighborhood: "Englewood, CO",
    date: "Thu, May 14",
    doors: "7:30 PM",
    showTime: "8:30 PM",
    genre: ["indie", "country"],
    ages: "16+",
    description: "Julien Baker and TORRES co-billed on the Send a Prayer My Way tour. Quiet, devastating, perfect for the Gothic.",
    price: {
      face: 38,
      fees: 0,
      openedAt: 38,
      low14d:   38,
      high14d:  38,
      range14d: null,
      observedAt: "2026-04-27T22:00:00Z",
      source: "box office (seen in person)",
      sourceUrl: null,
      sourceKind: "community",        // saw → community, even when in-person at venue
      boxOfficeAction: "saw",
      boxOfficeMethod: "in-person",
      submitter: { handle: "@hugh", url: "/u/hugh", name: "Hugh" },
      status: "live",
      tier: "fixed",
    },
  },

  // ── Phase 7.2 — BOX OFFICE, called and asked (no purchase) ─────
  // Per spec: drops OUT of the box-office gold tier into community.
  // Lowest-effort box-office signal — phone + saw-only = single hop.
  // sourceKind is "community" so it picks up the azure treatment; the
  // attribution still references the box-office call for transparency.
  cigarettes: {
    artist: "Cigarettes After Sex",
    title: "X's World Tour",
    venue: "Mission Ballroom",
    venueShort: "Mission",
    neighborhood: "RiNo, Denver",
    date: "Wed, May 28",
    doors: "7:30 PM",
    showTime: "8:30 PM",
    genre: ["dream pop"],
    ages: "All Ages",
    description: "CASX hush-pop at Mission, exactly how it ought to sound.",
    price: {
      face: 52,
      fees: 0,
      openedAt: 52,
      low14d:   52,
      high14d:  52,
      range14d: null,
      observedAt: "2026-04-28T01:00:00Z",
      source: "box office (by phone)",
      sourceUrl: null,
      // Note: even though the user dialed the venue, this is COMMUNITY tier.
      // The form should let users self-flag this and the backend should map it.
      sourceKind: "community",
      boxOfficeAction: "saw",
      boxOfficeMethod: "phone",
      submitter: { handle: "@amelia", url: "/u/amelia", name: "Amelia" },
      status: "live",
      tier: "fixed",
    },
  },

  // The hero — tickets up, has fees, slight drift
  electricCallboy: {
    artist: "Electric Callboy",
    title: "Tanzneid World Tour",
    venue: "Red Rocks Amphitheatre",
    venueShort: "Red Rocks",
    neighborhood: "Morrison, CO",
    date: "Wed, Apr 30",
    doors: "6:00 PM",
    showTime: "7:00 PM",
    genre: ["metalcore"],
    ages: "All Ages",
    description: "Electric Callboy brings the Tanzneid World Tour to Red Rocks. Expect pyrotechnics, crowd surfs, and songs your parents pretend not to like.",
    price: {
      face: 55,
      fees: 18.50,
      feeBreakdown: [
        { label: "Service",    amount: 12.00 },
        { label: "Facility",   amount: 4.50  },
        { label: "Processing", amount: 2.00  },
      ],
      openedAt: 50,
      low14d:   50,
      high14d:  58,
      range14d: [50,50,50,52,52,52,55,55,55,55,55,55,55,55],
      observedAt: "2026-04-28T07:42:00Z",  // ~3h ago vs demo "now"
      source: "Mission Ballroom",
      sourceUrl: "https://example.com/tickets/ec",
      status: "live",
      tier: "from",
    },
  },

  // Price drop — cheap show that just got cheaper
  amyl: {
    artist: "Amyl and The Sniffers",
    title: "Amyl and The Sniffers",
    venue: "Gothic Theatre",
    venueShort: "Gothic",
    neighborhood: "Englewood, CO",
    date: "Tue, Apr 28",
    doors: "8:00 PM",
    showTime: "9:00 PM",
    genre: ["punk", "garage rock"],
    ages: "16+",
    description: "Amyl Taylor and the boys, at full volume, in a small room. Bring earplugs. Or don't.",
    price: {
      face: 24,
      fees: 7.20,
      feeBreakdown: [
        { label: "Service",    amount: 5.00 },
        { label: "Facility",   amount: 1.50 },
        { label: "Processing", amount: 0.70 },
      ],
      openedAt: 28,
      low14d:   24,
      high14d:  28,
      range14d: [28,28,28,28,28,28,28,28,26,26,26,24,24,24],
      observedAt: "2026-04-28T09:10:00Z",  // ~1h ago
      source: "Gothic Theatre",
      sourceUrl: "https://example.com/tickets/amyl",
      status: "live",
      tier: "fixed",
    },
  },

  // No price data — common case
  yungblud: {
    artist: "YUNGBLUD",
    title: "IDOLS – THE WORLD TOUR",
    venue: "Red Rocks Amphitheatre",
    venueShort: "Red Rocks",
    neighborhood: "Morrison, CO",
    date: "Mon, May 11",
    doors: "7:00 PM",
    showTime: "8:00 PM",
    genre: ["alt rock"],
    ages: "All Ages",
    description: "YUNGBLUD between mosh pit and arena, in the great red bowl.",
    price: null,
  },

  // Sold out — NOW with community attribution. Per May-13 spec: sold-out is
  // community-reported just like price (we don't have an API telling us).
  // `soldOutBy` + `soldOutConfirms` drive the attribution line on the price
  // card and the SoldOutCTA below. A future iteration adds a "still available?"
  // dispute affordance — open question, see README.
  geese: {
    artist: "Geese",
    title: "Geese",
    venue: "Ogden Theatre",
    venueShort: "Ogden",
    neighborhood: "Capitol Hill, Denver",
    date: "Sat, May 9",
    doors: "8:00 PM",
    showTime: "9:00 PM",
    genre: ["indie rock"],
    ages: "16+",
    description: "Geese pulled the rug out and ran on it. Catch the last gasp of their tour at the Ogden.",
    price: {
      face: 25,
      fees: 0,
      openedAt: 25,
      low14d:   25,
      high14d:  25,
      range14d: null,
      observedAt: "2026-04-26T18:00:00Z",
      source: "fan submission",
      sourceUrl: null,
      sourceKind: "community",
      submitter: { handle: "@amelia", url: "/u/amelia", name: "Amelia" },
      status: "soldout",
      soldOutBy: { handle: "@amelia", url: "/u/amelia", at: "2026-04-27T15:00:00Z" },
      soldOutConfirms: 3,
      tier: "fixed",
    },
  },

  // Stale data (>24h)
  twoFriends: {
    artist: "Two Friends",
    title: "Two Friends",
    venue: "Red Rocks Amphitheatre",
    venueShort: "Red Rocks",
    neighborhood: "Morrison, CO",
    date: "Fri, May 1",
    doors: "6:00 PM",
    showTime: "7:00 PM",
    genre: ["electronic"],
    ages: "All Ages",
    description: "EDM duo Two Friends bring the Big Bootie energy to Red Rocks.",
    price: {
      face: 45,
      fees: 14.20,
      feeBreakdown: [
        { label: "Service",    amount: 9.50 },
        { label: "Facility",   amount: 3.00 },
        { label: "Processing", amount: 1.70 },
      ],
      openedAt: 45,
      low14d:   45,
      high14d:  45,
      range14d: [45,45,45,45,45,45,45,45,45,45,45,45,45,45],
      observedAt: "2026-04-26T14:00:00Z",  // ~46h ago — stale
      source: "Red Rocks",
      sourceUrl: "https://example.com/tickets/2friends",
      status: "live",
      tier: "from",
    },
  },

  // Big spike — quietly crept up
  guetta: {
    artist: "David Guetta",
    title: "David Guetta",
    venue: "Red Rocks Amphitheatre",
    venueShort: "Red Rocks",
    neighborhood: "Morrison, CO",
    date: "Tue, May 5",
    doors: "7:00 PM",
    showTime: "8:00 PM",
    genre: ["electronic", "house"],
    ages: "All Ages",
    description: "Guetta-at-Red-Rocks is its own genre. Bring sunglasses for the strobes.",
    price: {
      face: 95,
      fees: 27.50,
      feeBreakdown: [
        { label: "Service",    amount: 18.00 },
        { label: "Facility",   amount: 6.50  },
        { label: "Processing", amount: 3.00  },
      ],
      openedAt: 65,
      low14d:   65,
      high14d:  95,
      range14d: [65,65,68,72,72,75,80,82,85,88,88,90,92,95],
      observedAt: "2026-04-28T08:30:00Z",
      source: "AXS",
      sourceUrl: "https://example.com/tickets/guetta",
      status: "live",
      tier: "from",
    },
  },

  // ── Phase 7.1 — Resale (face value known) ──────────────────────
  // Tour came through with low face but resale market is wild.
  bladee: {
    artist: "Bladee",
    title: "Bladee",
    venue: "Ogden Theatre",
    venueShort: "Ogden",
    neighborhood: "Capitol Hill, Denver",
    date: "Sun, May 3",
    doors: "8:00 PM",
    showTime: "9:00 PM",
    genre: ["cloud rap"],
    ages: "16+",
    description: "Bladee at the Ogden — the Drain Gang faithful descending on Capitol Hill.",
    price: {
      face: 120,           // current cheapest resale listing
      fees: 24.00,
      feeBreakdown: [
        { label: "Service",    amount: 18.00 },
        { label: "Facility",   amount: 4.00 },
        { label: "Processing", amount: 2.00 },
      ],
      openedAt: 95,        // ← cheapest resale at first observation
      low14d:   95,
      high14d:  140,
      range14d: [95,98,100,105,108,112,115,118,118,120,122,125,122,120],
      observedAt: "2026-04-28T08:00:00Z",
      source: "SeatGeek",
      sourceUrl: "https://example.com/tickets/bladee",
      sourceKind: "resale",
      faceKnown: 45,       // ← we know primary sold at this face
      status: "live",
      tier: "from",
    },
  },

  // ── Phase 7.1 — Resale (face value NOT known) ──────────────────
  // Show sold out on primary before we caught it. Resale only.
  floMilli: {
    artist: "Flo Milli",
    title: "Flo Milli",
    venue: "Bluebird Theater",
    venueShort: "Bluebird",
    neighborhood: "Colfax, Denver",
    date: "Thu, May 14",
    doors: "8:00 PM",
    showTime: "9:00 PM",
    genre: ["hip-hop"],
    ages: "16+",
    description: "Flo Milli on the Bluebird stage. Sold out on primary in twenty minutes; resale's all that's left.",
    price: {
      face: 85,            // cheapest resale
      fees: 16.50,
      feeBreakdown: [
        { label: "Service",    amount: 12.00 },
        { label: "Facility",   amount: 3.00 },
        { label: "Processing", amount: 1.50 },
      ],
      openedAt: 75,
      low14d:   72,
      high14d:  95,
      range14d: [75,78,82,85,88,90,88,85,82,80,82,85,88,85],
      observedAt: "2026-04-28T10:00:00Z",
      source: "SeatGeek",
      sourceUrl: "https://example.com/tickets/flomilli",
      sourceKind: "resale",
      // faceKnown intentionally omitted — primary never published a face
      status: "live",
      tier: "from",
    },
  },

  // ── Phase 7.1 — Community submission, recent, attributed ───────
  caroline: {
    artist: "Caroline Polachek",
    title: "Caroline Polachek",
    venue: "Mission Ballroom",
    venueShort: "Mission",
    neighborhood: "RiNo, Denver",
    date: "Sat, May 16",
    doors: "7:00 PM",
    showTime: "8:00 PM",
    genre: ["art pop"],
    ages: "All Ages",
    description: "Caroline Polachek at Mission Ballroom — the venue's night for everyone who got a ticket and everyone who didn't.",
    price: {
      face: 65,
      fees: 0,             // community submissions don't carry verified fees
      openedAt: 65,
      low14d:   65,
      high14d:  65,
      range14d: null,      // single data point — no sparkline
      observedAt: "2026-04-26T22:00:00Z",  // 2 days ago
      source: "fan submission",
      sourceUrl: null,
      sourceKind: "community",
      submitter: { handle: "@hugh", url: "/u/hugh" },
      verification: {
        by: { handle: "@amelia", url: "/u/amelia", kind: "user" },
        at: "2026-04-27T15:00:00Z",  // ~20h ago — fresh
      },
      status: "live",
      tier: "fixed",
    },
  },

  // ── Phase 7.1 — Community submission, older, anonymous ─────────
  mannequin: {
    artist: "Mannequin Pussy",
    title: "Mannequin Pussy",
    venue: "Hi-Dive",
    venueShort: "Hi-Dive",
    neighborhood: "Baker, Denver",
    date: "Wed, May 20",
    doors: "8:00 PM",
    showTime: "9:00 PM",
    genre: ["punk"],
    ages: "21+",
    description: "Mannequin Pussy at the Hi-Dive. Tight room, no escape, exactly the point.",
    price: {
      face: 28,
      fees: 0,
      openedAt: 28,
      low14d:   28,
      high14d:  28,
      range14d: null,
      observedAt: "2026-04-15T18:00:00Z",  // ~13 days ago — old
      source: "fan submission",
      sourceUrl: null,
      sourceKind: "community",
      submitter: null,     // anonymous
      status: "live",
      tier: "fixed",
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────
// All cheap pure functions. No emoji. No noise.

const NOW_ISO = "2026-04-28T11:00:00Z";  // demo "now"

function formatUSD(n, opts = {}) {
  if (n == null) return null;
  const { whole = false } = opts;
  if (whole || Math.abs(n - Math.round(n)) < 0.005) {
    return `$${Math.round(n)}`;
  }
  return `$${n.toFixed(2)}`;
}

function formatDelta(n, opts = {}) {
  // "+$8" / "−$4" — absolute, no percentage. (User chose absolute-only.)
  if (n == null) return null;
  const { whole = true } = opts;
  if (Math.abs(n) < 0.5) return null;  // sub-dollar → not worth surfacing
  const sign = n > 0 ? "+" : "−";
  const abs = Math.abs(n);
  const num = whole ? Math.round(abs) : abs.toFixed(2);
  return `${sign}$${num}`;
}

function relTime(iso, nowIso = NOW_ISO) {
  const t = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  const ms = now - t;
  if (ms < 0) return "just now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function isStale(iso, nowIso = NOW_ISO, hours = 24) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  return (now - t) > hours * 3600 * 1000;
}

// Source kind helpers — default to primary when not specified
function sourceKind(p) {
  if (!p) return null;
  return p.sourceKind || "primary";
}
function isResale(p)    { return sourceKind(p) === "resale"; }
function isCommunity(p) { return sourceKind(p) === "community"; }
function isBoxOffice(p) { return sourceKind(p) === "boxoffice"; }

// Attribution phrasing for BOX OFFICE TIER (gold) submissions.
// **Box-office tier is restricted to BOUGHT submissions.** A fan must have
// actually purchased a ticket from the venue (in person or by phone) for
// the gold tier. "Saw" submissions — even at the box office — are community
// tier with a box-office origin context line (see communityBoxOfficeContext).
//
// Returns { verb, where, who, prep, method? } so the rendering layer can
// color the verb and submitter separately. Caller passes the venue display name.
function boxOfficeAttribution(p, venue) {
  if (!isBoxOffice(p)) return null;
  if (p.boxOfficeAction !== "bought") return null;  // only purchases qualify
  const v = venue ? `${venue} box office` : "the box office";
  const who = p.submitter && p.submitter.handle
    ? p.submitter.handle
    : "an anonymous fan";
  if (p.boxOfficeMethod === "in-person") return { verb: "Bought", where: `at ${v}`, who, prep: "by" };
  if (p.boxOfficeMethod === "phone")     return { verb: "Bought", where: `from ${v}`, who, prep: "by", method: "by phone" };
  return null;
}

// Box-office sub-tier — derived from action × method.
// Returns: "in-person-bought" | "phone-bought" | null.
// Per May-13 spec: only BOUGHT submissions earn the gold tier. Submissions
// with action="saw" never have sourceKind=boxoffice in the first place —
// they're community tier with optional box-office context.
function boxOfficeSubtier(p) {
  if (!isBoxOffice(p)) return null;
  if (p.boxOfficeAction !== "bought") return null;
  if (p.boxOfficeMethod === "in-person") return "in-person-bought";
  if (p.boxOfficeMethod === "phone")     return "phone-bought";
  return null;
}

// Context phrasing for COMMUNITY TIER submissions that came from a box-office
// origin (saw in person OR by phone). Returns a short context string the
// community card can render alongside its standard attribution.
//
//   saw + in-person  →  "Saw at {Venue} box office"  (passive in-person observation)
//   saw + phone      →  "Called the {Venue} box office"  (phone observation)
//
// Returns null for any community submission that isn't a box-office observation.
function communityBoxOfficeContext(p, venue) {
  if (!isCommunity(p)) return null;
  if (p.boxOfficeAction !== "saw") return null;
  const v = venue ? `${venue} box office` : "the box office";
  if (p.boxOfficeMethod === "in-person") return { verb: "Saw",    where: `at ${v}`,  kind: "in-person" };
  if (p.boxOfficeMethod === "phone")     return { verb: "Called", where: `the ${v.replace(/^the /, "")}`, kind: "phone" };
  return null;
}

// Markup over face — only meaningful when sourceKind === "resale"
// AND we know the face value. Returns positive number = $ over face.
function markupVsFace(p) {
  if (!p || !isResale(p) || p.faceKnown == null || p.face == null) return null;
  return p.face - p.faceKnown;
}

// All-in = face + fees, single number for the casual browser
function allIn(p) {
  if (!p || p.face == null) return null;
  return p.face + (p.fees || 0);
}

// Δ vs on-sale (positive = up = bad-for-fan; negative = down = good)
function deltaVsOpen(p) {
  if (!p || p.face == null || p.openedAt == null) return null;
  return p.face - p.openedAt;
}

// Δ flag for headline treatment.
// "drop"   : down meaningfully → subtle good signal
// "spike"  : up meaningfully   → muted note (we don't shout)
// null     : no movement worth showing
function deltaFlag(p, threshold = 4) {
  const d = deltaVsOpen(p);
  if (d == null) return null;
  if (d <= -threshold) return "drop";
  if (d >=  threshold) return "spike";
  return null;
}

// "Range vs all-in" string for compact card chips
// Falls back to "from" if we only know the cheapest tier.
function priceChipText(p) {
  if (!p || p.face == null) return null;
  if (p.status === "soldout") return "Sold out";
  if (p.tier === "from")  return `$${p.face}+`;
  if (p.tier === "fixed") return `$${p.face}`;
  if (p.tier === "range" && p.high14d) return `$${p.face}–$${p.high14d}`;
  return `$${p.face}`;
}

// Pretty fee summary — "+ $18 fees" or "+ $18.50 fees"
function feeSummary(p) {
  if (!p || !p.fees) return null;
  return `+ ${formatUSD(p.fees, { whole: p.fees >= 10 })} fees`;
}

window.PHASE7_EVENTS = PHASE7_EVENTS;
window.phase7 = {
  NOW_ISO, formatUSD, formatDelta, relTime, isStale,
  allIn, deltaVsOpen, deltaFlag, priceChipText, feeSummary,
  sourceKind, isResale, isCommunity, isBoxOffice, markupVsFace,
  boxOfficeSubtier, boxOfficeAttribution, communityBoxOfficeContext,
};
