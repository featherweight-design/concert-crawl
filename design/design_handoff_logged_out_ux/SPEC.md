# #794 Logged-out App UX — implementation spec

Companion to `README.md` (what and why) and `DECISIONS.md` (the calls Design made).
This file is the measurements. A developer who wasn't in the conversation should
be able to build from this alone.

**These files are design references built in HTML/JSX — not production code.**
Recreate them with the app's own primitives (Next.js App Router, Tailwind +
CSS custom properties, Clerk, lucide-react). **Fidelity: high** — final colors,
type, spacing, and states.

---

## 1 · Design tokens

All screen color is `var(--*)`. Nine themes ship off one identical token set;
Electric is the default and is listed here for reference only — **never hardcode
these**.

| Token | Electric | Jade | Light |
|---|---|---|---|
| `--bg` | `#070A1A` | `#06201F` | `#FAFCFF` |
| `--bg-elevated` | `#0E1226` | `#0A2A28` | `#FFFFFF` |
| `--surface-1` | `#11162E` | `#0E3331` | `#F2F5FB` |
| `--surface-2` | `#171D3A` | `#143E3B` | `#E8EDF6` |
| `--fg` | `#E8F3FF` | `#E6FFF6` | `#070A1A` |
| `--fg-muted` | `#9AA8C7` | `#8FBFB0` | `#4A5374` |
| `--fg-subtle` | `#5A6788` | `#557A6F` | `#8A93B0` |
| `--fg-on-accent` | `#070A1A` | `#06201F` | `#FFFFFF` |
| `--border` | `#1F2748` | `#1A4A47` | `#DCE3F0` |
| `--border-strong` | `#2C3661` | `#2A5C57` | `#B8C2D6` |
| `--signal` | `#7AE6FF` | `#1FFFC2` | `#0080A0` |
| `--accent` | `#FF7BD4` | `#9B5CFF` | `#E0297A` |
| `--success` / `--warning` / `--danger` | `#7BFFB0` / `#FFD27A` / `#FF7A8A` | `#1FFFC2` / `#FFD27A` / `#FF7A8A` | `#1F8A4F` / `#B86E00` / `#C42940` |
| `--focus`, `--scrim`, `--overlay-hover` | per theme | | |

`--signal` is the CTA color. `--accent` is brand presence only (logo halo,
wordmark, mono eyebrows). Never swap them.

### Type

Two families, no others.

| Use | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| Screen headline | Inter | 32–56 | 900 | −0.03 to −0.045em |
| Section headline | Inter | 21–27 | 900 | −0.03em |
| Row title | Inter | 16 (14 compact) | 700 | −0.015em |
| Body | Inter | 13–14.5 | 500 | −0.005em |
| Menu row label | Inter | 13.5 | 600 | −0.005em |
| Button | Inter | 13–15.5 | 800 | −0.01em |
| Wordmark | Inter | 17 | 800 | −0.02em |
| Mono eyebrow | JetBrains Mono | 9–10 | 700 | 0.10–0.16em, UPPERCASE |
| Row meta | JetBrains Mono | 12 (10.5 compact) | 500 | 0.02em |
| Price | JetBrains Mono | 13 (11.5 compact) | 700 | 0.02em |
| Genre chip | JetBrains Mono | 10.5 | 500 | 0.02em |
| Nav tab label | JetBrains Mono | 9 | 500 / 700 active | 0.04em |

Rule: **if it's a fact, it's monospaced.**

### Spacing, radii, hit areas

- Radii: rows/cards **12**, art tile **10**, menu **14**, sheet top **22**,
  buttons **12**, eye button **12**, chips **6**, pills **4**, discs **50%**.
- Mobile content padding `12–16px` sides. Desktop main column `max-width 880`,
  padding `26–34px`.
- **44px minimum** on every interactive target, including the 26px bottom-nav
  disc (its tap target is 56×44) and text links (`min-height: 44px`).
- Focus: `outline: 2px solid var(--focus); outline-offset: 2` (3 on posters).

---

## 2 · Shell

### Mobile header (`AppHeader`, mobile branch)

Row: `padding: 12px 14px 10px`, `background: var(--bg)`, space-between.

