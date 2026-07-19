# Handoff: Who Else Is Watching (#762)

## Overview
A social-proof surface on the **event-detail Watch zone** that shows *who else in
the crawl is watching a show* — named handles with colored initials, degrading to
an honest count when there are no names to surface. It **replaces the retired
"N watching" count tail** on `WatchShowButton` (Q6). Free tier, signed-in only.

## About the design files
The files in this bundle are **design references created in HTML/React-in-Babel** —
prototypes showing intended look and behavior, **not production code to copy
directly**. The task is to **recreate these designs in the target codebase**
(`apps/web`, React + the existing consumer component system) using its established
patterns: `IdentityArt`/`UserMenu` avatarColor tokens, the `WatchShowButton`
component, theme tokens, and `definitions/copy.ts` for strings. Do not ship the
HTML.

## Fidelity
**High-fidelity.** Final colors (all via tokens), typography, spacing, and
interactions are specified. Recreate pixel-accurately using the codebase's
existing token system and components. Every measurement below is authoritative.

---

## Screens / Views

The surface has ONE home — the event-detail hero, directly under the title, as a
second row beneath the Watch button. Everything else in this bundle (hero image,
genre chips, title, info block, breadcrumb/top bar) is **existing page furniture
shown for context only** — do not re-implement it; it already exists in
`events/[id]/page.tsx`. Only build the **Watch zone** changes.

### Watch zone (the deliverable)
- **Purpose**: let a signed-in user watch the show, and see who else is.
- **Layout**: vertical flex, `gap: 12px`, left-aligned. Three stacked rows:
  1. `WatchShowButton` — **unchanged** (28px outline button). Its **count tail is
     removed** (see Q6 below).
  2. **Alerts hint** (inactive state only): `Watch to get pinged on price drops +
     sold-out.` — Inter 11.5px, `--fg-subtle`, `margin-top: -4px`.
  3. **Watchers surface** (this component).
- Mobile and desktop mount the **identical** watch zone — parity is behavioral;
  only the surrounding column width differs.

### Watchers surface — the four states (brief §4)
Renders an avatar stack + a one-line sentence. Named handles **cap at 3**
(`NAMED_CAP`); the rest roll into a `+N` tail.

| State | When | Renders |
|---|---|---|
| **1 named** | one watcher, has handle | `[A]` + `marisol is watching this one.` |
| **2–3 named** | 2–3 handled, no overflow | `[A][B][C]` + `marisol, dev_ftw & priya are watching.` |
| **Named + N others** | >3 watchers, ≥1 handled | `[A][B][C][+N]` + `marisol, dev_ftw & priya + 11 more in the crawl, watching.` |
| **All others · no names** | every watcher handle-less | `[·][·][·][+N]` + `14 in the crawl are watching this one.` + honesty line `No handles to drop yet — beta's early.` |

**"Named" = the watcher has a handle.** Beta anon users (`handle: null`) can never
be named — they count into `+N`. When *all* watchers are handle-less, the surface
degrades to the count-only state (never a faked name).

### Loading skeleton
The watcher list is fetched **after** hero paint (non-blocking). While in flight:
three shimmer discs (24px, `--surface-2`, `w-shimmer` 1.4s ease-in-out, staggered
0.15s) + a 132×10px skeleton line. The row reserves the same ~28px height so
there is **no layout shift** when real data lands. `role="status"`,
`aria-busy="true"`, plus a visually-hidden `Counting the crawl…`.

### Roster expansion ("see all N")
The `+N` (and any count-only surface >3) is a **real button** (`aria-expanded`)
that expands an inline roster card below the sentence:
- Card: `margin-top: 12px`, `padding: 14px`, `border-radius: 12px`,
  `background: var(--surface-1)`, `border: 1px solid var(--border)`.
- Header: JetBrains Mono 10px/700, `letter-spacing: 0.14em`, uppercase,
  `--fg-subtle`, `margin-bottom: 12px` — text `The crawl on this show`.
- Rows (`gap: 10px`): **named watchers listed individually** — 28px avatar +
  handle (Inter 13.5px/600, `--fg`). **Anon watchers collapse into ONE summary
  row** — neutral 28px disc + `14 other crawlers` (Inter 13.5px/600,
  `--fg-muted`), separated from named rows by a `1px solid var(--border)` top
  border + `padding-top: 10px`. Never list anon watchers individually.

---

## Interactions & behavior
- **Watch button**: unchanged from current `WatchShowButton` — inactive → active
  (`+ Watch this show` → `✓ Watching`); active click reveals inline
  `Stop watching` / `Cancel` confirm. Do not restyle.
- **Handles are plain text, not links** — no profile pages exist in the codebase.
  The only interactive element in the surface is the `see all N` / `show fewer`
  toggle. If profile pages ship later, roster rows are the natural upgrade to
  links.
- **Expander**: toggles the roster open/closed; `aria-expanded` reflects state;
  ≥28px row, ≥44px effective tap target on mobile (row padding).
- **Loading → loaded**: swap skeleton for the surface with no reflow.
- **Zero watchers**: surface renders `null` (Watch button + alerts hint stand
  alone). No "be the first" nudge — deliberately omitted (reads as pressure,
  off-voice).

