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

---

# PR-5 — Crew home, roster, destructive flows

Scope: `/crews/[crewId]` route shell, hero, tabs, Coming up, Been there, Who's in,
crew-of-one waiting room, invite sheet, reroll sheet, and the five-kind confirm dialog.
Source precedence is unchanged from PR-4: **plan > handoff jsx/README > `crew-copy.jsx`
(key names only)**. Rows carrying copy the plan's copy-review verdict supersedes are marked
**[PLAN-COPY]**. Citations are `plan:N`, `README:N`, `file.jsx:N`, or a built path.

Legend is unchanged: every row is one assertion a verifier can answer yes/no on without
reading anything else.

## AA. `/crews/[crewId]` route shell

| #    | Requirement                                                                                                                                            | Source                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| AA1  | Route exists at `apps/web/src/app/(protected)/crews/[crewId]/page.tsx`                                                                                 | plan PR-5 Task 1                                           |
| AA2  | A sibling `loading.tsx` exists in the same directory                                                                                                   | plan PR-5 Task 1                                           |
| AA3  | A sibling `error.tsx` exists in the same directory                                                                                                     | plan PR-5 Task 1                                           |
| AA4  | Page data comes from `GET /v1/crews/:crewId`, typed as `CrewDetail` from `@repo/types` with no `as` cast                                               | packages/types/src/crew.ts                                 |
| AA5  | A 404 from that endpoint renders Next's `notFound()`, not the in-page error state                                                                      | plan global constraints                                    |
| AA6  | The loading state renders **no crew name and no patch** — only shimmer geometry                                                                        | plan global constraints ("never render a name or a patch") |
| AA7  | Loading hero shimmer is a `Shimmer` block sized 92 wide (>=768px) / 72 (<768px) with `borderRadius: 22`                                                | crews-destination.jsx:489-495                              |
| AA8  | Loading renders two text shimmers at 62% and 38% width below the patch shimmer                                                                         | crews-destination.jsx:496-499                              |
| AA9  | Loading renders three button-shaped shimmers in the action row                                                                                         | crews-destination.jsx:500-503                              |
| AA10 | Loading renders exactly three 70px-tall `CrewRowSkeleton`-style row shimmers under the hero                                                            | crews-destination.jsx:505-509                              |
| AA11 | The loading eyebrow is in an `aria-live="polite"` region and reads `CREWS_COPY.net.loadingCrew`                                                        | crews-destination.jsx:504; crew-copy.jsx:230               |
| AA12 | The error branch renders the shared error object with eyebrow `CONNECTION`, title `net.errCrewTitle`, body `net.errCrewBody`, and a `net.retry` action | crews-destination.jsx:255-260, 511                         |
| AA13 | Retry re-fetches the crew in place; it does not do a full page reload                                                                                  | crews-destination.jsx:257                                  |
| AA14 | `ShimmerKeyframes` is injected once per page, not once per skeleton row                                                                                | crews-destination.jsx:223-235                              |

## AB. Crew hero

| #    | Requirement                                                                                                             | Source                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| AB1  | Hero renders `<CrewPatch patchSalt={crew.patchSalt} size={wide ? 92 : 72} scale="hero" />`                              | crews-destination.jsx:266      |
| AB2  | The patch carries `aria-label` = `a11y.patch(crew.name)` from the crews copy file                                       | crew-copy.jsx:205              |
| AB3  | The crew name is an `<h1>`, Inter weight 900, 34px at >=768px / 25px below                                              | crews-destination.jsx:274-279  |
| AB4  | `<h1>` uses `letterSpacing: -0.035em`, `lineHeight: 1.05`, `textWrap: 'balance'`                                        | crews-destination.jsx:276-278  |
| AB5  | The meta line is mono 9.5px and reads `list.memberCount(crew.memberCount)`                                              | crews-destination.jsx:281      |
| AB6  | Meta segments are separated by a 3px round dot in `--border-strong`, not a text bullet                                  | crews-destination.jsx:282      |
| AB7  | When `crew.muted` is true, a `MUTED` chip renders in `--warning` in the meta line; when false it is absent from the DOM | crews-destination.jsx:283-286  |
| AB8  | Hero action row primary button reads `detail.seeLens` and carries a 13px lens svg                                       | crews-destination.jsx:288-290  |
| AB9  | Hero action row ghost button reads `detail.invite` and opens the invite sheet                                           | crews-destination.jsx:291      |
| AB10 | The 3-dot options control is a real `<button type="button">` with a visually-hidden accessible name from the copy file  | crews-destination.jsx:292-297  |
| AB11 | Every hero control has a >=44px hit target                                                                              | plan global constraints (a11y) |
| AB12 | No hex literal appears in the hero; every colour is a `var(--token)` or a `color-mix()` over one                        | plan global constraints        |