- Left: `<CCMark size={26}/>` + wordmark, gap 8.
- Right cluster, gap 8:
  - Search: 36px circle, `1px solid var(--border-strong)`, icon 15px `--fg-muted`, 44px target.
  - **Signed out only** — Sign up: filled `--signal`, `--fg-on-accent`, `min-height 36`, `padding 8px 13px`, `font-size 13`, `weight 800`, `radius 12`.
  - Account disc: signed out `AnonDisc` 32px; signed in avatar 32px. `aria-haspopup="dialog"`, `aria-expanded`.

**Sign-in rail (signed out only):** a row beneath the header,
`padding: 0 14px 8px`, right-aligned. Mono 10px/700/0.1em uppercase,
`--signal`, text `Already in? Sign in`, 44px min-height. Exists so the 320px
header row never carries two CTAs.

### `AnonDisc`

`border-radius: 50%`, `background: var(--surface-2)`,
`border: 1px solid var(--border-strong)`, person glyph at 50% of size in
`--fg-muted`. When its menu is open, `outline: 2px solid color-mix(in oklch, var(--signal) 50%, transparent)` at `outline-offset: 2`.
It is a **resolved** state — never render the loading disc or a hollow ring here.

### Bottom nav (`BottomNav`)

`height 56`, `border-top 1px solid var(--border)`, `background: var(--bg-elevated)`,
`justify-content: space-around`. Four slots, always all four:

| # | Key | Icon | Href |
|---|---|---|---|
| 1 | `browse` | three 1.5px rules | `/events` |
| 2 | `venues` | map pin | `/venues` |
| 3 | `watching` | **Eye** (lucide) | `/watching` |
| 4 | `me` | AnonDisc 26 / avatar 26 | opens the account menu |

Each slot: column, gap 3, `min-width 56`, `min-height 44`. Active `--signal` +
mono label weight 700; inactive `--fg-subtle` weight 500.

Slot 3 **navigates** — it does not open a sheet. Slot 4 is a `<button>` with
`aria-haspopup="dialog"`, accessible name `Account menu — sign up or sign in`
when signed out.

### Desktop header

`height 64`, `padding 0 28px`, `background: var(--bg-elevated)`,
`border-bottom 1px solid var(--border)`.

- Left: lockup (`CCMark` 30 + wordmark 17/800) + tabs, gap 30. Tabs
  `Browse · Venues · Watching`, `padding 8px 14px`, `radius 9`, `font-size 13`.
  Active: `background var(--surface-2)`, weight 700, `--fg`. Inactive: weight
  500, `--fg-muted`.
- Right, gap 12: search field `268×38`, `radius 9`, `1px solid var(--border)`,
  `background var(--surface-1)`, `⌘K` chip; **signed out** Sign in text link
  (13/700 `--fg-muted`) + Sign up filled pill (`min-height 38`, `padding 9px 15px`,
  13.5/800); account disc 36.

### Event row

Grid `auto 1fr auto auto`, gap 14 (11 compact), `padding 12px 4px` (10px 2px
compact), `border-bottom: 1px solid var(--border)`. **Rows are not cards** — no
background, no outer radius.

1. **Art** — 56px (48 compact), `radius 10`. Production: `<IdentityArt name={artist} kind="artist" scale="tile" showInitials={false}/>`.
2. **Title block** — column gap 5 (3 compact): artist Inter 16/700/−0.015em, ellipsis; meta JetBrains Mono 12 `--fg-muted` `{venue} · {time}`; genre chips (max 2, 1 compact) in a flex row gap 6.
3. **Watch eye** — 44×44 button.
4. **Price** — mono 13/700 `--fg`, or `tba` mono 13/500 `--fg-subtle`. `min-width 38`, right-aligned.

Genre chip: mono 10.5/500/0.02em, `--fg-muted`, `background var(--surface-2)`,
`radius 6`, `padding 4px 8px`, nowrap.

### Watch eye

44×44, `radius 12`, `1px solid var(--border-strong)`, transparent background,
`--fg-muted`, lucide `Eye` at 18px.
**Watching:** border `color-mix(in oklch, var(--signal) 55%, transparent)`,
background `color-mix(in oklch, var(--signal) 16%, transparent)`, `--signal`,
pupil filled.
**There is no signed-out variant.** No lock, no dimming, no muted token.

---

## 3 · Account menu

