# Handoff: Onboarding Flow

## Overview

A 5-step onboarding flow for **Concert Crawl**, shown to a user **after** they've redeemed an access code on the Auth Gate but **before** they hit Clerk sign-up. Its job is purely to set expectations for a private beta — no preference capture, no skips, just a short, honest preface.

Flow seam:

```
Landing → Code Entry → [ ONBOARDING ] → Clerk sign-up → Browse
```

Onboarding sits **before Clerk** intentionally: we don't want a stranger registering an account before we've told them what they're signing up for.

## About the Design Files

The files in this bundle are **design references created in HTML/JSX prototypes**. They are not production code to copy directly. Your task is to recreate these designs in the target codebase's existing environment (likely React + your established theming / component primitives), using its established patterns.

The prototype uses inline styles and `<script type="text/babel">` for portability inside the design tool — your implementation should use whatever the codebase uses (CSS modules, styled-components, Tailwind, etc.). All design tokens are referenced by CSS custom property names (`--bg`, `--signal`, `--accent`, etc.) that map to the existing Concert Crawl theming system delivered in earlier handoffs.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, copy, and interaction model. The text on every screen is final and was written by the founder — preserve copy verbatim unless asked otherwise.

## Flow & Screens

The onboarding is a **single component** that renders one of N step views based on an index, wrapped in a fixed-shape shell. The shell handles chrome, progress, and bottom-pinned navigation; each step renders its own body content.

### Default flow (5 steps)

| #   | Step key  | Title                                        | Purpose                                                                                         |
| --- | --------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `welcome` | "Hey — thanks for trying this thing."        | Founder's note. Plain voice (not the snarky app voice).                                         |
| 2   | `how`     | "Honest by design."                          | Three-row explainer: how prices work, where they come from, why they expire.                    |
| 3   | `today`   | "What you can do right now."                 | Bulleted list of what's actually shippable on day one (Denver pilot).                           |
| 4   | `notyet`  | "What's missing — on purpose."               | Honest list of what doesn't work yet (notifications, cross-device, other cities, ticket sales). |
| 5   | `done`    | "One last thing. You'll be shaping the app." | CTA into Clerk sign-in. Surfaces the feedback loop + community pricing ask.                     |

### Flow rules

- **No skips.** Every step is required. Back is allowed; forward is gated only by the user tapping Next.
- **No preference capture.** Beta does not collect city, genre, artist, or budget. (A `preview` step exists in source as a future-state sketch but is not used.)
- **Step 1 voice is the founder.** Caveat-style sign-off "— Hugh" with a circular initial avatar. All other steps use the app's normal Inter voice.
- **Step 5 CTA copy is "Continue to sign-in →"**. Every other step is "Next →".

## Layout

### Mobile (393 × 852, primary target)

```
┌──────────────────────────────────────┐
│ [logo + wordmark]   [Private Beta]   │  ← top chrome (18px / 20px gutter)
│                                      │
│ ●●○○○            Step 2 of 5         │  ← progress dots + counter
│                                      │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │  ↕ scrollable body               │ │  ← flex:1, overflow-y:auto
│ │  (vertically centered when       │ │     content centered when it
│ │   shorter than viewport)         │ │     doesn't fill the space
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │           Next →                 │ │  ← bottom-pinned CTA, full-width
│ └──────────────────────────────────┘ │
│ ← Back                  Step 2 of 5  │  ← secondary nav row
└──────────────────────────────────────┘
```

- **Outer container**: 393 × 852, `display: flex; flex-direction: column`.
- **Top chrome row**: `padding: 18px 20px 12px`. Cluster mark (22px) + wordmark (16px) on the left; `<BetaPill />` on the right.
- **Progress strip**: `padding: 4px 22px 8px`. Active dot is a 28×8 pill; completed dots are `--signal-muted`; pending dots are `--surface-3`. `transition: width 0.25s ease`.
- **Body region**: `flex: 1; min-height: 0; overflow-y: auto; padding: 10px 22px 8px`. Inner wrapper: `min-height: 100%; display: flex; flex-direction: column; justify-content: safe center` — so short content centers, long content scrolls.
- **Nav region**: `flex-shrink: 0; padding: 12px 22px 22px`. Primary CTA is `height: 52; border-radius: 10; full-width`. Secondary row below: Back link (left, disabled on step 1) + step counter (right).

### Desktop (≥1240px)

