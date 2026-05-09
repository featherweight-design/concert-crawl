# Handoff: Concert Crawl — Watching (Saved Shows Hub)

## Overview

The **Watching** surface is Concert Crawl's saved-shows hub: a chronological list of upcoming shows the user has tapped "Watch" on, with live face-price tracking against the price observed at save-time. The product job is "tell me when something I'm tracking moves" — drops are surfaced visually (success color), spikes are tonally muted (we don't paint the screen red), and sold-out / presale / stale states each have a defined row treatment.

This bundle covers the **mobile and desktop hubs**, the **row anatomy**, and the **states + status mixes** the surface must handle.

## About the Design Files

The files in this bundle are **design references created in HTML/JSX** — interactive prototypes showing intended look and behavior. They are **not production code to lift directly**. The task is to **recreate these designs in the target codebase's existing environment** (whatever framework, design system, and component library the app already uses). If no such environment exists yet, pick the most appropriate framework for the project and implement there.

The HTML scaffolding (theme provider, mobile/desktop shells, identity-art generator, design canvas, tweaks panel) is presentational glue for the prototype — your codebase will already have its own equivalents. **What you should lift from this bundle:** the design tokens, the row anatomy, the layout structure, the state matrix, the interaction behaviors, the copy.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, density rules, and interaction states. Tokens are exact hex values. Recreate pixel-perfectly using the codebase's existing component primitives.

## Files in This Bundle

| File | What it is |
|---|---|
| `Saved & Watching.html` | Top-level harness — design canvas + tweaks panel. Reference only; not a screen. |
| `watching-screens.jsx` | The actual surface components: `WatchingRoute` (mobile), `WatchingRouteDesktop`, `WatchingItem`, `DeltaTag`, `SourcePill`, `NotifyFutureRow`, `WatchingEmpty`, header, group sections. **Primary reference.** |
| `watching-data.jsx` | Sample data + helpers (`w_classifyDelta`, `w_doorIn`, `w_groupForDate`, `w_relTime`, etc). The helpers describe the data-shape contract. |
| `theme-context.jsx` | Token definitions for the three themes (electric / jade / light) and a `<ThemeProvider>` that emits CSS custom properties. |
| `identity-art.jsx` | Procedural artwork generator used as placeholder thumbnails per artist. **Not for production** — your app should use real artist art. Keep the 56×56 cozy / 40×40 compact / 64×64 roomy slot with `border-radius: 8px`. |
| `design-canvas.jsx`, `tweaks-panel.jsx`, `ios-frame.jsx` | Prototype-only chrome. Ignore for implementation. |

---

## Screen 1: Mobile Hub

**Component:** `WatchingRoute` in `watching-screens.jsx`.

### Layout (top → bottom)

1. **Header** (`WatchingHeader`) — fixed, `flex-shrink: 0`. Contains:
   - Eyebrow label `WATCHING` (mono, 10px, 700 weight, `letter-spacing: 0.14em`, uppercase, color `--fg-subtle`).
   - Big count line: `{n} shows` — Inter, 36px, 900 weight, `letter-spacing: -0.025em`, color `--fg`.
   - Change-summary subline (mono, 12px, 600): `3 dropped · 1 went up · 1 sold out`. `dropped > 0` → color `--success`; otherwise `--fg-muted`. If everything is steady, render `prices held`.
   - Bottom border: `1px solid --border`.
2. **Scroll region** — `flex: 1`, `overflow-y: auto`, padding `12px 16px 100px` (the 100px bottom keeps the last row clear of the bottom tab bar).
3. **Section list** (`GroupedBody`) — vertical stack of date groups; `gap: 10px` between rows within a group, header above each group.

### Date grouping

Always grouped by date. Buckets in this order, only rendered if non-empty:

| Key | Label | Rule |
|---|---|---|
| `tonight` | `Tonight` | `daysUntil === 0` |
| `thisWeek` | `This week` | `1 ≤ daysUntil < 7` |
| `nextWeek` | `Next week` | `7 ≤ daysUntil < 14` |
| `<Month>` | Full month name (`May`, `June`, …) | `daysUntil ≥ 14`. One bucket per month. |

