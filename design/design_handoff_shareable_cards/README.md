# Shareable Cards — engineering handoff

Image cards a fan posts to invite friends or flex an upcoming show. Two surfaces ship:

1. **Riso Poster** — per-event share card, three aspect ratios, triggered from Event Detail v2.
2. **Concert Passport** — a personal shrine of past-attended shows (not per-event). Compact in-app + 1:1 social share. Inherited from `concert_history` per PR #916.

> Receipt, Stub, and Watching-list-composite directions were explored and **dropped**. Don't build them.

**Tracker:** #72 Shareable cards (IdentityArt) — primary · #85 Concert passport (visual shareable grid) — Passport.

---

## Locked calls (from Hugh)

- **Tier gate — Free (for share generation).** The *act of sharing* is always Free:
  - **Poster share** (per-event, from Event Detail): available to every user, including Free. Watching is Free per #781 R6, and sharing is what drives Watching virality — gating it would neuter the loop. Supporter/Premium adds nothing share-specific.
  - **Passport share** (1080×1080 social): also Free at the share-generation step. **But note:** the Passport *itself* is a Concert History artifact, and **Concert History is a Supporter feature** (per `design/design_handoff_concert_history/README.md` §3). So in practice a Free user has no Passport to share — they'd first need to upgrade to Supporter to have a History, at which point sharing is free. The compact Passport surface (320×500) also ships inline on the History page, so it inherits that gating naturally.
  - **Net entitlement for eng:** Poster = Free everywhere. Passport = requires Concert History access (Supporter+) to exist; once it exists, both `compact` and `share` modes render for that user and the share action is Free.
