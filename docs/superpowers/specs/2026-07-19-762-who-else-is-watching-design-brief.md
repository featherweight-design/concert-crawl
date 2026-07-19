# #762 — Who else is watching (design brief)

**Ticket:** [#762](https://github.com/HartiganHM/concert-crawl/issues/762) — Who else is watching — social signal on event detail
**Phase / Priority:** Beta · Normal
**Track:** 2 (needs design)
**Status:** Brainstorm complete; brief locked; awaiting Claude Design handoff production
**Follow-up filed:** [#1096](https://github.com/HartiganHM/concert-crawl/issues/1096) — Attending signal on event detail (v2 of #762)

---

## 1. Purpose

Surface social signal on event detail so a signed-in beta user browsing tonight's shows can see who else is watching — turning a solo discovery moment into a community one and giving them a reason to commit to a show they're on the fence about.

Real scenario: a beta user browsing Tuesday's 7pm DIY-venue show would convert from "maybe" to "going" if they knew two other people they vaguely trust were already watching it. Today they have to text a friend.

## 2. App context

- Lives on the event detail page (`apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`) in the hero zone adjacent to the existing `WatchShowButton`.
- Interacts with the shipped **Watching** feature — `user_events` (rows with `status = 'watching'`), the heart-toggle in the UI, the Watching list page.
- The watch count is already computed on `GET /v1/events/:id` — the server aggregates it locally as `watchingCount` and returns it in the response payload as the `watching` field (see `apps/api/src/routes/events.ts`). The client `WatchShowButton` receives it as the `watchingCount` prop and renders it next to the heart button as `"N watching · alerts on price + sold out"` (see `apps/web/src/components/consumer/watch-show-button/WatchShowButton.tsx`). This brief consolidates that count into a new social-signal surface.
- Handle atom: `user_profiles.handle` is `text().unique()` and **nullable** — anonymous by default. Handles that exist are already publicly visible via shareable_cards (which can land on Twitter/etc.).
- Avatar atom: `user_profiles.avatarColor` enum = `signal` / `accent` / `success` / `warning`. Already used for identity treatment in `IdentityArt`, `UserMenu`, `BottomNav`, `MobileProfileEntry`.
- Beta scale reality: ~50–200 users during the design's relevance window. Most shows will have 0 other watchers. Empty-state behavior matters more than populated-state density.
- Voice: **Sour Patch** — slight cheek + honesty rail + warmth. Never blame the user or the show.

## 3. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Scope: watching signal only** this cycle. | Attending (`attending_at IS NOT NULL`, from #55) is a v2 follow-up tracked in #1096. Keeps this pass tight; attending needs real usage data from #55 before it's worth designing. |
| 2 | **Handle-gated visibility.** Users with a handle set appear by name; users without a handle contribute anonymously to the count. No separate opt-out toggle. | Handle-nullable-by-default means setting a handle is already an active user choice to have a public identity — the same identity that appears on shareable_cards today. Setting/clearing the handle IS the opt-in mechanism. Reuses an existing user-choice signal instead of building a new privacy surface. |
| 3 | **Named handles up to a cap; remaining watchers fold into "and N others."** | Named users get social warmth; un-handled still contribute to the count. Mirrors Instagram/Spotify social-proof pattern. Preserves true count. Creates a soft incentive to set a handle. Cap number is Design's call. |
| 4 | **Hide the surface entirely when 0 other watchers exist.** | Surface presence itself carries meaning. Avoids "no one cares" framing. The heart button already handles the invitation to watch. |
| 5 | **Signed-out (anonymous) users see nothing** on this surface. | Signed-out event-detail treatment is designed comprehensively in #794 (Logged-out UX). This ticket is scoped to the signed-in experience to prevent pre-empting #794's broader decisions. |
| 6 | **New surface replaces the existing button-adjacent count text.** | Consolidates social signal into one canonical block. The `WatchShowButton` keeps `· alerts on price + sold out` as pure affordance context (exact placement/wording is a mock-time call); the new surface owns names + count. |
| 7 | **Exclude self — surface is "others" only.** | Semantics match the ticket title ("who ELSE"). The heart button already communicates the viewer's own participation. Count = other watchers, not total. |
| 8 | **Colored initials + handle text using the existing `avatarColor` atom.** | Reuses the identity pattern from `IdentityArt` / `UserMenu`. No new dependencies. Handled users' visual treatment is consistent with the rest of the app. |
| 9 | **Free tier.** Surface appears for all signed-in users regardless of subscription tier. | Consistent with Watching itself being Free (per monetization matrix). Social density is the beta's lifeblood; gating this behind Premium would starve non-payers of the community moment. |

## 4. What Design will produce

- Hi-fi mockups covering **populated states**:
  - 1 named watcher (with handle)
  - 2–3 named watchers (all handled)
  - Named + "and N others" (mixed handled/un-handled)
  - All-others-no-names (0 handled, N un-handled watchers)
- **Mobile + desktop** parity in the same handoff — no behavioral asymmetry.
- **Themes:** Electric / Jade / Light (this project ships 3 themes, not 9).
- **Empty state:** surface hidden; no mock needed beyond noting the page reflows cleanly when the surface is absent.
- **Loading state** for the async watcher fetch on event-detail SSR/hydration.
- **Adjacency treatment** to the heart button — Design owns exact px, layout, and how the button's retired count text (Q6) is handled visually.
- **Voice pass** on the "and N others watching" tail — Sour Patch, warm, not clinical.
- **Named-handle cap number** (density call) with rationale.
- **Accessibility semantics** — how the surface is announced to screen readers (list vs sentence, `aria-label`).
- **Handle interaction posture** — Design confirms handles are non-interactive plain text (no profile pages exist), or flags an interaction affordance if warranted.
- Component handoff with `var(--*)` token references.

## 5. Technical requirements

- **Signed-in only.** Signed-out users see no surface (Q5 lock).
- **Data:** the event-detail endpoint (`GET /v1/events/:id`) already returns `data.watching` (a number — the total count). This brief adds one new sibling field on the same response: `data.watchers: Array<{ handle: string, avatarColor: AvatarColor | null, initials: string }>` — LIMIT-capped to the top N handled users (N is Design's call, see §8). Un-handled watchers still contribute to `data.watching` but are not returned in `data.watchers`. Single JOIN, cheap at beta scale.
- **All colors via `var(--*)` tokens.** No hardcoded hex.
- **Mobile-first with desktop parity in the same PR** (per `feedback_mobile_desktop_parity`).
- **WCAG AA** — colored initials must maintain contrast against surface tokens across all 3 themes.
- **All customer-facing strings in `apps/web/src/components/consumer/definitions/copy.ts`** (per `feedback_definitions_copy_rule`). No hardcoded strings in JSX.
- **Free tier** — no entitlements gate required beyond `isSignedIn`.

## 6. What's NOT in this brief (out of scope)

| Excluded | Owner / where handled |
|---|---|
| Attending / "going" signal on event detail | [#1096](https://github.com/HartiganHM/concert-crawl/issues/1096) — v2 of this ticket. Blocked on #55 shipping. |
| Signed-out (anonymous) treatment of the event-detail social surface | #794 Logged-out UX |
| Friend / follow graph, "people you trust" ranking | Out of scope in the original ticket; would be a separate future ticket |
| User profile pages | Do not exist; handles render as plain text, not links (implicit) |
| Privacy opt-out toggle for individual watches | Handle set/clear IS the opt-in mechanism (Q2 lock) |
| "A new watcher joined this show" notifications | Different ticket; not this surface |
| Watcher inbox / activity feed | Not this ticket |
| Modifying the Watching feature itself (heart toggle, list page) | Out of scope in the original ticket |
| Retiring the `heroes.watchers` marketing surface's "Aggregate · no names" copy | Left as-is for now; the marketing hero and the in-app event detail can diverge. Worth revisiting in a marketing-copy pass if the divergence bothers us. |

## 7. Decisions inherited

- **Watching = Free** (per monetization tier matrix)
- **Attending / concert history / concert alerts = Premium** (per monetization matrix — reinforces why attending is a separate v2)
- **`avatarColor` enum** = `signal` / `accent` / `success` / `warning` (from `user_profiles`)
- **3 themes** — Electric / Jade / Light (per current project scope; PWA cluster brief confirmed this project ships 3, not 9)
- **Sour Patch voice default** — cheek + honesty rail + warmth; no blame framing
- **All customer-facing strings in `definitions/copy.ts`** (project-wide convention)

## 8. Open for Design to call

- **Named-handle cap** — 3? 5? A density/scannability call that depends on the mocks.
- **Adjacency layout** to the heart button — exact px, whether the button's retired count text is replaced in-line or in a stacked block.
- **Voice** for the un-handled residue — "and 4 others watching" vs "and 4 more" vs alternate treatments.
- **Visual differentiation** between "you're the viewer" state and "you're not" state — Design can decide if any subtle visual treatment differs, though the surface content itself doesn't change per Q7.
- **Accessibility semantics** — sentence vs list vs role-region.
- **Loading skeleton** shape — one line, avatar row, or nothing (rely on fast fetch).
- **Handle interaction** — confirm plain text is fine, or propose a specific interaction that respects the "no profile pages" constraint.

## 9. Cross-references

- **Source ticket:** [#762](https://github.com/HartiganHM/concert-crawl/issues/762)
- **Follow-up ticket (attending v2):** [#1096](https://github.com/HartiganHM/concert-crawl/issues/1096)
- **Adjacent already-locked design:** `design/design_handoff_concert_history/` (attending vocabulary, `attending_at` schema — locked in PR #916, ships as #55)
- **Adjacent already-locked design:** `design/design_handoff_shareable_cards/` (handle-as-public-identity precedent — locked in PR #948, ships as #72)
- **Signed-out treatment ticket:** #794 Logged-out UX
- **Pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Persona + locked decisions:** `memory:feedback_design_track_persona`

---

## Process

Track 2 design ticket per [design-pipeline.md](../design-pipeline.md). After Claude Design produces the R1 handoff to `design/design_handoff_who_else_is_watching/`, runs Readiness Review before opening the plan PR. Handoff prompt to Claude Design is delivered separately (chat, not committed).