**The `Tonight` group header renders in `--accent` color** (the others use `--fg-subtle`). This is the only temporal emphasis — there is no per-row "Tonight" chip. We deprecated the chip after consolidating on a single source of truth for the temporal claim.

### Section header

```
TONIGHT  · 2          (mono, 10px, 700, uppercase, 0.14em letter-spacing)
                      (subtitle is muted — color --fg-subtle, weight 500)
```

Padding `10px 4px 4px`, baseline-aligned, gap `8px` between title and `· {count}` subtitle.

---

## Screen 2: Desktop Hub

**Component:** `WatchingRouteDesktop` in `watching-screens.jsx`.

Mirrors the **TopNav pattern from Browse** — no separate sidebar.

### Layout

1. **TopNav** (`WatchingTopNav`) — 64px tall, `flex-shrink: 0`, padding `0 32px`, `bg: --bg-elevated`, bottom border `1px solid --border`.
   - Left: `<CCMark>` logo (28px) + wordmark `concertcrawl.` (Inter, 17px, 800, `-0.02em`). The `crawl.` is colored `--accent`.
   - Tabs (gap 4px): `Browse`, `Search`, `Watching`. Active tab has `bg: --surface-2`, weight 700, color `--fg`. Inactive: weight 500, color `--fg-muted`.
   - Right: 36px circular avatar with initials (bg `--surface-2`, border `--border`).
2. **Main column** — `max-width: 880px`, centered, padding `32px 32px 80px`. The cap exists so 1440-wide monitors don't get a 1200-px-wide row.
3. **Headline block** — same eyebrow + big-count + change-summary as mobile, with `padding-bottom: 18px` and `border-bottom: 1px solid --border`. Big number is 36px, count and summary baseline-aligned.
4. **Section list** — same `GroupedBody` as mobile. Outer wrapper is `display: flex; flex-direction: column; gap: 12px`.

---

## Row Anatomy (`WatchingItem`)

Three densities. Sizing table (in px unless noted):

| Density | Art | padY | padL | padR | Gap | Title | Meta | Price |
|---|---|---|---|---|---|---|---|---|
| **compact** | 40 | 10 | 14 | 38 | 12 | 13 | 11 | 14 |
| **cozy** *(default)* | 56 | 14 | 14 | 44 | 14 | 14.5 | 11.5 | 16 |
| **roomy** | 64 | 18 | 18 | 48 | 16 | 16 | 12 | 18 |

`padR` is intentionally generous on every density so the absolute-positioned remove-X never sits on text.

### Container

```css
display: grid;
grid-template-columns: {art}px 1fr auto;
gap: {gap}px;
align-items: center;
padding: {padY}px {padR}px {padY}px {padL}px;
background: var(--surface-1);
border: 1px solid var(--border);
border-radius: 12px;
opacity: ifSoldOut ? 0.78 : 1;
position: relative;
font-family: Inter, system-ui;
```

### Three columns

**1. Identity art (left)** — square, `border-radius: 8px`, `overflow: hidden`. Sized per density.

