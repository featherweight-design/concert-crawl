# Release Notes — Concert Crawl

> Two paired surfaces: a **feature spotlight** that lets us go big and bold for marquee launches, and a quieter **`/changelog`** page for everything else. Both tie back to the version footer in the user menu.

## Files

- `Release Notes Canvas.html` — design canvas (drop pill in context, takeover, /changelog, version footer, theme coverage)
- `release-notes.jsx` — `<FeatureDropPill>`, `<SpotlightModal>`, `<SpotlightHero>`, `<ReleasePage>`, `<ReleaseEntry>`, `<UMStatusFooterRN>`
- `release-data.jsx` — sample releases incl. one with a `spotlight` block (mocked feature: **Map view**)
- `rn-shells.jsx` — in-context demo shells (desktop topbar, phone, browse grid, tab bar)
- Local copies of `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `user-menu.jsx`

## Decisions

|                                                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spotlight trigger**                          | A floating "feature drop" pill — bottom-right on desktop, above the bottom tab bar on mobile. Present while a drop is live; dismissible. **Opt-in**, never blocking.                                                                                                                                                                                                                                                                                                                                     |
| **Coexisting with the Beta Feedback edge tab** | Different anchors, no stacking. Drop pill = bottom-right corner; feedback edge tab = right edge, vertically centered. Both dismiss/persist independently. When the Feedback tab retires at public launch, the drop pill keeps the same corner — no re-positioning needed. (Earlier plan stacked the drop pill above a Beta Feedback pill, 10px gap — that was rejected when the feedback entry point swapped from a floating pill to the right-edge tab. See `design_handoff_feedback_modal/README.md`.) |
| **Spotlight surface**                          | Full-screen takeover modal. Animated SVG/CSS hero up top (no video file dependency) + 3-step walkthrough carousel + founder note + real CTA that deep-links into the feature. "Maybe later" is always one tap away.                                                                                                                                                                                                                                                                                      |
| **Spotlight frequency**                        | Only when a release explicitly attaches a `spotlight` block. Pure fix releases don't fire it.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Dismissal**                                  | Pill closes for this release. The matching `/changelog` entry carries a hero strip — _"See the announcement →"_ — that re-opens the takeover. Never permanently lost.                                                                                                                                                                                                                                                                                                                                    |
| **Changelog entry**                            | Tap the version footer in the user menu → `/changelog`. No popover, no inline menu card.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Changelog density**                          | **Less developer-y.** Commit hashes and PR numbers gone (repo's private — they weren't earning their space). Kept: version + date + headline + grouped items. The transmission-log visual texture stays (timeline rail, monospace eyebrows, pulsing dots) — that's the brand, not the dev-tooling.                                                                                                                                                                                                       |
| **Read state**                                 | localStorage, keyed by latest release `version` string. Beta-scale; no server tracking.                                                                                                                                                                                                                                                                                                                                                                                                                  |

## The example feature on the canvas

**Map view** — "Find the show. Or stumble into one." A queued feature in `DESIGN_PLAN.md`, so the copy/CTA is real, not lorem. The hero is a stylized city — soft grid, river, road veins, drifting parallax — with identity-art pins dropping in on a stagger, the freshest pin pulsing a radar ring. Pure SVG + CSS keyframes.

## Component contract

```jsx
<FeatureDropPill
  release={release}      // must have release.spotlight
  variant="desktop"      // "desktop" | "mobile"
  onOpen={...}           // → opens SpotlightModal
  onDismiss={...}        // → marks this release's pill as dismissed
/>

<SpotlightModal
  release={release}
  variant="desktop"      // "desktop" | "mobile" (mobile is fullscreen)
  onClose={...}          // "Maybe later" + the X button
  onCTA={...}            // routes to release.spotlight.ctaHref
/>

<UMStatusFooterRN
  build="v0.5.0-beta"
  unread={true}          // false hides the accent dot
  onClick={...}          // → /changelog
/>

<ReleasePage releases={...} onOpenSpotlight={(r) => ...}/>
```

### Release shape (with optional spotlight)

```js
{
  version: "v0.5.0-beta",
  date: "May 10, 2026",
  headline: "Map view is here. Find the show — or stumble into one.",
  items: [
    { kind: "added" | "fixed" | "changed" | "removed", text: "..." }
  ],
  spotlight: {                         // OPTIONAL — only on marquee releases
    title:    "Map view is live.",
    tagline:  "Find the show. Or stumble into one.",
    hero:     "map",                   // which animated hero to render
    cta:      "Open the map",
    ctaHref:  "#/map",
    steps: [
      { caption: "Pan around. Every venue with a show in your window glows." },
      { caption: "Tap a pin — the show card slides up..." },
      { caption: "Filter by night, price, or vibe — pins update live." },
    ],
    founderNote: "This one took a while... tell me what's broken.",
    founderSign: "— Hugh",
  },
}
```

## Hero system — how to add a new one

The `hero` key on the spotlight selects which animated background to mount inside `<SpotlightHero>`. Today only `"map"` exists. New heroes go inside the same component and own their own pulses/parallax — keep the contract: full-bleed, themed via tokens only, no video files, no external dependencies.

## Tokens

All color comes from theme tokens. Validated across `electric` (default), `jade`, `light`. No raw hex.

## Voice

- Headlines: playful + clear. _"Map view is here. Find the show — or stumble into one."_ > _"Added: map view feature."_
- Founder note: candid, slightly self-deprecating, asks for feedback. _"This one took a while — turns out drawing a city on a phone is hard."_
- Pill: terse. **FEATURE DROP** eyebrow over the spotlight title, "See it" pill on desktop.

## Eng notes

- **Read state for the changelog dot:** `localStorage["cc.lastSeenRelease"] = release.version` when the user opens `/changelog`. `unread = releases[0].version !== lastSeen`.
- **Pill dismissal:** `localStorage["cc.dismissedSpotlights"] = [...versions]`. Re-show pill if a newer release with a spotlight ships.
- **Hero performance:** the map hero animates 7 pin-drops + 1 radar ring + 1 parallax drift. Cheap on modern hardware. If we add video heroes later, gate them behind reduced-motion + a static fallback.
- The `<UMStatusFooterRN>` is a drop-in replacement for today's `<UMStatusFooter>` in `design_handoff_user_menu/user-menu.jsx` — same height/padding.

## What's NOT in scope

- No proactive blocking modal on first-open. Even the spotlight is opt-in.
- No notification/inbox surface (`DESIGN_PLAN.md` is firm on "no 'we'll notify you' until notifications ship").
- No per-item reactions or up-votes.
- No "dev view" toggle on /changelog — answered against. Private repo, no audience for it.
