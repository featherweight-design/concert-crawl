# #72 — Shareable show cards (IdentityArt) + Concert Passport

**Ticket:** #72 Shareable cards (IdentityArt) — primary · #85 Concert passport (visual shareable grid) — Passport half.
**Design handoff:** `design/design_handoff_shareable_cards/` — README.md (spec), READINESS.md (🟢 Green, post-addendum 2026-07-14, PR #948).
**Adjacent:** #70 Concert History (Passport moved *from* it per PR #916; #70 ships only the teaser link) · #794 Logged-out app UX (**file collision — see Sequencing lock**).

---

## Goal

Ship two shareable image surfaces:

1. **Riso Poster** — a per-event share card in three aspect ratios, triggered from Event Detail v2. Free for every user, including logged-out.
2. **Concert Passport** — a personal shrine of past-attended shows. Compact 320×500 in-app card + 1080×1080 social render. Exists only for users who have Concert History.

Plus the infrastructure both need: a **public `/e/:eventId` mirror route** so an OG-preview click from SMS/Slack lands on something real, and a **server-side PNG render pipeline** that supports all nine production themes.

---

## Architecture — the crux decision

### How the 1080×1080 is produced: `next/og` `ImageResponse` (satori), with a print-safe IdentityArt variant

Three candidates were evaluated against the real code:

| Option | Verdict |
| --- | --- |
| **`next/og` `ImageResponse` (satori)** | ✅ **Chosen.** Already in production in this repo — `apps/web/src/app/api/pwa/icon-512/route.tsx` renders a 512×512 PNG with `export const runtime = 'edge'`. Zero new dependencies, zero new infrastructure, runs on Vercel where the web app already lives, and works for an unauthenticated caller because the route is a plain GET. |
| **Headless Chromium (the handoff's suggestion, README §5)** | ❌ Rejected. Playwright/Chromium exists in this monorepo only inside `packages/crawler-core` (a devDependency of `apps/api`, deployed on Render). It cannot run in a Vercel serverless/edge function, so choosing it means standing up a *new* Render render-service, a new deploy target, a new secret, and a cross-origin hop from web → Render for every OG crawl. Enormous infra cost for pixel fidelity nobody is comparing against a reference. |
| **Client-side canvas / `html-to-image`** | ❌ Rejected as the primary path. It cannot serve `og:image` — Slack/iMessage/Twitter crawlers never execute JS, and the whole point of the link ratio is the unfurl. It also can't produce a card for a logged-out visitor arriving from a preview. (`design/design_handoff_concert_history/READINESS.md:141` suggests `html-to-image`; that recommendation predates the OG requirement and is superseded here.) |

**The cost of choosing satori** is that satori is not a browser. It supports a flexbox subset of CSS and *does not* support: `mixBlendMode`, `backdropFilter`, `mask-image`/`WebkitMaskImage`, SVG `<filter>` (so no `feTurbulence`), or `preserveAspectRatio="slice"` behaviour on nested SVG. `IdentityArt.tsx` uses **all** of those:

- `IA_TEMPLATES` (`apps/web/src/components/consumer/identity-art/IdentityArt.tsx:513`) wrap layers in `<g style={{ mixBlendMode: 'screen' | 'multiply' }}>`
- the grain overlay is a data-URI `feTurbulence` SVG composited with `mixBlendMode`
- the initials chip uses `backdropFilter: 'blur(6px)'`
- `PassportPill` (`passport-card.jsx:148`) uses `var(--scrim)` + `backdropFilter: blur(10px)`
- `PassportCard`'s bottom panel (`passport-card.jsx:192`) uses `backdropFilter: blur(9px)` + `WebkitMaskImage`/`maskImage` gradients

So PR-1 builds **`IdentityArtPrint`** — a satori-safe sibling that consumes the *same* `identityFor()` output (same hash, same palette, same template id, same rotation) but emits flattened geometry: blend modes pre-resolved to explicit rgba fills, grain baked as a static tiled data-URI PNG (or omitted at `link` ratio where it's invisible), no backdrop-filter (opaque scrim colour computed from the palette instead), and mask gradients replaced with a stacked `linear-gradient`. **The determinism contract is preserved** — `IdentityArtPrint` and `IdentityArt` render the same hash to the same template/palette/rotation, which is what makes the on-screen preview trustworthy.

### Nine themes, server-side

`apps/web/src/theme/themes.ts` exports `THEMES: Record<ThemeName, Record<string,string>>` where every token is a plain hex/oklch **string** — no CSS variable resolution needed. A server route can look up the full token set for any of the nine themes synchronously. That's what makes satori 9-theme support viable at all.

The theme *value* cannot be read server-side from the viewer: persistence to `localStorage['cc-theme']` lives in `apps/web/src/theme/ThemeProvider.tsx`, and the inline no-flash script that reads it and sets `data-theme` is in `apps/web/src/app/layout.tsx` (`apply-theme.ts` only applies tokens to the DOM — it does not persist); **there is no theme cookie**. So the render routes take a `?theme=` query param, validated with a Zod enum built from `THEME_NAMES`, defaulting to `electric`. For signed-in users the trigger UI supplies the current theme; `user_profiles.theme` (`packages/db/src/schema/user-profiles.ts`, `userThemeEnum`, default `'electric'`) is the server-side fallback.

### IdentityArt namespace — no invention

`type Kind = 'artist' | 'venue'` (`IdentityArt.tsx:5`). **There is no `'event'` kind.** The handoff README says `kind="event"`; that is prototype drift. Both the Poster hero and every Passport stamp key off `identityFor(event.artist, 'artist')`. This matches `passport-card.jsx:67`, which already uses `kind="artist"`.

Also: `IdentityArtProps.width?: number` / `height?: number` (`IdentityArt.tsx:35–36`) are typed `number`, but the handoff passes `"100%"`. PR-1 widens both to `number | string` (a props-type change, not a cast).

---

## Global Constraints

- **Watching is the only tracking concept** — never "Saved", "Favorites", "Following". Its glyph is the lucide **`Eye`**. No cardiac glyph exists anywhere in this product; `share-trigger.jsx:32` contains one and it is deleted, not ported.
- **All customer-facing strings this feature ships** (share sheet, public mirror, passport) go in `apps/web/src/components/consumer/definitions/copy.ts` under `CONSUMER_COPY`. This is a rule about *this feature's* strings, not a claim that the file is the app's only copy home — the codebase deliberately splits copy per feature (`tier-picker/definitions/copy.ts`, `spotify/definitions/copy.ts`, shared `lib/definitions/copy.ts`), and a feature-local file remains the right call for future work. `POSTER_TAGLINES` moves there verbatim — **do not rewrite the taglines**, they are shipped copy signed off in READINESS.
- **No `as` casts.** Zod `safeParse` at every boundary (query params, API responses), type guards for union narrowing, declaration merging for library types.
- **Zod at every Hono endpoint**; all API routes under `/v1/`.
- **Drizzle only**; expand/contract migrations only.
- **`var(--token)` only** in on-screen components — no hardcoded hex, no Tailwind `dark:` variants, all nine themes must render. (The *print* components are the sole exception: satori needs literal colour strings, which they get by reading `THEMES[theme]` — still no hardcoded hex, just resolved from the same source of truth.)
- **Mobile/desktop parity in the same PR.** The share trigger must work on both; desktop placement is a build-time item flagged in READINESS:55–65.
- **a11y in the same PR** — 44px minimum tap targets, `role="dialog"` + focus trap + `aria-modal` on the share sheet, keyboard-reachable destinations, `alt` text on every rendered PNG.
- **Release notes** — an entry in `apps/web/src/lib/definitions/releases.ts` on the same branch as the first user-visible PR (PR-2). Newest-first — prepend to the array rather than anchoring to a version string, which will be stale by the time this PR is written.
- **`progress.md`** — one ✅ row when the poster ships (PR-2) and one when the Passport ships (PR-5). Not per-PR.
- **Strip the dropped directions on port.** `StubCard` (`share-cards.jsx:189`), `ReceiptCard` (`:508`), `QRBlock` (`:96`), `ShareTriggerWatching` (`share-trigger.jsx:410`), `WatchingComposite` (`:459`), and the dead `watching`/`tonight` keys in `StatePill.colors` (`:139`) and `stateLabel` (`:173`). None of these reach production.

---

## Sequencing lock

| PR | Ticket | Scope | Depends on |
| --- | --- | --- | --- |
| **PR-0** | #72 | Public `/e/:eventId` mirror route + `middleware.ts` matcher | — |
| **PR-1** | #72 | Print-safe render kit: `IdentityArtPrint`, `resolveThemeTokens`, mint contract, `POSTER_TAGLINES` → copy.ts | — (parallel with PR-0) |
| **PR-2** | #72 | `<PosterCard>` renderer + `/share/[eventId]/[ratio]` PNG route + Event Detail share pill + share sheet | PR-0, PR-1 |
| **PR-3** | #72 | OG meta on `/e/:eventId`, `og:image:alt`, analytics events, a11y hardening | PR-2 |
| **PR-4** | #85 | `<PassportCard>` compact + share, `/passport/[ratio]` PNG route | PR-1 |
| **PR-5** | #85 / #70 | Wire `<PassportTeaser>` on the Concert History page + entitlement gate | PR-4, **#70 merged** |

### ⚠️ File collision with #794 — `apps/web/src/middleware.ts`

**PR-0 edits the exact file #794 rewrites.** `apps/web/src/middleware.ts:8–14` defines `isAlwaysPublic = createRouteMatcher([...])`. #72 adds two entries (`/e/(.*)`, `/share/(.*)`); **#794 "Logged-out app UX — navigation, header, browse-only shape"** broadens the same matcher across *every* consumer surface (browse, event detail, venue detail, artist detail, header/nav) for the ~Aug 18–22 public launch.

Mitigation, in order of preference:

1. **Land PR-0 first, small.** It is a two-line matcher addition plus a route. Merging it before #794 starts means #794 rebases onto a matcher that already contains `/e/(.*)` and simply generalises it.
2. If #794 is already in flight, **PR-0 must rebase onto #794's branch**, not `main` — the conflict is a single array literal and is trivial to resolve, but only if resolved deliberately. Do not let two agents merge competing versions of `isAlwaysPublic`.
3. **Do not run PR-0 and #794's middleware PR in parallel worktrees.** Assign both to the same session or serialise them.

Second seam in the same file: the signed-in branch returns early at `middleware.ts:38`, so an authenticated user who clicks a shared link lands on the *public mirror* of an event they could see in full. PR-0 resolves this by redirecting signed-in users from `/e/:id` → `/events/:id` (Task 2).

### ⚠️ Hard dependency on #70 — `attending_at`

`packages/db/src/schema/social.ts` has `userEventStatusEnum = pgEnum('user_event_status', ['going','interested','watching'])` and a `userEvents` table with `{ userId, eventId, status, savedPrice, createdAt }`. **There is no `attending_at` / `goingMarkedAt` column.** The Passport's "nights / venues / top genre / since ‹month year›" stats need the moment a user marked *I'm going*, which is exactly the migration `design/design_handoff_concert_history/READINESS.md:31` assigns to **#70**. PR-4 therefore builds the Passport against a typed selector interface and its own fixtures; PR-5 (wiring to real data + the History page) is blocked until #70 merges.

### ⚠️ Entitlement drift to resolve before PR-5

Both handoffs say Concert History is a **Supporter** feature. The shipped matrix disagrees: `packages/entitlements/src/index.ts` has `ENTITLEMENTS_MATRIX['concert-history']` = `{ 'logged-out': 'tier-picker-on-tap', free: 'paywall-on-tap', supporter: 'paywall-on-tap', premium: 'visible-active', founder: 'visible-active', gifted: 'visible-active' }` — i.e. **Premium+**. PR-5 follows the shipped matrix via `canUseFeature(state, 'concert-history')` and does **not** hardcode a tier. `design/design_handoff_concert_history/READINESS.md:129` already flags this as an open question; surface it for a Hugh call rather than silently picking a side.

**Poster sharing is unaffected** — it is Free for everyone including logged-out, and must not be routed through the entitlements matrix at all.

---

## Phase / PR-0 — #72 Public event mirror route

Goal: an unauthenticated visitor who taps a shared link sees a real event page.

### Task 1: Add `/e/(.*)` and `/share/(.*)` to the public matcher

**Files:**
- modify `apps/web/src/middleware.ts`

**Interfaces:** produces — public reachability for the mirror route and the PNG route. Consumes — nothing.

- [ ] **Step 1: Failing middleware test.** Add `apps/web/src/__tests__/middleware.public-share.test.ts` asserting that an unauthenticated request to `/e/<uuid>` and to `/share/<uuid>/link.png` is **not** redirected to `/`.
  `Run: pnpm --filter web test middleware.public-share`
  `Expected: FAIL — auth.protect() redirects to '/'`
- [ ] **Step 2: Extend `isAlwaysPublic`.** Add `'/e/(.*)'` and `'/share/(.*)'` to the array at `middleware.ts:8`. Leave the matcher `config` at the bottom untouched — the existing pattern already covers both paths.
  `Expected: PASS`
- [ ] **Step 3:** Add a comment above the array pointing at #794, so whoever generalises it knows these two entries are load-bearing for the share loop.

### Task 2: Build the mirror route

**Files:**
- create `apps/web/src/app/e/[id]/page.tsx`
- create `apps/web/src/components/consumer/event-detail/PublicEventDetail.tsx`
- modify `apps/web/src/components/consumer/definitions/copy.ts` (public-mirror CTA strings)

**Interfaces:** produces — `/e/:eventId` rendering event data for anonymous callers. Consumes — `publicApiClient` from `apps/web/src/lib/api.ts`; `GET /v1/events/:id` (`apps/api/src/routes/events.ts:568`, already unauthenticated-tolerant) and `/v1/events/:id/related` (`:1129`, no auth).

- [ ] **Step 1: Redirect signed-in users.** In `page.tsx`, `const { userId } = await auth()`; if `userId`, `redirect(\`/events/${id}\`)`. Test: `apps/web/src/app/e/[id]/__tests__/page.test.tsx` asserts the redirect fires for an authed session and does not for an anon one.
- [ ] **Step 2: Fetch with `publicApiClient`.** Mirror the `Promise.all` shape from `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` but drop the reports fetch (auth-only). Validate the id with the same `uuidSchema.safeParse` pattern; `notFound()` on failure — never cast.
- [ ] **Step 3: Render the read-only mirror.** `PublicEventDetail` reuses `EventImage`, `GenreChips`, `EventTitleBlock`, the InfoRow block, `EventDetailPriceBlock`, `SetlistPreview`, and the CTA (`isSafeHttpUrl`-filtered, sold-out disabled state) from the protected page. It renders the same `max-w-[880px]` inside `overflow-x-clip` container (#973).
- [ ] **Step 4: Gate the secondary actions.** `WatchShowButton`, `DetailFollowStrip`, price submission, and reports are **not** rendered. In their place, a single sign-in CTA. Copy lands in `CONSUMER_COPY.publicEvent`. The Watching affordance on the authed page is the lucide `Eye` — the mirror simply omits it; do not substitute another glyph.
- [ ] **Step 5:** E2E in `apps/e2e` — anonymous visit to `/e/<seeded id>` renders title + venue + date and shows the sign-in CTA; clicking Get Tickets still works (it's an external link, not a gated action).

---

## Phase / PR-1 — #72 Print render kit

Goal: everything both cards need, with no card built yet. Pure functions and pure components, all unit-testable.

### Task 3: `resolveThemeTokens` — server-side theme resolution

**Files:**
- create `apps/web/src/lib/share/theme-tokens.ts`
- create `apps/web/src/lib/share/__tests__/theme-tokens.test.ts`

**Interfaces:** produces `themeParamSchema: z.ZodEnum` and `resolveThemeTokens(raw: string | undefined): { theme: ThemeName; tokens: Record<string,string> }`. Consumes `THEMES`, `THEME_NAMES`, `ThemeName` from `apps/web/src/theme/themes.ts`.

- [ ] **Step 1: Failing test.** All nine names in `THEME_NAMES` resolve; `undefined`, `''`, `'nope'`, and `'__proto__'` all resolve to `electric`; the returned token record is the exact `THEMES[name]` object.
  `Run: pnpm --filter web test theme-tokens`
  `Expected: FAIL — module not found`
- [ ] **Step 2: Implement** with `z.enum(THEME_NAMES)` + `safeParse`. No `as`, no index-signature lookup on an unvalidated string.
- [ ] **Step 3:** Assert every one of the nine themes defines the tokens the cards read — `bg`, `fg`, `surface-1`, `border-strong`, `scrim`, `signal`, `accent`. A missing token in one theme is the classic 9-theme regression; this test catches it at build time.

### Task 4: `IdentityArtPrint` — satori-safe generative art

**Files:**
- create `apps/web/src/components/consumer/identity-art/IdentityArtPrint.tsx`
- create `apps/web/src/components/consumer/identity-art/__tests__/IdentityArtPrint.test.tsx`
- modify `apps/web/src/components/consumer/identity-art/IdentityArt.tsx` (widen `width`/`height` to `number | string`)

**Interfaces:** produces `<IdentityArtPrint name kind={'artist'|'venue'} width height grain? />`. Consumes `identityFor()` (`IdentityArt.tsx:545`), `IA_PALETTES` (`:85`), `ia_isDark()` (`:70`), `IA_TEMPLATES` (`:513`).

- [ ] **Step 1: Determinism test (write first).** For twenty artist names, `identityFor(name,'artist')` and the props `IdentityArtPrint` derives must agree on `hash`, `template`, `palette.id`, and `rotate` with what `IdentityArt` derives. This is the contract that makes the in-app preview honest.
  `Expected: FAIL — module not found`
- [ ] **Step 2: Flatten blend modes.** For each of the five templates (mesh, stripes, concentric, halftone artist-only, blueprint venue-only), replace `mixBlendMode: 'screen'|'multiply'` with a pre-computed rgba fill derived from `palette.primary`/`palette.secondary` over `palette.bg`. Add a snapshot test per template per kind.
- [ ] **Step 3: Bake the grain.** Replace the `feTurbulence` data-URI overlay with a static tiled PNG data-URI at the same visual weight (`grain` prop, default `0.1`). Omit entirely when `grain === 0`.
- [ ] **Step 4: Drop `backdropFilter`.** The initials chip renders on an opaque colour computed from `palette.bg` + `ia_isDark()`. `showInitials={false}` (the Passport stamp case, `passport-card.jsx:67`) skips the chip entirely.
- [ ] **Step 5: Fixed-size root.** Satori has no `preserveAspectRatio="slice"`. `IdentityArtPrint` takes explicit numeric `width`/`height` and pre-scales the 400×400 template geometry itself; no percentage sizing.
- [ ] **Step 6:** Render-through test — feed the component to `ImageResponse` in a Vitest test and assert a non-empty PNG buffer comes back for all five template/kind combinations. **This is the test that proves satori didn't silently drop a layer.**

### Task 5: Mint contract

**Files:**
- create `apps/web/src/lib/share/mint.ts`
- create `apps/web/src/lib/share/__tests__/mint.test.ts`

**Interfaces:** produces `hashStr(input: string): string` (FNV-1a, ported from `shareable-data.jsx`), `mintMeta(event, user, serial?): MintMeta` where `MintMeta = { serial: string; by: string | null; mintedAt: string; contentHash: string }`, and `shareCacheKey(eventId, userId, contentHash): string`.

- [ ] **Step 1: Failing test.** Same `(event.id, user.id, event.state)` → identical 8-char uppercase hex `contentHash` across calls; changing any one input changes it; `serial` is zero-padded to 4; `by` is `null` for an anonymous caller.
- [ ] **Step 2: Implement.** Port `_hashStr` verbatim from `design/design_handoff_shareable_cards/shareable-data.jsx`; hash string is `` `${event.id}:${user.id}:${event.state}` ``.
- [ ] **Step 3:** Assert `serial` and `mintedAt` are metadata only — a card-render snapshot must contain neither (README §3: both were dropped from the drawn card).

### Task 6: Share copy → `definitions/copy.ts`

**Files:**
- modify `apps/web/src/components/consumer/definitions/copy.ts`
- create `apps/web/src/lib/share/taglines.ts`

**Interfaces:** produces `CONSUMER_COPY.share` and `posterTagline(state: PosterState): string`.

- [ ] **Step 1: Lift the tagline bank verbatim.** Under `CONSUMER_COPY.share.taglines`:
  - `going`: `"found this one on Concert Crawl. see you in the pit."`
  - `soldout`: `"sold out. now we're all refreshing stubhub at 2am together."`
  - `drop`: `"price dropped. so did my dignity, but that's unrelated."`
  **Do not edit these strings.** They are the output of the Sour Patch voice pass (#782) and are signed off in the handoff README's voice table.
- [ ] **Step 2:** Add `CONSUMER_COPY.share.stateLabels` — `going: "I'm going"`, `soldout: "Sold out"`, `drop: "Price drop"` (from `share-cards.jsx:173`). Add sheet copy: eyebrow `"Share"`, destination labels `Story / Feed / X / Messages / Save image / Copy link`, and the alt-text template.
- [ ] **Step 3: `posterTagline`** is a total function over a `PosterState = 'going' | 'soldout' | 'drop'` union, falling back to `going`. Test the fallback with an unknown value narrowed via a type guard, not a cast.
- [ ] **Step 4:** Lint rule check — grep the new components for string literals; every user-visible string must come from `CONSUMER_COPY`.

---

## Phase / PR-2 — #72 Poster card + PNG route + trigger

### Task 7: `<PosterCard>` renderer

**Files:**
- create `apps/web/src/components/consumer/share/PosterCard.tsx`
- create `apps/web/src/components/consumer/share/StatePill.tsx`
- create `apps/web/src/components/consumer/share/ShareWordmark.tsx`
- create `apps/web/src/components/consumer/share/definitions/ratios.ts`
- create `apps/web/src/components/consumer/share/__tests__/PosterCard.test.tsx`

**Interfaces:** produces `<PosterCard event ratio theme mint />`. Consumes `IdentityArtPrint`, `resolveThemeTokens`, `posterTagline`, `MintMeta`, `EventWithVenue` (`packages/types/src/index.ts:573`).

- [ ] **Step 1: `SC_RATIOS`** in `definitions/ratios.ts` — `story: 1080×1920`, `square: 1080×1080`, `link: **1200×628**`. 628 is locked; 630 was drift (README "Locked calls"). Zod enum `ratioSchema = z.enum(['story','square','link'])`.
- [ ] **Step 2: Failing render test** — `PosterCard` at all three ratios × three sample events (going / soldout / drop) produces the right dimensions and contains the artist name, venue, city, date, and the state-keyed tagline.
- [ ] **Step 3: Top half — hero.** Full-bleed `<IdentityArtPrint name={event.artist} kind="artist" />` at exactly half the card height. No overlay (README §1).
- [ ] **Step 4: Bottom half — scrim.** Port `paperRgb(a)` (parsed from `palette.bg`) and `scrimGradient` = `linear-gradient(180deg, paperRgb(0) 0%, paperRgb(0) 38%, paperRgb(0.85) 52%, paperRgb(1) 62%, paperRgb(1) 100%)` from `share-cards.jsx:348`. Fully opaque under the title block, 92% elsewhere.
- [ ] **Step 5: Typography per ratio.** Artist `180/120/72`, venue+city `36/28/22`, date+time `56/46/34` (JetBrains Mono, paper scrim behind), wordmark `78/60/42`, handle `36/30/22`. Font files must be loaded and passed to `ImageResponse.fonts` — satori embeds no system fonts. Test: a card rendered with a missing font throws rather than silently falling back.
- [ ] **Step 6: State pill** top-left of the bottom block using `CONSUMER_COPY.share.stateLabels`; price-drop variant renders `↓ $XX` from the event's price block. Delete the dead `watching`/`tonight` colour keys on port.
- [ ] **Step 7: Mis-registration ghost.** Port the offset ghost `<h1>` (8/6 story, 5/4 others) at `inkOffset` — rgba(255,255,255,0.14) when `ia_isDark(palette.bg)`, else rgba(0,0,0,0.12). This is the riso signature; without it the card reads flat.
- [ ] **Step 8: Footer.** Wordmark only, plus `@handle` when `mint.by` is non-null. **Anonymous renders no signature line** (README §1, and the locked answer to open question 1).
- [ ] **Step 9: Tagline hidden at `link` ratio** (per `share-cards.jsx:348` — it doesn't fit at 628px tall).
- [ ] **Step 10: Nine-theme snapshot matrix** — 3 ratios × 9 themes × 3 states rendered through `ImageResponse`, asserting a non-empty PNG each time. 81 renders; keep it as one parameterised test.

### Task 8: The PNG route

**Files:**
- create `apps/web/src/app/share/[eventId]/[ratio]/route.tsx`
- create `apps/web/src/app/share/[eventId]/[ratio]/__tests__/route.test.ts`

**Interfaces:** produces `GET /share/:eventId/:ratio?u=:userId&theme=:theme` → `image/png`. Consumes `publicApiClient`, `PosterCard`, `resolveThemeTokens`, `ratioSchema`, `mintMeta`.

- [ ] **Step 1:** `export const runtime = 'edge'` — mirroring `apps/web/src/app/api/pwa/icon-512/route.tsx`.
- [ ] **Step 2: Validate every input.** `uuidSchema.safeParse(eventId)`, `ratioSchema.safeParse(ratio)`, `themeParamSchema` via `resolveThemeTokens`, optional `u` as a bounded string. Invalid → 400, never a throw, never a cast. Test each rejection.
- [ ] **Step 3: Fetch the event** with `publicApiClient` — the route must work with no session, because the OG crawler has none.
- [ ] **Step 4: Cache headers.** `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`, plus an `ETag` set to `shareCacheKey(eventId, userId, contentHash)`. Vercel's CDN is the cache tier — this replaces the README's "302 to a cached blob in object storage", which would need a storage bucket we don't have. Same cache-key semantics, no new infrastructure.
- [ ] **Step 5:** Test that two requests with identical inputs produce byte-identical output (determinism is the whole mint contract).
- [ ] **Step 6:** 404 for an unknown event id; assert we don't leak an unpublished event through the public renderer.

### Task 9: Event Detail share pill

**Files:**
- create `apps/web/src/components/consumer/event-detail/ShareButton.tsx`
- modify `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`
- modify `apps/web/src/components/consumer/event-detail/PublicEventDetail.tsx`

**Interfaces:** produces the hero share affordance on both the authed and public event surfaces. Consumes `ShareSheet`.

- [ ] **Step 1:** Sibling `BackButton.tsx`'s scrim-pill atom — `absolute top-14 z-10 rounded-full`, `style={{ background: 'var(--scrim)' }}`, positioned `right-3.5` opposite Back's `left-3.5`. Active state tinted `var(--accent)`.
- [ ] **Step 2: a11y — fix the tap target.** `BackButton` is `h-9 w-9` (36px), under the 44px bar. Ship the new Share pill at 44×44 with the visual circle inset, and bring `BackButton` to the same treatment in this PR so the pair stays visually matched. `aria-label` from `CONSUMER_COPY`.
- [ ] **Step 3: No Watching affordance in the hero.** README §2 is explicit: Back + Share only; Watching lives on the `Eye` affordance below the title. Delete the prototype's dead save glyph (`share-trigger.jsx:32`) rather than porting it.
- [ ] **Step 4: Desktop parity.** At `md+` the hero pill stays but the sheet becomes a centred dialog (READINESS:55–65 flags desktop placement as a build-time item). Same component, responsive presentation. Both covered by tests.

### Task 10: Share sheet + destinations

**Files:**
- create `apps/web/src/components/consumer/share/ShareSheet.tsx`
- create `apps/web/src/lib/share/destinations.ts`
- create `apps/web/src/components/consumer/share/__tests__/ShareSheet.test.tsx`

**Interfaces:** produces `<ShareSheet event open onClose />`. Consumes the `/share/...` PNG route, `navigator.share`, `navigator.clipboard`.

- [ ] **Step 1: Failing a11y test** — `role="dialog"`, `aria-modal="true"`, focus moves into the sheet on open, `Escape` closes, focus returns to the trigger, Tab is trapped. READINESS lists all of this as deferred-to-build; it lands here.
- [ ] **Step 2: Live preview** at story ratio via an `<img src="/share/...">` — reuse the render route rather than duplicating the card in DOM, so what the user previews is byte-identical to what they send.
- [ ] **Step 3: Collapse the direction switcher.** The prototype's switcher (`share-trigger.jsx:240`) had three directions; only Poster ships. Single direction → no switcher.
- [ ] **Step 4: Destinations.** `System share` (`navigator.share` with the PNG as a `File` when `navigator.canShare` allows, else URL-only), `Save image` (anchor download), `Copy link` (`navigator.clipboard.writeText` on the `/e/:eventId` URL). Each with a feature-detect fallback and a `try/catch` that logs — no unhandled promise rejections. Test each fallback branch.
- [ ] **Step 5:** Grabber 44×5 `var(--border-strong)`; all tokens, no hex.
- [ ] **Step 6: Release notes** — add the poster entry to `apps/web/src/lib/definitions/releases.ts`.

---

## Phase / PR-3 — #72 OG meta, alt text, analytics

### Task 11: OG metadata on the public mirror

**Files:**
- modify `apps/web/src/app/e/[id]/page.tsx`
- create `apps/web/src/app/e/[id]/__tests__/metadata.test.ts`

- [ ] **Step 1:** `generateMetadata` emits `openGraph.images` pointing at `/share/:id/link` (1200×628) with explicit `width`/`height`, plus `twitter.card = 'summary_large_image'`.
- [ ] **Step 2: `og:image:alt`** = `` `${artist} at ${venue}, ${date}` `` — the exact template READINESS:55–65 recommends. Sourced from `CONSUMER_COPY`, not inlined.
- [ ] **Step 3:** Absolute URL construction from the site origin env var — a relative OG image is ignored by every crawler. Test asserts the emitted URL is absolute.
- [ ] **Step 4:** Same `alt` applied to the `<img>` preview inside `ShareSheet`.

### Task 12: Analytics

**Files:**
- modify `apps/web/src/lib/analytics/*` (follow the existing event-emitter pattern)

- [ ] **Step 1:** `share_sheet_opened { eventId, surface: 'event-detail', authed }`, `share_destination_selected { eventId, destination }`, `share_card_rendered { ratio, theme, cacheHit }`, `public_event_viewed { eventId, referrer }`. READINESS lists the analytics spec as a build-time item.
- [ ] **Step 2:** No PII in payloads; `userId` only where the existing emitter already sends it.

---

## Phase / PR-4 — #85 Concert Passport card

### Task 13: `PP_MODES` + stamp primitives

**Files:**
- create `apps/web/src/components/consumer/passport/definitions/modes.ts`
- create `apps/web/src/components/consumer/passport/PassportStamp.tsx`
- create `apps/web/src/components/consumer/passport/PassportMoreTile.tsx`
- create `apps/web/src/components/consumer/passport/PassportPill.tsx`
- create `apps/web/src/components/consumer/passport/PassportStat.tsx`

**Interfaces:** produces the stamp-wall primitives. Consumes `IdentityArtPrint`, theme tokens.

- [ ] **Step 1: Port `PP_MODES` verbatim** from `passport-card.jsx:27–48` — both `compact` (320×500, 3×3, `pad:15 gap:8 radius:20 stampRadius:9 padTop:54 padBottom:132 statBig:30 wordmark:15 grain:0.12` …) and `share` (1080×1080, 4×4, `pad:44 gap:15 radius:30 stampRadius:16 padTop:116 padBottom:268 statBig:74 wordmark:42 grain:0.1` …). These numbers are the design; do not re-derive them.
- [ ] **Step 2: Fix the timezone bug.** `pp_dateParts` (`passport-card.jsx:63`) computes month in `America/Denver` but day via `getUTCDate()` — off-by-one near midnight. READINESS:50–51 flags it as an eng-fix-on-port. Both parts resolve in `America/Denver`. Failing test first: a show at `2026-03-01T02:00:00Z` renders `FEB 28`, not `MAR 1`.
- [ ] **Step 3: Fix the handle fallback.** `passport-card.jsx:196` throws when the handle is undefined. `user_profiles.handle` is **nullable** (`packages/db/src/schema/user-profiles.ts`), so this is a real production path, not a fixture artefact. Default to `"@you"`; test with `handle: null`.
- [ ] **Step 4: `PassportStamp`** — `IdentityArtPrint name={show.artist} kind="artist" showInitials={false} grain={cfg.grain}` + dark bottom gradient + mono `MONTH/DAY` punch + 2-line-clamped artist. Deterministic ±2° via `pp_rot(id)`.
- [ ] **Step 5: `PassportPill`** — `var(--scrim)` background; **drop `backdropFilter`** in the print variant (satori), keep it in the on-screen compact variant. Two variants, one component, `print` boolean prop.
- [ ] **Step 6: `PassportMoreTile`** — `+N more` on `var(--surface-1)` / `var(--border-strong)`.
- [ ] **Step 7: `PassportStat`** — `var(--signal)` for the accent stat.

### Task 14: `<PassportCard>`

**Files:**
- create `apps/web/src/components/consumer/passport/PassportCard.tsx`
- create `apps/web/src/lib/passport/stats.ts`
- create `apps/web/src/components/consumer/passport/__tests__/PassportCard.test.tsx`

**Interfaces:** produces `<PassportCard mode="compact"|"share" shows stats handle year theme />`. Consumes `PP_MODES`, the stamp primitives, `passportStats()`.

- [ ] **Step 1: Port `h_stats`** (`history-data.jsx:136–166`) to `apps/web/src/lib/passport/stats.ts` as `passportStats(shows: AttendedShow[]): PassportStats` returning `{ nights, venues, artists, topGenre, topVenue, first, last, totalSpent }`. Typed input interface, no fixture coupling. Unit-test empty array, single show, and ties in `topGenre`.
- [ ] **Step 2: Overflow.** When `shows.length > cols*rows`, the last slot becomes `+N more` — meaning only `cols*rows - 1` stamps render. Test the boundary at exactly 9 and exactly 16.
- [ ] **Step 3: Bottom panel.** `linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 58%)`; on-screen adds `backdropFilter: blur(9px)` + mask gradient, print stacks an extra opaque linear-gradient instead. Same visual, two implementations, one snapshot per mode.
- [ ] **Step 4: Header pills** — `PASSPORT · <year>` with signal dot, and `@handle`. **Anonymous is out of scope for Passport** — it is an account artifact by definition (README). If no handle exists, fall back to `"@you"` (Step 3 of Task 13), never render an anonymous passport.
- [ ] **Step 5: Footer** — wordmark + `since ‹month year›` derived from `stats.first`.
- [ ] **Step 6: Nine-theme matrix** — both modes × 9 themes, snapshot on-screen and `ImageResponse` for print.

### Task 15: Passport PNG route

**Files:**
- create `apps/web/src/app/passport/[ratio]/route.tsx`

**Interfaces:** produces `GET /passport/:ratio?theme=` → `image/png`, 1080×1080 only for now.

- [ ] **Step 1:** **Authenticated route** — unlike the poster, the passport is personal data. Resolve the user from the session; 401 if absent. It is deliberately *not* added to `isAlwaysPublic`.
- [ ] **Step 2:** `ratioSchema` restricted to `square`; anything else 400.
- [ ] **Step 3:** Theme resolves from `user_profiles.theme` (server-readable for a signed-in user) with `?theme=` override.
- [ ] **Step 4:** `Cache-Control: private, max-age=300` — never a shared CDN cache for a personal card. Test the header explicitly; a `public` cache header here would be a data leak.

---

## Phase / PR-5 — #85/#70 Wire the Passport to Concert History

**Blocked on #70 merging.** Do not start until `attending_at` exists.

### Task 16: Real attendance data

**Files:**
- modify `apps/api/src/routes/*` (History/attended endpoint added by #70)
- create `apps/web/src/lib/passport/select-shows.ts`

- [ ] **Step 1:** Select attended shows — `user_events.status = 'going'` AND the event date has passed, ordered by date desc, limited to the wall size. A show enters History only via an explicit *I'm going*; **Watching is not a proxy for attendance** (`history-data.jsx` header comment).
- [ ] **Step 2:** Map the API row to the `AttendedShow` interface Task 14 defined. Zod-parse the response; no casts.

### Task 17: Teaser + entitlement gate

**Files:**
- modify the Concert History page (created by #70)
- modify `apps/web/src/components/consumer/definitions/copy.ts`

- [ ] **Step 1:** `<PassportTeaser>` — #70 renders the "See your Passport →" link but leaves the share button unwired (`design/design_handoff_concert_history/READINESS.md:184`). Wire it here.
- [ ] **Step 2: Gate via `canUseFeature(state, 'concert-history')`** — never a hardcoded tier string. See the entitlement-drift note in the Sequencing lock; surface the Supporter-vs-Premium discrepancy for a Hugh call in the PR description.
- [ ] **Step 3:** The share action itself is **Free** once a Passport exists — no second paywall between "you have a Passport" and "you can share it".
- [ ] **Step 4:** Release notes + `progress.md` row.

---

## Files

**Created**
- `apps/web/src/app/e/[id]/page.tsx`
- `apps/web/src/app/share/[eventId]/[ratio]/route.tsx`
- `apps/web/src/app/passport/[ratio]/route.tsx`
- `apps/web/src/components/consumer/event-detail/PublicEventDetail.tsx`
- `apps/web/src/components/consumer/event-detail/ShareButton.tsx`
- `apps/web/src/components/consumer/identity-art/IdentityArtPrint.tsx`
- `apps/web/src/components/consumer/share/{PosterCard,StatePill,ShareWordmark,ShareSheet}.tsx`
- `apps/web/src/components/consumer/share/definitions/ratios.ts`
- `apps/web/src/components/consumer/passport/{PassportCard,PassportStamp,PassportMoreTile,PassportPill,PassportStat}.tsx`
- `apps/web/src/components/consumer/passport/definitions/modes.ts`
- `apps/web/src/lib/share/{theme-tokens,mint,taglines,destinations}.ts`
- `apps/web/src/lib/passport/{stats,select-shows}.ts`

**Modified**
- `apps/web/src/middleware.ts` — ⚠️ collides with #794
- `apps/web/src/components/consumer/identity-art/IdentityArt.tsx` — widen `width`/`height` to `number | string`
- `apps/web/src/components/consumer/definitions/copy.ts` — `CONSUMER_COPY.share`, `.publicEvent`, `.passport`
- `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` — mount `ShareButton`
- `apps/web/src/components/consumer/event-detail/BackButton.tsx` — 44px tap target
- `apps/web/src/lib/definitions/releases.ts`, `docs/superpowers/progress.md`

**Read-only references (not shipped):** everything in `design/design_handoff_shareable_cards/`.

---

## Tests

| Layer | Coverage |
| --- | --- |
| Unit (Vitest) | `resolveThemeTokens` 9-theme + injection cases · `mintMeta` determinism · `posterTagline` totality · `passportStats` edge cases · `pp_dateParts` timezone regression · `PassportCard` null-handle regression |
| Component | `IdentityArtPrint` ↔ `IdentityArt` determinism parity · per-template snapshots · `PosterCard` 3 ratios × 3 states · `PassportCard` 2 modes · `ShareSheet` a11y (role/focus-trap/Escape/return-focus) · destination fallback branches |
| Render-through | Every card fed to `ImageResponse` returns a non-empty PNG — 3 ratios × 9 themes × 3 states (poster), 2 modes × 9 themes (passport). Catches silent satori layer drops. |
| Route | `/share/...` input rejection (bad uuid / bad ratio / bad theme), determinism, cache headers, 404 · `/passport/...` 401 when anon, `private` cache header · middleware public-matcher test |
| Integration | `/e/:id` anon fetch through `publicApiClient`; signed-in redirect to `/events/:id` |
| E2E (staging) | Anon visit to `/e/<id>` renders the event and the sign-in CTA · authed user opens the share sheet, preview image loads, Copy link writes the `/e/` URL |

---

## Out of scope

- **Receipt direction, Stub direction, Watching-list composite** — explored and dropped. `StubCard`, `ReceiptCard`, `ShareTriggerWatching`, `WatchingComposite` are stripped on port, not ported behind a flag.
- **QR code overlay** — Tweak removed.
- **Mint serial overlay** on the drawn card (`#0247/999`) — metadata only.
- **Branded short link / `/e/<slug>` text overlay** on the card — wordmark only. The short-domain question (`concertcrawl.app/e/…` vs `cc.show/…`) stays open and doesn't block anything, since no CTA URL is drawn.
- **A share entry on the Watching surface** — per-event sharing lives only on Event Detail.
- **"My past shares" history** — the mint contract makes it possible later; nothing is built.
- **Object-storage blob cache** — CDN caching on the render route covers it with no new infrastructure.
- **Anonymous Passport** — an account artifact by definition.
- **Story/link ratios for the Passport** — square only.
- **The `attending_at` migration and the Concert History page itself** — owned by #70.
- **Generalising the public route matcher across all consumer surfaces** — owned by #794.

---

## Next

Land **PR-0 first and small**, before #794 touches `apps/web/src/middleware.ts`. PR-1 can run in parallel in a separate worktree — it shares no files.