**2. Title block (middle, `min-width: 0`)** — column with `gap: density === "roomy" ? 4 : 2`:
- **Artist name**: weight 700, size from sizes table, `letter-spacing: -0.01em`, color `--fg`. `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — long names give way first.
- **Venue · date · time**: JetBrains Mono, sized from `meta`, color `--fg-muted`, `letter-spacing: 0.02em`, ellipsis-truncated. Format: `"{venue} · {dateLabel} · {showTime}"`.
- **(roomy only) saved meta**: JetBrains Mono, 10.5px, color `--fg-subtle`. Format: `"saved 6d ago · at $62"` with a `·` separator at 0.4 opacity.

**3. Price column (right, `flex-shrink: 0`)** — column, `align-items: flex-end`, `gap: 4`:

Stack from top to bottom:
- **Status pill OR current price** — see "Status treatments" below.
- **`<DeltaTag>`** (saved → current). Arrow icon + amount. Color `--success` for drops, `--fg-muted` for spikes (intentionally not red). Title attribute: `"Down/Up from $62 when you saved"`. If delta < $2, render the word `flat` in `--fg-subtle`.
- **`<SourcePill>`** if `priceSource === "resale" | "community"`. 1px outline, mono 9.5px, 700 weight, uppercase, `letter-spacing: 0.10em`. Resale = `--warning`. Community = `--signal`. **Always full word** — never a 1-letter fallback.
- **Stale dot** if `observedAt > 24h ago` — small `--warning` indicator with `"as of …"` tooltip.

### Remove-X

Absolutely positioned in the top-right corner of the row, inside `padR`. Small × icon (12px), color `--fg-subtle`, hover `--fg`, hit area at least 32×32.

---

## Status Treatments

Single source of truth: `w_classifyDelta(savedPrice, currentPrice)` in `watching-data.jsx`.

| Status | Trigger | Price column treatment |
|---|---|---|
| `fresh` | `\|d\| < 2` | Current price normal; delta tag reads `flat` in `--fg-subtle`. |
| `drop` | `current < saved` (≥ $2) | Current price normal; delta tag with ↓ icon, color `--success`. |
| `spike` | `current > saved` (≥ $2) | Current price normal; delta tag with ↑ icon, color `--fg-muted`. |
| `soldout` | `status === "soldout"` | Replace price with `SOLD OUT` pill: mono 10px, 700, `--warning` color/border, bg `color-mix(in oklch, --warning 14%, transparent)`, `padding: 3px 8px`, `letter-spacing: 0.14em`, uppercase. Row `opacity: 0.78`. |
| `presale` | `status === "presale"` | Em-dash for price; `presale` label in `--fg-subtle` mono. |
| `stale` | `observedAt > 24h` | Add small `--warning` dot next to the price; tooltip `"as of {relativeTime}"`. |
| `noprice` | `savedPrice == null \|\| currentPrice == null` | Em-dash, no delta tag. |

### `<DeltaTag>` formatter

`w_formatDelta(saved, current)`:
- `|d| < 1` → `"flat"`
- otherwise `(d > 0 ? "+$" : "−$") + abs(round(d))` (note: U+2212 minus, not hyphen)

---

## Empty State (`WatchingEmpty`)

When `shows.length === 0`. Centered single-column block:
- Bookmark glyph (dashed border box, 64px, color `--fg-subtle`).
- Headline: `Crickets.` — Inter, 26px, 900.
- Body: 1–2 lines explaining the surface, Inter 13.5px, `--fg-muted`.
- CTA button to `Browse tonight's shows` — `--signal` bg, `--fg-on-accent` text.

---

## Notify-Future Row (`NotifyFutureRow`)

Optional teaser at the bottom of the list (controlled by `showNotifyTeaser`). Greyed-out row stub with bell icon, title `"Price drop alerts"`, and subline `"Coming soon."`. Visually muted — `--surface-2` bg, color `--fg-subtle`, "SOON" badge. **Not interactive.** Remove this when alerts ship.

---

## Themes & Tokens

Three themes, defined in `theme-context.jsx`. All UI references CSS custom properties — switching theme is a token swap, no per-component branching.

### Token contract (every theme defines all of these)

| Token | Purpose |
|---|---|
| `--bg`, `--bg-elevated` | App and surface bg |
| `--surface-1`, `--surface-2`, `--surface-3` | Card / row / nested surface bgs |
| `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-on-accent` | Text scale (contrast → low) |
| `--border`, `--border-strong`, `--border-focus` | Borders |
| `--signal`, `--signal-muted` | Brand cyan-equivalent (links, focus) |
| `--accent`, `--accent-muted` | Brand pink-equivalent (CTAs, "Tonight") |
| `--success`, `--warning`, `--danger` | Semantic |
| `--focus` | Focus ring |
| `--overlay-hover`, `--overlay-press` | Interaction overlays |
| `--scrim`, `--image-tint` | Modal scrim, image overlay |

