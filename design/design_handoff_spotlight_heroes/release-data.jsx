// release-data.jsx — sample release notes for design surfaces
//
// Shape mirrors what the GitHub Releases auto-gen will produce, plus an
// optional `spotlight` block hand-attached for releases that warrant a
// big feature announcement.
//
//   {
//     version, date, headline?,
//     items: [{ kind, text }, ...],
//     spotlight?: {
//       title, tagline, cta, ctaHref,
//       steps: [{ caption }, ...],     // 2–4 step walkthrough
//       hero: "map" | "..."            // which animated hero to render
//       founderNote
//     }
//   }
//
// `headline` is the optional hand-edited 1-liner — founder voice. Spotlight
// is rarer: explicitly flagged on releases that ship a marquee feature.

const RN_KIND_LABEL = {
  added:   "Added",
  fixed:   "Fixed",
  changed: "Changed",
  removed: "Removed",
};

const RN_KIND_COLOR = {
  added:   "var(--success)",
  fixed:   "var(--signal)",
  changed: "var(--fg-muted)",
  removed: "var(--warning)",
};

const RN_RELEASES = [
  {
    version: "v0.5.0-beta",
    date: "May 10, 2026",
    headline: "Map view is here. Find the show — or stumble into one.",
    spotlight: {
      title: "Map view is live.",
      tagline: "Find the show. Or stumble into one.",
      hero: "map",
      cta: "Open the map",
      ctaHref: "#/map",
      steps: [
        { caption: "Pan around. Every venue with a show in your window glows." },
        { caption: "Tap a pin — the show card slides up, same one you'd see on Browse." },
        { caption: "Filter by night, price, or vibe — pins update live." },
      ],
      founderNote: "This one took a while — turns out drawing a city on a phone is hard. I use it most on Friday nights when I don't know what I want yet. If there's a venue we're missing or a filter you wish was there, let me know.",
      founderSign: "— Hugh",
    },
    items: [
      { kind: "added",   text: "Map view. Browse shows geographically, filter as you pan." },
      { kind: "added",   text: "Venue density heatmap behind the pins — spot the busy blocks." },
      { kind: "changed", text: "Browse and Map share a filter sheet now — your selection follows you." },
      { kind: "fixed",   text: "Tap targets on small phones no longer fight the bottom tab bar." },
    ],
  },
  {
    version: "v0.4.2-beta",
    date: "May 2, 2026",
    headline: "Trust marks ship. Resale shows now say so.",
    items: [
      { kind: "added",   text: "Trust mark on event detail — shows whether a price came from the venue, a resale platform, or a fellow crawler." },
      { kind: "added",   text: "Verified stamp on submitted prices, expires after 7 days." },
      { kind: "fixed",   text: "Watching list no longer flashes empty for a frame on cold start." },
      { kind: "fixed",   text: "Filter chips on Browse stay readable in light theme (contrast bump)." },
      { kind: "changed", text: "Source links demoted to a terse receipt — the trust mark already carries the identity." },
    ],
  },
  {
    version: "v0.4.1-beta",
    date: "Apr 24, 2026",
    headline: null,
    items: [
      { kind: "added",   text: "Identity art for artists and venues — generative, deterministic, never the same twice." },
      { kind: "fixed",   text: "Empty calendar view no longer shows yesterday's shows for a frame." },
      { kind: "changed", text: "Filter sheet remembers your last selection within a session." },
    ],
  },
  {
    version: "v0.4.0-beta",
    date: "Apr 16, 2026",
    headline: "Price transparency lands. The big one.",
    items: [
      { kind: "added",   text: "Price block on event detail — face value, fees, last-seen, sparkline." },
      { kind: "added",   text: "Submit-a-price flow for shows we can't crawl." },
      { kind: "added",   text: "Watching shortcut on event cards (the heart-eye affordance)." },
      { kind: "fixed",   text: "Venue profile crashed when a venue had no upcoming shows. It does now." },
      { kind: "removed", text: "The old 'best guess' price chip — replaced by the real thing." },
    ],
  },
  {
    version: "v0.3.4-beta",
    date: "Apr 8, 2026",
    headline: null,
    items: [
      { kind: "fixed",   text: "Sign-in form double-submit on slow networks." },
      { kind: "fixed",   text: "Search results no longer snap to top when you tap a chip." },
      { kind: "changed", text: "Tightened tap targets across mobile nav (44px floor)." },
    ],
  },
];

Object.assign(window, { RN_RELEASES, RN_KIND_LABEL, RN_KIND_COLOR });
