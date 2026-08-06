# #1226 Concert Crews — PR-4 design specification table

Scope: **PR-4 only** — `CrewPatch`, the fifth bottom-nav slot + desktop header tab,
the `/crews` destination (ready / empty / loading / error), the create-crew sheet,
and the premium gate on the create affordance.

Sources, in precedence order:

1. `docs/superpowers/plans/2026-08-05-1226-concert-crews.md` — the merged execution
   plan. **Authoritative** where it disagrees with the handoff.
2. `design/design_handoff_concert_crews/*.jsx` + `README.md` — the visual spec.
3. `design/design_handoff_concert_crews/crew-copy.jsx` — key names only.
   **Its gate strings are superseded** by the plan's ✅ copy-review verdict table
   (plan:121-136). Rows sourced from that table are marked **[PLAN-COPY]**.

Paths below are relative to the repo root. `plan:N` = line N of the plan doc;
`README:N` = line N of the handoff README; bare `file.jsx:N` = that handoff file.

Legend for the Check column: a verifier should be able to answer yes/no without
reading anything else.

---

## A. CrewPatch — algorithm (crew-art.jsx)

| #   | Requirement                                                                                 | Source                   |
| --- | ------------------------------------------------------------------------------------------- | ------------------------ |
| A1  | Component lives at `apps/web/src/components/consumer/crew-patch/CrewPatch.tsx`              | plan:389                 |
| A2  | Hash is FNV-1a 32-bit, seed `0x811c9dc5`, `Math.imul(h, 0x01000193)`, all steps `>>> 0`     | crew-art.jsx:38-46       |
| A3  | Hash input string is exactly `"crew:" + String(crewId \|\| "") + ":" + String(salt \|\| 0)` | crew-art.jsx:40          |
| A4  | `chord = CREW_CHORDS[hash % 5]`                                                             | crew-art.jsx:260         |
| A5  | `weave = CREW_WEAVES[(hash >>> 5) % 4]`                                                     | crew-art.jsx:261         |
| A6  | `sigil = CREW_SIGILS[(hash >>> 11) % 5]`                                                    | crew-art.jsx:262         |
| A7  | `ground = CREW_GROUNDS[(hash >>> 17) % 3]`                                                  | crew-art.jsx:263         |
| A8  | `spin = ((hash >>> 21) % 6) * 60` degrees, applied as a rotation about the patch centre     | crew-art.jsx:264         |
| A9  | Variant space is 5 × 4 × 5 × 3 = 300 distinct patches (spin is not counted as identity)     | plan:391; README:563-700 |
| A10 | Bit-slices must stay independent — do not reuse one slice for two layers                    | crew-art.jsx:259-267     |
| A11 | Determinism: same `(crewId, patchSalt)` always renders byte-identical SVG                   | plan:392                 |
| A12 | `patchSalt + 1` must render a visibly different patch (snapshot differs)                    | plan:392                 |

## B. CrewPatch — palette (chords)

| #   | Requirement                                                                              | Source           |
| --- | ---------------------------------------------------------------------------------------- | ---------------- |
| B1  | Chord 0 = `--signal` / `--accent`                                                        | crew-art.jsx:76  |
| B2  | Chord 1 = `--accent` / `--signal`                                                        | crew-art.jsx:77  |
| B3  | Chord 2 = `--signal` / `--success`                                                       | crew-art.jsx:78  |
| B4  | Chord 3 = `--accent` / `--warning`                                                       | crew-art.jsx:79  |
| B5  | Chord 4 = `--success` / `--accent`                                                       | crew-art.jsx:80  |
| B6  | **No hex literals anywhere in CrewPatch.** Every colour is a `var(--token)`              | plan:390         |
| B7  | CrewPatch takes **no** identity-palette carve-out — unlike `IdentityArt`'s `IA_PALETTES` | plan:390; README |
| B8  | Therefore the patch re-colours with every one of the nine themes; verify in at least 3   | plan:390         |

## C. CrewPatch — grounds (3)

| #   | Requirement                                                                   | Source               |
| --- | ----------------------------------------------------------------------------- | -------------------- |
| C1  | `halo` — concentric rings, radii and opacities exactly as authored            | crew-art.jsx:85-96   |
| C2  | `wedges` — radial wedge fan, angle set as authored                            | crew-art.jsx:97-110  |
| C3  | `bands` — horizontal band stack, band heights/opacities as authored           | crew-art.jsx:111-122 |
| C4  | Ground uses the chord's **secondary** role; it must never out-weigh the sigil | crew-art.jsx:84-122  |

