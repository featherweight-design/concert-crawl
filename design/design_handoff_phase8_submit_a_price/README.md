# Handoff: Submit a Price (Phase 8)

## Overview

This bundle covers the **Submit a Price + Verify** flow for Concert Crawl — the mechanism by which fans contribute real ticket prices they saw, and the community confirms or disputes them. The deliverable is one mobile-first dedicated route for submission, a community-price strip on the event detail page, a bottom-sheet verify path, and a dedicated dispute page.

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, not production code to ship. The task is to **recreate these designs in Concert Crawl's existing app environment** (whatever React / Next / Expo / SwiftUI stack the team is using) using its established components, tokens, and patterns. Treat the JSX in this bundle as a precise visual + behavioral spec, not as files to drop in.

## Fidelity

**High-fidelity.** Final colors, typography scale, spacing, copy, validation rules, and state transitions are all locked. Recreate pixel-perfectly using the codebase's existing primitives.

## Files in this bundle

| File | Role |
|---|---|
| `Submit a Price.html` | Top-level design canvas — open in a browser to see all artboards |
| `submit-price-screens.jsx` | **The spec.** All Phase 8 components, validation, sample data, exports |
| `theme-context.jsx` | Design tokens (colors, surfaces, borders) — three themes: electric (default), jade, light |
| `landing-screens.jsx` | Provides `BetaPill`, `CCWordmark`, `CCClusterMark` reused in the route header |
| `design-canvas.jsx` | Canvas/artboard scaffolding — **not part of the product**, only used to lay out artboards |
| `tweaks-panel.jsx` | Tweak controls — **not part of the product**, only used in the design canvas |

The two non-product files (`design-canvas.jsx`, `tweaks-panel.jsx`) are included so the HTML opens, but you should not port them.

## Screens / Views

There are five things to build:

### 1. Submit Route (mobile + desktop)

Dedicated full-screen page. Reached from the event detail page's "Submit a price you saw" CTA.

**Layout (mobile, 393 × 852):**
- Header: 16px top / 20px sides / 12px bottom. `← Back` link (left, JetBrains Mono 11/700, uppercase, 0.10em tracking, `--fg-muted`), CC cluster mark + wordmark (right, 20px / 14px). Spacer right side to balance back button.
- Body: scrollable, `12px 20px 16px` padding.
- Inside body, a `SubmitForm` (see below).

**Layout (desktop, 1180 × 760):**
- Window chrome, header with logo left and "← Back to {artist}" right.
- Body: centered `max-width: 520px` column, `padding: 32px 32px 40px`.
- Same `SubmitForm` content.

### 2. SubmitForm (the core form, used inside the route)

Vertical stack, gap 18px (14px in dense mode):

1. **DetailContextHeader** — small label "Submit a price" (mono 10/700, 0.14em, uppercase, `--fg-subtle`), then artist name (Inter 22/900, -0.02em, balanced text-wrap, `--fg`), then `{venue} · {date}` (Inter 13/500, `--fg-muted`). Bottom: 16px padding-bottom + 1px border-bottom `--border`.

2. **Anti-abuse banner** — `--surface-1` background, 1px `--border`, 10px radius, 10/12 padding. Shield icon (18×18 box, 4px radius, `--surface-3` bg, `--signal` icon), then copy: "Prices are capped at **$2000**. Submissions stay *pending* until 2 fans confirm." (Inter 12.5, `--fg-muted`).

3. **Floor + Ceiling row** — two `SPNumberField` side by side, gap 12px. Both use `inputMode="numeric"`, strip non-digits on input, prefix `$` (mono 14/700, `--fg-muted`), input is Inter 16/700, `--fg`, -0.01em tracking. Field: `--surface-1` bg, 1px `--border-strong`, 10px radius. Floor is required (red asterisk), placeholder "35", hint "cheapest you saw". Ceiling is optional, placeholder "optional", hint "if known". Border switches to `--danger` on error, `--warning` on warning.

4. **Tier chip group** — label "Tier", chips: GA, Reserved, VIP, Pit, Lawn. Chip: 8/14 padding, 999 radius, Inter 13.5/600, -0.005em tracking. Inactive: `--surface-1` bg, 1px `--border-strong`, `--fg`. Active: `rgba(122,230,255,0.08)` bg, 1.5px `--signal` border, `--signal` text.

5. **Where it's listed chip group** — label "Where it's listed", chips: AXS, Ticketmaster, SeatGeek, DICE, Eventbrite, Venue box office.

