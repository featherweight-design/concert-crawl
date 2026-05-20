# Shareable Cards — engineering handoff

Image cards a fan posts to invite friends or flex an upcoming show. Final design ships **Riso Poster only** at three aspect ratios, triggered from Event Detail v2.

> Receipt, Stub, and Watching-list-composite directions were explored and **dropped**. Don't build them.

## Files

- `Shareable Cards.html` — entry point.
- `share-cards.jsx` — `<ShareCard direction="poster" event ratio mint opts />`. Receipt and Stub branches still exist in source but are not surfaced on the canvas; remove during implementation.
- `share-trigger.jsx` — `<ShareTriggerEventDetail event mint sheetOpen sheetDirection />` — trigger pill + bottom sheet on Event Detail v2.
- `shareable-canvas.jsx` — design-canvas composition (reference only, not for prod).
- `shareable-data.jsx` — fixture events (`SHARE_EVENTS.callboy / .geese / .amyl`), `SHARE_USER`, `mintMeta()`, `SC_RATIOS`.
- Lifted copies of `theme-context`, `primitives`, `ios-frame`, `design-canvas`, `tweaks-panel`, `identity-art`.

## What to build

### 1. Card renderer — `<ShareCard direction="poster" .../>`

Three aspect ratios from `SC_RATIOS`:
| ratio | px | use |
|---|---|---|
| `story` | 1080×1920 | Instagram / TikTok stories |
| `square` | 1080×1080 | IG feed, X post |
| `link` | 1200×630 | OG image, SMS / iMessage preview |

**Layout** (Riso Poster):

- **Top half** — full-bleed `<IdentityArt entity={event} kind="event">` at the event's deterministic hash. No overlay.
- **Bottom half** — paper-toned scrim (fully opaque under the title block, 92% alpha elsewhere).
  - State pill (top-left of bottom block): `GOING` / `SOLD OUT` / `↓ $XX` price-drop.
  - Date + show time (top-right of bottom block): 56/46/34 px (story/square/link), JetBrains Mono, paper scrim behind.
  - Title block: artist name 180/120/72 px display weight, venue + city below at 36/28/22 px.
  - Tagline (one line, brand voice): default `"found this one on Concert Crawl. see you in the pit."` Sold-out / price-drop have specific overrides — see `share-cards.jsx`.
  - Footer row: `ConcertCrawl` wordmark 78/60/42 px (no logo glyph — wordmark only) + user `@handle` 36/30/22 px. **Anonymous users render no signature line.**

### 2. Trigger — Event Detail v2

- Adds a third hero pill between Back and Save, using EV2's existing scrim-pill atom (`top: 56`, blurred `var(--scrim)` background). Active state tinted `var(--accent)`.
- Tap opens a bottom sheet showing the **live preview at story ratio** + destinations row (System share / Save image / Copy link).
- Watching surface does **not** get a share entry. Per-event share lives only on Event Detail.

### 3. Mint contract

Every render is keyed by `mintMeta(event, user, serial)` → `{ serial, by, mintedAt, contentHash }`.

- Cache key: `(eventId, userId, contentHash)` — same inputs always resolve to the same PNG and the same serial.
- `serial` and `mintedAt` are **not drawn** on the card (dropped per feedback). They're metadata only — useful for "my past shares" history if/when we build it.
- `by` renders as `@handle` in the footer; `null` (anonymous) → footer is wordmark-only.

### 4. Themes

`<ThemeProvider>` wraps the card. All three consumer themes (`electric` / `jade` / `light`) must render. Identity art palette is theme-independent (per Phase 7.5 contract); only the paper scrim, fg/border tokens swap.

### 5. Rendering pipeline (server)

- Cheapest path: HTML-to-PNG via headless Chromium, keyed by `contentHash`, cached in object storage.
- Hot URL: `GET /share/:eventId/:ratio.png?u=:userId` → 302 to cached blob, falls back to render-and-cache on miss.
- OG meta on the public event page points at `…/link.png` so SMS / Slack / Twitter previews work without app install.

## Out of scope (don't ship)

- Receipt direction, Stub direction (code paths still in `share-cards.jsx` — strip).
- Watching list composite card (entire concept dropped).
- QR code overlay (Tweak removed).
- Mint serial overlay (`#0247/999`-style line — dropped).
- Branded short link / `/e/<slug>` overlay on the card (just `ConcertCrawl` wordmark).

## Brand voice notes

Sold-out and price-drop taglines tested well — keep verbatim from `share-cards.jsx::POSTER_TAGLINES`. The "going" default is the only one that calls out the app explicitly. Don't auto-generate new copy.

## Open questions

1. **Anonymous handle policy** — confirm we want to silently drop the line vs. render `@anonymous`. Currently: drop.
2. **Short domain** — `concertcrawl.app/e/...` vs. `cc.show/...` (only matters if we add a CTA URL line; we don't currently).