## AC. Tabs

| #    | Requirement                                                                                                                                                         | Source                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| AC1  | The tab strip is `role="tablist"` with `aria-label={detail.tabsLabel}`                                                                                              | crews-destination.jsx:143                   |
| AC2  | Three tabs render in order: Coming up, Been there, Who's in                                                                                                         | crews-destination.jsx:519-523               |
| AC3  | Tab labels come from `detail.upcomingTitle`, `detail.pastTitle`, `detail.rosterTitle`                                                                               | crew-copy.jsx:35,38,41                      |
| AC4  | Each tab is `role="tab"` with `id`, `aria-controls` pointing at the panel id, and `aria-selected`                                                                   | crews-destination.jsx:158-162               |
| AC5  | Roving tabIndex: the selected tab is `tabIndex={0}`, the others `tabIndex={-1}`                                                                                     | crews-destination.jsx:163                   |
| AC6  | ← / → move selection with wraparound; Home selects the first tab, End the last                                                                                      | crews-destination.jsx:145-155               |
| AC7  | Each tab shows a count: upcoming shows, past nights, member count                                                                                                   | crews-destination.jsx:519-523               |
| AC8  | The count is mono weight 700 at 10px, `letterSpacing: .04em`                                                                                                        | crews-destination.jsx:186-190               |
| AC9  | Count colour is `--signal` on the active tab and `--fg-subtle` on inactive tabs                                                                                     | crews-destination.jsx:188                   |
| AC10 | The tab `<button>` is >=44px tall; the visible pill inside is 34px tall with `borderRadius: 8`                                                                      | crews-destination.jsx:165-172               |
| AC11 | Active pill is `--surface-2` with a `--border-strong` border; inactive is transparent with `--border`                                                               | crews-destination.jsx:173-175               |
| AC12 | Label weight is 700 in both states (weight does not change on selection)                                                                                            | crews-destination.jsx:180-184               |
| AC13 | The strip is horizontally scrollable with `scrollbarWidth: 'none'` and no visible scrollbar                                                                         | crews-destination.jsx:143                   |
| AC14 | Each panel is `role="tabpanel"`, `tabIndex={0}`, with `aria-labelledby` naming its tab                                                                              | crews-destination.jsx:530-534               |
| AC15 | Lead order: Coming up opens when it has content; otherwise Been there opens when it has content; otherwise the roster, which is the one tab a quiet crew can act on | crews-destination.jsx:516; plan PR-5 Task 1 |
| AC16 | Only the selected panel's content is in the DOM (inactive panels are not rendered hidden)                                                                           | crews-destination.jsx:530-534               |

## AD. Coming up

| #    | Requirement                                                                                         | Source                        |
| ---- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| AD1  | Shows are grouped by date, in ascending date order                                                  | crews-destination.jsx:310-318 |
| AD2  | Each date group has a mono 9.5px uppercase label                                                    | crews-destination.jsx:322-325 |
| AD3  | Each date label is followed by a 1px `--border` rule filling the remaining width                    | crews-destination.jsx:326     |
| AD4  | Rows use the shipped `EventRow` with `surface="crew"`, `density="cozy"`, and `carded`               | crews-destination.jsx:330     |
| AD5  | At >=768px the rows lay out in a 2-column `minmax(0, 1fr)` grid; below, a single column             | crews-destination.jsx:328     |
| AD6  | Each row shows who is going via `MemberCluster` sourced from `CrewShow.going`                       | packages/types/src/crew.ts    |
| AD7  | When `going.length` exceeds the cluster max, the overflow chip count equals `goingCount - rendered` | crew-shared.jsx:175-205       |
| AD8  | Empty state title is `empty.noUpcomingTitle` ("Nobody's committed.")                                | plan PR-5 Task 2              |
| AD9  | Empty state uses the shared `EmptyState` with `variant`/`state` hybrid, not a bespoke block         | crews-destination.jsx:52-65   |
| AD10 | A show appears here when at least one member is going (>=1), never at 0                             | plan tense rule               |