Desktop popover `width 360`, `background var(--bg-elevated)`,
`1px solid var(--border-strong)`, `radius 14`,
`box-shadow 0 24px 64px color-mix(in oklch, var(--bg) 78%, transparent)`.
Mobile: full-width bottom sheet, top radii 22, 18px drag-handle strip with a
36×4 `--border-strong` bar. Same rows, same order, both.

Menu row: `padding 13px 14px`, `min-height 46`, label 13.5/600,
`border-bottom 1px solid var(--border)` except last. Section label:
`padding 11px 14px 4px`, mono 10/700/0.14em `--fg-subtle`.

### Signed-out body

1. **Get-in card** — occupies the identity card's slot. `padding 14px 14px 13px`,
   bottom border. Row: `AnonDisc 42` + column (mono 10 `--accent` `NOT SIGNED IN`;
   Inter 14/800 `Browsing as a guest`). Then a full-width **Sign up free**
   primary button. Then centered `Already have an account?` 12.5/500 `--fg-muted`
   + `Sign in` 12.5/700 `--signal`.
2. `APP` — **Theme** row: label + `MiniMark 18` + active label + chevron.
   Expanded: the shipped 3×3 nine-theme grid (gap 7, dense swatches) + mono
   caption `9 themes · saved on this device, no account needed`.
3. **How Concert Crawl works** · meta `2 min` · chevron.
4. **Terms** · **Privacy**, each with chevron.
5. **Version footer** — `padding 11px 14px`, top border, `background var(--surface-1)`:
   mono 9.5 `v1.0.0 · a3f19c2` left, `Changelog` in `--signal` right.

Absent signed out: Submitted prices, Settings, Sign out. Nothing renders disabled.

### Theme swatch (shipped component)

`radius 12`, `padding 8` dense / 10, `background {theme}.bg`,
border `1.5px solid {theme}.signal` when active else `1px solid {theme}.border-strong`.
Contents: row of `MiniMark` + signal/accent dots (9px, +accent-2 where the theme
has one) + `ACTIVE` mono eyebrow; a mini gig card (`{theme}.surface-1`,
`1px solid {theme}.border`, radius 8) reading `Habstrakt` / `$35` `GA`; then the
theme name with its mode-or-genre label right-aligned in mono 7.5.

`ThemeMenuRow` already handles signed-out correctly in code — no token, local
write only, no `patchMe`, no `ThemeSync` revert. No change needed.

---

## 4 · `/watching` signed out

Public route, **gated payload** — this page fetches nothing.

Mobile, `padding 16px 16px 18px`, column gap 20 (16 at 320):

1. **Head** — 34px eye mark (radius 10, `color-mix(in oklch, var(--signal) 14%, var(--surface-1))`, border `…34%, var(--border)`, icon `--signal`) beside a `WATCHING` mono eyebrow; headline **"Keep an eye on it."** Inter 32/900/−0.035em (27 at 320); two-sentence lede 14.5/500 `--fg-muted`, `line-height 1.55`.
2. **Worked example** — caption row `EXAMPLE · NOT YOUR LIST` mono 9 + hairline; then a `1px dashed var(--border-strong)` container, `radius 12`, `padding 9`, gap 7, holding three sample rows (art 40, radius 7; artist 13.5/700; meta mono 9.5; price mono 13/700 with a delta line beneath — `−$7` in `--success`, `flat` in `--fg-subtle`, `SOLD OUT` in `--warning`).
   **`aria-hidden="true"`, plus a visually-hidden text alternative** beside it:
   *"Example: a Watching list showing three shows, one with a seven-dollar price drop."*
3. **Three facts** — `01/02/03` mono `--signal` in a 22px column; title 14/700; body 13/500 `--fg-muted`.
4. **CTA** — Sign up free (primary, lg, full) · `Already have an account? Sign in` · `OR KEEP BROWSING →` mono 10 `--fg-subtle`.

Desktop: `max-width 880`, two columns gap 40 — head + CTA left, example + facts
right. DOM order matches reading order.

Copy, verbatim:

- Headline: `Keep an eye on it.`
- Lede: `Watching is your shortlist of shows you don't want to miss — and a price tracker on each one. Nothing to set up. It just needs an account to save to.`
- `01 The eye is the whole gesture.` / `Tap it on any show — card or detail page — and the show lands here.`
- `02 We watch the price, not you.` / `Drops, spikes, and sell-outs show up against what it cost when you started watching.`
- `03 Free, and it stays free.` / `Watching is on the Free tier. No card, no trial, nothing to cancel.`

