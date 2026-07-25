# #794 — Logged-out App UX — Design Brief

**Ticket:** [#794](https://github.com/HartiganHM/concert-crawl/issues/794) — `type: design` · `phase: launch` · `priority: normal`
**Track:** 2 (needs design)
**Brainstorm date:** 2026-07-25
**Status:** Brief locked — awaiting Claude Design handoff production

---

## 1. Purpose

Concert Crawl has never had a logged-out state. Every consumer surface sits behind Clerk, and a visitor without an account reaches exactly one page: the marketing landing. At public launch that stops being viable — the calendar is the product, and a product nobody can look at cannot be shared, indexed, or evaluated.

This brief covers the shape of the app for a visitor with no account: what they can reach, what the navigation looks like when half of it is about a user who doesn't exist yet, and how they cross the line into having an account without being nagged across every screen.

**The problem, stated plainly:** the app's navigation assumes a signed-in user, so every slot that describes *you* degrades rather than adapts — a mobile profile entry that disappears, a nav tab stubbed with a placeholder glyph, a desktop menu whose trigger works but whose contents are written for somebody with an account, a Watching page that returns `null`, and no route at all from the front door into the calendar.

---

## 2. App context

### What actually exists today

- **Middleware gates everything.** `apps/web/src/middleware.ts` declares a public list of `/`, `/auth/code(.*)`, `/sign-in(.*)`, `/api/webhooks(.*)`, `/api/pwa/icon(.*)`, `/legal(.*)`. Every other route redirects an anonymous request to `/`. `/onboarding(.*)` and `/sign-up(.*)` are additionally invite-gated behind an `invite_verified` cookie. A signed-in redirect off `/` to `/events` already exists here.
- **Consumer routes live under `(protected)/(main)/`** — `events`, `events/[id]`, `venues`, `venues/[slug]`, `watching` — plus `(protected)/search` and `(protected)/me`.
- **The nav components already branch on auth, and each branch stops at a different place.** They are not uniform, and the differences matter to Design:
  - `MobileProfileEntry.tsx` returns `null` outright (`if (!isSignedIn) return null`). The mobile header's profile entry simply vanishes.
  - `BottomNav.tsx` tab 4 falls back to a bare `PersonIcon` — a stub glyph, not a designed state.
  - `UserMenu.tsx` **does not return null.** It handles signed-out deliberately: `if (!userId)` resolves the avatar loading state immediately so the trigger renders a neutral/anonymous disc rather than hanging on a spinner. So the desktop **trigger already works logged-out** — it is the **menu body** that assumes a signed-in user (an empty email in the identity card, plus signed-in-only rows like Submitted prices and Sign out). This is a better starting position than "nothing exists": Design is replacing a menu's contents, not inventing a trigger.
- **`/watching` returns `null` with no token.** Not an empty state — nothing.
- **The API is public-capable, behind one global flag.** `REQUIRE_BETA_AUTH` is not a venues-only switch — when it is `'true'` each of four routers installs its own auth middleware via a router-level `use('*')`: **events** (`events.ts` — so list, `/:id`, `/genres`, and `/availability` all gate together), **search** (`search.ts`), **venues** (`venues-public.ts`), and **price submissions** (`price-submissions.ts`). The middleware is not uniform — events uses `serviceOrClerkAuth`, which also admits a service token, while the other three require a real user session (`requireAuth`). Same flag, four call sites, two different bars. With the flag off, all of those serve unauthenticated requests; integration tests cover both states.

  So the data layer needs no new endpoints — but **flipping this one flag is the switch that makes the API public**, and it is the highest-risk line in the whole vertical. Its disposition is an eng-plan decision, not a design one. Design should assume public reads are available.
- **The landing page is ISR-cached** (`revalidate = 300`), fetches `/v1/events?limit=4` through `publicApiClient`, and renders the results through `LandingPoster` as **display only — the posters are not links.** Its CTAs are primary *"I have a code"* → `/auth/code`, secondary *waitlist* (modal), tertiary *"Sign in"* → `/sign-in`. All three are beta-era artifacts.
- **A logged-out tier-picker state already ships.** `components/consumer/tier-picker/definitions/copy.ts` carries `loggedOutEyebrow`. #794 extends something real rather than inventing it.
- **The onboarding flow is six steps and runs pre-auth.** `OnboardingShell.tsx` sequences `welcome → how → today → notyet → theme → done` (founder note, price-source honesty, what it does today, what's missing, theme picker, you're in) and then calls `router.push('/sign-up')`. Its copy is heavily beta-insider — *"This is a private beta"*, *"Friends, you're here early on purpose"* — and `BetaPill` appears throughout.
- **No Clerk `<SignedIn>` / `<SignedOut>` components are used anywhere.** Auth branching goes through `useAuth()` / `useUser()` hooks.

### Vocabulary — non-negotiable

- **Watching** is the only show-tracking concept. Never "Saved", "Favorites", or "Following". There is no "Saved" concept in this product.
- **The Watching affordance is an eye.** `WatchShowButton.tsx` imports `Eye` from `lucide-react`. There is **no heart icon anywhere in this application** — do not write "heart" in any handoff artifact. Say *the Watch eye* or *the Watching affordance*.
- **Submitted prices** for a user's own submissions; **price check** for the admin review.

Note for the handoff: `tier-picker/definitions/copy.ts` currently reads `loggedOutEyebrow: 'Save a show · sign in'`, which violates the rule above. Design should propose replacement copy; the fix itself is a one-line edit for the eng plan.

### Voice

The landing page and onboarding both speak in Hugh's voice — first person, direct, honest about limits. The logged-out app should sound like the same person. It should not sound like marketing, and it should never imply the visitor is missing out on something the app hasn't built yet.

---

## 3. Locked decisions

Each of these was decided in the 2026-07-25 brainstorm and signed off row by row. Design consumes them; it does not re-open them.

### 3.1 — Public reach is the **full read-only app**

Browse, Venues, Event detail, Venue detail, and Artist detail are all public and complete. Gated: Watching, `/me`, submitted prices, settings.

*Why-not a metered window* (public browse capped to a short horizon): it buys conversion pressure by making the product look thinner than it is, and it breaks shared links unpredictably — the same URL works or doesn't depending on when someone opens it.

*Why-not gating detail pages:* every gated page is a page no search engine can index and no friend can share.

### 3.2 — **One shell** with signed-out variants, not a separate public shell

Identical structure across the auth boundary: same header, same bottom nav, same four tab slots in the same positions. The slots that render `null` today get purposeful signed-out content. Signing in *fills things in*; it does not move you to a different product.

*Why-not a distinct marketing shell:* two navigations to design, test, and maintain, and signing in would feel like entering a different application.

*Why-not hybrid by breakpoint* (app shell on mobile, marketing header on desktop): mobile/desktop parity is non-negotiable in this project, and a breakpoint-dependent navigation is exactly what that rule exists to prevent.

### 3.3 — The **Watching tab navigates**, to a designed signed-out state

Tab 3 behaves like a tab. It routes to `/watching`, which renders a real signed-out state: what Watching is, what it does for the visitor, and a sign-up CTA.

*Why:* it is the one screen a visitor reaches by deliberately asking *what is this?* — the best teaching surface in the app.

*Why-not firing the tier-picker sheet from the tab:* a sheet that dismisses back to nothing wastes that intent, and it makes a nav tab that never navigates.

### 3.4 — The **account menu still opens** when logged out

Tab 4 and the desktop `UserMenu` remain menus. They carry the auth-independent items — **theme picker**, legal links, version/build — with **Sign up / Sign in** occupying the position the identity card holds when signed in.

*Why:* theme is a device preference, not an account feature, and nine themes off one token set is the most memorable thing in this app. Keeping the menu a menu also means the slot behaves consistently across the auth boundary.

*Why-not relocating the theme picker out of the menu entirely:* conceptually the cleanest option, but it edits a shipped signed-in surface and widens #794's blast radius past its own scope.

### 3.5 — Header CTA leans **sign up**

One filled **Sign up** as the primary; **Sign in** as a quiet adjacent text link.

*Why:* launch traffic arriving logged-out skews new, and returning users already know where the door is.

### 3.6 — **No persistent signup nudge.** Conversion is contextual only

No sticky strip, no banner, no dismissible first-visit interstitial, no end-of-list block. Three mechanisms carry all conversion: the header CTA, the inherited tier-picker-on-tap, and the `/watching` signed-out state.

*Why-not a persistent strip:* the mobile baseline here is 320px, where a sticky bar is a material share of the viewport — and the product's entire argument *is* the calendar. Covering the calendar to advertise the calendar argues against itself.

### 3.7 — Onboarding becomes a **post-auth welcome**, skippable and permanently reachable

Account creation comes first and stays fast. The retooled flow then runs as a welcome-and-thanks, carries a visible skip for anyone who arrived mid-intent, and ends by returning the user to wherever they left. It also gets a **stable route reachable any time from the account menu**, so it stops being a one-shot.

Surviving content: the **theme step** and the **price-source honesty material** (box office / community / resale, verifications expire). The beta-insider voice is rewritten for a public audience.

*Why-not keeping it pre-auth:* six screens between *"I want to watch this show"* and *"I have an account"* is where you lose people, particularly a visitor who arrived on a shared event link.

*Why-not decoupling it entirely:* many users would never see it, so anything load-bearing inside would need a second home.

### 3.8 — `/` stays the **marketing landing** for logged-out visitors

It is the surface that can carry a pitch without taxing the app, and it is what a cold link from social should hit. The signed-in redirect to `/events` already exists in middleware and stays.

### 3.9 — The landing page's **primary CTA becomes "Browse shows"**

Primary *Browse shows* → `/events`. Secondary *Sign up*. The *"I have a code"* and *waitlist* CTAs retire. **The four hero posters become live links** into their own event detail pages.

*Why:* consistent with 3.6 — the landing page's job is to get people into the calendar, where the product argues for itself, not to extract an account first.

*Why-not posters-only as the entry:* too implicit. A visitor uninterested in those four shows may never learn there is a whole calendar behind them.

### 3.10 — Gated affordances look **identical to signed-in** at rest

Full-strength Watch eye. No lock glyph, no dimming, no muted token. The tier picker appears **on tap**, with feature-anchored copy.

*Why-not a lock glyph:* the eye appears on every card in a dense calendar; a repeated lock mark makes a fully-working read-only app look half-broken.

*Why-not dimming:* muted interactive controls read as "broken" or "loading", and reduced-contrast interactive targets are an accessibility defect.

*Why-not hiding active affordances* (extending #781's background-features-hidden rule): it would remove every contextual conversion moment, leaving the header CTA to do the whole job alone.

**Constraint this creates, and Design owns it:** when the pixels are identical, the **accessible name must still be honest**. A screen-reader user must not be told they are activating something that will instead open a tier picker.

### 3.11 — **Search is public**

It is a read of public data. A visible search affordance that traps the visitor into a sign-in wall is worse than no search affordance.

### 3.12 — Gated routes redirect to **sign-in with the return path preserved**

Not to `/`, as middleware does today. Same seam as the post-signup return in 3.7.

---

## 4. What Design will produce

A handoff drop at `design/design_handoff_logged_out_ux/` covering:

1. **The signed-out app shell** — header (mobile and desktop) and bottom nav, shown beside their signed-in counterparts so the "slots fill in" model is legible. Both breakpoints, full parity.
2. **The signed-out account menu** — mobile sheet and desktop dropdown, with the theme picker, legal, version, and the Sign up / Sign in pair in the identity card's position.
3. **The `/watching` signed-out state** — the app's primary teaching surface. What Watching is, what it does, how to get it.
4. **The tier-picker-on-tap moment for a logged-out visitor** — extending the shipped `loggedOutEyebrow` state, not redesigning the picker. Include proposed replacement copy for the vocabulary violation noted in §2.
5. **The reworked landing page CTA block** — new hierarchy, retired CTAs removed, and the hero posters treated as links (including their interactive states).
6. **The retooled onboarding flow** — all six steps in public voice, plus the skip affordance and the return-in-place ending. Show what the entry from the account menu looks like.
7. **The post-signup return seam** — what the visitor sees between "account created" and "back where I was", including how the completed action is confirmed.
8. **A signed-out state inventory** — every surface that changes, what it shows logged-out, and what it shows signed-in. This is the artifact the eng plan will task off.

Standard drop conventions apply: `README.md`, a decisions log, and the interactive canvas.

---

## 5. Technical requirements

- **Themes:** mock Electric / Jade / Light (the three base themes; production ships nine off the same token set). Token-only colors via `var(--*)`. No hardcoded hex.
- **Breakpoints:** 320px baseline through desktop. Full mobile/desktop behavioral parity — no affordance exists on one and not the other.
- **Accessibility:** keyboard reachable, visible focus, 44px minimum hit areas, honest accessible names on identical-looking gated affordances (§3.10). Announce state changes at the auth seam.
- **The landing page is ISR-cached** (`revalidate = 300`). Calling `auth()` or `cookies()` in that server component forces dynamic rendering on every request and kills ISR. Any auth-dependent behavior on `/` must be an ISR shell plus a Client Component island. The existing code comment says this explicitly — respect it.
- **Public pages must be indexable.** Titles, metadata, and shareable URLs are part of why 3.1 was chosen.
- **Middleware public list must expand** to cover the routes in 3.1. This is where the change actually lands, and it is security-relevant: broadening the public matcher must not accidentally expose `/me`, `/admin`, or any authenticated `/v1` route. `/watching` is a special case: per §3.3 the **route** becomes publicly reachable so it can render a designed signed-out state, but a visitor's watch list is per-user authenticated data and must never be fetched or served without a session. Public route, gated payload.
- **`REQUIRE_BETA_AUTH`** is a single global gate spanning events, search, venues, and price submissions (see §2). Its disposition at launch is an eng-plan question — and a security-relevant one — but Design should assume public reads are available.
- **No new icon set.** Use what ships.

---

## 6. What's NOT in this brief

- **Per-feature paywall mechanics and tier-picker visuals** → #781. #794 consumes the locked mechanic and never re-opens it.
- **The sign-in and sign-up screens themselves** → Clerk owns those.
- **Beta-artifact retirement** — `BetaPill` across the app shell, waitlist modal removal, lifting the `invite_verified` gate in middleware. This is launch-readiness work that also touches signed-in surfaces. #794 names the dependency; it does not own it.
- **Artist detail's own design** → already 🟢 Green via #1115. #794 only establishes that it ships public from day one.
- **SEO / indexability implementation** → a technical requirement above, not a design deliverable.
- **The implementation plan** — route changes, middleware sequencing, PR breakdown, test plan, rollback. That belongs to the eng plan, not to Design.

---

## 7. Decisions inherited

From **#781** (monetization):

- **Active affordances** — the Watch eye, artist Follow, Calendar export — use **tier-picker-on-tap with feature-anchored copy.**
- **Background features** — Spotify sync, Alerts, Price-drop alerts — are **hidden**, not teased.

From the project's standing rules:

- Locked customer-facing vocabulary (§2). **Watching**, never Saved/Favorites/Following. **Eye, never heart.**
- Mobile/desktop parity is non-negotiable.
- All customer-facing strings live in `definitions/copy.ts`.
- Nine production themes off one identical token set; three carry `role: 'base'`.

From **#1115** (artist page): the page is Free tier and fully usable signed-out. #794 confirms rather than changes this.

---

## 8. Open for Design to call

- How the "slots fill in" relationship is made legible — whether the signed-out header and nav read as *incomplete* or simply as *different*, and which is better here.
- The `/watching` signed-out state's structure: does it teach with copy, with a representation of what a populated Watching list looks like, or both.
- Whether the Sign up / Sign in pair in the account menu sits where the identity card sits, or somewhere more prominent within the menu.
- The skip affordance's weight in the retooled onboarding — how easy skipping should be, and whether it reads differently for someone who arrived mid-intent.
- How the completed action is confirmed at the return seam, and for how long.
- The hero posters' interactive treatment on a page that has never had interactive content.
- Replacement copy for `loggedOutEyebrow`.
- Whether anything in the retired code/waitlist CTA space needs to absorb their absence, or whether the block simply gets smaller.

---

## 9. Cross-references

- Design pipeline workflow: `docs/superpowers/design-pipeline.md`
- Beta-to-launch plan: `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
- #781 monetization brief and handoff — source of the inherited gating mechanic
- #1115 artist page brief: `docs/superpowers/specs/2026-07-24-1115-artist-page-design-brief.md`; handoff at `design/design_handoff_artist_page/`
- Middleware: `apps/web/src/middleware.ts`
- Shell components: `apps/web/src/components/consumer/app-header/AppHeader.tsx`, `.../user-menu/UserMenu.tsx`, `.../bottom-nav/BottomNav.tsx`, `.../app-header/MobileProfileEntry.tsx`
- Onboarding: `apps/web/src/components/onboarding/OnboardingShell.tsx` and `definitions/copy.ts`
- Landing: `apps/web/src/app/page.tsx`, `apps/web/src/app/_components/LandingClientShell.tsx`
