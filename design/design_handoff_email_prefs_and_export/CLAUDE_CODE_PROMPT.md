# Handoff: Email preferences + Data export (`/me`)

> **Read `README.md` in this folder first** — it carries the decisions log and
> the reasoning behind every placement call. This file is the implementation
> spec.

## Overview

Two controls added to the signed-in account surface `/me`:

1. **A product-email opt-out** — one stored boolean gating the whole `product`
   email family (winback, gifting-ending, welcome-gifted). Defaults ON. Writes
   the same value as the one-click unsubscribe link in email footers, and must
   agree with it in both directions.
2. **A data-export button** — one authenticated request returning a JSON file
   synchronously, rate-limited to 1/hour.

Plus one representation change: **billing email is explained in prose** at the
foot of the email group. It is not a switch, not a disabled switch, and not a
row.

Nothing else on `/me` changes. Section order, the push toggles, the weekly
digest and its scheduling are all untouched.

## About the design files

The files in this bundle are **design references created in HTML/JSX** —
prototypes showing intended look and behaviour, not production code to copy.
The task is to **recreate these designs in the Concert Crawl codebase** using
its existing settings-row components, `ToggleSwitch` primitive, and `var(--*)`
token system.

Concretely: `me-primitives.jsx` here is a *restatement* of the shipped settings
vocabulary so the canvas can render standalone. **Do not port it.** Use the live
`ToggleSwitch`, the live settings-row group, and the live `/me` shells. If a
primitive in this folder disagrees with the live one, the live one wins. The two
files that carry genuinely new work are `email-export.jsx` (the two controls) and
the copy table `EX_COPY` inside it.

## Fidelity

**High-fidelity.** Final colours (as tokens), typography, spacing, copy, and all
states. Recreate pixel-accurately against the live token set.

---

## Screen 1 — `/me` ▸ Notifications

**Purpose:** the user controls what reaches them. Push is per-device; email is
per-account.

**Layout.** Mobile: single-scroll hub section, 18px horizontal page padding
(14px at ≤320). Desktop: 240px left sidebar + right panel, panel content capped
at 620px, padding `34px 40px 48px`. Groups are stacked with a 22px gap; each
group is `rail → card → (optional footnote)` with a 10px internal gap.

**Group order inside the section — this is the load-bearing decision:**

```
1. Push                 master toggle + New show alerts · Watch updates · Price drops
2. Email from us        ← NEW. product-email switch + billing footnote
3. Artists you follow   entitlement-gated. Premium: weekly digest toggle.
                        Free: collapses to a single upgrade card.
```

Group 2 is **outside the push master** (turning push off must not take email
with it) and **above group 3** (a control that free users need most must never
sit beneath an upgrade card — it inherits the paywall framing even when it isn't
gated).

### Component: email group

```
SectionRail
  title  "Email from us"        JetBrains Mono 10px / 700 / 0.14em / uppercase / --fg-subtle
  hr     flex:1, 1px, --border
  (no meta tag)

Card                            --surface-1, 1px solid --border, radius 12, overflow hidden
  Row (a <div>, NOT a button)   display flex, align center, gap 12, padding 14px 14px
    leading  mail glyph 15×15, stroke 1.4, --fg-muted
    label    "News, offers, and the occasional nudge"
             Inter 14.5px / 600 / -0.005em / --fg
    detail   Inter 12.5px / 500 / -0.005em / line-height 1.4 / --fg-muted / text-wrap pretty
             ON  → "Rare. A discount, or a heads-up when a gift is running out."
             OFF → "Off. Nothing from us but billing."
    switch   ToggleSwitch 40×24 (see below)

Footnote                        display flex, gap 8, padding 0 4px — NO card, NO border
  info glyph  13×13 circle + exclamation, stroke 1.3, --fg-subtle, margin-top 3
  text        Inter 11.5px / line-height 1.5 / --fg-subtle / text-wrap pretty
    "Billing email always sends: receipts, a failed charge, a card about to
     expire. Those aren't news, they're your subscription talking, and missing
     one is how people lose a plan without knowing why."
```

### Component: `ToggleSwitch` (existing primitive — do not rebuild)

40×24, `border-radius: 999`, `role="switch"`, `aria-checked`, `aria-label` = row
label. ON: background + border `--signal`, knob 18×18 `--fg-on-accent` at
`left: 18px`. OFF: background `--surface-3`, border `--border-strong`, knob
`--fg-subtle` at `left: 2px`. Transitions: background/border 140ms ease, knob
`left` 140ms `cubic-bezier(.2,.7,.3,1)`.

The switch is a real `<button>` inside a `<div>` row — never nest it in a button.

---

## Screen 2 — `/me` ▸ Account

**Purpose:** account facts, and the way to take your data with you.