## D. CrewPatch — weaves (4)

| #   | Requirement                                                                                         | Source               |
| --- | --------------------------------------------------------------------------------------------------- | -------------------- |
| D1  | `twill` — `<pattern>` at 12×12                                                                      | crew-art.jsx:132-146 |
| D2  | `warp` — 12 radial spokes + 3 circles, geometry explicit (not a pattern tile)                       | crew-art.jsx:147-166 |
| D3  | `braid` — `<pattern>` at 13×13                                                                      | crew-art.jsx:167-179 |
| D4  | `knot` — `<pattern>` at 16×16, dashed strokes                                                       | crew-art.jsx:180-193 |
| D5  | The three pattern-based weaves each paint via one `<rect x="-20" y="-20" width="140" height="140">` | crew-art.jsx:131-193 |
| D6  | Weave is suppressed entirely at `scale="micro"` (`showWeave = scale !== "micro"`)                   | crew-art.jsx:315     |

## E. CrewPatch — sigils (5)

| #   | Requirement                                            | Source               |
| --- | ------------------------------------------------------ | -------------------- |
| E1  | `triad` renders as authored                            | crew-art.jsx:202-212 |
| E2  | `bloom` renders as authored                            | crew-art.jsx:213-224 |
| E3  | `beacon` renders as authored                           | crew-art.jsx:225-235 |
| E4  | `keystone` renders as authored                         | crew-art.jsx:236-246 |
| E5  | `tangle` renders as authored                           | crew-art.jsx:247-256 |
| E6  | Sigil stroke width `sw = scale === "hero" ? 1.6 : 2.2` | crew-art.jsx:317     |
| E7  | Sigil uses the chord's **primary** role                | crew-art.jsx:201-256 |

## F. CrewPatch — SVG shell + props

| #   | Requirement                                                                                                                             | Source                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| F1  | Props exactly: `crewId, patchSalt, size, scale: 'hero' \| 'tile' \| 'micro'`                                                            | plan:389                   |
| F2  | `viewBox="0 0 100 100"`; `width`/`height` both = `size`                                                                                 | crew-art.jsx:310-320       |
| F3  | `aria-hidden="true"` and `focusable="false"` on the root `<svg>` — the patch is never an accessible name                                | crew-art.jsx:320           |
| F4  | Root style `{ display: "block", flexShrink: 0, overflow: "visible" }`                                                                   | crew-art.jsx:320           |
| F5  | SSR-safe id prefix: `` `cp${React.useId().replace(/:/g, "")}` `` — **never** a module-scope counter                                     | plan:390; crew-art.jsx:311 |
| F6  | Every `clipPath` / `pattern` / `mask` id is namespaced with that uid                                                                    | crew-art.jsx:322-350       |
| F7  | Squircle body `<rect x=2 y=2 width=96 height=96 rx=28>` filled `var(--surface-2)`                                                       | crew-art.jsx:325-330       |
| F8  | Ground + weave + sigil are all clipped to the squircle                                                                                  | crew-art.jsx:331-344       |
| F9  | Edge stroke `var(--border-strong)` at width 2, drawn above the clipped content                                                          | crew-art.jsx:345-347       |
| F10 | Hero-only stitch: `<rect x=7.5 y=7.5 width=85 height=85 rx=23>`, stroke `var(--fg-subtle)`, width 1.1, dasharray `3 4.5`, opacity `.55` | crew-art.jsx:348-350       |
| F11 | `showStitch = scale === "hero"` — never at tile or micro                                                                                | crew-art.jsx:316           |
| F12 | Renders correctly with no props beyond `crewId` (salt defaults to 0)                                                                    | crew-art.jsx:38,285        |

## G. CrewPatch — reroll (used by PR-4's create sheet, shared with PR-5)

| #   | Requirement                                                                                           | Source               |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------- |
| G1  | `nextPatchSalt(crewId, currentSalt = 0, maxShared = 1)` scans `currentSalt+1 … currentSalt+60`        | crew-art.jsx:285-297 |
| G2  | Rule 1 — candidate is rejected outright if `weave.id` is unchanged (the fabric must change)           | crew-art.jsx:289     |
| G3  | Rule 2 — of `sigil` / `ground` / `chord`, at most `maxShared` (default 1) may match the current patch | crew-art.jsx:290-295 |
| G4  | If no candidate in 60 tries satisfies both, fall back to `currentSalt + 1`                            | crew-art.jsx:296     |
| G5  | Documented worst case: 1 shared layer, 0 shared weaves                                                | README:445-560       |
| G6  | Seed-table parity check: Thursdays' stored salts run 0, 1, 3, 5, 6, 8                                 | README:445-560       |

