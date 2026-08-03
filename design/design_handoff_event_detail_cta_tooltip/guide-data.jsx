// guide-data.jsx — #764 Venue First-Timer Guide
// Chip pool, tokenized icon set, copy maps, and fixtures.
//
// VOICE BAR (Sour Patch #782): honest > cheerful, specific > generic, never
// brochure-y, callout is a question. Every string below is written as though a
// concert-goer typed it. On build, the *_COPY maps lift verbatim into
// apps/web/src/components/consumer/definitions/copy.ts (per feedback_definitions_copy_rule).

const G_FONT = "Inter, system-ui, -apple-system, sans-serif";
const G_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// ── Chip pool ────────────────────────────────────────────────────────────
// accessibility is ALWAYS-PRESENT and locked (admin can't skip it). Its two
// states — authored | honest_placeholder — are the only way to satisfy the
// publish gate. The other seven are opt-in per venue.
const CHIP_ORDER = ["accessibility", "parking", "age", "bag", "coat", "entry", "food", "transit"];

const CHIP_DEFS = {
  accessibility: { key: "accessibility", label: "Accessibility", icon: "access", locked: true, star: true,
                   adminHint: "Step-free entry, restrooms, elevator, seating. Required — a first-timer with a mobility need can't guess." },
  parking:       { key: "parking", label: "Parking", icon: "parking",
                   adminHint: "Lot vs street, price, cash-only, how early it fills." },
  age:           { key: "age", label: "Age policy", icon: "age",
                   adminHint: "18+/21+, where they check ID, wristband rules." },
  bag:           { key: "bag", label: "Bag check", icon: "bag",
                   adminHint: "Size limit, whether there's a check, pat-down at the door." },
  coat:          { key: "coat", label: "Coat check", icon: "coat",
                   adminHint: "Price, cash-only, where it is, worth-it call." },
  entry:         { key: "entry", label: "Will-call / entry", icon: "ticket",
                   adminHint: "Which door, ID needed, do digital tickets scan cleanly." },
  food:          { key: "food", label: "Food + drink", icon: "food",
                   adminHint: "Bars, in-house food, the cart out front, re-entry." },
  transit:       { key: "transit", label: "Getting there", icon: "transit",
                   adminHint: "Nearest train/bus, walk time, where rideshare should drop." },
};

// ── Tokenized icon set (Lucide-style strokes, matches AdminIcon vocabulary) ─
function GuideIcon({ name, size = 18, color = "currentColor", strokeWidth = 1.6 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
              stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    access:  <><circle cx="12" cy="4" r="2" /><path d="M6 7l4 1.2V13m0 0l-2.4 6M10 13l4 .4 2.5 5.6M6.5 7h7" /></>,
    parking: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9.5 16.5V8h3.2a2.6 2.6 0 010 5.2H9.5" /></>,
    age:     <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><circle cx="8" cy="11.5" r="2" /><path d="M5.4 16.2a2.9 2.9 0 015.2 0M14 9.5h4.5M14 13h3.5" /></>,
    bag:     <><path d="M5.5 8h13l1 12H4.5l1-12z" /><path d="M8.5 8V6.5a3.5 3.5 0 017 0V8" /></>,
    coat:    <><path d="M12 4.5a2 2 0 00-1.6 3.2c.4.5.6.9.6 1.3 0 .6-.4 1-1 1.3L4 13.5a1.4 1.4 0 00-.8 1.3V17a1 1 0 001 1h15.6a1 1 0 001-1v-2.2a1.4 1.4 0 00-.8-1.3L14 10.3" /></>,
    ticket:  <><path d="M3 8.5A1.5 1.5 0 014.5 7h15A1.5 1.5 0 0121 8.5v2a1.8 1.8 0 000 3v2A1.5 1.5 0 0119.5 17h-15A1.5 1.5 0 013 15.5v-2a1.8 1.8 0 000-3v-2z" /><path d="M13 7v10" strokeDasharray="1.5 2.2" /></>,
    food:    <><path d="M6 3v6a3 3 0 006 0V3M9 3v6M15 3c-1.2.6-2 2-2 3.6 0 1.7.8 2.6 2 2.9V21" /></>,
    transit: <><rect x="5" y="3.5" width="14" height="13" rx="2.5" /><path d="M5 11h14M9 3.5v7.5M15 3.5v7.5" /><path d="M8 16.5L6 20M16 16.5L18 20" /><circle cx="9" cy="13.7" r=".6" fill={color} stroke="none" /><circle cx="15" cy="13.7" r=".6" fill={color} stroke="none" /></>,
  };
  return <svg {...p} aria-hidden="true">{paths[name] || null}</svg>;
}