6. **How'd you find out chip group** — label "How'd you find out?", chips: Bought it myself, Saw the listing, At the venue.

7. **Submit primary button** — full-width, 50px height, 10px radius, `--signal` bg, `--fg-on-accent` text, Inter 15.5/800, glow shadow `0 12px 32px -12px var(--signal)`. Label: "Submit price". When `phase === "submitting"` → "Submitting…", disabled, no shadow, `--surface-2` bg, `--fg-subtle` text.

8. **Footer hint** — "Anonymous to other fans. Goes out as *pending* until 2 confirm. We rate-limit at 1 per show per 24h." (Inter 12, line-height 1.45, `--fg-muted`).

### 3. CommunityPriceChip (on event detail page, "Ticket info" section)

Vertical stack inside `--surface-1` card (1px `--border`, 12px radius, 14/14 padding, gap 10):

- **Pill row:** `community` pill (mono 10/700 uppercase, `rgba(255,123,212,0.10)` bg, 1px `--accent` border, `--accent` text), then either `ConfirmedPill` (count of confirms, with checkmark, success colors) or `PendingPill` (warning colors).
- **Price line:** `${floor}` (Inter 28/900, -0.02em), optionally `– ${ceiling}` (Inter 18/700, `--fg-muted`), then tier label (mono 11/700 uppercase, 0.06em tracking, `--fg-subtle`).
- **Vendor line:** "seen on {vendor}" (mono 11, 0.04em, `--fg-muted`).
- **Attribution line:** Inter 12.5, `--fg-muted`. If `attribution === "anonymous"` (default): "Submitted by {N} fan{s} · most recent {time} ago". If `"handle"`: "Submitted by @{handle} · {time} ago".
- **Action row:** 1px dashed `--border` top, padding-top 12. "Saw the same" quick-confirm button (8/12 padding, 8 radius, `--surface-2` bg, 1px `--border-strong`, `--success` text, with checkmark icon). Far right (margin-left auto): "{N} reports →" link (mono 11/700, 0.10em, uppercase, `--fg-muted`). The reports link is the entry to the Verify Sheet.

### 4. Verify Sheet (bottom sheet on detail)

Triggered by tapping "{N} reports →". Pinned to bottom, scrim above, 20px top radius, `--bg-elevated` bg, 1px `--border-strong` top border, `10/18/22` padding, max-height 82%. Grabber bar 44×4 `--border-strong`, 12px below.

Content:
1. `DetailContextHeader` (dense)
2. Lead copy: "Confirm what you saw, dispute what looks off. Two confirms move a price out of *pending*." (Inter 13, 1.5 line-height, `--fg-muted`)
3. Scrollable `SubmissionList` (see below)
4. "Close" secondary button

### 5. SubmissionList — items inside the verify sheet

Each submission is a card: 12/14 padding, 10 radius, gap 8. `--surface-1` bg + 1px `--border` for peer submissions; `rgba(255,123,212,0.04)` bg + 1px `--accent` for the user's own.

Per card:
- Pill row: ConfirmedPill or PendingPill, plus a `you` pill if it's the user's, plus the timestamp right-aligned (mono 11, 0.04em, `--fg-subtle`).
- Price line: same structure as community chip but smaller (20/900 floor, 14/700 ceiling, 11 tier).
- Vendor + source line: "{vendor} · {source}" (mono 11, 0.04em, `--fg-muted`). If `attribution === "handle"` and not own, append " · @anon{N}".
- **Actions** (only on peer submissions, never on your own): two buttons side by side.
  - **Confirm** — 7/11 padding, 8 radius, `--surface-2` bg, 1px `--border-strong`, `--success` text + checkmark, "Confirm".
  - **Dispute** — same shape, transparent bg, `--fg-muted` text. Tapping it navigates to the dedicated dispute page (do NOT inline-expand).

### 6. Dispute Page (dedicated route)

Reached from a peer submission's Dispute button in the verify sheet.

Header: 14/18 top padding, 12 bottom, 1px `--border` bottom border. Three slots:
- "← Cancel" left (mono 11/700, 0.10em, uppercase, `--fg-muted`).
- "Dispute price" centered (Inter 14/800).
- 60px spacer right.

Body: `16/18/22` padding, gap 16, scrollable.