**Layout.** Rows group first, then the export group, 22px gap. `Delete account`
is **not here** — Danger zone is the next sidebar page / the next mobile section.

```
Account card    Email address    hugh@concertcrawl.app        chevron
                Password         Last changed in March        chevron
                Member since     May 2026 · invite #004       mono "BETA"

Your data       SectionRail  "Your data" · meta "1 / HOUR"
                DataExportRow
```

### Component: `DataExportRow`

The **whole row is the button** — verbatim anatomy from the shipped
Save-to-calendar row in Concert history.

```
button          width 100%, display flex, align center, gap 14
                padding 14px 16px, radius 12
                background --surface-1  (hover --surface-2, suppressed when disabled)
                border 1px solid --border, color --fg
                transition background 120ms ease, opacity 120ms ease
  tile          36×36, radius 8, background --surface-2, centred glyph
                glyph colour --signal   (--fg-muted while pending)
  label         Inter 14.5px / 700 / -0.005em / --fg   — "Download your data"
  meta          JetBrains Mono 11px / 0.02em / line-height 1.4 / --fg-muted
                rest    → "Everything we store on you, as a file. Takes a second."
                pending → "Putting your file together…"
  chip          JetBrains Mono 9px / 700 / 0.14em / uppercase
                padding 3px 7px, radius 3
                colour --signal, border 1px color-mix(in oklch, var(--signal) 50%, transparent)
                rest "JSON" · pending "WORKING" (chip + border switch to --fg-subtle)
```

**States**

| state | row | beneath the row |
|---|---|---|
| `rest` | pressable, chip `JSON` | — |
| `pending` | spinner replaces the download glyph (11px ring, `rotate 360deg` 800ms linear infinite), chip `WORKING`, meta copy changes, `aria-busy="true"`, `disabled` | — |
| `limited` | `opacity: 0.62`, `disabled`, no hover | warning status line |
| `failed` | back to `rest`, pressable | danger status line |

Refusals render **outside** the row on purpose: the row's label stays "Download
your data" in every state, so the retry affordance never has to double as an
error message.

### Component: `ExportStatusLine`

```
div role="status"      display flex, gap 9, align-items flex-start
                       padding 10px 12px, radius 10
                       background color-mix(in oklch, <tone> 8%, var(--surface-1))
                       border   1px solid color-mix(in oklch, <tone> 34%, var(--border))
  glyph  13×13, colour <tone>, margin-top 1  (clock for warning, triangle for danger)
  rail   JetBrains Mono 9px / 700 / 0.12em / uppercase / <tone>
  text   Inter 12.5px / line-height 1.45 / --fg-muted / text-wrap pretty
```

| tone | rail | text |
|---|---|---|
| `--warning` | `HOLD ON` | `One export an hour. Try again in {wait}.` |
| `--danger` | `DIDN'T WORK` | `Signal lost. The export didn't come through. Give it another go.` |

`{wait}` is a **formatted duration string**: minutes above a minute
(`"43 minutes"`), seconds below it (`"40 seconds"`).

⚠️ **The client formats it, not the server.** Design assumed a pre-formatted
server string; `users-export.ts` in fact returns a `Retry-After` header in
seconds plus a generic sentence, and is not changing. Read `Retry-After`, format
it to the shape above, count down locally, and re-enable the row at zero without
a reload. See `READINESS.md` § B.

---

## Interactions & behaviour

**Product-email switch.** Optimistic flip is fine; on write failure revert the
switch and surface the existing settings-write error treatment (no new pattern
introduced here). The switch is the **read of record** — a user who unsubscribed
via the email link must open `/me` and find it already off, and flipping it back
on must re-enable the family.

**Export button.**

1. Press → `pending` immediately. Not optimistic: hold `pending` until the
   response lands. A fast success just means the state is brief.
2. 200 → browser download fires, row returns to `rest`. **The server sets the
   filename** — never construct or display one.
3. 429 → `limited`. Read the wait from the refusal, render it into the status
   line, keep the row disabled, and re-enable it when the countdown reaches zero
   **without a reload**. Ticking the string down live is preferred; a single
   static value that clears at zero is acceptable.
4. Any other failure → `failed`, row pressable again. Never expose the cause.

**Rate limit is a common state, not an edge case** — it is what a user hits by
pressing the button twice. It must look designed, not like an error.

**Responsive.** Mobile-first from 320px. At ≤320 page padding drops to 14px, the
bottom-nav mono labels drop to 8.5px, and the toggle-row detail line wraps to
three lines — nothing truncates and no row falls under 44px. Desktop panel caps
at 620px.

## State management

```
productEmail : boolean            // one stored field per user, defaults true
exportState  : "rest" | "pending" | "limited" | "failed"
exportWait   : string | null      // server-supplied, only set with "limited"
```