---

## 5 · Tier picker, logged out

Extends the shipped state. Mobile bottom sheet (`padding 4px 16px 20px`),
desktop centered modal `width 560` (`padding 22px 24px 20px`). Body column gap 14.

1. **Rail** — pulsing 7px `--signal` dot + eyebrow, `3 tiers` right, bottom border.
2. **Head** — 46px eye mark (radius 13) + headline 22/900 (25 desktop) + sub 13/500 + mono `Anchored to: {artist}`.
3. **Tiers — stacked vertically**, gap 8. Each: `radius 12`, `padding 12px 13px`; header row = name 15/800 + tag mono 9 + price mono 12 right; features wrap in a flex row `gap 5px 16px`, each with an 11px check. Free is the picked card: `background color-mix(in oklch, var(--signal) 10%, var(--surface-1))`, `1.5px solid color-mix(in oklch, var(--signal) 55%, transparent)`, name and checks in `--signal`.
4. **CTA** — Sign up free (primary, full) + `Already have an account?` / `Sign in →`.
5. **Footer** — mono 9/0.12em centered.

### Replacement copy (fixes a live vocabulary violation)

```ts
loggedOutEyebrow: 'Watching · free with an account',
loggedOutTitle: "Keep an eye on the ones you can't miss.",
loggedOutSub:
  "Watching is free — it just needs an account to save to. Start on Free; " +
  "pick a lane later if you ever want to chip in.",
```

Footer rail: `Free forever · no card · we'll put you back on this show`.

Second violation, outside #794's screens: `CONSUMER_COPY.settings.watchlistRow`
is `'Saved shows'` and must read **Watching**.

### Accessible-name contract (the §3.10 constraint)

| Affordance | Signed out | Signed in |
|---|---|---|
| Watch eye | `Watch {artist} — sign up to start watching` | `Watch this show` / `Watching, click to stop` |
| Follow artist | `Follow {artist} — sign up to follow artists` | `Follow {artist}` / `Following, click to stop` |
| Calendar export | `Add to calendar — sign up to export` | `Add to calendar` |
| Account slot | `Account menu — sign up or sign in` | `Account menu` |

- Name states the outcome; no visible word is added.
- **Omit `aria-pressed` entirely when signed out** — do not ship `aria-pressed="false"`.
- `aria-haspopup="dialog"` + `aria-expanded` on the affordance.
- Open → focus the dialog heading, trap. Dismiss → return focus to the affordance.
- Announce the return seam once via `role="status"`.

---

## 6 · Landing

Top bar `height 68`, `padding 0 40px`: lockup left, **Sign in** text link right.

Hero grid `1fr auto`, gap 40, centered.

- **Head** — mono `Denver · updated hourly` in `--accent`; headline Inter 56/900/−0.045em, `line-height 0.98`, `See who's playing` + `tonight.` in `--accent`; lede 16.5/500 `--fg-muted`, `max-width 560`.
- **CTA block** — row gap 10: **Browse shows** (primary lg, `padding 15px 22px`) → `/events`; **Sign up** (outline lg) → `/sign-up`. Beneath: mono 9.5 `NO ACCOUNT NEEDED TO LOOK AROUND`.
- **See all 214 shows this week →** — Inter 13.5/700 `--signal`, 44px min-height.
- **Poster stage** — the shipped `<LandingPosterAnimation mode="stack"/>` at `width 286`. Motion, poster art, and dot pager are unchanged.

Mobile: same order, CTAs stacked full-width, poster stage centered at 200
(176 at 320).

### Poster link chrome (the only new part)

Whole card is one `<a>`. Accessible name `{artist} at {venue}, {dateShort}. See the show`.

| State | Treatment |
|---|---|
| rest | none |
| hover | `translateY(-4px)`, `box-shadow 0 18px 40px color-mix(in oklch, var(--bg) 62%, transparent)` |
| focus-visible | `outline 2px solid var(--focus)`, `outline-offset 3` |
| press | `scale(0.99)` |

On hover/focus/press a 32px `--signal` arrow badge fades in at `right 10 / bottom 10`.
Transition `transform 140ms, box-shadow 140ms`.