Same content, centered card on a dim background. Mirrors the Auth Gate desktop chrome.

```
┌──────────────────────────────────────────────────────────────────┐
│ CODE ACCEPTED · WELCOME    [logo+wordmark]    [Private Beta]     │
│                                                                  │
│              ┌──────────────────────────────────┐                │
│              │ Header (progress)                │                │
│              ├──────────────────────────────────┤                │
│              │                                  │                │
│              │  ↕ scrollable body, max 640h    │                │
│              │                                  │                │
│              ├──────────────────────────────────┤                │
│              │ Bottom-pinned nav                │                │
│              └──────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

- **Outer container**: full-viewport, `flex; column`. Background = `--bg`.
- **Top header**: `padding: 22px 48px`. Left: monospace eyebrow `CODE ACCEPTED · WELCOME` (11px / 0.14em / `--fg-subtle`). Center: cluster mark + wordmark. Right: `<BetaPill />`.
- **Card**: width `520` (or `620` for `welcome` / `today` / `notyet`), height `640`, `border-radius: 16`, `border: 1px solid --border-strong`, `box-shadow: 0 32px 80px rgba(0,0,0,0.4)`, `background: --bg-elevated`.
- **Card internals**: header (`padding: 22px 32px 10px`), body (`flex: 1; overflow-y: auto; padding: 8px 32px 12px`), nav (`padding: 14px 32px 22px; border-top: 1px solid --border`). Same body-centering rule as mobile.
- **Faint poster watermark**: cluster mark, 380px, `opacity: 0.07`, `transform: rotate(-12deg)`, top-right of viewport behind the card.

## Step content (verbatim copy)

### Step 1 · Founder note (`welcome`)

- Eyebrow: `A note from the maker`
- Heading: `Hey — thanks for trying this thing.`
- Body (three paragraphs, last one in `--fg-muted`):
  > I'm Hugh. I go to a lot of shows. Concert Crawl is the tool I always wanted: an honest place to see what's playing, what it costs, and whether it's worth the trip.
  >
  > This is a private beta. Lots of edges are still rough. Some screens are empty because the data isn't there yet. Some prices are missing because we couldn't pull a real one — and we'd rather say that than make one up.
  >
  > You're here early on purpose. Tell me what works, what's confusing, what's missing. I'll read all of it. The product will change because of it.
- Sign-off: 32×32 round avatar (`--accent` bg, white "H"), Caveat 24/600 "— Hugh".

### Step 2 · How it works (`how`)

- Eyebrow: `How this works`
- Heading: `Honest by design.`
- Lede: `Two minutes on what to expect from the prices, the listings, and what we'll never do.`
- Three-row card (`--surface-1` bg, 1px `--border`, `border-radius: 14`). Each row: 36×36 monospace number tile (01/02/03) + title + body.
  - **01 — We crawl, we don't sell.** Concert Crawl reads public listings from venues and ticketers. We don't sell tickets and we don't take a cut. Tap a price, you go to the source.
  - **02 — Prices come from somewhere — we'll tell you where.** Every price has a tag. BOX OFFICE means a fan bought a ticket directly from the venue — that's the gold standard. COMMUNITY means a fan reported what they saw. RESALE means a marketplace listing. If we can't find a price, we'll say so instead of making one up.
  - **03 — Verifications expire.** A community price is more trustworthy after another fan confirms it — but even verified prices go stale after a week. We'll show you when something is old.

### Step 3 · What it does today (`today`)

- Eyebrow: `Today`
- Heading: `What you can do right now.`
- Lede: `We're starting small. Denver is the pilot. Here's what's actually in front of you on day one:`
- Bulleted list (each item: 18px `--signal` checkmark circle + 14.5px copy in `--fg`):
  1. Browse upcoming shows in the Denver area
  2. See real prices side-by-side, with their sources
  3. Watch shows you're curious about (saved locally for now)
  4. Submit a price you saw — or report what you paid at the box office

### Step 4 · What it doesn't (yet) (`notyet`)

- Eyebrow: `Not yet` (uses `--accent` tone)
- Heading: `What's missing — on purpose.`
- Lede: `Better to be straight with you than to ship something that pretends. Things on this list are coming, not abandoned.`
- List (each item: monospace `SOON` tag in `--accent` + title + body, dashed `--border-strong` border):
  - **Notifications.** No push, no email alerts yet. We'll add them after we earn the right to interrupt you.
  - **Cities outside Denver.** The crawl is regional for now. Other metros come once the system is solid.
  - **Accounts that follow you across devices.** Watching is local-only this beta. Sign-in keeps your invite, not your list — yet.
  - **Buying tickets.** We'll never sell. We point you at the source and stay out of the transaction.