## H. Fifth bottom-nav slot (mobile)

| #   | Requirement                                                                                                                                | Source                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| H1  | Product nav order is locked to Option A: `browse · venues · my shows · crews · me`                                                         | crew-nav-options.jsx:112-124; plan D8                                    |
| H2  | Append `{ key: 'crews', label: 'crews', href: '/crews' }` to `CONSUMER_COPY.bottomNav.nav.tabs`                                            | plan:399; `apps/web/src/components/consumer/definitions/copy.ts:743-752` |
| H3  | Crews sits at slot 4; the account trigger moves to slot 5                                                                                  | plan:400                                                                 |
| H4  | Update the "Slot 4's accessible name comes from userMenu.ariaLabels" comment to say slot 5                                                 | plan:400; copy.ts:753-760                                                |
| H5  | Append the matching `STATIC_TABS` entry in `BottomNav.tsx` with an inline SVG                                                              | plan:401; `BottomNav.tsx:17-89`                                          |
| H6  | Icon is 18×18, `stroke="currentColor"`, `strokeWidth="1.5"` — matching the three existing tabs                                             | plan:401; BottomNav.tsx:17-89                                            |
| H7  | Icon motif: three overlapping rings or similar. **Not a heart.** **Not the eye** (that belongs to "my shows")                              | plan:401; crew-nav-options.jsx:52                                        |
| H8  | Do **not** add fixed per-slot widths. The bar stays `flex … justify-around`; "5 × 64px = 320px" was a sizing budget, not an implementation | plan:402-404                                                             |
| H9  | At a 320px viewport all five labels render with no truncation and no wrap                                                                  | plan:404; plan tests table                                               |
| H10 | Every slot clears a 44px minimum tap target (bar height is `calc(52px + safe-area)`)                                                       | plan:404; crew-nav-options.jsx; BottomNav.tsx                            |
| H11 | Active slot colour `var(--signal)`; inactive `var(--fg-subtle)`                                                                            | crew-nav-options.jsx                                                     |
| H12 | Label typography: 9px mono, letter-spacing `.04em`, weight 700 active / 500 inactive                                                       | crew-nav-options.jsx                                                     |
| H13 | Icon-to-label gap 3px; slot `minWidth 56`, `minHeight 44`                                                                                  | crew-nav-options.jsx                                                     |
| H14 | Each slot carries an `aria-label` and `aria-current="page"` when active                                                                    | crew-nav-options.jsx                                                     |
| H15 | Bar background `var(--bg-elevated)` with a top border; `paddingBottom: env(safe-area-inset-bottom, 2px)`                                   | BottomNav.tsx; crew-nav-options.jsx                                      |

## I. Desktop header tab (parity, same PR)

| #   | Requirement                                                                                 | Source              |
| --- | ------------------------------------------------------------------------------------------- | ------------------- |
| I1  | Add the same crews tab to `CONSUMER_COPY.appHeader.nav.tabs` (`AppHeader.tsx` maps over it) | plan:406            |
| I2  | It renders as a real `<a>`, not a div/button                                                | plan:406            |
| I3  | `aria-current="page"` on the active desktop tab                                             | plan:406            |
| I4  | `isTabActive` covers the new `/crews` href                                                  | plan:407            |
| I5  | Mobile and desktop ship in the **same PR** — parity is non-negotiable                       | CLAUDE.md; plan:406 |

## J. `/crews` route shell

| #   | Requirement                                                                             | Source   |
| --- | --------------------------------------------------------------------------------------- | -------- |
| J1  | Route lives at `apps/web/src/app/(protected)/(main)/crews/`                             | plan:410 |
| J2  | `page.tsx` is an async server component: `getToken()` then `fetchCrews(token)`          | plan:411 |
| J3  | `loading.tsx` mirrors the row geometry so there is **no CLS** on hydration              | plan:412 |
| J4  | `error.tsx` exists and renders the error state                                          | plan:412 |
| J5  | `CrewsContent` is the client component holding list + create trigger                    | plan:413 |
| J6  | Being under `(protected)` means the route is authed-only; unauthed users never reach it | plan:410 |

