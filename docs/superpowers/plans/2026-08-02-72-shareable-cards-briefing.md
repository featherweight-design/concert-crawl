# Epic Run Briefing — Shareable cards (#72) + Concert Passport (#85)

**Epic:** #72 Shareable show cards (IdentityArt) — closes on PR-3 · #85 Concert passport — closes on PR-5. Both open.
**Execution plan:** `docs/superpowers/plans/2026-07-27-72-shareable-cards.md` (merged) — **stale in four places, see Current state.**
**Design handoff:** `design/design_handoff_shareable_cards/` — READINESS.md 🟢 Green (post-addendum 2026-07-14, PR #948).

---

## Source of truth (read in this order)

1. **This briefing** — it overrides the execution plan wherever they disagree.
2. `docs/superpowers/plans/2026-07-27-72-shareable-cards.md` — task-level detail, still correct outside the four corrections below.
3. `design/design_handoff_shareable_cards/README.md` + `READINESS.md` — visual spec and locked calls.
4. `CLAUDE.md` — conventions, locked vocabulary, worktree discipline.

The handoff `.jsx` files are **read-only references**. Nothing in them ships.

---

## Current state (verified 2026-08-02 against `origin/main` @ `54b884bc`)

The plan was written 2026-07-27. #794, #70 and #1225 have merged since and moved the ground under it.

| Plan claims | Reality on `origin/main` | Consequence |
| --- | --- | --- |
| `middleware.ts` has one `isAlwaysPublic` matcher that #794 will broaden; three-step collision mitigation needed (plan lines 83–93) | PR #1254 **split the file into two matchers**. `isAlwaysPublic` = `/`, `/auth/code`, `/sign-in`, `/api/webhooks`, `/api/pwa/icon`, `/legal`, `/changelog`. `isPublicOnceLaunched` = `/events`, `/venues`, `/artists`, `/search`, `/watching`, `/onboarding`, `/sign-up`, gated on `NEXT_PUBLIC_PUBLIC_BROWSE === 'true'` | No merge conflict remains. **Ignore the mitigation list entirely.** PR-0 is choosing between two matchers, not appending to one. See Launch gating. |
| "There is no `attending_at` column" (plan line 97); PR-4/PR-5 blocked on #70 | `userEvents.attendingAt` exists (`packages/db/src/schema/social.ts:60`), partial index and all. #70 merged 2026-07-31 | **PR-4/PR-5 are unblocked.** |
| Task 16 Step 1 selects `user_events.status = 'going'` | Dead value. `social.ts:17-28`: attendance moved to `attendingAt`, `going` is derived from `attending_at IS NOT NULL`, **migration 0065 nulls out every remaining `going` row**, enum values retained but unreachable — *"Do not reintroduce writes to them."* | As written, **PR-5 ships a permanently empty Passport** that passes fixture-based tests. Select on `attendingAt IS NOT NULL`. Verify against a seeded DB, not fixtures. |
| `ENTITLEMENTS_MATRIX['concert-history'].supporter = 'paywall-on-tap'`; drift needs a Hugh call (plan lines 99–103) | PR #1225 (2026-07-29) set it to `'visible-active'` (`packages/entitlements/src/index.ts:64-71`). The matrix now agrees with both handoffs | **Resolved. No escalation.** PR-5 still calls `canUseFeature(state, 'concert-history')` and hardcodes no tier — that part of the plan stands. |

Also verified, and **not** stale:

- `PassportTeaser.tsx` exists (`apps/web/src/components/consumer/history/PassportTeaser.tsx`), already mounted at `HistoryContent.tsx:104` taking `stats` + `shows`, with `'See your Passport →'` in `history/definitions/copy.ts:78`. **PR-5 wires it; it does not create it.**
- The `isAlwaysPublic` doc comment requires a negative test per new pattern proving private neighbours still redirect.
- `apps/web/src/app/api/pwa/icon-512/route.tsx` is the in-repo `ImageResponse` + `runtime = 'edge'` precedent the render routes copy.
- Both #72 and #85 open (REST-checked; `gh issue view` fails on this repo with a Projects-classic GraphQL error — use `gh api repos/HartiganHM/concert-crawl/issues/N`).

---

## Risk shape — **content/data-driven, with a copy/IA tail**

The poster and passport are rendered *from crawled event data* into an immutable PNG that gets sent to people outside the product. Two consequences drive where to over-invest:

1. **The long tail is the risk, not the happy path.** A 40-character artist name, a null venue city, a missing price block, an artist name that is a single emoji, a 9-word co-headliner string — each produces a broken card that we cannot recall once it is in someone's iMessage thread. **Gate 2 runs with deliberately ugly fixtures drawn from real prod rows**, not clean ones.
2. **Satori is not a browser.** The whole `IdentityArtPrint` exercise exists because `mixBlendMode`, `backdropFilter`, `maskImage` and `feTurbulence` all silently no-op or drop layers. A dropped layer does not throw — it renders a plainer card. The render-through tests (plan Task 4 Step 6, Task 7 Step 10) are the only thing standing between us and that, so they are not optional and must assert more than "non-empty buffer" where they can.

Gate 6 does not fire — this epic creates no records in response to events. Gate 5 fires on the share journey.

---

## Launch gating — **DECIDED: `isPublicOnceLaunched`**

`/e/(.*)` and `/share/(.*)` go into **`isPublicOnceLaunched`**, not `isAlwaysPublic`. Do not build a new flag; `isPublicBrowseEnabled()` (`apps/web/src/lib/launch-mode.ts`) already exists, defaults false, and is build-time inlined so flipping it needs a redeploy.

**Why**, so edge cases can be judged rather than looked up: Concert Crawl is in private beta until the Aug 18–22 window, and `main` auto-deploys to prod with no human gate between merge and public exposure. Putting a browse vertical into `isAlwaysPublic` is precisely what made a private-beta product publicly readable in #794 — the inline comment on `/artists` says so in as many words. #1115 (`/artists`) and #764 (`/venues`) both chose `isPublicOnceLaunched`.

**The cost is near zero pre-launch.** The middleware early-returns for signed-in users, so during private beta the sharer gets the entire feature: share pill, sheet, live PNG preview, Save image, Copy link. Only a *signed-out recipient's* landing is dark, and only until the flag flips.

**The cost that is real, stated honestly:** OG unfurls cannot be verified in prod before launch, because a crawler carries no session and will be redirected. Verify them on staging with the flag on, and put "paste a real `/e/` link into iMessage and Slack" on the launch-day runbook rather than claiming it is covered.

**Not gated:** `/passport/[ratio]` is deliberately authenticated and appears in **neither** matcher — it renders personal data. A `public` cache header on that route would be a data leak; the plan's `private, max-age=300` is correct and must be asserted in a test.

---

## Off-happy-path homes — **REQUIRED**

Three states a recipient can land in that the plan does not address.

### 1. Dead link — event deleted or bad id → **needs a real 404 page, and PR-0 owns it**

`notFound()` in `/e/[id]` does **not** inherit the app's 404. The only `not-found.tsx` in the repo is `apps/web/src/app/(protected)/(main)/not-found.tsx`, and `/e/[id]` sits outside that route group — so today it would render Next's bare built-in 404: no nav, no branding, no way back. That is Defect Class row 6 (a surface with no way back) shipped straight to someone's first-ever contact with the product.

**Decision:** PR-0 creates `apps/web/src/app/e/[id]/not-found.tsx` — a minimal branded surface with copy in `CONSUMER_COPY.publicEvent` and **one** CTA.

**Where that CTA points is launch-mode-dependent, and this is the trap:** `/events` is in `isPublicOnceLaunched`, so pre-launch a signed-out visitor sent there is bounced to `/sign-in`. Two dead ends in a row. The CTA therefore points to `/` when `isPublicBrowseEnabled()` is false and `/events` when true. Both branches get a test.

### 2. Past event → **renders, with the ticket CTA suppressed**

A poster is frequently shared *after* the show — that is the memento case, and it is the Passport's whole premise. `/e/:id` renders a past event normally. But `Get Tickets` on a show that has happened is a link to a dead vendor page, so it is suppressed for past events on the public mirror, matching the sold-out disabled treatment the plan already specifies in PR-0 Task 2 Step 3.

### 3. Recipient wants in, pre-launch → **`/sign-in`, never `/sign-up`**

The mirror's sign-in CTA points at `/sign-in`, which is in `isAlwaysPublic` and reachable in both modes. It must **not** point at `/sign-up`, which pre-launch bounces to `/auth/code` — the invite wall. A recipient hitting the invite wall with no code is the same dead end as case 1. Post-launch `/sign-up` opens and the existing sign-in page already links to it, so no second branch is needed here.

**Not an off-happy-path case:** an anonymous Passport. Out of scope by definition (README) — the Passport is an account artifact and `/passport/*` 401s for anonymous callers.

---

## User journeys — walk script — **REQUIRED**

Gate 5 runs all four passes (forward / reverse / repeat / resume) on Journeys A and B. Journeys C–E are forward-only checks.

Run locally with `NEXT_PUBLIC_PUBLIC_BROWSE` toggled per journey; re-run A and C on **staging** with the flag on before the epic is called done. Record in `docs/superpowers/journey-lifecycle-72.md`.

### Journey A — Sharer sends a poster (PR-2, walked at PR-2 and again at PR-6)

1. Signed in, open `/events/<id>` for a show with a price block.
2. Confirm the hero shows **Back + Share only** — no Watching glyph in the hero, no heart anywhere.
3. Tap Share. Sheet opens: `role="dialog"`, `aria-modal="true"`, focus moves in, grabber visible.
4. Story-ratio preview image loads and shows artist, venue, city, date, state pill, tagline.
5. **Reverse:** `Escape` closes, focus returns to the Share pill.
6. **Repeat:** reopen. Preview must load again — not a blank frame from a consumed object URL or a stale `<img>` cache.
7. Copy link → clipboard holds the **`/e/:id`** URL, not `/events/:id`.
8. Save image downloads a non-zero PNG that opens.
9. **Resume:** reload mid-sheet; the app returns to event detail with no orphaned overlay or trapped focus.
10. Desktop (≥`md`): same pill, sheet presents as a centred dialog. Same assertions.

### Journey B — Passport (PR-4/PR-5, walked at PR-5 and PR-6)

1. Signed in as a **Supporter** with ≥1 attended show (`attendingAt` set, event date past). Open `/history`.
2. `PassportTeaser` renders with real stats — **not zeroes**. Zeroes here is the `status='going'` regression resurfacing.
3. Follow "See your Passport →", confirm the compact 320×500 card, 3×3 wall, `+N more` at exactly 10 shows.
4. Share → 1080×1080 renders; `Cache-Control` is `private`.
5. **Reverse:** un-mark *I'm going* on one show. Stats decrement, stamp disappears.
6. **Repeat:** re-mark it. The stamp returns. Anything keyed by `eventId` rather than `userEventId` fails here (Defect Class 13).
7. **Resume:** reload; open in a second session. Same card.
8. As a **Free** user, `/history` gates via `canUseFeature` — no Supporter chip on the unlocked surface (Defect Class 11).

### Journey C — Signed-out recipient (PR-0/PR-3) — **the one that needs staging**

1. Flag **on**, no session. Open `/e/<id>`. Event renders read-only: title, venue, date, genres, price, setlist.
2. No Watching affordance, no price submission, no reports. One sign-in CTA → `/sign-in`.
3. Get Tickets still works (external link, not a gated action).
4. Flag **off**, no session: `/e/<id>` redirects to `/sign-in` with a safe `redirect_url`.
5. `/e/<garbage-uuid>` and a deleted id → the branded 404, CTA correct for the current flag state.

### Journey D — Signed-in user clicks a shared link (PR-0)

Signed in, open `/e/<id>` → redirected to `/events/<id>`, full authed surface. Not the mirror.

### Journey E — Unfurl (PR-3)

`curl` `/e/<id>` with the flag on; assert `og:image` is an **absolute** URL to `/share/<id>/link`, `og:image:width=1200`, `height=628`, `og:image:alt` = `‹artist› at ‹venue›, ‹date›`, `twitter:card=summary_large_image`. Fetch the `og:image` URL directly and assert `image/png` with non-zero length.

---

## Hard pause points — stop and ask

- **Flipping `NEXT_PUBLIC_PUBLIC_BROWSE`.** Out of scope, Hugh's call, #794's runbook. This epic never touches it in any environment.
- Any production database migration. This epic should need none — if one appears, stop.
- Adding anything to `isAlwaysPublic`. The decision above is the decision.
- Rewriting `POSTER_TAGLINES`. They are shipped copy signed off in READINESS; they move to `copy.ts` verbatim.

## Notify-and-proceed

- Mid-run cold-eyes review after PR-2 — post the summary and screenshot path, keep building.
- Any Defect-Class sweep that touches a surface outside this epic (e.g. bringing `BackButton` to 44px, which PR-2 Task 9 Step 2 requires) — note it in the PR body and proceed.

## Done means

- PR-0 → PR-6 merged at the full Copilot bar; #72 closed by PR-3, #85 by PR-5.
- `/e/(.*)` + `/share/(.*)` in `isPublicOnceLaunched` with positive **and** negative tests for both flag states; `/passport/*` in neither, with a `private` cache-header test.
- PR-5 selects on `attendingAt IS NOT NULL`, proven against a seeded DB.
- Gate artifacts committed with evidence: `state-coverage-72.md`, `journey-lifecycle-72.md`, `design-tables/72.md`.
- Journeys A and C re-walked on staging with the flag on.
- Release notes entry (PR-2 poster, PR-5 passport) + two `progress.md` rows.
- Launch-day runbook carries the real-unfurl check.
- Vertical is **live-capable but dark**: the flag is untouched at `false`.
