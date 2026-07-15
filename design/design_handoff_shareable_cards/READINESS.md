# Readiness Review — Shareable Cards (IdentityArt)

**Verdict:** 🟢 Green (post-addendum, 2026-07-14) — Design's addendum landed all three items from the Yellow → Green path: tier gate + anonymous URL both locked at Hugh's calls, `POSTER_TAGLINES` bank added with a smart de-blaming voice pass, Passport card added with `compact`/`share` modes coherent with the Poster direction. Bonus: mock hero updated to match live app (Watch is the eye affordance below the title, not a Save/heart pill). Plan PR unblocked.
**Original verdict:** 🟡 Yellow (2026-06-26) — two blockers (tier gate + anonymous URL) + one handoff cleanup (`POSTER_TAGLINES` reference) blocking Green. Concert History's Yellow → Green addendum (PR #916) later moved Passport ownership here, expanding scope.
**Audited:** 2026-06-26 (initial) → **flipped 🟢 Green 2026-07-14** after Design addendum landed
**Auditor:** Claude (autonomous Track 1 gate — pre-existing handoff, merged 2026-05-09; addendum re-audit 2026-07-14)
**Audited handoff:** `design/design_handoff_shareable_cards/` (committed `58eb5b80`, 2026-05-09; addendum delivered 2026-07-14)
**Related tickets:**
- [#92](https://github.com/HartiganHM/concert-crawl/issues/92) — Design: Shareable event card (**closed**, delivered by this handoff)
- [#72](https://github.com/HartiganHM/concert-crawl/issues/72) — Shareable show cards (IdentityArt) (**open**, this is the build ticket)
- [#85](https://github.com/HartiganHM/concert-crawl/issues/85) — Concert passport (**open**, **now in scope** via inherited Passport card work per PR #916)
- [#99](https://github.com/HartiganHM/concert-crawl/issues/99) — Venue passport card (**open, launch phase**, out of scope here)

**Plan PR target:** `docs/superpowers/plans/<date>-shareable-cards-implementation-plan.md`. **Unblocked as of 2026-07-14.** Eng-planning agent picks up.

---

## 🎉 Green resolution (2026-07-14 addendum)

Design's addendum touched 5 files + 2 new files across 152 insertions / 37 deletions — focused, no scope creep, everything Hugh signed off on.

### Blockers closed

- ✅ **Tier gate for share generation → Free** (locked in `README.md`). Rationale from Hugh: Watching is Free per #781 R6; sharing is what drives Watching virality, gating it would neuter the loop. Supporter/Premium adds nothing share-specific.
  - **Note (clarified 2026-07-15):** the "Free" call applies to the *share generation action*, not universally to both surfaces. The **Poster** (per-event) is Free everywhere. The **Passport** requires Concert History access to exist (Supporter+), because Concert History is Supporter-gated (per concert_history handoff §3). Once a user has a Passport, both the compact (in-app on History) and share (1080×1080 social) modes render for them, and the share action is Free. See README `Locked calls` for the full entitlement seam. Not a change to Hugh's Free call — it's a clarification of what "Free" means for a Passport-adjacent surface that inherits History's gating naturally.
- ✅ **Anonymous URL contract → public `/e/:eventId` mirror route** (locked in `README.md`). OG-preview clicks land on a public event detail surface that mirrors `/events/:id`; paywall stays on secondary actions (Watch, Get Tickets, submit-a-price). Eng chooses between "mirror route" or `public: true` variant — infra decision, not Design's problem.
- ✅ **`POSTER_TAGLINES` bank shape + placement** (`share-cards.jsx:24–48`). Constant added, keyed by state (`going`/`soldout`/`drop`), wired into `PosterCard` via `posterTagline(state)` instead of the old per-event `event.snark`. Final home documented as `apps/web/src/components/consumer/definitions/copy.ts` per `feedback_definitions_copy_rule`.
- ✅ **Sour Patch voice pass on all three taglines** (documented in `README.md` diff table). Notable: `soldout` de-blamed from *"you snoozed. now you're refreshing stubhub…"* to *"sold out. now we're all refreshing stubhub at 2am together"* — flips from finger-pointing to inclusive shared misery, keeps the 2am detail. `drop` genericized (no hard-coded $ amount; the `pricePill` carries the number). `going` unchanged — already at the bar.
- ✅ **Link ratio drift fixed** — README + code both now read `1200×628`.

### Passport card (NEW — inherited from concert_history, added in scope)

- ✅ **`passport-card.jsx`** — `<PassportCard mode="compact|share" shows stats handle year />` + `<PassportStamp>` + `PP_MODES` config bank.
- ✅ **Two modes**:
  - **compact (320×500)** — 3×3 stamp wall, sidebar/inline surface; ships on the Concert History page under a "See your Passport →" teaser link.
  - **share (1080×1080)** — 4×4 stamp wall, matches existing `square` share ratio; render pipeline reuses `/share/:eventId/:ratio.png` shape as a sibling route (proposed `/passport/:userId/:ratio.png`).
- ✅ **Visual coherence with Poster** — identity-art stamp wall (top) uses same generative palette engine as Poster's hero (theme-independent per Phase 7.5); tokened `--scrim` glassmorphism panel (bottom) with stat readout (`nights` / `venues` / `top genre`) + wordmark. Stands on its own conceptually (personal shrine, not per-event).
- ✅ **`history-data.jsx`** copied verbatim from `concert_history` handoff — Passport consumes `H_SHOWS` + `h_stats()` without inventing a new fixture shape.
- ✅ **Canvas section added** — `shareable-canvas.jsx` gains a "Concert Passport" section with both mode artboards, scaled to fit.
- ✅ **HTML entry updated** — `Shareable Cards.html` loads `history-data.jsx` and `passport-card.jsx` before the canvas.

### Bonus improvement from Design

- ✅ **Mock Event Detail hero fixed to match live app** — removed the Save/heart pill from the hero (`share-trigger.jsx`). The live app moved Watch to the eye affordance below the title (see `concert_history` handoff). The hero now carries only Back + Share, matching what shipped. Small drift catch that prevents an implementer from rebuilding against a stale hero pattern.

### 🧹 Prototype polish deferred to build

Two small bugs surfaced during the Copilot R1 pass on the addendum — both are mock-fidelity issues in `passport-card.jsx` that a reasonable implementer will get right when porting to production. Listed here so eng has an at-a-glance checklist:

- **`passport-card.jsx:196`** (handle fallback) — `handle || (window.SHARE_USER ? window.SHARE_USER.handle : "@you").replace(/^@?/, "@")` will throw if `SHARE_USER` exists but its `.handle` is undefined (because `.replace()` runs on `undefined`). Fix: guard for a missing handle before the `.replace()` — e.g. `(window.SHARE_USER?.handle || "@you").replace(...)`. Won't bite in the prototype (SHARE_USER fixture always defines handle); would bite in prod if the auth layer ever hands off a nameless session.
- **`passport-card.jsx:63`** (`pp_dateParts` timezone drift) — `month` uses `America/Denver`, `day` uses `getUTCDate()`. Near midnight in Denver, the UTC day can be off-by-one from the Denver day (rare but real — shows starting at 11pm local on the last day of the month). Fix: switch `day` to a Denver-timezone extraction to match the month (e.g. `d.toLocaleString("en-US", { day: "numeric", timeZone: "America/Denver" })`).

Neither affects the visual system or the design's intent — the mock renders fine on the fixture data. Eng should apply both when reimplementing in the real app stack (per `CLAUDE_CODE_PROMPT` convention in adjacent handoffs).

### Non-blocking items — deferred to build (unchanged from Yellow verdict)

The following were flagged in the original audit as non-blocking; the addendum correctly did not touch them, and they remain build-phase items:

- A11y annotations on share sheet (`role="dialog"`, focus trap, SR script)
- Desktop trigger placement (assumption: top-right scrim-pill row, matches BackButton pattern)
- Analytics events spec (share sheet open/close, destination click, share completion)
- Rendered PNG alt text (recommend `{artist} at {venue}, {date}`)
- 9-theme scope confirmation (paper-scrim is theme-independent per Phase 7.5; bottom scrim reads tokens — likely auto-adapts)
- Watching-composite dead code paths in `share-cards.jsx` and `share-trigger.jsx` (strip during implementation, per original audit)
- Anonymous handle policy (currently: drop the signature line — README default confirmed)

## Path to Green — historical

1. ✅ **Hugh confirmed tier gate (2026-07-14):** Free.
2. ✅ **Hugh confirmed URL contract (2026-07-14):** public `/e/:eventId` mirror route.
3. ✅ **Design applied the addendum (2026-07-14):** all six items closed (3 blockers + Passport scope + link ratio + hero cleanup).
4. ✅ **Second-pass audit (2026-07-14):** flipped 🟢 Green. Plan PR can open.

---

> ⏳ **Everything below is the original 2026-06-26 Yellow audit, preserved as historical context.** Statements about undesigned tier gates, missing `POSTER_TAGLINES`, and out-of-scope Passport reflect the codebase at audit time and have since been resolved — see the Green resolution section above for current state.

---

## Summary 🎯

This is one of Design's cleaner riso experiments — the Poster direction is confident, the layout math is spelled out per ratio, the drop-Receipt/drop-Stub/drop-Watching-composite call is decisive, and the mint contract is small and hashable. The dev-facing README is also tight: three ratios, three consumer themes, one direction, exact typography ladders, an explicit "strip these code paths" list.

The two blockers are both **cross-cutting**: a **tier-gate call** for share (undesigned; monetization vertical landed six weeks *after* this handoff and has no share-related entitlement) and an **anonymous-view infrastructure decision** for the OG image / `/share/:eventId/:ratio.png` route (the event page today lives under `(protected)/(main)`, so the shared link's landing surface has to be defined). Neither requires a full brief re-pass — a light addendum will resolve both.

Plus one small handoff cleanup: the README references a `POSTER_TAGLINES` constant that doesn't exist in `share-cards.jsx`; the taglines are actually inlined as `event.snark` on fixture data. Eng will need clear guidance on where the string bank lives.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Purpose is crisp — image cards a fan posts to invite friends or flex an upcoming show. One direction (Riso Poster), three aspect ratios (story / square / link), one trigger surface (Event Detail hero, third scrim-pill).
- ✅ Explicit **drop list** in "What to build" + "Out of scope": Receipt, Stub, Watching-composite, QR overlay, mint-serial overlay, branded-short-link overlay. That's exemplary discipline — dropped concepts still live in `share-cards.jsx` and `share-trigger.jsx`, and the README tells eng to strip them.
- ✅ Mint contract cleanly separates rendered visual (`serial` / `mintedAt` not drawn) from metadata (present for future "my past shares" history if it ships). Good deferral hygiene.
- 🟡 **Sequencing / gating undesigned.** README doesn't state who can generate a share card. Anonymous unsigned-in visitors? Free-tier users? Supporter+? Given monetization landed after this handoff, this is a legitimate gap, not a Design oversight — but it needs a call before build. See Decisions log below.

### 🎭 State coverage

- ✅ Three state pills wired end-to-end: `going`, `soldout`, `drop`. Each has its own tagline override in fixture data and pill color mapping in the `colors` map inside `StatePill` (`share-cards.jsx:111`).
- ✅ Three aspect ratios × three consumer themes = **9 rendering variants**. `SC_RATIOS` locks the pixel dimensions (1080×1920, 1080×1080, 1200×628 — note the README says 1200×630 for `link` but the code says 628, a 2-pixel drift that only matters if OG spec requires exact-630).
- ✅ Anonymous-user handling documented in "Open questions" #1: currently the signature line is dropped. **Confirm-or-flip decision needed** (see Decisions log).
- 🟡 **Watching state pill exists in code but never appears on the shipped direction.** `stateLabel()` handles `watching` and `tonight` states + the pill `colors` map inside `StatePill` has entries for both. Since Watching-composite was dropped and Riso Poster is the only direction, `watching` state pill has no surface — dead code eng should strip along with the Receipt/Stub paths. (Not a spec gap; just noting for the "strip during implementation" list.)
- 🟡 **No error/empty state.** What happens if identity-art fails to hash-derive a palette (impossible in prod but defensively)? What if the user's `@handle` is `null` mid-render? The `showSig` guard covers `mint.by` being falsy, so the mechanical path is defensive. The visual path (top-half art + bottom scrim) hasn't been shown against a "no palette" fallback. Low priority.

### 🔌 Data contract

- ✅ Event fixture shape (`SHARE_EVENTS.callboy`, `.geese`, `.amyl`) maps cleanly to shipped `EventWithVenue`: `artist`, `venue`, `city`, `date`, `showTime`, `state` (needs derivation), `pricePill` (needs derivation from `priceByTier`). Eng will need small selector functions but no new schema.
- ✅ `mintMeta(event, user, serial)` correctly documents cache key as `(eventId, userId, contentHash)`. Content hash inputs are `event.id`, `user.id`, `event.state` — that's the correct minimum set (state changes the pill + tagline, so it must invalidate).
- ✅ Rendering pipeline shape (§5) is architecturally clean: `GET /share/:eventId/:ratio.png?u=:userId` → 302 to cached blob, HTML-to-PNG via headless Chromium. **Uses existing crawler Chromium** (Playwright already installed in the crawler package). No new dep.
- 🔴 **Data-contract-vs-README drift on tagline copy.** README line 67 says "keep verbatim from `share-cards.jsx::POSTER_TAGLINES`". No such constant exists in the file. Tagline copy is actually stored on **fixture event data** as `event.snark` (`shareable-data.jsx:28,45,62`) and rendered via `"{event.snark}"` in `PosterCard`. This will break eng: they'll go looking for `POSTER_TAGLINES`, find nothing, and either invent a new constant or hardcode strings. Design needs to specify **where the tagline bank actually lives** — one option: a `POSTER_TAGLINES` constant keyed by `state` (`{ going: "...", soldout: "...", drop: "..." }`). This also intersects with `feedback_definitions_copy_rule` (all customer-facing strings in `definitions/copy.ts`), so the answer is likely "eng owns a `consumer.share.poster.taglines` copy map with three keys".
- 🟡 **Anonymous URL contract undefined.** `?u=:userId` in the OG route implies always-signed sharing. But #85 (concert passport) and #99 (venue passport) will need shared URLs viewable by *anyone*, and OG image previews (SMS / Slack / iMessage) fire from unauthenticated crawlers. If the event detail landing page stays under `(protected)/(main)`, an SMS-preview click lands on `/sign-in`. Is that the intended UX? Alternative: a public `/e/:eventId` route or letting `/events/:id` be reachable unauth. See Decisions log.

### 🧱 Codebase fit

- ✅ **Identity art already exists** at `apps/web/src/components/consumer/identity-art/IdentityArt.tsx` (`ia_isDark`, `identityFor`, hash-derived palettes) — the design's `window.identityFor(...)` and `window.ia_isDark(...)` calls in `share-cards.jsx` line up 1:1. No reinvention.
- ✅ **`--scrim` token exists** and is widely used across the codebase. BackButton at `apps/web/src/components/consumer/event-detail/BackButton.tsx:29` already uses `top-14` (56 px) + `background: var(--scrim)` + `h-9 w-9` — that's the exact `ScrimPill` atom from the handoff. Adding Save + Share as siblings is a small edit, not a new pattern.
- ✅ **Token-only colors** across state pills, scrim, wordmark: `var(--accent)`, `var(--warning)`, `var(--success)`, `var(--signal)`, `var(--fg)`, `var(--fg-on-accent)`, `var(--fg-muted)`, `var(--fg-subtle)`, `var(--border)`, `var(--bg)`, `var(--bg-elevated, var(--bg))`. All present in `globals.css`.
- ✅ **Riso Poster reads `identityFor().palette.ink` and `.bg` directly, then computes `paperRgb()` for the scrim gradient.** This bypasses theme tokens deliberately (per Phase 7.5: identity art palette is theme-independent). That's correct — but note eng will need to lift `identityFor` and `ia_isDark` out of the component and into a shared util if the poster renderer runs server-side. They're already exported from `IdentityArt.tsx`, so fine.
- 🟡 **Theme scope limited to 3, but the app now has 9 themes.** README §4 names only `electric` / `jade` / `light`. Since the poster's paper scrim + fg/border swaps only affect the **bottom half** and identity art is theme-independent, this is likely fine in practice — but Design should confirm whether the 6 later themes (Pulse, Forge, Blue Note, Drip, Cedar, Gloss) need any per-theme paper-scrim tuning or if the token contract auto-adapts.
- 🟡 **Customer-facing copy hardcoded in JSX.** `"I'm going"`, `"Sold out"`, `"Price drop"`, wordmark strings, taglines — all inline. Plan PR must externalize per `feedback_definitions_copy_rule`. Not a Design gap; standard convention violation carried by all handoffs.

### ♿ Cross-cutting

- 🟡 **No a11y annotations on the share sheet.** Bottom sheet has grabber, direction switcher, live preview, destinations row, mint-signature toggle — but no `role="dialog"`, no `aria-label`, no focus-trap notes, no screen-reader script. The Event Detail scrim-pill has `aria-label="Share"` (good), but everything downstream is unannotated. Compare to #782's `AnnotatedFailure` / `AnnotatedChallenge` composites — that's the bar Design set on more recent handoffs. Plan PR needs to fill this in during build.
- 🟡 **Rendered image alt text unspecified.** `GET /share/:eventId/:ratio.png` returns a PNG — what does the `<img alt>` say when embedded in a post preview? Standard OG behavior lets the platform decide, but the event page's own `og:image` tag needs `og:image:alt`. Design call: full tagline + artist + venue vs. minimal `"{artist} at {venue}, {date}"`. Recommend the latter.
- ✅ **Mobile-first.** Event Detail hero is 390 px wide (iPhone 14/15 Pro). ScrimPills at 36 × 36 px hit tap-target minimum. Bottom sheet slides from bottom edge in familiar iOS pattern. **Desktop parity, however, is unaddressed** — MockEventDetailHero has no desktop variant. That's OK if we treat share as a mobile-first affordance (most sharing happens on phones), but the desktop event detail page needs at least a placement decision. Per `feedback_mobile_desktop_parity`, this is a hard rule — plan PR must ship both surfaces. Design should confirm the desktop trigger placement (assumption: same top-right scrim-pill row, matches BackButton pattern on desktop layouts).
- 🟡 **No analytics events spec'd.** Share sheet open/close, direction preview (moot with only Riso Poster), destination-picker click, actual share completion (per-destination). Owned by eng infra / plan PR.

### ⏰ Drift from reality

- ⏰ **Handoff is 7 weeks old and pre-dates the monetization vertical.** #781 (tier picker + entitlements matrix) locked 2026-06-24 and does NOT list shareable cards in any tier's feature bullets. The handoff assumes share is universally available — but that's a policy question the monetization vertical never got to answer. Diffed the tier features (`design/design_handoff_monetization/monetization-shared.jsx` §features arrays for Free / Supporter / Premium / Founder / Gifted): **zero share-related entitlements**. Silent drift. Not Design's fault (order of operations), but a decision is needed.
- ⏰ **Fixture events are LA / NY / Brooklyn.** App is Denver-focused. Not a spec bug — fixtures — but eng should use Denver venues in the implementation storybook / preview environment for coherent brand voice.
- ⏰ **README says `link` = 1200×630 (line 24) but code says 1200×628 (`SC_RATIOS.link.h`).** OG spec is technically flexible (Facebook/Meta recommends 1.91:1 aspect ratio, no strict pixel requirement), but if we're claiming a spec number, pick one. Recommend the code (628 = closer to the 1.91:1 float 627.9); update README.
- 🟡 **Sound-effect drift on brand voice.** The `going` tagline (`"found this one on Concert Crawl. see you in the pit."`) is warm, Sour-Patch-adjacent. Sold-out and drop taglines are sharper (`"you snoozed. now you're refreshing stubhub at 2am like the rest of us."`, `"price dropped $9. so did my dignity, but that's unrelated."`). Both work as *user-composed* posts but neither is quite the Sour Patch voice #782 locked (honest + slight cheek, never blamey). "You snoozed" comes closest to blamey — Design should confirm whether these ship verbatim or whether Hugh gets a voice pass at build time. Not a blocker; just a voice-review checkpoint.

### 📝 Decision log

Two "Open questions" from the README + three implicit decisions surfaced during audit. **Two of these five block plan PR.**

| # | Question | Blocking? | Recommendation (Design still owns final call) |
|---|---|---|---|
| 1 | Anonymous handle policy — drop the signature line vs. render `@anonymous`? | 🟢 no | README default (drop) is fine. `@anonymous` reads passive-aggressive; anonymous-sharer = no line. |
| 2 | Short domain — `concertcrawl.app/e/...` vs. `cc.show/...`? | 🟢 no | Only matters if we add a CTA URL line, and we're not. Kick to launch phase. |
| 3 | **Tier gate for share** — who can generate a share card? | 🔴 **YES** | Recommend Free (Watching is Free per #781 R6; sharing amplifies Watching virality). But this is Design/Hugh's call, not audit's. |
| 4 | **Anonymous URL contract** — where does an OG-preview click *land*? Event page today is `(protected)/(main)`. | 🔴 **YES** | Recommend adding a `public: true` variant for the event detail route (or a `/e/:id` public route), with paywall/sign-in appearing on secondary actions (Watch, Get Tickets). Sharing is fundamentally about reaching non-users; landing them on `/sign-in` breaks the loop. |
| 5 | Tagline source-of-truth — README says `POSTER_TAGLINES`, code says `event.snark`. | 🟡 handoff cleanup | Design should confirm the tagline bank shape — most likely `{ going, soldout, drop }` keyed by state, ultimately living in `definitions/copy.ts`. |

## Deliberate exclusions (from handoff, unchanged)

- Receipt direction, Stub direction (dropped, code paths still present — strip)
- Watching-list composite card (entire concept dropped)
- QR code overlay (removed as Tweak)
- Mint serial overlay (`#0247/999`) (dropped)
- Branded short link / `/e/<slug>` overlay on the card (wordmark-only)
- #85 Concert passport + #99 Venue passport — separate launch-phase tickets

## Decisions inherited (from adjacent locked matrices)

- **Watching is Free** (#781 R6 amendment) — reinforces the recommendation to keep sharing on the Free tier if Watching drives share adoption.
- **All 9 themes render token-only colors** — the paper-scrim math in `PosterCard` uses raw `identityFor().palette.bg` (theme-independent per Phase 7.5), so this constraint is naturally honored for the top half. Bottom-half scrim + fg/border reads from tokens, so 9-theme parity is likely automatic.
- **Concert history requires explicit "I'm going" action** separate from watch record (per `project_concert_history_attending.md`) — the `state: "going"` on a share card should map to the user having explicitly marked attendance, not to their watch status. Small semantic distinction, but tag-line accuracy depends on it.
- **Sour Patch voice on failure/paid touchpoints** (#782) — recommended as a light voice pass on the three shipped taglines during build.

## Open observations (no addendum required)

- The mock `MockEventDetailHero` at `share-trigger.jsx:72` is a faithful recreation of Event Detail v2 — small differences from shipped code (e.g., `Watching` chip states, `Going rate` price block). Eng should treat the *shipped* Event Detail as source-of-truth and add the third scrim-pill in-place, not rebuild from the mock.
- The `WatchingComposite` component at `share-trigger.jsx:473` is thoroughly built for a concept the README explicitly drops. It's fine to leave as commented reference for #85 concert passport, but plan PR must not accidentally ship it.
- The 2-pixel `link` height drift (README 630 vs. code 628) doesn't need Design attention; eng should just pick the code value and move on.

## What Design needs to add (light addendum)

Two blocking items (#3 and #4 above) plus the tagline-bank shape (#5). Recommend a **~30-min direct-write addendum** in the working tree that:

1. States the tier gate for share generation (recommendation: Free).
2. States the OG-preview landing UX (recommendation: public `/e/:id` mirror route or `public: true` variant of `/events/:id`; paywall on Watch/Get Tickets, not the page shell).
3. Names the tagline constant + shape (recommendation: `POSTER_TAGLINES = { going, soldout, drop }` keyed by state, destined for `apps/web/src/components/consumer/definitions/copy.ts`).

Non-blocking items (a11y annotations, desktop trigger placement, analytics events, alt text on rendered PNG) can be resolved during plan PR review — they're standard build-phase decisions and don't need a fresh Design round.

## Next step

**Design:** add the three-item addendum above (working-tree only per `feedback_handoff_iterate_before_commit` until this Yellow closes to Green).

**Then:** plan PR opens at `docs/superpowers/plans/<date>-shareable-cards-implementation-plan.md`. First-round scope should carve out:

- The tier-gate + public-event-route infra changes as a **prerequisite PR** (or a PR-0 in the plan).
- Card renderer + mint contract + Chromium PNG pipeline as PR-1.
- Event Detail hero third scrim-pill + share sheet + destinations wiring as PR-2.
- OG meta on the event page + rendered-image alt text + a11y annotations as PR-3.

This verdict follows `docs/superpowers/design-pipeline.md` — Track 1 pre-existing-handoff audit gate.