## AE. Been there (past) and StubRow

| #    | Requirement                                                                                            | Source                           |
| ---- | ------------------------------------------------------------------------------------------------------ | -------------------------------- |
| AE1  | Nights are grouped by year, most recent first                                                          | crews-destination.jsx:340-350    |
| AE2  | The panel header shows `detail.pastStat(n)` in `--signal`                                              | crews-destination.jsx:356-360    |
| AE3  | Each night renders as a ticket stub, not an `EventRow`                                                 | README §2 item 6                 |
| AE4  | Stub grid is `62px 1fr auto` at >=768px and `54px 1fr auto` below                                      | crews-destination.jsx:78         |
| AE5  | Stub column gap is 16px wide / 12px narrow                                                             | crews-destination.jsx:79         |
| AE6  | Stub background is `--surface-1` with a 1px `--border` and `borderRadius: 10`                          | crews-destination.jsx:80-82      |
| AE7  | The stub end block is `--surface-2` with `borderRight: '1.5px dashed var(--border-strong)'`            | crews-destination.jsx:86-88      |
| AE8  | Stub end shows a mono 9px uppercase month above a `CS_UI` weight-900 day at 19px wide / 17px narrow    | crews-destination.jsx:89-93      |
| AE9  | Artist title is 15px wide / 14px narrow, weight 700, single-line ellipsised                            | crews-destination.jsx:96-99      |
| AE10 | Venue line is mono 10.5px in `--fg-muted`                                                              | crews-destination.jsx:100-102    |
| AE11 | Attendee cluster is `MemberCluster` with `size={wide ? 26 : 23}` and `max={wide ? 5 : 3}`              | crews-destination.jsx:104        |
| AE12 | At >=768px only, a mono 9.5px line reads `detail.together(others)` when you attended, else `${n} went` | crews-destination.jsx:105-107    |
| AE13 | A night appears only when at least **two** members attended                                            | plan tense rule; README §2       |
| AE14 | Empty state title is `empty.noPastTitle` and the body states the two-person minimum                    | plan PR-5 Task 2 **[PLAN-COPY]** |

## AF. Who's in (roster)

| #    | Requirement                                                                                                                                            | Source                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| AF1  | The roster header shows `{memberCount} / 12 SPOTS` in mono uppercase                                                                                   | crews-destination.jsx:377-383                            |
| AF2  | That header switches to `--warning` when the crew is at 12                                                                                             | crews-destination.jsx:380                                |
| AF3  | A ghost `detail.invite` button sits in the roster header                                                                                               | crews-destination.jsx:384                                |
| AF4  | Member rows are >=48px tall with an 11px gap                                                                                                           | crews-destination.jsx:392-394                            |
| AF5  | Each row after the first has a 1px `--border` top rule; the first has none                                                                             | crews-destination.jsx:395                                |
| AF6  | Avatar is `MemberDot size={32}` from the shipped `crews/MemberCluster.tsx`, not a new component                                                        | apps/web/src/components/consumer/crews/MemberCluster.tsx |
| AF7  | A member with a handle renders it at Inter 700 14px                                                                                                    | crews-destination.jsx:399-401                            |
| AF8  | `isYou` appends ` · You` using `roster.you`, it does not replace the handle                                                                            | crews-destination.jsx:401                                |
| AF9  | A member with no handle renders `roster.noHandle` at Inter 600 14px in `--fg-subtle`                                                                   | crews-destination.jsx:399-401                            |
| AF10 | A no-handle member's `MemberDot` is the letterless dashed dot — no initial is invented                                                                 | crew-shared.jsx:156-174; #762 rule                       |
| AF11 | A no-handle member's dot carries `aria-label` = `a11y.memberNoHandle`                                                                                  | crew-copy.jsx:209                                        |
| AF12 | A no-handle member is still counted in `memberCount` and in the tab count                                                                              | README §2; #762 rule                                     |
| AF13 | The secondary line is mono 9px and reads `roster.joined(rel)` derived from `CrewMember.joinedAt`, never a hardcoded month                              | packages/types/src/crew.ts                               |
| AF14 | The keeper's row shows a keeper badge driven by `CrewMember.isKeeper`                                                                                  | plan PR-5 Task 3                                         |
| AF15 | A Remove control renders only when the viewer is the keeper **and** the row is not the viewer                                                          | crews-destination.jsx:405-410                            |
| AF16 | A Leave control renders on the viewer's own row, keeper included: a keeper's leave is answered with 409 and becomes the handoff or last-member confirm | crews-destination.jsx:405-410                            |
| AF17 | Remove calls `DELETE /v1/crews/:crewId/members/:memberId`                                                                                              | apps/api/src/routes/crews.ts                             |
| AF18 | Leave calls `POST /v1/crews/:crewId/leave`                                                                                                             | apps/api/src/routes/crews.ts                             |
| AF19 | Roster ordering is stable across renders (keeper first, then `joinedAt` ascending)                                                                     | plan PR-5 Task 3                                         |