## K. `/crews` — ready state (list)

| #   | Requirement                                                                                         | Source                                  |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| K1  | List header pairs a mono eyebrow with the gated create affordance on the trailing edge              | crews-destination.jsx:442-475           |
| K2  | One `CrewRow` per crew                                                                              | crews-destination.jsx:442-475           |
| K3  | `CrewRow` contents in order: patch, crew name, member count, upcoming meta, member cluster, chevron | plan:414; crews-destination.jsx:416-439 |
| K4  | Row `minHeight: 64`                                                                                 | crews-destination.jsx:416-439           |
| K5  | Patch renders at `scale="tile"`, size 54 on wide, 48 on narrow                                      | crews-destination.jsx:416-439           |
| K6  | Chevron is 8×14                                                                                     | crews-destination.jsx:416-439           |
| K7  | Whole row is one focusable link to the crew detail (PR-5 destination), 44px+ target                 | crews-destination.jsx:416-439           |
| K8  | Member cluster uses `MemberDot` / `MemberCluster` from the shared atoms, with overflow count        | crew-shared.jsx                         |
| K9  | Member names come from `nameMembers()` grammar, not ad-hoc joins                                    | crew-shared.jsx                         |
| K10 | Row background/border read `--surface-*` / `--border` tokens only                                   | crews-destination.jsx:416-439           |

## L. `/crews` — loading state

| #   | Requirement                                                                                              | Source                        |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| L1  | Four `CrewRowSkeleton` rows                                                                              | crews-destination.jsx:236-251 |
| L2  | Skeleton geometry matches `CrewRow` exactly (same minHeight, same patch box, same gaps)                  | crews-destination.jsx:236-251 |
| L3  | Loading **never renders a crew name and never renders a patch** — a wrong patch flashes a wrong identity | plan:412; README              |
| L4  | Shimmer via the shared `Shimmer` / `ShimmerKeyframes` primitive                                          | crews-destination.jsx:223-235 |
| L5  | A mono eyebrow announces loading through `aria-live`                                                     | crews-destination.jsx:442-475 |
| L6  | Loading copy is near-silent — no cheerful filler                                                         | plan:412                      |
| L7  | The gated create button is **hidden** while loading                                                      | crews-destination.jsx:442-475 |

## M. `/crews` — empty state

| #   | Requirement                                                                          | Source                                |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| M1  | Uses the **shipped** `EmptyState`, not a bespoke block                               | plan:415                              |
| M2  | Props: `state="no-data"`, `density="dense"`, default `variant="hybrid"`              | plan:415; empty-state.jsx:308-365     |
| M3  | Primary CTA is "Start a crew"                                                        | plan:415; crews-destination.jsx:52-65 |
| M4  | Hybrid rail-right reads `0 / 0` for a no-data state                                  | empty-state.jsx:311                   |
| M5  | Accent token for no-data is `var(--accent)`                                          | empty-state.jsx:310                   |
| M6  | The empty-state CTA must respect the same entitlement gate as the header CTA (see S) | ⚠️ see Open Questions                 |

## N. `/crews` — error state

| #   | Requirement                                              | Source                        |
| --- | -------------------------------------------------------- | ----------------------------- |
| N1  | Uses `EmptyState state="error"` plus a retry affordance  | plan:416                      |
| N2  | Error accent token is `var(--warning)`                   | empty-state.jsx:310           |
| N3  | Hybrid rail-right reads `err`                            | empty-state.jsx:311           |
| N4  | Retry is a real focusable button, not a link-styled span | crews-destination.jsx:255-260 |
| N5  | The gated create button is hidden in the error state     | crews-destination.jsx:442-475 |

## O. Create-crew sheet — shell