- **Anonymous URL contract — public `/e/:eventId` mirror route.** OG-preview clicks (SMS / iMessage / Slack / preview crawlers) land on a **public** event-detail surface that mirrors `/events/:id` (eng builds it as a mirror route or a `public: true` variant — infra choice, not Design's). Secondary actions (Watch, Get Tickets, submit a price) still require sign-in, so the paywall stays in place without breaking the share loop. The card's OG `link.png` points here.
- **Link ratio — 1200×628** (matches code; the earlier `630` reference in the ratio table was drift).

## Files
- `Shareable Cards.html` — entry point.
- `share-cards.jsx` — `<ShareCard direction="poster" event ratio mint opts />` + `POSTER_TAGLINES` bank. Receipt and Stub branches still exist in source but are not surfaced on the canvas; remove during implementation.
- `passport-card.jsx` — `<PassportCard mode="compact|share" shows stats handle year />` + `<PassportStamp>` + `PP_MODES`. The Concert Passport.
- `share-trigger.jsx` — `<ShareTriggerEventDetail event mint sheetOpen sheetDirection />` — trigger pill + bottom sheet on Event Detail v2.
- `shareable-canvas.jsx` — design-canvas composition (reference only, not for prod).
- `shareable-data.jsx` — fixture events (`SHARE_EVENTS.callboy / .geese / .amyl`), `SHARE_USER`, `mintMeta()`, `SC_RATIOS`.
- `history-data.jsx` — attended-show fixtures (`H_SHOWS`) + `h_stats()`. Copied verbatim from `concert_history`; Passport consumes it.
- Lifted copies of `theme-context`, `primitives`, `ios-frame`, `design-canvas`, `tweaks-panel`, `identity-art`.

## What to build

### 1. Card renderer — `<ShareCard direction="poster" .../>`

Three aspect ratios from `SC_RATIOS`:
| ratio | px | use |
|---|---|---|
| `story` | 1080×1920 | Instagram / TikTok stories |
| `square` | 1080×1080 | IG feed, X post |
| `link` | 1200×628 | OG image, SMS / iMessage preview |

**Layout** (Riso Poster):
- **Top half** — full-bleed `<IdentityArt entity={event} kind="event">` at the event's deterministic hash. No overlay.
- **Bottom half** — paper-toned scrim (fully opaque under the title block, 92% alpha elsewhere).
  - State pill (top-left of bottom block): `GOING` / `SOLD OUT` / `↓ $XX` price-drop.
  - Date + show time (top-right of bottom block): 56/46/34 px (story/square/link), JetBrains Mono, paper scrim behind.
  - Title block: artist name 180/120/72 px display weight, venue + city below at 36/28/22 px.
  - Tagline (one line, brand voice): keyed by state from `POSTER_TAGLINES` in `share-cards.jsx` (via `posterTagline(event.state)`), **not** per-event `event.snark`. See the tagline-bank section below.
  - Footer row: `ConcertCrawl` wordmark 78/60/42 px (no logo glyph — wordmark only) + user `@handle` 36/30/22 px. **Anonymous users render no signature line.**

### 2. Trigger — Event Detail v2

- Adds a Share pill to the hero next to Back, using EV2's existing scrim-pill atom (`top: 56`, blurred `var(--scrim)` background). Active state tinted `var(--accent)`. **No heart/Save pill** — the live app moved Watch to the eye affordance below the title; the hero carries only Back + Share.
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

## Concert Passport (`passport-card.jsx`)

A **personal** shareable — a shrine of past-attended shows, not a per-event card. Sourced from Concert History's attended list (`H_SHOWS` → `h_stats`). Ownership moved here from `concert_history` per PR #916.

### Modes
| mode | px | surface |
|---|---|---|
| `compact` | **320×500** | in-app: sidebar / inline. Ships on the Concert History page behind a **“See your Passport →”** teaser link. |
| `share`   | **1080×1080** | social. Matches the square share ratio, so the render pipeline reuses the `/share/:eventId/:ratio.png` shape as a sibling route — likely `/passport/:userId/:ratio.png`. |

### Layout — coherent with the Poster, stands on its own
- **Identity-art stamp wall (top).** Every stamp is a live `<IdentityArt kind="artist">` tile of one attended show, overprinted with a mono `MONTH/DAY` punch + artist name, on a deterministic ±2° rotation so the page reads *stamped*. This is the identity-art half — same generative engine as the Poster hero, theme-independent per the Phase 7.5 contract. Compact = 3×3 (9); share = 4×4 (16). Overflow fills the last slot with a `+N more` tile.
- **Tokened scrim panel (bottom).** `--scrim` glassmorphism (backdrop-blur, masked fade to `var(--bg)`) carrying the stat readout — `nights` (big, `var(--signal)`) · `venues` · `top genre` — and a `ConcertCrawl` wordmark footer + “since ‹month year›”. All chrome reads theme tokens; verified across Electric / Jade / Light.
- **Header** — two `--scrim` glass pills float over the top of the wall: `PASSPORT · <year>` (signal dot) + `@handle`. Anonymous is out of scope for Passport — it's an account artifact by definition.

### API
`<PassportCard mode="compact|share" shows={H_SHOWS} stats={h_stats(shows)} handle="@mira" year={2026} />` — `shows`/`stats`/`handle` all default (H_SHOWS / recomputed / `SHARE_USER.handle`).

---

## Out of scope (don't ship)
- Receipt direction, Stub direction (code paths still in `share-cards.jsx` — strip).
- Watching list composite card (entire concept dropped).
- QR code overlay (Tweak removed).
- Mint serial overlay (`#0247/999`-style line — dropped).
- Branded short link / `/e/<slug>` overlay on the card (just `ConcertCrawl` wordmark).

## Tagline bank — shape, placement, voice

`POSTER_TAGLINES` (in `share-cards.jsx`) is the Design-owned draft, keyed by event state:

```js
{ going, soldout, drop }   // one line each, printed above the wordmark
```

The Poster renderer keys in by `event.state` via `posterTagline(state)` — it no longer reads per-event `event.snark` (fixture-only; stripped on build).

**Final home:** these strings move to `apps/web/src/components/consumer/definitions/copy.ts` on build, like every other customer-facing string (per `feedback_definitions_copy_rule` — all customer-facing strings externalized). Don't leave them inline in the component.

**Voice pass (Sour Patch bar #782: “honest + slight cheek, never blamey”):**
| state | shipped line | note |
|---|---|---|
| `going` | “found this one on Concert Crawl. see you in the pit.” | unchanged — the only line that names the app on purpose. |
| `soldout` | “sold out. now we're all refreshing stubhub at 2am together.” | **de-blamed.** Dropped “you snoozed” and flipped “you…the rest of us” → inclusive “we're all…together.” Keeps the beloved 2am-StubHub detail; cheek now points at shared misery, not the reader. |
| `drop` | “price dropped. so did my dignity, but that's unrelated.” | lightened. Cheek is self-directed (“my dignity”) so it was never blamey; genericized the hard-coded `$9` — the `pricePill` carries the number. |

Don't auto-generate new copy.

## Open questions
1. **Anonymous handle policy** — confirm we want to silently drop the line vs. render `@anonymous`. Currently: drop.
2. **Short domain** — `concertcrawl.app/e/...` vs. `cc.show/...` (only matters if we add a CTA URL line; we don't currently).