### Step 5 · You're in (`done`)

- Eyebrow: `You're in` (`--accent` tone)
- Heading: `One last thing.` <br/> `You'll be shaping the app.` (second line in `--accent`)
- Lede (two paragraphs):
  > You're not just here to use the thing — you're here to make it better. When something changes, we'll ask what you think. When something breaks, we want to know.
  >
  > The Give Feedback button lives in your menu — always there, never buried. Tap it and you'll see a quick category picker and a free-form message field. Thirty seconds. I read every one.
- Channel card: `--surface-1` bg, 1px `--border`, 12 radius. Pulsing dot (6×6, `--signal`, glow shadow) + monospace `BETA CHANNEL · ALWAYS OPEN`. Body line: `Tap "Give Feedback" in your menu. You'll see a quick category picker and a free-form message field — thirty seconds, straight to me.`
- **Personal ask · community pricing.** Sits between the channel card and the CTA. No card chrome — a hairline `--border` top rule separates it from the channel card so it reads as a personal beat, not another feature box. Mono eyebrow `One ask, from me` in `--accent`. Body: `Most shows won't have a price listed yet — that's the part you can fix. When you buy a ticket, take ten seconds to report what you paid. Two fans confirming a number is all it takes to make a price real for everyone else.` Closes with a small (22×22) Hugh avatar in `--accent` + a `Caveat` `— Hugh` sign-off in `--fg-muted`, echoing step 1's founder signature at reduced scale. Rationale: beta users _are_ the seed data for the pricing system — without explicit asks, most show pages display nothing. This makes the role personal at the last possible moment before sign-in. Voice is founder-adjacent (matches step 1), not feature-explainer (steps 2/3 already cover the mechanics).
- CTA copy: `Continue to sign-in →`.

## Typography

| Role             | Family         | Size                           | Weight  | Letter spacing   |
| ---------------- | -------------- | ------------------------------ | ------- | ---------------- |
| Step heading     | Inter          | 28px (mobile) / 34px (desktop) | 900     | -0.03em          |
| Lede             | Inter          | 15                             | 400     | -0.005em         |
| Body             | Inter          | 13.5–15.5                      | 400–700 | -0.005em         |
| Eyebrow          | JetBrains Mono | 10                             | 700     | 0.14em uppercase |
| Step counter     | JetBrains Mono | 10                             | 700     | 0.14em uppercase |
| Back link        | JetBrains Mono | 11                             | 700     | 0.10em uppercase |
| Founder sign-off | Caveat         | 24                             | 600     | —                |
| CTA              | Inter          | 16                             | 800     | -0.01em          |

`text-wrap: balance` on headings; `text-wrap: pretty` on bodies.

## Design tokens

All tokens come from the existing Concert Crawl theme system (`theme-context.jsx`). Onboarding uses these names — do not invent new ones:

- **Surfaces**: `--bg`, `--bg-elevated`, `--surface-1`, `--surface-2`, `--surface-3`
- **Borders**: `--border`, `--border-strong`
- **Foreground**: `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-on-accent`
- **Accents**: `--signal` (primary CTA / progress), `--signal-muted`, `--accent` (secondary highlight, founder avatar, "Not yet" eyebrow)

The flow renders correctly under all three project themes: **Electric** (default), **Jade**, and **Light**.

## Components / dependencies

The prototype reuses these existing Concert Crawl primitives (do not reimplement — wire to the codebase equivalents):

- `<CCClusterMark />` — the cluster mark logo (`landing-screens.jsx`).
- `<CCWordmark />` — the wordmark (`landing-screens.jsx`).
- `<BetaPill />` — small pill reading "PRIVATE BETA" (`landing-screens.jsx`).
- Theme provider / token vars — `theme-context.jsx`.

Onboarding-specific components (in `onboarding-screens.jsx`):