| #   | Requirement                                                                                                                               | Source                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| O1  | `CreateCrewSheet` is built on the shipped `CCOverlay` — no second sheet implementation                                                    | plan:418                |
| O2  | `mode="sheet"` on mobile, popover/modal on desktop, **same PR**                                                                           | plan:418                |
| O3  | Desktop chrome width 520 (`ModalChrome width={520}`)                                                                                      | crew-invite.jsx:50-89   |
| O4  | Sheet dialog: `role="dialog"`, `aria-modal="true"`, `aria-label={title}`                                                                  | cc-overlay.jsx:70       |
| O5  | Focus trap active in sheet mode; initial focus lands on the first focusable in the dialog                                                 | cc-overlay.jsx:31-52,58 |
| O6  | Scrim is click-to-dismiss, `tabIndex={-1}`, `aria-hidden="true"`, background `var(--scrim)` with 1.5px blur                               | cc-overlay.jsx:66-69    |
| O7  | Grabber: 38×4, `borderRadius: 99`, `var(--border-strong)`, margin `0 auto 12px`                                                           | cc-overlay.jsx:79       |
| O8  | Header close button is the accessible close, `aria-label="Close"`, 30×30, radius 8                                                        | cc-overlay.jsx:86-90    |
| O9  | Escape closes and returns focus to the trigger                                                                                            | cc-overlay.jsx:159-168  |
| O10 | Sheet chrome: `var(--bg-elevated)`, top border `var(--border-strong)`, radius `18px 18px 0 0`, padding `10px 18px 26px`, `maxHeight: 78%` | cc-overlay.jsx:70-78    |
| O11 | Header title is mono 10px, weight 700, `.14em` tracking, uppercase, `var(--fg-subtle)`                                                    | cc-overlay.jsx:82-85    |

## P. Create-crew sheet — fields and behaviour

| #   | Requirement                                                                                 | Source                          |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| P1  | One text input for the crew name, with a visible label                                      | crew-invite.jsx:50-89           |
| P2  | Live `CrewPatch` preview beside/above the input                                             | plan:419                        |
| P3  | Preview is seeded from a **client-minted uuid** (decision D2), generated before submit      | plan:419                        |
| P4  | "New patch" reroll control mints a **fresh uuid** pre-creation (not a salt bump)            | plan:419                        |
| P5  | Submit is disabled until the name is non-empty (`disabled={!typed}`)                        | plan:419; crew-invite.jsx:50-89 |
| P6  | Helper copy states that renaming the crew does **not** move the artwork                     | plan:420                        |
| P7  | Focus ring uses the handoff's focus-ring token, not a browser default                       | crew-invite.jsx:50-89           |
| P8  | Server-side name validation is `max(40)`                                                    | plan (schema section)           |
| P9  | Submit control is 44px+ tall and reachable by keyboard alone                                | CLAUDE.md a11y baseline         |
| P10 | All create-sheet copy lives in `apps/web/src/components/consumer/crews/definitions/copy.ts` | plan:420                        |

## Q. Premium gate on create — behaviour

| #   | Requirement                                                                               | Source                        |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| Q1  | Client gate uses `useEntitlement('crews')`                                                | plan:420                      |
| Q2  | `visible-active` → tapping opens the create sheet directly                                | plan:420                      |
| Q3  | Anything else → tapping opens the gate, following `EventDetailCtaBlock.tsx:116-131`       | plan:420                      |
| Q4  | `tier-picker-on-tap` → routes to the tier picker                                          | plan:420                      |
| Q5  | Supporter resolves to `visible-active` (2026-08-05 resolution supersedes README §7)       | plan (Supporter decision)     |
| Q6  | Server-side `requireFeature('crews')` guards the **create** route only; join stays free   | plan                          |
| Q7  | Tier name always resolved via `unlockTierFor('crews')` — **never** hardcode a tier string | plan:121-136                  |
| Q8  | Gated create button renders a `★` mono glyph affordance in the list header                | crews-destination.jsx:442-475 |

## R. Premium gate — copy **[PLAN-COPY]** (supersedes crew-copy.jsx:96-105)

| #   | Requirement                                                                                                            | Source              |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- |
| R1  | `title` = `"Starting one is the paid part."`                                                                           | plan:121-136        |
| R2  | `body` = `"Joining one is free, forever. Nobody hits a paywall on your invite link."`                                  | plan:121-136        |
| R3  | `` cta = (tierName) => `Pick ${tierName}` ``                                                                           | plan:121-136        |
| R4  | `` lapsed = (tierName) => `Your crews all still work. Starting another one needs ${tierName} again.` ``                | plan:121-136        |
| R5  | `eyebrow = (tierName) => tierName.toUpperCase()`                                                                       | plan:121-136        |
| R6  | Comparison row = `` `${tierName} · ${priceText}` ``, with `priceText` read from `tier-picker/definitions/constants.ts` | plan:121-136        |
| R7  | Tier names in `crew-copy.jsx` are **illustrative only** and must not be copied                                         | crew-copy.jsx:97-98 |
| R8  | No em-dashes in any new copy string (build-blocking lint)                                                              | CLAUDE.md           |
| R9  | Every `aria-label` is also a copy-file string, not a JSX literal                                                       | CLAUDE.md           |