## AG. At-cap notice

| #   | Requirement                                                                                                        | Source                        |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| AG1 | At 12 members a `CrewNotice` renders **above** the roster grid                                                     | plan PR-5 Task 3              |
| AG2 | The at-cap block is **not** an `EmptyState` — the roster is full, not empty                                        | README §3; plan PR-5 Task 3   |
| AG3 | Notice padding is `16px 16px 15px` with `borderRadius: 12` and a 7px internal gap                                  | crews-destination.jsx:206-210 |
| AG4 | Notice background is `--surface-1`; border is `1px solid color-mix(in oklch, var(--warning) 28%, var(--border))`   | crews-destination.jsx:211     |
| AG5 | A 6px round dot in `--warning` precedes the mono 9.5px `.14em` eyebrow                                             | crews-destination.jsx:213-215 |
| AG6 | Notice title is Inter 800 17px with `letterSpacing: -0.02em`                                                       | crews-destination.jsx:217     |
| AG7 | Notice body is Inter 13px `--fg-muted`, `lineHeight: 1.45`, `maxWidth: 380`                                        | crews-destination.jsx:218     |
| AG8 | While at cap, the roster Invite control is disabled or absent — the invite sheet is not reachable from a full crew | plan PR-5 Task 5              |
| AG9 | Title and body come from `empty.atCapTitle` / `empty.atCapBody`                                                    | crew-copy.jsx:154-155         |

## AH. Crew of one (waiting room)

| #   | Requirement                                                                            | Source                |
| --- | -------------------------------------------------------------------------------------- | --------------------- |
| AH1 | When `memberCount === 1`, an inline notice renders **above** the tab strip             | README §2 item 4      |
| AH2 | The hero remains fully rendered in this state                                          | plan PR-5 Task 4      |
| AH3 | Both content tabs remain present and selectable in this state                          | plan PR-5 Task 4      |
| AH4 | The notice is a waiting-room block, **not** an `EmptyState`                            | README §2 item 4      |
| AH5 | The notice carries an invite CTA that opens the invite sheet                           | plan PR-5 Task 4      |
| AH6 | Copy is `empty.crewOfOneTitle` / `empty.crewOfOneBody`                                 | crew-copy.jsx:146-147 |
| AH7 | The notice disappears the moment `memberCount` reaches 2, with no page reload required | plan PR-5 Task 4      |

## AI. Invite sheet