### Electric (default, dark)
```
bg #070A1A · bg-elevated #0E1226 · surface-1 #11162E · surface-2 #171D3A · surface-3 #1F2748
fg #E8F3FF · fg-muted #9AA8C7 · fg-subtle #5A6788 · fg-on-accent #070A1A
border #1F2748 · border-strong #2C3661 · border-focus #7AE6FF
signal #7AE6FF · accent #FF7BD4
success #7BFFB0 · warning #FFD27A · danger #FF7A8A
```

### Jade (dark)
```
bg #06201F · bg-elevated #0A2A28 · surface-1 #0E3331 · surface-2 #143E3B · surface-3 #1A4A47
fg #E6FFF6 · fg-muted #8FBFB0 · fg-subtle #557A6F · fg-on-accent #06201F
signal #1FFFC2 · accent #9B5CFF
success #1FFFC2 · warning #FFD27A · danger #FF7A8A
```

### Light
```
bg #FAFCFF · bg-elevated #FFFFFF · surface-1 #F2F5FB · surface-2 #E8EDF6 · surface-3 #DCE3F0
fg #070A1A · fg-muted #4A5374 · fg-subtle #8A93B0 · fg-on-accent #FFFFFF
signal #0080A0 · accent #E0297A
success #1F8A4F · warning #B86E00 · danger #C42940
```

Full token map in `theme-context.jsx`.

---

## Typography

| Use | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Headline count | Inter | 36 | 900 | -0.025em |
| Artist name (cozy) | Inter | 14.5 | 700 | -0.01em |
| Artist name (compact) | Inter | 13 | 700 | -0.01em |
| Artist name (roomy) | Inter | 16 | 700 | -0.01em |
| Wordmark | Inter | 17 | 800 | -0.02em |
| Tab labels | Inter | 13 | 500/700 | -0.01em |
| Section header (eyebrow) | JetBrains Mono | 10 | 700 | 0.14em, UPPERCASE |
| Venue/date meta | JetBrains Mono | 11–12 | 500 | 0.02em |
| Saved-meta line | JetBrains Mono | 10.5 | 500 | 0.02em |
| Price (cozy) | JetBrains Mono | 16 | 700 | 0.01em |
| Delta tag | JetBrains Mono | 11–12 | 700 | 0.01em |
| Source pill | JetBrains Mono | 9.5 | 700 | 0.10em, UPPERCASE |
| Status pill (SOLD OUT) | JetBrains Mono | 10 | 700 | 0.14em, UPPERCASE |
| Change-summary subline | JetBrains Mono | 12 | 600 | 0.02em |

Two families. **Inter** for everything human (artist names, headlines, tabs). **JetBrains Mono** for everything data (prices, dates, deltas, eyebrows, status pills) — the visual rule is "if it's a fact, it's monospaced."

---

## Spacing & Radii

- Row vertical spacing inside a section: `gap: 10px`.
- Section vertical spacing: `gap: 8px` between header and rows; sections sit naturally in scroll.
- Row corner radius: **12px**.
- Identity-art radius: **8px**.
- Status / source pills: **2–4px** (small, deliberately less rounded than rows).
- Section eyebrow padding: `10px 4px 4px` (asymmetric — more on top to breathe).
- Mobile content padding: `12px 16px 100px` (bottom = bottom tab clearance).
- Desktop content padding: `32px 32px 80px`, `max-width: 880px`.

---

## Interactions & Behavior

- **Tap row** → navigate to Event Detail. (Not implemented in this prototype; wire to your existing detail route.)
- **Tap remove-X** → optimistic remove from list. The prototype does this with local state (`setList(prev => prev.filter(s => s.id !== id))`); production should fire a `DELETE /watching/{id}` and surface an undo toast.
- **Hover row (desktop)** → background tint via `--overlay-hover`.
- **Tonight group header** is rendered in `--accent` (no other temporal emphasis at the row level).
- **Sort order**: ascending by `dateISO` (soonest first). Past shows are filtered out client-side here, but should be filtered server-side in production.
- **No animations** beyond simple hover transitions (~120ms on bg/color). The surface should feel fast and quiet, not bouncy.

---

## State Management

Minimum viable state for this surface:

| State | Source |
|---|---|
| `shows: WatchingShow[]` | Fetch from `GET /watching` (your endpoint). |
| `density: "compact" \| "cozy" \| "roomy"` | User preference, persist to localStorage or user settings. |
| `theme: "electric" \| "jade" \| "light"` | App-level theme preference (already exists if your app has theming). |

`WatchingShow` shape (extends your existing `Show` type):

```ts
type WatchingShow = Show & {
  savedAt: string;        // ISO — when the user tapped Watch
  savedPrice: number;     // face price observed at save-time
  currentPrice: number;   // current face price (from your pricing pipeline)
  sourceKind?: "resale" | "community" | "primary";
  status: "live" | "soldout" | "presale";
  observedAt?: string;    // ISO — last time pricing was refreshed
};
```

The `priceTrail: number[]` history exists in the prototype data but is **not** rendered on the row anymore — it lives on Event Detail (sparkline / chart). Don't surface it here.

---

## State Matrix the Implementation Must Cover

The design canvas in `Saved & Watching.html` enumerates these — verify your implementation handles each:

1. **Empty** (0 shows) — empty state component.
2. **Light** (≤3 shows) — single Tonight group, no trailing groups.
3. **Power user** (8+ shows) — multiple month buckets render.
4. **All drops** — every row green delta. Header summary `"5 dropped"` in `--success`.
5. **All spikes** — muted deltas, summary in `--fg-muted`.
6. **Sold-out mix** — at least one row dimmed with `SOLD OUT` pill.
7. **Stale + presale** — warning dots and em-dash prices coexist in same list.
8. **Long artist names** — ellipsis truncates artist line first; price column never collapses.
9. **All three themes** — tokens hold across electric / jade / light.

---

## Assets

- **Fonts**: Inter (variable), JetBrains Mono. Load via your existing font pipeline. The prototype assumes them present in CSS.
- **Identity art**: the procedural art in `identity-art.jsx` is a **placeholder** for the real artist artwork your app should serve. The slot is `art × art` square, `border-radius: 8px`, `overflow: hidden`.
- **Icons**: tiny inline SVGs (`IconBookmark`, `IconBell`, `IconX`, `IconArrowDown`, `IconArrowUp`, `IconClock`) defined inline in `watching-screens.jsx`. Replace with your icon system; keep sizes (10–16px).
- **CC logo / wordmark**: prototype renders these via `<CCMark>`. Use your existing brand component.

---

## Decisions Made During Design (For Your Reference)

- **No Digest layout.** An earlier iteration had a "Digest" variant that surfaced price-moved shows above steady ones. We deprecated it — the change-summary in the header (`3 dropped · 1 went up · 1 sold out`) plus the per-row delta-tag color carry the "what changed" signal without losing chronology, which a price-watcher still needs ("the drop is great, but is it next week or in two months?"). One layout, one pattern.
- **No per-row "Tonight" chip.** The `Tonight` group header in `--accent` carries it. Suppressing the chip avoids double-encoding.
- **Spikes are muted, not red.** We don't paint the screen red when prices go up — it's noise, not an error. Drops get the visual privilege (`--success`); spikes are tonally muted (`--fg-muted`).
- **Resale / Community pills always render the full word.** No 1-letter fallback. Consistency across densities matters more than a few px of horizontal space.
- **The artist name truncates first.** Price column is `flex-shrink: 0`. The full artist name lives on Event Detail.
- **Right padding is generous on every density** so the absolute-positioned remove-X never overlaps text.

---

## Open Questions for Engineering

1. **Pricing refresh cadence** — how often does `currentPrice` update? The `stale` treatment kicks in at 24h; if your pipeline is slower than that, half the list will look stale.
2. **Optimistic remove + undo toast** — design didn't spec the toast yet. Recommend reusing your existing toast component.
3. **Push notifications** — the `NotifyFutureRow` is a placeholder; remove it when alerts ship.
4. **Server-side sort + filter** — the prototype filters past shows client-side. In production, `GET /watching` should return only future shows, sorted ascending by `dateISO`.