## S. Cross-cutting: tokens, themes, a11y

| #   | Requirement                                                                                  | Source                        |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------- |
| S1  | Every colour on every new surface reads a `var(--*)` token; zero hex                         | plan:140-161                  |
| S2  | Verified against at least three themes including Light                                       | CLAUDE.md                     |
| S3  | 320px baseline holds for the nav bar, the list rows, and the sheet                           | CLAUDE.md; plan:404           |
| S4  | No native `title=` tooltips anywhere                                                         | CLAUDE.md                     |
| S5  | All interactive elements are real focusable controls (`button` / `a`)                        | CLAUDE.md                     |
| S6  | State changes (loading → ready, submit result) announce via `aria-live`                      | crews-destination.jsx:442-475 |
| S7  | Watching's eye icon is never reused or recoloured for crews                                  | CLAUDE.md; plan:401           |
| S8  | No heart icon is introduced anywhere                                                         | CLAUDE.md                     |
| S9  | Shared atoms (`Btn`, `MonoEyebrow`, `RailHeader`, `SectionRail`) are reused, not re-authored | crew-shared.jsx               |

## T. Tests owned by PR-4

| #   | Requirement                                                          | Source           |
| --- | -------------------------------------------------------------------- | ---------------- |
| T1  | Patch determinism — same `(crewId, patchSalt)` snapshots identically | plan tests table |
| T2  | Patch determinism — `patchSalt + 1` snapshots differently            | plan tests table |
| T3  | Nav — five slots fit at 320px with no truncation                     | plan tests table |
| T4  | Nav — `aria-current` present on the active tab (mobile and desktop)  | plan tests table |

---

## Contradictions between the handoff and the plan

| ID  | Conflict                                                                                                                                                                                                                                                       | Resolution                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | Plan Task 1 tells the builder to "carry" a `cellSize` retune of **hero 16 / tile 40 / micro 64** into `CrewPatch`. `crew-art.jsx` has **no `cellSize`**; README §7(b) attributes those numbers to `identity-art.jsx`'s halftone template, an unrelated system. | CrewPatch's real per-scale knobs are `showWeave` (off at micro), `showStitch` (hero only), and `sw` (1.6 hero / 2.2 otherwise). The `cellSize` instruction is inapplicable. |
| X2  | README §7 dev notes say the entitlement cell is `paywall-on-tap` for Free **and Supporter**, `visible-active` for Premium/Founder/Gifted. The plan's 2026-08-05 resolution sets `supporter: 'visible-active'`.                                                 | Plan wins; the README line is stale.                                                                                                                                        |
| X3  | README R2 §B1 marks nav Option A "viable, not recommended" and Option B "RECOMMENDED". The Aug 4 ruling and plan decision 8 lock **Option A**.                                                                                                                 | Option A. The README recommendation is stale.                                                                                                                               |
| X4  | Handoff components and fixtures use `crew.createdBy` ("Started it", "YOU STARTED IT"). The plan's schema deliberately uses `keeperId` and states creator identity is not a fact the product uses.                                                              | Use `keeperId`; drop creator-attribution copy.                                                                                                                              |

## Where the handoff is silent (PR-4 must decide)

| ID  | Gap                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Y1  | No `maxLength` or character counter is drawn on the create-sheet name input. The plan only sets `max(40)` server-side. Decide whether the client caps input and whether a counter shows.                                            |
| Y2  | The gated create button's `★` mono glyph has no accessible-name treatment anywhere, and the plan never mentions it. It needs a copy-file `aria-label`.                                                                              |
| Y3  | `CrewEmpty` renders its "Start a crew" CTA unconditionally, while the header CTA is gated and hidden during loading/error. The two entry points' gating is unreconciled — the empty-state CTA almost certainly needs the same gate. |
| Y4  | No pending/submitting state on "Make the crew" is drawn anywhere. Decide the in-flight treatment (disabled + label swap vs. spinner) and its `aria-live` announcement.                                                              |
| Y5  | Swipe-to-dismiss for the create sheet is not specified. `CCOverlay` provides scrim click, header ⨯, and Escape only (cc-overlay.jsx:66-90,159-168) — no drag gesture exists.                                                        |
| Y6  | Desktop: whether the create trigger is an anchored popover or a centred modal is stated only as "popover/modal"; `crew-invite.jsx` shows `ModalChrome width={520}`, which implies modal. Confirm.                                   |