## State management
- `watchers: Array<{ handle: string | null, avatarColor?: 'signal'|'accent'|'success'|'warning' }>` — fetched async for the event.
- `loading: boolean` — true until the watcher fetch resolves.
- `open: boolean` — roster expansion, local to the surface.
- `active: boolean` — watch state, owned by `WatchShowButton` (existing).
- Derived (pure, no side effects): `buildWatchers()` → `{ named, shown, others,
  total, anonOnly }`; `watchersToParts()` → `{ parts, aria }`. Keep these headless
  so the rendered sentence and the `aria-label` can never drift.

## Q6 — retired count text (important)
The current `WatchShowButton` renders a trailing
`{count} watching · alerts on price + sold out` span. **Remove that span.** Its
two jobs are rehomed:
1. **The count** → replaced by this richer WHO surface (who, not just how many).
2. **The alerts affordance** → the muted hint line under the *inactive* button
   (`Watch to get pinged on price drops + sold-out.`).

## Accessibility (WCAG AA)
- Wrap the surface in `role="group"` with an `aria-label` carrying the **full
  sentence as prose** (not a list) — e.g. `marisol, dev_ftw & priya + 11 more in
  the crawl, watching.` Avatars are **decorative** (`aria-hidden`).
- **Colored initials**: reuse the four `avatarColor` tones. Each token doubles as
  fill and ink; the letter (`var(--tone)`) sits on a `color-mix(in oklch,
  var(--tone) 22%, var(--surface-1))` tint and clears AA in Electric, Jade, and
  Light. Verify if you change tone tokens.
- Anon watchers get a neutral disc (no faked letter a screen reader would
  misread).
- Loading uses `role="status"` + `aria-busy`; no color-only signals; focus ring
  `--focus`.

## Design tokens (all via `var(--*)` — no hardcoded hex)
- **Handles**: `--fg` (700). **Connective** ("& ", " + N more…"): `--fg-muted`.
- **Initials**: `var(--<tone>)` on `color-mix(in oklch, var(--<tone>) 22%,
  var(--surface-1))`; border `color-mix(in oklch, var(--<tone>) 50%, transparent)`.
- **Anon disc**: `--surface-2` fill, `--border-strong` border, inner dot
  `--fg-subtle`.
- **`+N` chip**: `--surface-2` fill, `--border-strong` border, JetBrains Mono
  `--fg-muted`.
- **Avatar separation ring**: `box-shadow: 0 0 0 2px <surface-behind>` (`--bg` on
  the event hero).
- **Sizes**: avatar 24px in-line / 28px in roster; overlap `-30%` of size
  (≈ −7px at 24). Sentence Inter 12.5px/1.4. Honesty line JetBrains Mono 9.5px/600
  `--fg-subtle`.
- **Themes**: Electric (default) · Jade · Light — all three verified.

## Copy (externalize to `apps/web/src/components/consumer/definitions/copy.ts`)
Lift `WATCHERS_COPY` verbatim from `watchers-data.jsx`:
- `one` = `is watching this one.`
- `areWatching` = `are watching.`
- `plusOthers(n)` = `+ ${n} more in the crawl, watching.`
- `countOnly(n)` = `${n} in the crawl are watching this one.`
- `countOnlyHonest` = `No handles to drop yet — beta's early.`
- `watchHint` = `Watch to get pinged on price drops + sold-out.`
- `rosterTitle` = `The crawl on this show`
- `rosterToggle(n)` = `see all ${n}` · `rosterHide` = `show fewer`
- `rosterOthers(n)` = `${n} other crawler(s)`
- `loading` = `Counting the crawl…`

Voice is **Sour Patch** (cheek + honesty rail + warmth). Do not drift to clinical
("N other users are watching this event") or saccharine. Keep "in the crawl".

## Assets
No image assets. `CCMark` (brand mark) is not used inside the surface itself; it's
the canonical mark from `browse-home.jsx` if you need the lockup elsewhere.
Avatars are CSS/SVG only.

## Files in this bundle
- `Who Else Is Watching.html` — the design reference (open in a browser; drive
  states from the Tweaks panel: state · loading · roster · watch-state · theme).
- `watchers-surface.jsx` — **the components to port**: `WatchersSurface`,
  `AvatarStack`, `WAvatar`, `WatchersSkeleton`, `WatchersRoster`, `WatchZone`,
  and `WatchShowButtonCC` (the count-tail-removed reference).
- `watchers-data.jsx` — the headless model (`buildWatchers`, `watchersToParts`,
  `joinNames`), `WATCHERS_COPY`, avatar tone helpers, fixtures.
- `watchers-context.jsx` — event-detail framing for context only (do not port;
  the real page already has this).
- `theme-context.jsx` · `ios-frame.jsx` · `design-canvas.jsx` · `tweaks-panel.jsx`
  — prototype infra (not for production).
- `README.md` — the design rationale + gap report (decisions, cap rationale,
  a11y, open questions).

## Existing surfaces to align with (target codebase)
- `IdentityArt.tsx` / `UserMenu` — the `avatarColor` + initials pattern to reuse.
- `WatchShowButton.tsx` — the button whose count tail this surface replaces.
- `events/[id]/page.tsx` — hero zone: EventImage → GenreChips → EventTitleBlock →
  **WatchShowButton** (mount the watchers surface here).