### Retiring

| Slot | Was | Becomes |
|---|---|---|
| Primary | `I have a code` → `/auth/code` | `Browse shows` → `/events` |
| Secondary | Join the waitlist (modal) | `Sign up` → `/sign-up` |
| Tertiary | `Sign in` → `/sign-in` | Sign in, moved to the top bar |
| Header pill | `PRIVATE BETA` | retires with the beta artifacts |
| Posters | display only | each links to `/events/[id]` |
| Poster motion | stack animation | unchanged |

**ISR:** middleware already redirects a signed-in request off `/` to `/events`,
so `/` only renders for a visitor with no session. The CTA block needs no auth
branch — no `auth()`, no `cookies()`, ISR intact. The poster stack is already a
Client Component and stays one.

---

## 7 · Onboarding (post-auth)

Order: `welcome → how → today → theme → notyet → done`.

**Rail** (every step): `padding 11px 14px`, `background var(--bg-elevated)`,
bottom border. Left `CCMark 20` + mono `Step N of 6 · {LABEL}`. Right: the skip
affordance. Below, a 2px `--border` track with a `--signal` fill at `N/6`.

| Entry | Rail left | Skip |
|---|---|---|
| Post-signup | `Step N of 6 · {LABEL}` | quiet mono `SKIP` |
| Post-signup, mid-intent | same, plus a `role="status"` strip: filled eye + `Watching {artist} — we'll take you back` on `color-mix(in oklch, var(--signal) 8%, transparent)` | outlined button `Skip — back to {artist}`, `min-height 36`, radius 9 |
| Account menu | `How it works · {LABEL}` | `CLOSE` |

**Footer:** `← Back` 12.5/700 `--fg-muted` left, primary `Next →` right
(`min-height 40`). The final step has no footer — its body carries the return CTA.

**Body:** `padding 16px 16px 18px`, column gap 14. Head = mono eyebrow
`--accent`, headline 25/900/−0.035em, lede 13/500 `--fg-muted`.

Steps:

1. **Welcome** — `A note from the developer` / `Thanks for signing up.` Three paragraphs (first in `--fg`, rest `--fg-muted`, `line-height 1.6`), `— Hugh` in mono at the bottom.
2. **How this works** — `Honest by design.` Numbered 01/02/03. 02 carries the three source pills (`BOX OFFICE` `--success`, `COMMUNITY` `--signal`, `RESALE` `--warning`; mono 8.5/700/0.1em, 1px border at 45% mix, radius 4) each with a one-line description, then `If we can't find a price, we say so.`
3. **Today** — four check rows: `radius 10`, `background var(--surface-1)`, `1px solid var(--border)`, `padding 10px 11px`, 12px `--success` check + 12.5/600 label.
4. **Make it yours** — the 3×3 nine-theme grid (same swatch component as the menu).
5. **Not yet** — four items, each `padding-left 11` with a `1px solid var(--border-strong)` left rule; title 12.5/800, body 12 `--fg-muted`.
6. **That's the tour** — headline + `Go find something.` in `--signal`; the price-submission ask as the lede; primary CTA `Back to {artist}` or `Start browsing`; mono footnote `Your show is still watched · we saved it` / `The tour lives in your account menu`.

---

## 8 · Return seam

`Tap the eye → tier picker → Clerk sign-up (redirect_url + intent) → welcome tour (skippable) → destination, action applied.`

**Confirmation strip** on the destination: `margin 8px 14px 0`, `padding 11px 12px`,
`radius 11`, `background color-mix(in oklch, var(--signal) 13%, var(--surface-1))`,
`1px solid color-mix(in oklch, var(--signal) 45%, transparent)`. Contents: 17px
filled eye `--signal`; `Now watching {artist}.` 12.5/800; mono 9
`Kept while you were signing up`; `VIEW` link in `--signal`.

`role="status" aria-live="polite"`, announced **once**, dismissed after **6s** or
on any navigation. The eye is already filled when the page paints — the strip
explains the change, it does not perform it.

Edge cases:

- **Action can't be replayed** (sold out, unlinked, expired) → land on the destination, no strip, no error.
- **Tour skipped** → straight to the destination; action applied and confirmed identically.
- **Gated route, no session** (§3.12) → `/sign-in?redirect_url=…` then back to the route. Never a bounce to `/`.

