# Handoff: #794 — Logged-out App UX (R2)

**Ticket:** [#794](https://github.com/HartiganHM/concert-crawl/issues/794) · `type: design` · `phase: launch`
**Brief:** `docs/superpowers/specs/2026-07-25-794-logged-out-ux-design-brief.md` (12 locked decisions — this drop consumes them, it does not reopen them)
**Round:** R2 · 2026-07-27 — 🟢 Green (see `READINESS.md`)
**Fidelity:** High. Final colors (tokens), typography, spacing, states, copy.

---

## What this is

Concert Crawl has never had a logged-out state. Middleware gates every consumer
route, so a visitor without an account reaches exactly one page: the marketing
landing. Public access begins at launch (~Aug 18–22).

This drop designs the app for a visitor with no session. It is **not new
chrome** — every slot already exists, each one just degrades differently today
(`MobileProfileEntry` returns `null`, `BottomNav` tab 4 falls back to a bare
`PersonIcon`, `/watching` returns `null`, and `UserMenu`'s trigger already works
signed-out while its body assumes an account). We are designing states into
slots that exist.

### About the design files

These are **design references built in HTML/JSX** — interactive prototypes
showing intended look and behavior. They are **not production code to lift**.
Recreate them with the app's own primitives. What to lift: the token usage, the
layout structure, the state matrix, the interaction and focus behavior, the
accessible-name contract, and the copy.

---

## Files

| File | What it is |
|---|---|
| `Logged-Out App UX.html` | The canvas. Eight sections, one per deliverable. **Start here.** |
| `lo-primitives.jsx` | `CCMark` (inline copy of the source of truth in `browse-home.jsx`), lockup, icon set, `AnonDisc`, `WatchEye`, `EventRow`, token-only phone/desktop frames. |
| `lo-shell.jsx` | Deliverable 1 — headers, bottom nav, shell screens, slot-parity table. |
| `lo-menu.jsx` | Deliverable 2 — signed-out account menu (sheet + dropdown + standalone). |
| `lo-watching.jsx` | Deliverable 3 — the `/watching` signed-out state. |
| `lo-gating.jsx` | Deliverable 4 — logged-out tier-picker moment + the accessible-name spec. |
| `lo-landing.jsx` | Deliverable 5 — reworked CTA block, poster link states, retirement table, ISR note. |
| `lo-onboarding.jsx` | Deliverables 6 + 7 — six public-voice steps, skip variants, return seam. |
| `lo-inventory.jsx` | Deliverable 8 — the state inventory, rendered. |
| `identity-art.jsx` | **Copy of the shipped Phase 7.5 engine** (`design_handoff_phase7_5_identity_imagery/`, via `design_handoff_landing_poster_v2/`). Exports `IdentityArt`, `identityFor`, `IA_PALETTES`, `ia_hashName`. Not new work. |
| `landing-poster.jsx` | **Copy of the shipped landing poster** (`design_handoff_landing_poster_v2/`). `<LandingPoster show width height/>`. Not redesigned by #794. |
| `landing-poster-stack.jsx` | **Copy of the shipped hero animation** (`design_handoff_landing_poster_v2/`). `<LandingPosterAnimation mode="stack"/>`. Motion is unchanged. |
| `landing-events.jsx` | Poster fixture data, copied alongside. |
| `theme-context.jsx`, `design-canvas.jsx` | Prototype chrome. Ignore for implementation. |
| `DECISIONS.md` | Every call Design made under §8, with the reasoning. |
| `SPEC.md` | **Implementation spec** — exact measurements, tokens, type, states, copy, and the accessible-name contract. Self-sufficient; build from this. |

---

## Vocabulary — enforced throughout

- **Watching.** Never "Saved", "Favorites", or "Following". There is no "Saved"
  concept in this product.
- **The Watch eye.** The affordance renders `Eye` from `lucide-react`. There is
  **no heart icon anywhere in this application**, and the word does not appear
  in any file in this drop.
- **Submitted prices** for a user's own submissions; **price check** for admin
  review; a resolved `contest_resolved` is a **price update**, never a callout.

### Two live vocabulary violations found in the code

1. **`components/consumer/tier-picker/definitions/copy.ts`** ships
   `loggedOutEyebrow: 'Save a show · sign in'` today. Replacement copy below.
2. **`components/consumer/definitions/copy.ts`** ships
   `settings.watchlistRow: 'Saved shows'`. Not one of #794's screens — flagged
   for the eng plan as a second one-line fix. It should read **Watching**.

#### Proposed `tier-picker` logged-out copy

```ts
loggedOutEyebrow: 'Watching · free with an account',
loggedOutTitle: "Keep an eye on the ones you can't miss.",
loggedOutSub:
  "Watching is free — it just needs an account to save to. Start on Free; " +
  "pick a lane later if you ever want to chip in.",
```

Footer rail on the logged-out state: `Free forever · no card · we'll put you
back on this show` — it states the return seam, which is the actual objection.

---

## Deliverable 1 — The signed-out app shell

**One shell** (§3.2). Same header, same bottom nav, same four tab slots in the
same positions. Nothing returns `null`, nothing dims, nothing skeletons.

| Slot | Signed out | Signed in |
|---|---|---|
| Header lockup | identical | identical |
| Header search | identical (search is public, §3.11) | identical |
| Header CTA pair | filled **Sign up** + quiet **Sign in** | absent |
| Header account disc | anonymous disc → account menu | avatar → account menu |
| Nav 1–2 · browse, venues | identical | identical |
| Nav 3 · watching | navigates → signed-out state | navigates → your list |
| Nav 4 · me | anonymous disc → account menu | avatar → account menu |
| Watch eye on a card | identical pixels · tier picker on tap | toggles watching |

**Nav tabs are `browse · venues · watching · me`** — matching the shipped
`CONSUMER_COPY.bottomNav.nav.tabs` (`venues`, with the map-pin glyph), not
`search`. Search is reached from the header at both breakpoints.

### The anonymous disc

The signed-out counterpart to the avatar: a filled `--surface-2` disc with a
`--border-strong` ring and the ships-today person glyph in `--fg-muted`. It is a
**resolved** state, never the `loading` disc — a spinner or a hollow ring in that
slot reads as broken, and the slot is the most-looked-at 36px in the app.

### 320px accommodation

At 320 the header row carries **one** CTA. The Sign-in link drops to a quiet mono
rail immediately beneath it, right-aligned. Both are present at every width — no
affordance exists on one breakpoint and not the other — only their position moves.

---

## Deliverable 2 — The signed-out account menu

The menu **stays a menu** (§3.4). Rows, in order:

1. **Get-in card** — the identity card's slot, same footprint, same border:
   anonymous disc · `NOT SIGNED IN` eyebrow · "Browsing as a guest" ·
   full-width **Sign up free** · "Already have an account? **Sign in**".
2. `APP` — **Theme** (expanded by default the first time; three of nine swatches
   shown, mono caption `3 OF 9 · SAVED ON THIS DEVICE, NO ACCOUNT NEEDED`).
3. **How Concert Crawl works · 2 min** — the retooled onboarding's permanent
   route (§3.7).
4. **Terms** · **Privacy**.
5. Version footer / **Changelog**.

Absent signed-out: Submitted prices, Settings, Sign out. Nothing is rendered
disabled.

`ThemeMenuRow` already handles the signed-out case correctly in code (no token →
local write only, no `patchMe`, no `ThemeSync` revert). No change needed there.

---

## Deliverable 3 — `/watching` signed out

The tab **navigates** (§3.3), so this is a real page and the best teaching
surface in the app. It teaches **both ways**:

1. **Definition** — eye mark, `WATCHING` eyebrow, "Keep an eye on it.", and two
   sentences on what the surface is.
2. **Worked example** — three sample rows inside a dashed container, showing a
   drop (`−$7` in `--success`), a `flat`, and a `SOLD OUT`. Captioned
   `EXAMPLE · NOT YOUR LIST`.
3. **Three facts** — the eye is the gesture · we watch the price · free and
   staying free.
4. **CTA** — Sign up free (primary) · Sign in (quiet) · `OR KEEP BROWSING →`.

**Accessibility:** the example block is `aria-hidden="true"` and needs a
visually-hidden text alternative next to it ("Example: a Watching list showing
three shows, one with a seven-dollar price drop"). A screen-reader user must
never mistake sample rows for their own shows.

**Public route, gated payload.** Nothing on this page is fetched. Broadening the
middleware matcher to include `/watching` must not make a watch list servable
without a session.

---

## Deliverable 4 — The gating beat

Extends the **shipped** logged-out picker state. #781 owns the mechanics and the
visuals; this changes two things: the header copy (above) and the accessible-name
contract.

### The hard problem: identical pixels, honest name

§3.10 locks gated affordances to look identical at rest — full-strength eye, no
lock glyph, no dimming. So the honesty has to live entirely in the accessible
name and the popup contract:

| Affordance | Signed out | Signed in |
|---|---|---|
| Watch eye (card + detail) | `Watch Geese — sign up to start watching` | `Watch this show` / `Watching, click to stop` |
| Follow artist | `Follow Geese — sign up to follow artists` | `Follow Geese` / `Following, click to stop` |
| Calendar export | `Add to calendar — sign up to export` | `Add to calendar` |
| Account slot | `Account menu — sign up or sign in` | `Account menu` |

Rules:

- **Name states the outcome.** No visible word is added; `aria-label` overrides
  the icon's implied name.
- **No `aria-pressed` signed out.** The eye is not a toggle without a session, so
  it must not report a pressed state. Omit the attribute — do not ship
  `aria-pressed="false"`.
- **Declare the dialog.** `aria-haspopup="dialog"` + `aria-expanded`, so AT
  announces "opens a dialog" *before* activation.
- **Focus moves in, then back.** Open → focus the sheet/modal heading, trap
  inside. Dismiss → return focus to the affordance.
- **Announce the seam** once, via `role="status"`, on return (deliverable 7).
- **Never dim, never lock.** No gated variant of the eye exists. Contrast and hit
  area are identical on both sides of the auth boundary.

---

## Deliverable 5 — Landing CTA block

- Primary **Browse shows** → `/events`. Secondary **Sign up**. One mono line:
  `NO ACCOUNT NEEDED TO LOOK AROUND`.
- **Sign in** moves to the top bar as a quiet text link, at both breakpoints.
- **"I have a code"** and the **waitlist** CTAs retire.
- **The four hero posters become links.** The poster itself and its stack
  animation are the shipped ones (`LandingPoster` + `LandingPosterAnimation`
  mode="stack" from `design_handoff_landing_poster_v2/`) — #794 does not
  redesign either. It adds only link chrome: whole card is one target, hover
  lifts −4px, focus-visible draws the 2px `--focus` ring at offset 3, press
  settles, and an arrow badge appears on all three. Accessible name per card:
  `{artist} at {venue}, {date}. See the show`.
  *(In the canvas only the desktop artboard runs the live animation, and at a
  20s interval rather than the shipped 5.2s \u2014 each advance remounts hero-scale
  identity art, and a 48-artboard document can't absorb that every five seconds.
  Production runs one stack on one page at the shipped interval.)*
- Under the row: **See all 214 shows this week →**. This is what stops the
  posters being the only implicit way in (§3.9's *why-not posters-only*).

**The block simply gets shorter.** Nothing moves into the retired CTAs' space —
the poster row moves up into it.

**ISR:** middleware already redirects a signed-in request off `/` to `/events`,
so `/` only ever renders for a visitor with no session. That means the CTA block
needs **no auth branch at all** — no `auth()`, no `cookies()`, ISR intact, no
client island required. If a signed-in variant of `/` is ever wanted, the island
boundary is this block and nothing else.

---

## Deliverable 6 — Onboarding, retooled

Six steps, **post-auth**, in public voice. Order changed:
`welcome → how → today → theme → notyet → done` — the theme step moves ahead of
"what's missing" so the tour ends on momentum rather than on a gap list.

- **Survives:** the theme step (nine themes, one token set) and all the
  price-source honesty material (box office / community / resale, "if we can't
  find a price we say so", verifications expire).
- **Rewritten:** the founder note loses "this is a private beta" and "friends,
  you're here early on purpose". `BetaPill` goes with the beta-artifact
  retirement (not #794's to remove, but it must not appear here).
- **Replaced:** the beta feedback ask on the final step becomes the
  price-submission ask, in public voice.
- **Skip** sits in the top rail on **every** step, same position. Default weight:
  quiet mono link. Mid-intent (arrived from a Watch tap): the rail states the
  pending action and Skip becomes an outlined button naming the destination —
  *Skip — back to Geese*.
- **Entered from the account menu:** rail reads `HOW IT WORKS` with no step
  counter, and Skip reads **Close**.
- Ends by **returning you where you were**.

---

## Deliverable 7 — The post-signup return seam

`Tap the eye → tier picker → Clerk sign-up (redirect_url + intent) → welcome
tour (skippable, rail names the pending show) → back where you were, action
applied.`

The same seam serves §3.12's gated-route redirect. Both preserve a destination;
the post-signup path also preserves an action.

**Confirmation:** an inline strip on the destination — filled eye, "Now watching
Geese.", mono subline "Kept while you were signing up", `View` link. It is a
`role="status"` `aria-live="polite"` region, **announced once**, dismissed after
**6 seconds** or on any navigation. The eye is *already* filled when the page
paints; the strip explains the change, it doesn't perform it.

**If the action can't be replayed** (show sold out, unlinked, expired): land on
the destination anyway, with no confirmation strip and no error. Never bounce to
`/`.

---

## Deliverable 8 — Signed-out state inventory

Rendered in section 8 of the canvas (`lo-inventory.jsx` holds the data as
`LO_INVENTORY`, grouped: Routes · Shell mobile · Shell desktop · Account menu
rows · Affordances · **Protected-layout mounts** · Copy to fix). Rows marked
*identical* need no change and are listed so the eng plan can close them out fast.

### Protected-layout mounts — the group most likely to be missed

`apps/web/src/app/(protected)/layout.tsx` makes **no `auth()` call**. Gating is
entirely edge middleware. So the moment `/events`, `/events/[id]`, `/venues`,
`/search` and `/watching` join the public matcher, five components begin
mounting for anonymous visitors. Only one of them self-gates today.

| Mount | Signed out | Signed in | Note |
|---|---|---|---|
| `FeedbackEdgeTabGate` | **Hidden** | Present (until beta-artifact retirement) | Gates on `pathname.startsWith('/admin')` only — needs an `isSignedIn` check |
| `FeatureDropPillGate` | **Hidden** | Present | No auth check today — needs one |
| `FirstWatchNudgeGate` | Renders nothing, but mounts and holds auth-dependent effects | Nudge on first watch | Early-return before the effects |
| `OnboardingThemeFlush` | Nothing to flush — logged-out theme is localStorage-only (§3.4) | Flushes the onboarding theme pick to the server | Early-return before the effects |
| `LifecycleNudgesGate` | Already self-gates (`!isSignedIn → null`) | Present | No change |

**Decision — `FeedbackEdgeTabGate` is hidden signed out.** It is not treated
like Submit a price. Submit a price is *contextual*: it sits on one show, the
visitor arrived with a reason, and routing them to sign-in preserves that
reason. The edge tab is *omnipresent chrome* on every screen with nothing behind
it but an auth-only endpoint — routing it to sign-in would make the closest
thing this app has to a sticky element into a conversion surface, which is the
spirit of §3.6's no-persistent-nudge rule. It stays hidden until it retires with
the beta artifacts, which closes the window where it would otherwise ship broken.

**Decision — `FeatureDropPillGate` is hidden signed out.** A pill promoting a
new feature to someone with no account is a persistent nudge (§3.6) *and* a
teased background feature (#781's hidden-not-teased rule). Both say hide it.
Feature drops are for people who have the app; a visitor's first job is the
calendar.

Highlights for sequencing:

- `/watching` is the only **public route with a gated payload** — it needs its
  own test.
- **Five protected-layout mounts** begin rendering for anonymous visitors the
  moment the matcher broadens. Two need new gates, two need early-returns, one is
  already correct.
- `/artists/[slug]` is a **dependency on #1115**, not a no-op — the route does
  not exist yet.
- `/me`, `/admin`, and every authenticated `/v1` route must stay gated as the
  public matcher broadens. Security-relevant.
- `REQUIRE_BETA_AUTH` spans events, search, venues, and price submissions off one
  flag with two different bars. Design assumes public reads are available; the
  flag's disposition is an eng-plan call.

---

## Themes & tokens

Electric / Jade / Light are mocked; production ships nine off the same token set.
**Every color in the app chrome is `var(--*)`** — headers, nav, menus, sheets,
rows, the tier picker, the onboarding steps.

Three things are deliberately *not* token-driven, and all three are correct:

1. **Theme-preview swatches** (the nine in the account menu's picker and on
   onboarding step 4) render other themes' tokens as literals — that is what a
   preview is.
2. **Identity artwork** (row tiles, hero posters) comes from the Phase 7.5
   `IA_PALETTES` riso set, which is theme-independent by design: the same artist
   paints the same picture in electric, jade, and light. Row tiles index that
   palette via `ia_hashName`; they are a cheap 4-band reduction of the full
   generator, which production should replace with `<IdentityArt scale="tile"/>`
   (the full generator emits hundreds of SVG nodes per tile — fine on one hero
   poster, fatal on a canvas holding ninety rows).
3. `theme-context.jsx` and `design-canvas.jsx` are prototype chrome.

No screen file in this drop invents a hex.

Type: **Inter** for anything human (500–900); **JetBrains Mono** for anything
factual — prices, dates, eyebrows, status rails — always uppercase with
0.08–0.16em tracking.

## Accessibility floor held throughout

44px minimum hit areas (including the 26px bottom-nav disc, whose target is
56×44); visible `--focus` ring at 2px offset 2; keyboard reachable in DOM order;
honest names on identical-looking gated affordances; state changes at the auth
seam announced once.

---

## Out of scope (named, not designed)

#781's paywall mechanics and tier-picker visuals · Clerk's sign-in/sign-up
screens · beta-artifact retirement (`BetaPill`, waitlist modal, `invite_verified`
gate) · artist detail's visual design (#1115) · SEO implementation · the
implementation plan.

## Open questions for engineering

1. **Intent replay.** Does `intent=watch:{id}` get replayed server-side on first
   authenticated request, or client-side after hydration? The confirmation strip
   assumes the eye is already filled on first paint.
2. **`/watching` matcher.** Public route, gated payload — confirm the page can
   render without any `GET /watching` call at all.
3. **`REQUIRE_BETA_AUTH`.** Design assumes public reads. If the flag stays on for
   any of the four routers at launch, half of this drop is unreachable.
4. **`loggedOutEyebrow`.** The replacement copy is a one-line edit — worth
   landing ahead of the rest of #794, since the violation ships today.