1. `DetailContextHeader` (the show being disputed).
2. **"You're disputing" card** — `--surface-1` bg, 1px `--border`, 12 radius, 12/14 padding. Tiny label (mono 9/700, 0.14em, uppercase, `--fg-subtle`) "You're disputing", then `${floor}–${ceiling}` (Inter 22/900, `--fg`) + " · {tier}" (Inter 13/600, `--fg-muted`), then "{source} · {vendor} · {time} ago" (Inter 12.5, `--fg-muted`).
3. **Why disputes need an alternate** — `rgba(255,107,107,0.06)` bg, 1px `rgba(255,107,107,0.30)` border, 10 radius, 10/12 padding. Copy: "A dispute needs an alternate price + vendor. If you saw something different, log it — that's how we find the truth." (Inter 12.5, line-height 1.5, `--fg-muted`).
4. **DisputeForm** (see below).

### 7. DisputeForm

Container: 8 top margin, `--bg-elevated` bg, 1px `--danger` border, 10 radius, 12/12 padding, vertical stack gap 10.

- Title: "What did *you* see instead?" (Inter 12.5/700, `--fg`).
- Sub: "Disputes have to come with a price and a vendor. Keeps it honest." (Inter 11.5, line-height 1.45, `--fg-muted`).
- Floor + Ceiling row (two SPNumberField, gap 8). Floor required.
- Vendor chip group, label "Where you saw it", same vendor option list.
- Action row, gap 8: "Cancel" small secondary (left), then "File dispute" small (flex: 1) with `--danger` bg, white text, 36 height, 8 radius, Inter 13/700.

Validation: both floor and vendor required. Errors on first submit attempt. Submitting → "Submitting…" + opacity 0.6 → success state replaces form: 10/12 card with `rgba(123,255,176,0.06)` bg, 1px `--success` border, copy "Logged. Your alternate price will show up alongside this one."

## Validation & Anti-Abuse Rules

Codified in `SP_POLICY` in `submit-price-screens.jsx`. Server enforces canonically; client mirrors for UX.

| Rule | Value | Behavior |
|---|---|---|
| `floorMin` | 1 | "Has to be at least $1." |
| `floorMax` | 2000 | "Cap is $2000 — pick a number that exists." |
| `ceilingMax` | 2000 | "Cap is $2000." |
| Ceiling < floor | — | "Ceiling can't be below floor." |
| Tier required | — | "Pick a tier." |
| Vendor required | — | "Pick where it's listed." |
| Source required | — | "Pick how you found out." |
| Outlier low | floor < 0.4 × avg of peers | Soft warning (yellow), not error: "Other fans reported around ${avg}. Sure about this one?" |
| Outlier high | floor > 2.5 × avg of peers | Same warning. |
| `confirmsRequired` | 2 | Pending → confirmed once 2 peers confirm. |
| `rateLimitHours` | 24 | One submission per show per user per 24h. |

**No freeform inputs.** Tier, source, and vendor are all preset chips. There is no "Other…" option anywhere — this is a deliberate anti-abuse decision.

## States — Submit Route

The form has five `phase` states, all reachable in the design via `initialState` prop:

1. **`empty`** — fresh form, no errors, all fields editable.
2. **`error`** — user attempted submit with invalid data; field-level errors shown in red below each invalid field, borders red.
3. **`submitting`** — primary CTA shows "Submitting…", all inputs disabled (opacity 0.5). Simulated 700ms in mock; real impl uses actual request promise.
4. **`success`** — form replaced with success card: `rgba(123,255,176,0.06)` bg, 1px `--success` border, 12 radius, 18/16 padding. Green checkmark dot (22×22), "Got it. Thanks." (Inter 15/800), then body copy: "Your price is in. It'll show up tagged **pending** until 2 other fans corroborate it. We'll let you know if anyone confirms or disputes." Done secondary button.
5. **`alreadySubmitted`** — user has an existing pending submission for this show. Show their submission inside a `--surface-1` card with PendingPill + "You submitted this {time} ago", the price line, vendor + source mono line, then Edit (secondary) + Withdraw (danger) buttons. Hint below: "You can submit one price per show every 24h."

## Interactions & Behavior

