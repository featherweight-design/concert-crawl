# Design Readiness Review — `design_handoff_logged_out_ux` (#794)

**Verdict: 🟢 Green.** Ready for eng-planning.

| | |
|---|---|
| Ticket | **#794** Logged-out app UX — navigation, header, browse-only shape (Launch · Normal) |
| Brief | `docs/superpowers/specs/2026-07-25-794-logged-out-ux-design-brief.md` (PR #1198) |
| Rounds | R1 → 🟡 Yellow → R2 → 🟢 Green |
| Audited | 2026-07-27 |

---

## How this was audited

Claims were **executed, not read**. All 14 `.jsx` files were transpiled and loaded
into a `vm` context and the authored components rendered through
`react-dom/server` with adversarial props. Prose assertions in `README.md` /
`SPEC.md` / `DECISIONS.md` were treated as hypotheses and checked against both the
rendered output and the live application source.

---

## R1 verdict — 🟡 Yellow

The design shape was right and all 12 locked decisions were honored. One gap
blocked Green.

### The blocker: `(protected)/layout.tsx` mounts five components the drop never named

`apps/web/src/app/(protected)/layout.tsx` makes **no `auth()` call** — gating is
entirely edge middleware. Nothing in the layout signals that its children assume a
session, which is why the group was missed. Broadening the public matcher (the
drop's own correct guidance) mounts all five for anonymous visitors with no other
code change:

| Component | Self-gates? |
|---|---|
| `FeedbackEdgeTabGate` | ❌ gates on `pathname.startsWith('/admin')` only |
| `FeatureDropPillGate` | ❌ no auth check |
| `FirstWatchNudgeGate` | ❌ mounts auth-dependent effects |
| `OnboardingThemeFlush` | ❌ mounts auth-dependent effects |
| `LifecycleNudgesGate` | ✅ `!isSignedIn → null` |

`FeedbackEdgeTabGate` was the sharpest instance: it renders a feedback affordance
to anonymous visitors that leads to an auth-only endpoint.

None appeared in deliverable 8 — the state inventory explicitly billed as "the
artifact the eng plan tasks off." An eng plan built from that table would have
shipped them unchanged.

---

## R2 — closed

Design added a **`Protected-layout mounts`** group to `lo-inventory.jsx` (verified
live: the rendered inventory now reports 7 groups, `Protected-layout mounts(5)`),
mirrored it in the README state-inventory table and `SPEC.md`, and locked three new
decisions:

- **13.** `FeedbackEdgeTabGate` is **hidden** signed out — not routed to sign-in.
  Reasoned against the Submit-a-price seam: that affordance is *contextual* (the
  visitor arrived at one show with a reason, and the return seam gives it back),
  whereas the edge tab is *omnipresent chrome* with nothing behind it. Routing it
  to sign-in would turn the closest thing the app has to a sticky element into a
  conversion surface — exactly what §3.6's no-persistent-nudge rule prevents.
  The second reason is load-bearing for sequencing: **hiding it closes the window
  between public launch and beta-artifact retirement**, so #794 stops depending on
  another ticket landing first.
- **14.** `FeatureDropPillGate` is **hidden** signed out — it is both a persistent
  nudge (§3.6) and a teased background feature (#781).
- **15.** The other three are eng rows, not design calls. `FirstWatchNudgeGate`
  and `OnboardingThemeFlush` need an early return **before** their effects;
  `LifecycleNudgesGate` is listed no-change so the plan closes it fast.

---

## Verified in R2

| Check | Result |
|---|---|
| §3.10 identical pixels, honest name | ✅ signed-out and signed-in-at-rest `WatchEye` emit **byte-identical** style strings while `aria-label` differs |
| ARIA semantics | ✅ signed-out uses `aria-haspopup="dialog"` + `aria-expanded`; signed-in uses `aria-pressed`. Correct — the signed-out tap opens a dialog, so `aria-pressed` would lie |
| Decorative SVG | ✅ `aria-hidden` on the glyph only |
| Hit area | ✅ 44px floor survives `size={0}` |
| All 12 R1 locked decisions | ✅ honored |
| Token discipline | ✅ zero hardcoded hex in any screen file; the only hex is the theme-token source in `theme-context.jsx` / `lo-primitives.jsx` and the canvas chrome + identity art |
| Theme coverage | ✅ 9 production theme sets off one identical token set (3 asked for) |
| "heart" sweep | ✅ clean — the only occurrences are the rule statements themselves |
| No persistent nudge (§3.6) | ✅ zero sticky/fixed positioning anywhere in the drop |
| README ↔ `lo-inventory.jsx` sync | ✅ both carry all five new rows |

---

## Fixes applied during the audit

Three one-line issues, corrected in place rather than spending a round.

1. **`lo-onboarding.jsx:304` — vocabulary violation in the drop's own new copy.**
   The post-signup return strip read `Saved while you were signing up`. This is
   the exact class the drop flags twice elsewhere as a violation to fix in shipped
   copy (`loggedOutEyebrow`, `settings.watchlistRow`), reintroduced in new copy.
   Swept to `Kept while you were signing up` across all four occurrences
   (`lo-onboarding.jsx`, `DECISIONS.md`, `README.md`, `SPEC.md`).

2. **`lo-inventory.jsx:15` — `/artists/[slug]` row overstated.** Read "Fully
   public from day one (#1115) / Confirmed, not changed" for a route that **does
   not exist yet** — #1115 is a Green still awaiting its eng plan. It also
   contradicted `README.md:327`, which correctly called it a dependency. Reframed
   to "Public — but the route does not exist yet; it ships with #1115" /
   "DEPENDENCY on #1115 — not a no-op".

3. **`lo-primitives.jsx` `WatchEye` — hole in the accessible name.** The
   `artist = "this show"` default only catches `undefined`, so `artist=""`
   rendered `"Watch  — sign up to start watching"`. Added
   `const who = artist || "this show";`. Verified across empty string,
   `undefined` and `null`; pixel identity preserved.

Items 2 and 3 were applied after R1 and clobbered by R2's regeneration — they are
reapplied here. R2 independently picked up the `/artists/[slug]` framing in the
README prose, which is how the contradiction surfaced.

---

## Eng scope for the plan PR

Not polish — these need decisions or code the drop does not own.

1. **Broadening the public matcher in `middleware.ts` is the highest-risk line in
   the vertical.** `/events`, `/events/[id]`, `/venues`, `/venues/[slug]`,
   `/search`, `/watching` go public; `/me`, `/admin` and authenticated `/v1`
   routes must not follow.
2. **`/watching` is a public route with a gated payload.** The route renders a
   designed signed-out teaching state, but a visitor's watch list is per-user
   authenticated data and must never be fetched or served without a session.
3. **`REQUIRE_BETA_AUTH` disposition.** One global flag, four routers
   (`events.ts`, `search.ts`, `venues-public.ts`, `price-submissions.ts`), two
   different bars — events uses `serviceOrClerkAuth` (also admits a service
   token), the other three require a real session. Flipping it is an eng-plan
   call.
4. **Three shipped copy strings violate locked vocabulary** and are one-line fixes
   the plan should carry: `tier-picker/definitions/copy.ts` `loggedOutEyebrow`
   (`'Save a show · sign in'`) and `loggedOutTitle`, plus
   `consumer/definitions/copy.ts` `watchlistRow` (`'Saved shows'`).
5. **`/artists/[slug]` is a dependency on #1115**, which has not been built.
6. **Beta-artifact retirement** (`BetaPill`, waitlist modal, lifting the
   `invite_verified` gate, `/auth/code`) is named as a dependency and deliberately
   **excluded** from #794's scope. Decision 13 is what keeps #794 shippable
   without it.