---

## 9 · State

| State | Scope | Source |
|---|---|---|
| `isSignedIn` | shell | Clerk `useAuth()`. No `<SignedIn>`/`<SignedOut>` — the app branches on hooks. |
| `menuOpen` | header + bottom nav slot 4 | local; one menu, two triggers |
| `themePickerOpen` | account menu | local |
| `theme` | app | localStorage signed out; `patchMe` signed in (already implemented) |
| `pickerOpen` + `anchor` | tier picker | local; anchor is the feature that fired it |
| `pendingIntent` | sign-up → destination | query params `redirect_url` + `intent` |
| `confirmVisible` | destination | true on arrival with a replayed intent; 6s timer |

## 9b · Protected-layout mounts

`(protected)/layout.tsx` makes no `auth()` call — gating is edge middleware
only — so broadening the public matcher mounts these for anonymous visitors.

| Mount | Signed out | Change needed |
|---|---|---|
| `FeedbackEdgeTabGate` | **Hidden** | Currently gates on `pathname.startsWith('/admin')` only. Add `isSignedIn`. |
| `FeatureDropPillGate` | **Hidden** | No auth check today. Add one. |
| `FirstWatchNudgeGate` | Renders nothing, but mounts auth-dependent effects | Early-return before the effects |
| `OnboardingThemeFlush` | Nothing to flush — logged-out theme is localStorage-only | Early-return before the effects |
| `LifecycleNudgesGate` | Already self-gates | None |

Rationale for the two hides is in `README.md` §Deliverable 8 and mirrored in
`lo-inventory.jsx`. Short version: the edge tab is omnipresent chrome pointing at
an auth-only endpoint, so routing it to sign-in would turn the app's only
near-sticky element into a conversion surface (§3.6); the feature-drop pill is
both a persistent nudge (§3.6) and a teased background feature (#781).

## 10 · Assets

- **Icons:** lucide-react (`Eye`, `Search`) plus the inline nav SVGs already in `BottomNav.tsx`. No new icon set.
- **Brand:** `CCMark` from `@/components/brand/cc-mark` — the file in this bundle is a verbatim inline copy for prototype use only.
- **Artwork:** the Phase 7.5 `IdentityArt` engine. Row tiles in this prototype draw a cheap 4-band reduction of the artist's real `IA_PALETTES` entry (indexed by `ia_hashName`) purely for canvas render cost; **production calls `<IdentityArt scale="tile"/>`**.
- **Posters:** the shipped `LandingPoster` + `LandingPosterAnimation`, unchanged.
- **Fonts:** Inter (variable) + JetBrains Mono, via the existing pipeline.

## 11 · Files

| File | Contains |
|---|---|
| `Logged-Out App UX.html` | The canvas — eight sections, one per deliverable |
| `lo-primitives.jsx` | CCMark, lockup, icons, `AnonDisc`, `WatchEye`, `EventRow`, `Art`, theme swatches, frames |
| `lo-shell.jsx` | Headers, bottom nav, shell screens, slot-parity table |
| `lo-menu.jsx` | Account menu — sheet, dropdown, standalone |
| `lo-watching.jsx` | `/watching` signed out |
| `lo-gating.jsx` | Tier-picker moment + accessible-name spec |
| `lo-landing.jsx` | CTA block, poster link states, retirement table, ISR note |
| `lo-onboarding.jsx` | Six steps, skip variants, return seam |
| `lo-inventory.jsx` | The state inventory (`LO_INVENTORY`) |
| `identity-art.jsx`, `landing-poster.jsx`, `landing-poster-stack.jsx`, `landing-events.jsx` | Copies of shipped code from `design_handoff_landing_poster_v2/` |
| `theme-context.jsx`, `design-canvas.jsx` | Prototype chrome — ignore |

## 12 · Open questions for engineering

1. **Intent replay** — server-side on first authenticated request, or client-side after hydration? The confirmation strip assumes the eye is already filled on first paint.
2. **`/watching` matcher** — confirm the page can render with no `GET /watching` call at all.
3. **`REQUIRE_BETA_AUTH`** — Design assumes public reads. If the flag stays on for any of the four routers at launch, most of this drop is unreachable.
4. **`loggedOutEyebrow`** — worth landing ahead of the rest of #794; the violation ships today.