| #    | Requirement                                                                                                      | Source                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| AI1  | The sheet renders a crew card with `CrewPatch size={48} scale="tile"` using the crew's `patchSalt`               | crew-invite.jsx:146                                         |
| AI2  | The crew name in that card is Inter 800 15px                                                                     | crew-invite.jsx:148                                         |
| AI3  | Spots-left line is mono 9.5px and reads `invite.seatsLeft(left)`                                                 | crew-invite.jsx:150-153                                     |
| AI4  | Spots-left switches to `--warning` when 2 or fewer spots remain                                                  | crew-invite.jsx:151                                         |
| AI5  | The link box is >=48px tall, padding `0 6px 0 13px`, `borderRadius: 10`                                          | crew-invite.jsx:126-129                                     |
| AI6  | The link text is monospace 11.5px and ellipsises rather than wrapping                                            | crew-invite.jsx:133-135                                     |
| AI7  | The link box border is `--border-strong` normally and `--signal` for the copied state                            | crew-invite.jsx:130                                         |
| AI8  | The link URL is built from the invite token returned by `POST /v1/crews/:crewId/invites`, never a hardcoded host | apps/api/src/routes/crew-invites.ts                         |
| AI9  | Copy uses `navigator.clipboard.writeText` with **no `await` before the call** in the click handler               | plan global constraints; #72 lesson                         |
| AI10 | After a successful copy the button label becomes `invite.copied` and reverts after a timeout                     | crew-copy.jsx:110                                           |
| AI11 | The copy result is announced in an `aria-live` region                                                            | plan global constraints (a11y)                              |
| AI12 | The expiry line reads `invite.expiry(days)` with `days` derived from the invite's `expiresAt`, not a literal 7   | packages/types/src/crew.ts                                  |
| AI13 | `invite.expiryHelp` renders beneath the expiry line                                                              | crew-invite.jsx:172                                         |
| AI14 | A danger-tone `invite.revoke` control renders while a live link exists                                           | crew-invite.jsx:174                                         |
| AI15 | Revoke calls `POST /v1/crews/:crewId/invites/:inviteId/revoke`                                                   | apps/api/src/routes/crew-invites.ts                         |
| AI16 | After revoke, the link renders with `line-through` and `opacity: 0.5` and the copy control is disabled           | crew-invite.jsx:134-136                                     |
| AI17 | The revoked branch shows `invite.revoked` plus a primary `invite.newLink` button                                 | crew-invite.jsx:177-180                                     |
| AI18 | Only one live invite exists per crew at a time; a new link supersedes the previous one                           | plan PR-3 Task 1                                            |
| AI19 | At 12 members the sheet renders a `CrewNotice` and no link controls                                              | crew-invite.jsx:155-158                                     |
| AI20 | Desktop chrome is `ModalShell` with `desktopWidth={540}`                                                         | crew-invite.jsx:184; Z10 precedent                          |
| AI21 | Mobile chrome is the shared sheet overlay: scrim click, header ⨯, Escape; no swipe gesture                       | Z9                                                          |
| AI22 | The sheet title reads `invite.title` and is wired via `ariaLabelledBy` on `ModalShell`                           | apps/web/src/components/consumer/modal-shell/ModalShell.tsx |

## AJ. Reroll sheet

| #    | Requirement                                                                                              | Source                       |
| ---- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| AJ1  | The sheet shows the current patch and a candidate patch side by side                                     | crew-invite.jsx:191-227      |
| AJ2  | Both patches render at `size={76} scale="hero"`                                                          | crew-invite.jsx:200,205      |
| AJ3  | The current patch renders at `opacity: 0.45` under a `NOW` label                                         | crew-invite.jsx:200-202      |
| AJ4  | The candidate renders at full opacity under a `NEW` label in `--signal`                                  | crew-invite.jsx:205-207      |
| AJ5  | An arrow svg sits between the two                                                                        | crew-invite.jsx:203          |
| AJ6  | The candidate salt comes from `nextPatchSalt(crewId, currentSalt)`, the shipped shared helper            | Section G                    |
| AJ7  | A ghost shuffle control cycles to a new candidate without applying it                                    | crew-invite.jsx:215          |
| AJ8  | The shuffle control carries `aria-label` = `a11y.reroll`                                                 | crew-copy.jsx:206            |
| AJ9  | Applying is explicit: `roster.newPatchCta` primary; `roster.newPatchKeep` ghost dismisses with no change | crew-invite.jsx:219-222      |
| AJ10 | Apply calls `POST /v1/crews/:crewId/patch/reroll`; shuffling alone issues no request                     | apps/api/src/routes/crews.ts |
| AJ11 | The reroll entry point is visible only to the keeper                                                     | README §2 item 11            |
| AJ12 | `roster.newPatchBody` states the change applies to the whole crew                                        | crew-copy.jsx:66             |
| AJ13 | Desktop chrome is `ModalShell` with `desktopWidth={480}`                                                 | crew-invite.jsx:226          |
| AJ14 | Renaming the crew does not change the patch (rename and reroll are independent)                          | create.nameHelp; README §2   |