// ── Populated guide (The Roxy) — the full, voice-passed reference ──────────
const ROXY_GUIDE_COPY = {
  accessibility: "Step-free entrance on the north side — ask any staffer to open it. One accessible restroom on the main floor. No elevator to the balcony, so it's floor-only if stairs are a no.",
  parking: "Paid lot on Blake, $15 cash. Street usually opens up a block over on Walnut after 7.",
  age: "18+ to get in, 21+ with a wristband to drink. They check IDs on the sidewalk, so have it out before the line.",
  bag: "Nothing bigger than a small purse, and there's no bag check — leave the backpack in the car. Quick pat-down at the door.",
  coat: "Coat check's $3, cash only, back-left by the merch table. Worth it in winter — the floor gets sweaty by the second song.",
  entry: "Will-call is the right-hand door, bring your ID. Screenshots scan fine; crank your brightness up before you get to the scanner.",
  food: "Two bars, one up one down. No food inside, but there's a green-chile cart out front till close. No re-entry once you're in.",
  transit: "A-line to 38th & Blake, then a 6-minute walk. Tell your driver to drop on Walnut — the front's a zoo right at doors.",
};
const ROXY_VIBE = "Roxy runs loud — grab earplugs at the bar if you forgot. The line's rough after 8:30, so come early. Sound's best dead center, about ten feet back off the rail.";

// ── Thin guide — only accessibility authored; the rest honest placeholders ─
const ROXY_THIN_COPY = {
  accessibility: "Step-free entrance around the side on 13th. Accessible restroom on the main floor. Call ahead about balcony seating — it's stairs-only.",
  // parking / age / bag / coat / entry / food / transit → null (not authored yet)
};
const ROXY_THIN_VIBE = null; // no vibe line yet — honest, we don't fake it

// ── Callout copy — a QUESTION, works for anonymous + signed-in identically ─
const CALLOUT_COPY = {
  populated: { q: "First time at Roxy?", sub: "Two minutes of stuff worth knowing before you walk in." },
  thin:      { q: "First time at Roxy?", sub: "Here's what we've got so far." },
};
const EVENT_CHIP_COPY = "First time at Roxy? Guide";

// ── Honest placeholder copy (consumer display) ─────────────────────────────
// Non-accessibility chips with no authored content are NOT faked and NOT
// padded — they collapse into one honest line. Accessibility, when unauthored,
// gets its own explicit placeholder that points you at the venue.
const PLACEHOLDER_COPY = {
  accessibility: "Not documented yet. Best to call the venue and ask before you head out — details are on the main page.",
  thinFooter: "That's the lot for now — Roxy's new to us.",
  thinLabel: "Still gathering",
};