- `<OnboardingMobile theme flow initialStep onComplete />`
- `<OnboardingDesktop theme flow initialStep onComplete />`
- `useOnboardingShell({ flow, index, setIndex, onComplete })` — returns `{ Header, Body, Nav, stepKey }` slots so wrappers can pin the CTA to the bottom.
- Step bodies: `<FounderNote />`, `<HowItWorks />`, `<WhatItDoesToday />`, `<WhatItDoesntYet />`, `<YoureIn />`.
- `<ProgressDots total index />` — top progress strip.
- `ob_resolveFlow(stepCount, includeHow, includePreview)` — flow shape resolver. Beta should hard-code the 5-step flow; the resolver is design exploration scaffolding.

## Interactions & behavior

- **Mount**: `index = 0`. Show `welcome`. Back button is disabled.
- **Next**: `setIndex(i + 1)`. On the last step, Next calls `onComplete()` — the host should route to Clerk sign-up.
- **Back**: `setIndex(i - 1)`. Disabled on step 1 (`opacity: 0.4`, no pointer).
- **Progress dots**: derived purely from `index`. Animate width on the active dot via `transition: width 0.25s ease`.
- **Body scroll**: each step body sits in a scroll container that vertically centers content shorter than the viewport. Long content scrolls; the bottom nav stays pinned.
- **No persistence**: the beta does not store anything from onboarding. After step 5 → Clerk → first app load.
- **Never timed-out / dismissable**: no skip link, no Esc to close, no "remind me later." It must run to completion before Clerk.
- **Resume rule**: if a user lands on `/onboarding` after step 1 mid-flow (rare — refresh case), restart from step 1. Steps are short and the founder note should not be skipped.

## Responsive behavior

- **Mobile (≤ 1239px)**: render `<OnboardingMobile />`. Container is the full viewport (no phone bezel in production — that's a design-canvas frame only).
- **Desktop (≥ 1240px)**: render `<OnboardingDesktop />`. Card max-width 520 (or 620 for `welcome` / `today` / `notyet`); fixed card height 640 with internal scroll.
- The breakpoint should match the existing Auth Gate breakpoint in the codebase.

## Accessibility

- Progress dots are decorative — pair with an off-screen "Step N of M" announcement on each step change.
- Step counter ("Step 2 of 5") is visible text, lives in the bottom nav row.
- CTA buttons are real `<button>` elements (the prototype uses `all: unset` styling — keep them as buttons in production).
- Disabled Back is `disabled` + `cursor: default` + reduced opacity, not just visually faded.
- Color contrast in all three themes was checked against `--fg` / `--bg-elevated`; preserve those mappings.

## Files in this bundle

| File                     | Role                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Onboarding.html`        | The design canvas. Loads all dependencies and renders mobile + desktop side-by-side under the design canvas wrapper. **Reference only — do not ship.** |
| `onboarding-screens.jsx` | All onboarding components and step bodies. The source of truth for layout, copy, and tokens.                                                           |
| `theme-context.jsx`      | Existing project theme provider (already in your codebase from earlier handoffs — included for completeness).                                          |
| `landing-screens.jsx`    | Existing brand chrome — `CCClusterMark`, `CCWordmark`, `BetaPill`. Onboarding consumes these.                                                          |
| `design-canvas.jsx`      | Design-canvas presentation wrapper. **Not part of production.**                                                                                        |
| `tweaks-panel.jsx`       | In-canvas Tweaks panel. **Not part of production.**                                                                                                    |

## Implementation checklist

1. Wire `<OnboardingMobile />` / `<OnboardingDesktop />` into the auth-gate flow so they render after code redemption and before the Clerk handoff. Pass `onComplete={() => router.push('/sign-in')}` (or your codebase's equivalent).
2. Hard-code the 5-step flow `["welcome", "how", "today", "notyet", "done"]`; the variable-flow scaffolding is design exploration only.
3. Recreate the five step bodies using your codebase's component primitives. Copy is final — preserve verbatim.
4. Use the existing CC theme tokens; verify rendering under all three themes.
5. Keep the bottom-pinned-CTA + scrollable-body layout on both mobile and desktop. No skips. Back disabled on step 1.
6. Step 5 routes feedback through the in-app feedback form (Give Feedback in the menu) — no direct email reference.

## Out of scope / explicit non-features

- **No city, genre, artist, or budget capture.** The `FuturePref` component in `onboarding-screens.jsx` is a sketch of where this might land later — do not wire it in for the beta.
- **No skip / dismiss.** Required.
- **No analytics events.** Add later if/when product wants funnel telemetry.
- **No "what's new" notification surface.** The "send notify when something changes" idea on step 5 references future work — that surface is its own design.