## AK. LeaveConfirm — five kinds

| #    | Requirement                                                                                                   | Source                         |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| AK1  | One component covers all five kinds; there are not five separate dialogs                                      | plan PR-5 Task 6               |
| AK2  | The kind union is exactly `leave` / `remove` / `delete` / `handoff` / `last` (plan spelling, not `del`)       | plan PR-5 Task 6               |
| AK3  | `leave` renders `confirm.leaveTitle(crew)`, `confirm.leaveBody`, danger `confirm.leaveCta`                    | crew-copy.jsx:183-185          |
| AK4  | `remove` renders `confirm.removeTitle(handle)`, `confirm.removeBody`, danger `confirm.removeCta`              | crew-copy.jsx:186-188          |
| AK5  | `delete` renders `confirm.deleteTitle(crew)`, `confirm.deleteBody`, danger `confirm.deleteCta`                | crew-copy.jsx:189-191          |
| AK6  | `handoff` is entered only after a `crew_handoff_required` 409 from the leave call                             | apps/api/src/lib/crews.ts      |
| AK7  | `last` is entered only after a `crew_last_member` 409 from the leave call                                     | apps/api/src/lib/crews.ts      |
| AK8  | Kind is derived from the typed 409 `code`, never from a message-string match                                  | plan global constraints        |
| AK9  | `handoff` renders a selectable list of other members with `MemberDot size={30}`                               | crew-invite.jsx:366-375        |
| AK10 | The handoff list is a real single-select control (radio semantics), keyboard-operable                         | plan global constraints (a11y) |
| AK11 | Confirming a handoff calls `POST /v1/crews/:crewId/handoff` with the chosen member id, then retries the leave | apps/api/src/routes/crews.ts   |
| AK12 | The handoff confirm is disabled until a member is selected                                                    | plan PR-5 Task 6               |
| AK13 | `last` renders a crew card with `CrewPatch size={44} scale="tile"`                                            | crew-invite.jsx:381-386        |
| AK14 | `last` names deletion as the only outcome: danger `confirm.lastOneCta` ("Delete crew")                        | README §2 item 11              |
| AK15 | `last` offers `confirm.lastOneAlt` ("Invite someone instead") as the secondary, which opens the invite sheet  | crew-copy.jsx:199              |
| AK16 | `last` states that the viewer's own nights survive in Concerts                                                | crew-copy.jsx:197              |
| AK17 | Every kind's dismissive action reads `confirm.never`                                                          | crew-copy.jsx:200              |
| AK18 | Destructive primaries use the danger tone; the dismissive control is ghost                                    | crew-invite.jsx:388-393        |
| AK19 | Desktop chrome is `ModalShell` with `desktopWidth={480}`, `role="alertdialog"`                                | crew-invite.jsx:394; a11y      |
| AK20 | On confirm, the dialog shows an in-flight disabled state (label swap, no spinner)                             | Z8 precedent                   |
| AK21 | A successful delete or leave navigates back to `/crews`                                                       | plan PR-5 Task 6               |
| AK22 | A failed confirm keeps the dialog open and surfaces the error inside it                                       | plan global constraints        |

## AL. Cross-cutting: tokens, copy, a11y