`exportState` is local component state and should reset to `rest` on unmount —
there is no export history, no job queue, and nothing to resume.

## Design tokens

All colour comes from the live token set. **No raw hex and no oklch literals in
screen code**; every mix goes through
`color-mix(in oklch, var(--token) N%, …)`.

Used here: `--bg` `--bg-elevated` `--surface-1` `--surface-2` `--surface-3`
`--fg` `--fg-muted` `--fg-subtle` `--fg-on-accent` `--border` `--border-strong`
`--signal` `--accent` `--warning` `--danger`.

Reference values (from `theme-context.jsx`, for verification only — read them
from the theme at runtime):

| token | electric | jade | light |
|---|---|---|---|
| `--bg` | `#070A1A` | `#06201F` | `#FAFCFF` |
| `--surface-1` | `#11162E` | `#0E3331` | `#F2F5FB` |
| `--surface-2` | `#171D3A` | `#143E3B` | `#E8EDF6` |
| `--surface-3` | `#1F2748` | `#1A4A47` | `#DCE3F0` |
| `--fg` | `#E8F3FF` | `#E6FFF6` | `#070A1A` |
| `--fg-muted` | `#9AA8C7` | `#8FBFB0` | `#4A5374` |
| `--fg-subtle` | `#5A6788` | `#557A6F` | `#8A93B0` |
| `--fg-on-accent` | `#070A1A` | `#06201F` | `#FFFFFF` |
| `--border` | `#1F2748` | `#1A4A47` | `#DCE3F0` |
| `--border-strong` | `#2C3661` | `#2A5C57` | `#B8C2D6` |
| `--signal` | `#7AE6FF` | `#1FFFC2` | `#0080A0` |
| `--warning` | `#FFD27A` | `#FFD27A` | `#B86E00` |
| `--danger` | `#FF7A8A` | `#FF7A8A` | `#C42940` |

`--signal` is the CTA / active colour throughout. `--accent` appears only on the
Premium upgrade card and the wordmark — never on these two controls.

**Type.** Inter (500/600/700/800/900) for UI; JetBrains Mono for rails, chips,
and metadata, always uppercase, letter-spacing 0.08–0.16em.

**Spacing.** Group gap 22 · rail-to-card 10 · row padding `14px 14px` (toggle
rows) / `14px 16px` (action rows) · radius 12 cards, 10 status lines, 8 icon
tiles, 3 mono chips.

## Accessibility

- Switch: real `<button role="switch">` with `aria-checked` and `aria-label` —
  focus and Space/Enter for free. Never a `<span role="switch">`.
- Export row: real `<button>`; `aria-busy` while pending; `disabled` while
  pending or rate-limited.
- Status lines are `role="status"` so a refusal is announced when it appears
  without stealing focus from the button.
- Every row clears 44px minimum height at 320px.

## Assets

None. All glyphs are inline stroked SVG defined in `MeIcon`
(`me-primitives.jsx`): bell, mail, download, clock, alert, star, shield. The
Cluster Path brand mark (`CCMark`) appears only in the shells and is copied
verbatim from `browse-home.jsx` — use the live component.

## Also needs changing (outside these two screens)

**The unsubscribe confirmation page.** It currently tells the user "You can turn
it back on any time from Settings → Notifications" — a place that doesn't exist.
The destination is `/me` ▸ **Notifications** ▸ *Email from us*. Copy and link
both need updating in the same ship.

## Explicitly out of scope

Per-email-type granularity inside the product family (it is one switch) ·
making billing email unsubscribable · changing what the export contains · any
async/emailed-archive export, job queue, or export history · account deletion ·
redesigning the rest of `/me`, the push toggles, or digest scheduling · moving
the weekly digest out of the Artists group.

## Files in this bundle

| File | Role |
|---|---|
| `README.md` | **Decisions log** — why each placement call was made |
| `CLAUDE_CODE_PROMPT.md` | This spec |
| `Email Prefs + Data Export.html` | The canvas — open this. 7 sections, mobile 393 + 320, desktop 1280, all three themes. §0 is interactive. |
| `email-export.jsx` | **The new work.** `EX_COPY` (all copy as data) · `EmailFromUsGroup` · `DataExportRow` · `ExportStatusLine` · in-context `NotificationsSection` / `AccountSection` / `DangerZoneSection` |
| `me-primitives.jsx` | Restatement of shipped settings primitives so the canvas runs standalone. **Reference, don't port.** |
| `me-screens.jsx` | `/me` route compositions for the canvas |
| `theme-context.jsx` · `ios-frame.jsx` · `design-canvas.jsx` | Local copies of project primitives — canvas scaffolding only |