- **Number fields** strip non-digits on input (`replace(/[^0-9]/g, "")`).
- **Chip groups** are single-select. Tapping the active chip does *not* deselect (avoid empty-state ambiguity); tapping a different chip switches.
- **Primary CTA** validates synchronously; if errors exist, transitions phase to `error` (does not call API). When valid, transitions to `submitting`, calls API, then `success` on resolve.
- **Verify sheet** opens via the `{N} reports →` link on the community chip. Closes via Close button or scrim tap.
- **Confirm action** (in submission list) is one tap, optimistic UI — show success feedback inline, no modal.
- **Dispute action** (in submission list) navigates to the dedicated dispute page, passing the disputed submission as a route param. No inline expansion.
- **Animations:** verify sheet slides up from bottom (300ms ease-out). Dispute page is a normal route push.

## Design Tokens

All from `theme-context.jsx`. Three themes: `electric` (default, dark), `jade` (dark), `light`.

### Electric (default)

```
--bg:            #0A0E22
--bg-elevated:   #11173A
--surface-1:     #161D44
--surface-2:     #1F2754
--surface-3:     #2A3568
--border:        rgba(255,255,255,0.08)
--border-strong: rgba(255,255,255,0.16)
--fg:            #F0F2FF
--fg-muted:      #A6ADC4
--fg-subtle:     #6E7796
--accent:        #FF7BD4   (pink)
--signal:        #7AE6FF   (cyan)
--success:       #7BFFB0
--warning:       #FFD27A
--danger:        #FF6B6B
--fg-on-accent:  #0A0E22
```

See `theme-context.jsx` for `jade` and `light` token sets — palette swaps but structure identical.

### Type scale

| Use | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| Display (artist) | Inter | 22 | 900 | -0.02em |
| Heading (price) | Inter | 28 | 900 | -0.02em |
| Body | Inter | 13.5 | 500–700 | -0.005em |
| Small body | Inter | 12.5 | 500 | -0.005em |
| Form input | Inter | 16 | 700 | -0.01em |
| Mono label | JetBrains Mono | 10 | 700 | 0.14em uppercase |
| Mono meta | JetBrains Mono | 11 | 700 | 0.04–0.10em |

### Spacing & radii

- Form gap: 18 (dense: 14)
- Section gap: 10
- Card padding: 12/14 or 14/16
- Button height: 50 (primary), 44 (secondary), 36 (small / dispute)
- Card radius: 12
- Input radius: 10
- Button radius: 10 (primary), 8 (secondary, small)
- Pill radius: 999

### Shadows

- Primary CTA glow: `0 12px 32px -12px var(--signal)`
- Phone frame: `0 24px 60px -20px rgba(0,0,0,0.55)`
- Bottom sheet: `0 -24px 60px -10px rgba(0,0,0,0.5)`

## State Management

The form is local component state — no Redux/Zustand needed. Required state:

```
form:    { floor, ceiling, tier, vendor, source }
phase:   "empty" | "submitting" | "success" | "error" | "alreadySubmitted"
disputeOpenId: string | null    (in SubmissionList)
```

Server-side state needed:
- `GET /shows/:id/submissions` — returns array of `{ id, floor, ceiling, tier, source, vendor, submittedAgo, confirms, disputes, byYou, pending }`.
- `POST /shows/:id/submissions` — body matches form shape; server validates same rules + rate limit.
- `POST /submissions/:id/confirm` — increments confirms; idempotent per user.
- `POST /submissions/:id/dispute` — body `{ floor, ceiling, vendor }`; logs an alternate.
- `PATCH /submissions/:id` — edit own submission (within rate-limit window).
- `DELETE /submissions/:id` — withdraw own submission.

Sample response shape lives in `SAMPLE_SHOW.submissions` in the JSX.

## Copy

All user-facing strings are in `submit-price-screens.jsx`. Copy is final — do not paraphrase.

## Assets

No images, icons, or fonts beyond what's listed:
- **Fonts:** Inter (400, 500, 600, 700, 800, 900), JetBrains Mono (400, 500, 600, 700) via Google Fonts.
- **Icons:** all inline SVG in the JSX. Pin, calendar, clock, users, plus, checkmark, shield. Lift them as-is or substitute with the codebase's icon system if equivalent shapes exist.
- **Brand marks:** `CCWordmark`, `CCClusterMark` from `landing-screens.jsx` — reuse the existing implementations in your codebase.

## Open questions (flagged for follow-up)

- The dispute page is currently scoped to *one* alternate price. If a user wants to log multiple disputes against the same submission, we'd need to think about whether that's allowed at all.
- Edit / Withdraw flows on `alreadySubmitted` are stubbed in the design but not specced as pages — we'll do that next pass if needed.
- Desktop verify path (currently mobile bottom sheet only) is noted as future work.