| #    | Requirement                                                                                                                                            | Source                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| AL1  | Every customer-facing string on these surfaces lives in `crews/definitions/copy.ts`, including every `aria-label`                                      | plan global constraints                                     |
| AL2  | No em-dash appears in any string added by PR-5                                                                                                         | plan global constraints                                     |
| AL3  | `git diff origin/main -- apps/web/src \| grep -n '^+.*[Hh]eart'` returns nothing                                                                       | plan global constraints                                     |
| AL4  | The word "Watching" is not reused to mean people; a crew is people, Watching is shows                                                                  | CLAUDE.md locked vocabulary                                 |
| AL5  | No banned synonym ("group", "squad", "circle", "friends list") appears in PR-5 copy                                                                    | crew-copy.jsx:18-20                                         |
| AL6  | PR-5 adds no new patch, member-dot, modal, or empty-state component — it consumes `CrewPatch`, `MemberCluster`/`MemberDot`, `ModalShell`, `EmptyState` | plan global constraints                                     |
| AL7  | All nine themes render these surfaces with no hardcoded colour                                                                                         | plan global constraints                                     |
| AL8  | Mobile and desktop parity is delivered in this PR, not deferred                                                                                        | plan global constraints                                     |
| AL9  | No native `title=` attribute is used as a tooltip anywhere on these surfaces                                                                           | repo a11y convention                                        |
| AL10 | No `as` cast appears in PR-5 source                                                                                                                    | plan global constraints                                     |
| AL11 | PR-5 adds **no** `releases.ts` entry and **no** `progress.md` row (both land on PR-7)                                                                  | plan global constraints                                     |
| AL12 | Opening any sheet or dialog traps Tab and closes on Escape via `ModalShell`                                                                            | apps/web/src/components/consumer/modal-shell/ModalShell.tsx |
| AL13 | Closing a sheet or dialog restores focus to the control that opened it                                                                                 | a11y baseline                                               |
| AL14 | Every interactive target on these surfaces is >=44px                                                                                                   | plan global constraints                                     |

## AM. Tests owned by PR-5

| #   | Requirement                                                                                           | Source                  |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| AM1 | Lead-order test: content in Coming up opens Coming up; empty Coming up with nights opens Been there   | plan PR-5 Task 1        |
| AM2 | Tabs keyboard test: ←/→ wrap, Home/End jump, `aria-selected` follows                                  | plan PR-5 Task 1        |
| AM3 | Roster test: a no-handle member renders the dashed dot and no invented name, and is still counted     | plan PR-5 Task 3        |
| AM4 | At-cap test: 12 members renders `CrewNotice`, not `EmptyState`                                        | plan PR-5 Task 3        |
| AM5 | Crew-of-one test: notice renders above the tabs and the hero is still present                         | plan PR-5 Task 4        |
| AM6 | 409 mapping test: each of `crew_handoff_required` / `crew_last_member` selects the right confirm kind | plan PR-5 Task 6        |
| AM7 | Reroll test: shuffling issues no network call; apply issues exactly one                               | plan PR-5 Task 6        |
| AM8 | Loading test: the loading branch renders neither the crew name nor a `CrewPatch`                      | plan global constraints |

---

## PR-5 rows to resolve — plan vs handoff copy conflicts

Copy is not design-locked. These are recorded, not decided, per the standing rule that a
duplicate is reported rather than silently resolved.

| ID  | Conflict                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR1 | `crew-copy.jsx:151` `noPastBody` is a three-sentence paragraph; the plan's PR-5 Task 2 gives "No history yet. Two of you, minimum." Plan wins.                               |
| CR2 | `crew-copy.jsx:117` `seatsLeft` interpolates a hardcoded `${12}` instead of the shared `cap` constant. The cap must come from one source.                                    |
| CR3 | `crew-invite.jsx:356` uses kind key `del`; the plan's Task 6 names it `delete`. The plan's five-kind union wins.                                                             |
| CR4 | `crew-copy.jsx:53` `roster.creator` reads "Started it" — creator attribution the schema does not carry. X4/Z4 already ruled this out; the keeper badge needs its own string. |
| CR5 | `crew-copy.jsx:112` `expiryHelp` and `:134` `expiredBody` both hardcode "7 days" in prose while `expiry(days)` is parameterised. One source.                                 |

## PR-5 — wrong or unbuildable in the handoff

Named, not fixed.