---

## Z. Decisions on the contradictions and silences (2026-08-06)

Resolved before PR-4's build, per the "decide it now" intake rule. These are binding for the
build and for the pre-PR verification pass.

| ID  | Question                                                | Decision                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Z1  | Plan's `cellSize` retune (hero 16 / tile 40 / micro 64) | **Dropped.** Those numbers belong to `identity-art.jsx`'s halftone, an unrelated system; `CrewPatch` has no `cellSize`. Scale is expressed by `showWeave`, `showStitch` and `sw` (1.6 / 2.2). Build to `crew-art.jsx`.                                                            |
| Z2  | Supporter treatment                                     | **`visible-active`.** The plan's 2026-08-05 entitlement resolution wins; README §7's `paywall-on-tap` is stale. Matches `packages/entitlements/src/index.ts`.                                                                                                                     |
| Z3  | Nav layout option                                       | **Option A.** Locked by the Aug 4 ruling and plan D8; README R2 §B1 is stale.                                                                                                                                                                                                     |
| Z4  | `createdBy` / "Started it"                              | **Not built.** The schema's concept is `keeperId`; creator identity is not a fact the product surfaces. Drop the "Started it" affordance.                                                                                                                                         |
| Z5  | Name input length                                       | **`maxLength={40}`**, mirroring the API's `nameSchema` (`apps/api/src/routes/crews.ts:51`, `z.string().trim().min(1).max(40)`). No visible counter — the field is short enough that a counter is chrome. Trim before submit so the client and server agree on what "empty" means. |
| Z6  | Accessible name for the gated `★`                       | Required. Add an `aria-label` to the copy file; the glyph is decorative on its own and must not be the button's only accessible content.                                                                                                                                          |
| Z7  | Empty-state "Start a crew" CTA gating                   | **Same gate as the header CTA.** One entry point gated and the other not is the sibling-duplicate class this repo keeps re-shipping. Extract the gated-create affordance into one component and use it in both places rather than gating twice.                                   |
| Z8  | "Make the crew" in-flight state                         | Disabled + label swap, no spinner, matching the repo's existing mutation buttons. The creation is a server round-trip on a server-rendered destination, so the button must not look inert while it waits.                                                                         |
| Z9  | Swipe-to-dismiss on the create sheet                    | **Not built.** Conform to `CCOverlay`: scrim click, header ⨯, Escape. Inventing a gesture no sibling sheet has is a divergence, not a polish.                                                                                                                                     |
| Z10 | Desktop create chrome                                   | **Centred modal, `ModalChrome width={520}`**, matching `crew-invite.jsx`.                                                                                                                                                                                                         |

## Z11–Z13. Divergences accepted at the pre-PR verification pass (2026-08-06)

Gate 4's verify half found these three rows contradicted by the implementation. Each was
judged on the merits rather than forced back to the table; the table is amended here.

| ID  | Row                                   | Divergence and why it stands                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Z11 | J4 — `crews/error.tsx`                | **Not built, deliberately.** `page.tsx` catches the fetch failure and passes `null` down, so `CrewsContent` paints the in-page error state with its own retry — a treatment that keeps the header and nav rather than replacing the route. A thrown render still lands on `(protected)/error.tsx`. A third boundary would only add a worse-looking path to the same outcome.                                           |
| Z12 | M4 — empty-state rail reads `0 / 0`   | **Overridden to `0 crews`.** The default rail counts events, which says nothing on a surface that is not counting events. Implemented as a `railLabel` prop on the shared `EmptyState` so every future non-event surface can do the same, rather than crews forking the component.                                                                                                                                     |
| Z13 | Q4 — `tier-picker-on-tap` on `/crews` | **Coded but unreachable, and kept.** `/crews` sits under `(protected)`, so no logged-out viewer renders the create button, and `logged-out` is the only entitlement cell producing that surface. The branch mirrors `EventDetailCtaBlock`; dropping it would make this the one gated control that handles the surface set incompletely if `/crews` ever goes public. Recorded so it is not re-flagged as a dead state. |