// ── Admin field copy — placeholders model specific-over-generic ────────────
const ADMIN_COPY = {
  blockTitle: "First-timer guide",
  blockSub: "Concert-goer voice only. Write it like you're texting a friend who's never been — specific beats generic, honest beats hype.",
  voiceReminder: "“$15 cash, Blake St.” beats “paid parking available.” If you can't say it like a regular would, leave it blank.",
  accessRequired: "Required. Publish is blocked until this is filled — or explicitly marked not-yet-documented.",
  accessPlaceholder: "e.g. Step-free entry on the north side. Accessible restroom, main floor. No elevator to the balcony.",
  vibeLabel: "Insider tip",
  vibePlaceholder: "e.g. Never been? Roxy runs loud — earplugs at the bar. The line's brutal after 8:30, come early.",
  fieldPlaceholder: {
    parking: "e.g. Paid lot on Blake, $15 cash. Street opens up on Walnut after 7.",
    age: "e.g. 18+ in, 21+ to drink. IDs checked on the sidewalk.",
    bag: "e.g. Nothing bigger than a small purse. No check — leave it in the car.",
    coat: "e.g. $3, cash only, back-left by merch. Worth it in winter.",
    entry: "e.g. Will-call is the right door, bring ID. Screenshots scan fine.",
    food: "e.g. Two bars. No food inside; green-chile cart out front till close.",
    transit: "e.g. A-line to 38th & Blake, 6-min walk. Rideshare drops on Walnut.",
  },
  // The insider tip is the free-form catch-all AND the hero of the guide — it's
  // surfaced first, before the practical chips. The thing you'd tell a friend
  // who's never been. The chip pool stays curated + finite (voice quality bar);
  // structured additions land via #997, and the picker already scales to them.
  vibeHelp: "Surfaced first on the venue page — the thing you'd tell a friend who's never been. Altitude, loudness, the brutal line, a real heads-up. This is what sets us apart.",
};

// v2 chip-pool expansion (#997) — shown as disabled ghosts in the admin picker
// so the finite-but-growing model is legible. Not authorable yet.
const V2_CHIPS = [
  { key: "weather", label: "Weather" },
  { key: "restrooms", label: "Restrooms" },
  { key: "atm", label: "ATMs" },
  { key: "cell", label: "Cell service" },
];

// ── chipState — the three-state model surfaced in admin indicators ─────────
// blank | authored | honest_placeholder (placeholder only valid on accessibility)
function chipState(value, { placeholder = false } = {}) {
  if (placeholder) return "honest_placeholder";
  if (value && String(value).trim().length > 0) return "authored";
  return "blank";
}

// ── Fixtures ───────────────────────────────────────────────────────────────
const ROXY_VENUE = {
  name: "The Roxy",
  neighborhood: "RiNo · Denver, CO",
  city: "Denver",
  capacity: "1,100",
  type: "Club",
  upcoming: 18,
  address: "2549 Welton St",
  // Venue basics live ELSEWHERE on the page — never inside the guide (#764).
};

// About = venue personality, editorial voice. Kept per prod (issue feedback).
// Complements the guide (who/what the room is) without duplicating it (how to survive it).
const ROXY_ABOUT = "A 1,100-cap room in a converted RiNo warehouse — low stage, no bad sightlines, and a PA that punches well above the square footage. Books loud guitar bands and the odd late-night DJ set. Been here since the neighborhood was all body shops.";

const ROXY_UPCOMING = [
  { artist: "Amyl and the Sniffers", date: "Fri, Jul 24", time: "8:00 PM", price: "$32" },
  { artist: "Geese", date: "Sat, Jul 25", time: "8:30 PM", price: null },
  { artist: "Been Stellar", date: "Wed, Jul 29", time: "7:30 PM", price: "$24" },
];

const ROXY_EVENT = {
  artist: "Amyl and the Sniffers",
  title: "Cartoon Darkness Tour",
  venue: "The Roxy",
  venueShort: "Roxy",
  neighborhood: "RiNo · Denver, CO",
  date: "Fri, Jul 24",
  doors: "7:00 PM",
  showTime: "8:00 PM",
  genre: ["punk"],
  ages: "16+",
  price: "$32",
};

Object.assign(window, {
  G_FONT, G_MONO,
  GuideIcon, CHIP_ORDER, CHIP_DEFS,
  ROXY_GUIDE_COPY, ROXY_VIBE, ROXY_THIN_COPY, ROXY_THIN_VIBE,
  CALLOUT_COPY, EVENT_CHIP_COPY, PLACEHOLDER_COPY, ADMIN_COPY,
  chipState, ROXY_VENUE, ROXY_ABOUT, ROXY_UPCOMING, ROXY_EVENT, V2_CHIPS,
});