| ID  | Finding                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | `crews-destination.jsx:264,278` and `:403` read `crew.createdBy` and render "Started it". The schema has `keeperId` only. Already ruled by X4/Z4; the crew-home artboard still carries it.                                                |
| W2  | `crews-destination.jsx:292-297` draws a 3-dot "Crew options" control with no menu behind it. Mute, rename, reroll and delete all need a home; the handoff never draws that menu's contents.                                               |
| W3  | `crews-destination.jsx:284-290` puts "See it in Browse" in the hero, but the Browse crew lens ships in PR-6. The control has no destination in PR-5.                                                                                      |
| W4  | `crews-destination.jsx:386` gives the roster-full `CrewNotice` a "Start a crew" CTA that bypasses the PR-4 entitlement gate. Per Z7 it must route through the one gated-create component.                                                 |
| W5  | `crews-destination.jsx:403` hardcodes `joined("in June")`. `CrewMember.joinedAt` is an ISO string and needs a real relative formatter.                                                                                                    |
| W6  | `crews-destination.jsx:526` draws crew-of-one as `CrewEmpty`, contradicting README §2 item 4 ("a waiting room, not an empty state") and the plan's Task 4.                                                                                |
| W7  | `crew-invite.jsx:69,146,200,205` pass a `salt` prop; the shipped `CrewPatch` takes `patchSalt`. `:200` also passes an unsupported `style` prop.                                                                                           |
| W8  | `crew-invite.jsx:163` hardcodes the invite URL host and `:172` calls `expiry(7)` with a literal, so the sheet cannot reflect a real token or a real `expiresAt`.                                                                          |
| W9  | `crew-invite.jsx:215` ships a bare "Shuffle again" JSX literal (with siblings elsewhere in the file). `react/jsx-no-literals` is build-blocking here.                                                                                     |
| W10 | `crew-invite.jsx:366-375` draws the handoff picker as decorative 19px circles with no radio group, no selected state, and no `newKeeperId` wiring. The `POST /handoff` body has nowhere to come from.                                     |
| W11 | `README §7` still says the entitlement cell is `paywall-on-tap` for Supporter. Stale; superseded by Z2.                                                                                                                                   |
| W12 | The at-cap Invite affordance is drawn in both the roster header (`crews-destination.jsx:384`) and the invite sheet (`crew-invite.jsx:155-158`) with different at-cap behaviour — one disables, one shows a notice. Only one can be right. |

### PR-5 rulings on W1–W12 and CR1–CR5

Decided before the build so none of these is re-litigated in review. Each is either a
handoff defect we do not copy, or a conflict where a higher authority already settled it.

| ID      | Ruling                                                                                                                                                                                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1      | No "Started it" line and no `createdBy`. The schema has `keeperId`; the hero shows the keeper label off `isKeeper`, which is the only creator-ish fact that survives a handoff.                                                                                                        |
| W2      | Build the overflow menu for real. An affordance that opens nothing is the defect class this gate exists to catch, and PR-5's destructive actions need a home. It opens a `ModalShell` action sheet whose rows are filtered by keeper-ness: Invite, New patch, Leave crew, Delete crew. |
| W3      | Drop "See it in Browse" from PR-5. The lens it points at lands in PR-6, and a link to nothing is worse than no link. It returns with the surface it needs.                                                                                                                             |
| W4      | No create affordance at cap. Creating is gated at `POST /v1/crews` and has nothing to do with a full roster; the at-cap treatment is a notice, never a CTA.                                                                                                                            |
| W5      | Joined date is formatted from `joinedAt`. No literal month survives into the build.                                                                                                                                                                                                    |
| W6      | Crew of one is an inline notice with the hero and both tabs still rendered, per plan Task 4. The plan outranks the artboard: the crew exists, so an empty state would lie about that.                                                                                                  |
| W7      | Use `CrewPatch`'s shipped props as PR-4 merged them (`crewId`, `patchSalt`, `size`). The handoff's `salt` and freeform `style` predate the component.                                                                                                                                  |
| W8      | Invite URL is built from the request origin and the real token; the expiry line is formatted from the API's `expiresAt`. Nothing about a link is a literal.                                                                                                                            |
| W9      | All strings live in `crews/definitions/copy.ts`. `react/jsx-no-literals` is build-blocking, so this resolves itself.                                                                                                                                                                   |
| W10     | The handoff picker is a real radio group that produces `newKeeperId`. Decorative circles cannot satisfy the endpoint.                                                                                                                                                                  |
| W11     | README §7 is stale; Z2 stands (Supporter is `visible-active` for `crews`).                                                                                                                                                                                                             |
| W12     | One behaviour: at cap the Invite affordance stays reachable and the sheet carries the at-cap notice. Disabling it hides the explanation behind the thing it is explaining.                                                                                                             |
| CR1–CR5 | The plan's copy-review verdict table wins over `crew-copy.jsx` wherever they differ, per the same rule PR-4 followed. The cap is read from the shared constant, never re-typed as `12`.                                                                                                |
