# Epic Run Briefing — Venue first-timer guide (#764)

Companion to the execution plan. The plan owns sequencing and file-level detail;
this briefing owns the facts the plan could not know when it was written
(2026-07-27) plus the four premise sections epic-run gates on.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-27-764-venue-first-timer-guide.md` — master sequencing, 4 PRs, task-by-task. Follow its order exactly.
2. [#764](https://github.com/HartiganHM/concert-crawl/issues/764) — the ticket.
3. `docs/superpowers/specs/2026-07-17-764-venue-first-timer-guide-design-brief.md` — design brief, PR [#999](https://github.com/HartiganHM/concert-crawl/pull/999), merged 2026-07-17.
4. `design/design_handoff_venue_first_timer_guide/` — visual ground truth. `READINESS.md` verdict is 🟢 Green (PR [#1008](https://github.com/HartiganHM/concert-crawl/pull/1008)). `guide-data.jsx` holds the shipped copy maps; `guide-consumer.jsx` / `guide-admin.jsx` hold the markup to port.

Execution plan merged as PR [#1222](https://github.com/HartiganHM/concert-crawl/pull/1222) (2026-07-28).

---

## Current state (verified 2026-08-02)

Every row below was checked against the repo at `origin/main` = `004fea2e`
(`chore(release): 1.181.0`) on 2026-08-02. **Four of them contradict the plan** —
the plan is five days stale on a fast-moving repo.

| Claim | Verified state | Consequence |
|---|---|---|
| Next migration index is **0064** (plan line 25) | ❌ **Wrong.** Head is `0067_drop_inbox_reads`, `when` = `1785974400000`. `0064` was taken by #70's `0064_user_events_attending_at`. | **Use `0068_venue_first_timer_guide.sql`, `idx: 68`, `when: 1786060800000`.** |
| Seed lives at `packages/db/src/seed.ts` (plan line 324) | ❌ **Wrong.** It is `packages/db/seed.ts` (`db:seed` = `tsx seed.ts`). | Task 3 edits `packages/db/seed.ts`. |
| `user_events.attending_at` unbuilt; PR-4 blocked on #70 | ✅ **Now live.** `packages/db/src/schema/social.ts:60` — `attendingAt: timestamp('attending_at', { withTimezone: true })`. Partial index on `(userId, attendingAt) WHERE attending_at IS NOT NULL`. | **PR-4 is unblocked.** Read PRs [#1236](https://github.com/HartiganHM/concert-crawl/pull/1236) + [#1239](https://github.com/HartiganHM/concert-crawl/pull/1239) for the shipped read contract before writing Task 14 — do not build from the plan's contract sketch. |
| `status = 'going'` is part of the attendance model | ❌ **Retired** in [#1250](https://github.com/HartiganHM/concert-crawl/pull/1250) (`0065_user_events_retire_going_status`). Attendance is `attending_at IS NOT NULL` and nothing else. | PR-4's `EXISTS` predicate keys on `attending_at` only. Never reference a `going` status column. |
| #794 made `/venues/[slug]` public (plan lines 146-151) | 🟡 **Partly.** `/venues(.*)` is in `isPublicOnceLaunched` (`apps/web/src/middleware.ts:41`), **not** `isAlwaysPublic`. It goes public only when `NEXT_PUBLIC_PUBLIC_BROWSE === 'true'`, which **defaults to false** and is build-time inlined (flipping it needs a redeploy, not just a dashboard change). | See Launch gating. The anonymous branch is real code on a real route, but it is walked locally by setting the flag in the worktree `.env.local`, **not** by assuming prod is open. |
| `MapPlaceholder` has exactly one call site | ✅ Confirmed. `venues/[slug]/page.tsx:7` (import) and `:224` (mount); the only other hits are its own directory. | Task 11 Step 1 deletes the directory with the mount, as written. |
| `VenueDetailsClient.tsx` is huge | ✅ 2717 lines. `admin/venues.ts` 915 lines. `venues-public.ts` 309. | The plan's separate-file discipline holds — do not inline the block or the routes. |
| `venue_guide_chips` / `insider_tip` / `guide_published_at` exist | ✅ Confirmed absent. Nothing to expand around. | PR-1 creates all three. |

Local services: Postgres via `docker compose up -d`. **Integration tests need no
DB setup.** Per CLAUDE.md, `apps/api/src/test/setup/global-setup.ts` derives
`concert_crawl_test__<worktree>` from the worktree directory and auto-creates and
migrates it on first run. `DATABASE_URL_TEST` is an *override* (CI sets it per
job) — do not set it by hand in a worktree, and do not invent a database name;
doing so bypasses the isolation this convention exists to provide. Post-run
pruning drops these automatically via `pnpm worktree:prune <branch>`.

---

## Risk shape — **copy/IA-driven, with a content/data-driven tail**

Not event-driven. Nothing in this feature creates a record in response to
something else happening — an admin types content and presses Publish. **Gate 6
is skipped, deliberately**, and the skip is recorded in the run report.

Where the bugs will actually come from, in order:

1. **Copy redundancy and affordance ambiguity on the consumer surface.** This
   epic ships ~20 new user-facing strings onto a page that already has a hero,
   a Directions row, a stats row and an About section. Defect-class row 8
   ("does it say something the adjacent UI does not already say?") accounted for
   7 of the last 22 leaked bugs, and this is a guide — copy *is* the feature.
   The cold-eyes review is the highest-value hour of this run.
2. **The long tail of authored content.** Chip bodies are free text up to 400
   chars, authored by a human, rendered into a fixed grid. A 400-character
   parking chip, a one-word tip, a venue with exactly one chip, a venue with all
   eight, an insider tip with an em-dash and a URL in it. **Gate 2 runs with
   deliberately ugly fixtures, not the tidy `ROXY_GUIDE_COPY` samples.**
3. **State branching.** Four consumer states × two auth states × published/draft
   is a wide matrix for a surface with no runtime complexity, and the thin and
   placeholder states are the ones nobody will look at twice.

Not a risk here: performance, concurrency, fan-out, data volume.

---

## Launch gating — REQUIRED

**Verdict: gated, twice over — and both launch gates are already in place. No PR
in this plan opens either one.**

(The epic-run template offers three shapes: *reachable on merge*, *gated behind a
named flag*, or *dark until a runbook step*. This epic is the second, doubled.)

**Launch gate 1 — content.** The consumer endpoint returns a guide only when
`venues.guide_published_at IS NOT NULL`. On merge of PR-3, every venue in prod
has a NULL `guide_published_at`, so **the vertical ships dark and stays dark until
a human authors and publishes a guide in admin.** There is no backfill, no
seed-to-prod, and no default. This is the safest possible shape and it is
deliberate: the feature cannot embarrass us with empty chrome, because with no
content there is no chrome.

**Launch gate 2 — audience.** `/venues(.*)` sits in `isPublicOnceLaunched`
(`middleware.ts:39-52`), so signed-out visitors reach it only when
`NEXT_PUBLIC_PUBLIC_BROWSE === 'true'`. That variable defaults to `false`,
fails closed on typo or absence, and is inlined at build time. **This run does
not touch it, does not add it to any `.env`, and does not ask for it to be
flipped.** Public launch is #794's runbook and Hugh's call (target Aug 18–22).

**Which PR makes the vertical live:** none. PR-3 makes it *buildable*; the first
admin publish makes it *live*, one venue at a time.

**Release notes:** PR-3 and PR-4 add `releases.ts` entries per the plan. These
are safe to land unheld — `/changelog` is already in `isAlwaysPublic`
(`middleware.ts:26`), the entries describe a feature that is genuinely shipped,
and a reader who then visits a venue with no guide simply sees the page they
saw yesterday. No entry is held back.

---

## Off-happy-path homes — REQUIRED

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| **Draft guide** — chips + tip saved, `guide_published_at` NULL | `VenueGuideBlock` on `/admin/venues/[id]` | Admin nav → Venues → venue → guide block | ✅ Keep editing, or Publish |
| **Published guide** — `guide_published_at` set | Same block (badge shows live), consumer venue page | Same | ✅ **via the Unpublish action added below** — see the amendment |
| **Publish-blocked** — accessibility empty, publish attempted | Validation banner inside the block, `aria-invalid` on the field | Press Publish with accessibility blank | ✅ Fill the field or flip the placeholder toggle |
| **Honest placeholder** — accessibility marked undocumented | Accessibility field, toggle on; consumer shows `NOT DOCUMENTED` row | Flip "Can't document yet" | ✅ Flip the toggle back |
| **Selected-but-blank chip** — picker on, body empty | Client-side only, in-session | Select a chip, type nothing | ✅ Discarded on save by design (plan §2); reload shows it unselected |
| **Thin guide** — accessibility only, no tip | Consumer venue page, `StillGathering` cluster | Publish with one chip | ✅ Author more chips |
| **Returner** — viewer has attended this venue | Collapsed accordion on the venue page, inline peer | Mark "I'm going" on a past show at that venue | ✅ Accordion opens in one gesture; un-going restores first-timer |
| **Anonymous** — signed-out visitor | Identical to signed-in first-timer (brief Q7) | Only once `NEXT_PUBLIC_PUBLIC_BROWSE=true` | n/a — read-only |
| **No guide** — venue never published | Nothing renders; venue page as it is today | Any unpublished venue | n/a |

No row created an orphan: this feature adds **no new route and no new IA
location**. Every state renders inline on `/venues/[slug]`, `/events/[id]`, or
the existing admin venue detail page. That is why #70's "going but not
watching" failure mode does not have an analogue here.

### ⚠️ Plan amendment — Unpublish (added by this briefing, PR-2 scope)

Filling the "Published guide → reversible?" row exposed a genuine one-way door:
**the plan sets `guide_published_at` and never unsets it.** `Save draft` writes
chips and leaves the timestamp untouched, so once a guide is live the only way
to take it down is a hand-written SQL `UPDATE` against prod. For a surface whose
entire content is free text typed by a human, "published a wrong thing and
cannot retract it" is a defect, not a missing nicety.

**PR-2 additionally ships:**

- `POST /v1/admin/venues/:id/guide/unpublish` → sets `guide_published_at = NULL`,
  returns the updated guide. Audit-logged as `venue.guide.unpublish` with
  `auditTargetId` = venue id, mirroring the publish route exactly.
- An `Unpublish` control in the block footer, rendered **only when
  `guide_published_at` is non-null**, styled as a ghost/destructive-adjacent
  button next to `Save draft`. Confirm-on-click (the existing admin confirm
  pattern), because it removes a live consumer surface.
- Integration tests: unpublish sets NULL; the consumer endpoint stops returning
  the guide afterwards; audit row written; non-admin → 403; unpublishing an
  already-unpublished guide is a no-op 200, not a 500.

Copy for the control is not in the handoff — Design never drew this state. Use
`Unpublish` / confirm body `"This hides the guide from the venue page. Your
chips and tip stay saved."` Flagged to Hugh in the morning report as the one
place this run wrote consumer-adjacent copy that Design did not voice-pass.

**Also editing semantics, for the cold-eyes pass rather than a code change:**
once published, `Save draft` edits are live immediately — there is no
draft-shadow of a published guide. That is the right simple model, but the
button label arguably lies. Left as-is for PR-2; the cold-eyes critic gets the
screenshot and may call it.

---

## User journeys — walk script — REQUIRED

Five journeys. Each is walked forward / reverse / repeat / resume per Gate 5 and
recorded in `docs/superpowers/journey-lifecycle-764.md`. Journeys A–D are fully
exercisable on local dev; **E requires an `attending_at` row** and is walked
locally against seeded data, then confirmed on staging.

### Journey A — Admin authors a guide from scratch (PR-2)

Entry: `/admin/venues/[id]` for a venue with no guide.

1. Scroll to the guide block → badge reads **Blocked · accessibility required**; insider tip panel is the **first** field in DOM order (R2 lock); picker shows 7 selectable + 4 ghosted `SOON · #997`.
2. Press **Publish guide** → validation banner appears, accessibility textarea gets `aria-invalid`, **no network call fires**.
3. Type an accessibility body → badge flips to **Ready to publish**.
4. Select Parking + Age policy, fill both; select Coat check, leave it blank.
5. Type an insider tip.
6. **Save draft** → 200; `guide_published_at` still NULL; audit row `venue.guide.save`.
7. Reload → tip, accessibility, Parking and Age policy hydrate; **Coat check is unselected** (blank chip was never persisted, plan §2).
8. **Publish guide** → 200; badge shows live; audit row `venue.guide.publish`.

**Reverse:** Unpublish → confirm → guide gone from the consumer page, chips still in admin. Flip accessibility to "Can't document yet" → badge reads **Publishable · access marked undocumented**. Deselect a chip → its body leaves the save payload.
**Repeat:** publish → unpublish → publish again. The second publish must set a *fresh* timestamp and re-derive the gate server-side, not trust the client badge.
**Resume:** reload mid-edit with unsaved changes — nothing is persisted, and that is correct; confirm no crash and no half-written chip row.

### Journey B — First-timer reads a populated guide (PR-3)

Entry: `/venues/<populated-slug>`, signed in, no attendance anywhere.

1. Page order is hero → type chip → title → Directions → stats → About → **callout** → **guide** → Upcoming. **No map** anywhere.
2. Callout reads `First time at <Venue>?` with the populated sub-copy.
3. Press the jump control → smooth-scrolls to `#ft-guide`, respecting `prefers-reduced-motion`.
4. Inside the section: **insider tip first**, then accessibility (`★ ALWAYS HERE`), then remaining chips in `GUIDE_CHIP_ORDER`.
5. Chips are a 2-column grid at `sm:` and up, single column at 320/390. No horizontal overflow at 320.

**Reverse:** n/a (read-only) — instead, unpublish in admin and confirm callout *and* section both vanish and the page reads exactly as it did pre-#764.
**Repeat:** reload twice; the callout must fire every time — there is no dismissal and no `localStorage` key anywhere in this feature. **If a dismissal is ever added, defect-class row 13 applies and it keys off nothing that outlives the guide.**
**Resume:** deep-link straight to `/venues/<slug>#ft-guide` in a fresh tab — the anchor must land with the section in view (`scroll-margin-top` set), not under a sticky header.

### Journey C — Anonymous visitor reads the same guide (PR-3)

Entry: `/venues/<populated-slug>`, **signed out**, with `NEXT_PUBLIC_PUBLIC_BROWSE=true` set in the worktree `.env.local` and the web app restarted.

1. Page renders without a redirect to sign-in.
2. Callout and guide are **byte-identical** to Journey B — same copy, because it is a question, not an assertion (brief Q7).
3. Network tab: the guide arrives on the **unauthenticated** `GET /v1/venues/:slug`; no token is sent.
4. Watching / Get Tickets controls behave per #794's signed-out treatment — this run must not change them.

**Reverse / repeat / resume:** as Journey B.
**Also walk with the flag `false`** — signed-out must redirect to sign-in exactly as it does today. This run must not alter that behavior, and confirming it is how we prove we did not accidentally widen the public surface.

### Journey D — Event detail → venue guide (PR-3)

Entry: `/events/[id]` for a show at a venue **with** a published guide, signed in, first-timer.

1. Venue row shows the chip `First time at <Venue>? Guide` — **signal-tinted, right-aligned, below the venue name**, not in the CTA row beside Watching / Get Tickets (R2 fix).
2. Tap target ≥44px (prototype's 32px is raised).
3. Click → lands on `/venues/<slug>#ft-guide` with the guide in the viewport.
4. Same event at a venue with **no** published guide → **no chip**, event page otherwise unchanged.

**Reverse:** browser Back returns to the event detail with scroll position intact.
**Repeat:** click the chip twice from the same event; second click must not stack history oddly or double-scroll.
**Resume:** reload the anchored venue URL — the anchor still resolves.

### Journey E — Returner (PR-4)

Entry: signed-in user with an `attending_at` row on a past event at this venue.

1. `/venues/<slug>` → **no callout**; an accent-tinted collapsed accordion instead.
2. Preview strip reads the first three authored chip labels joined by `·`, plus `+N` when more exist; **no `+N` at exactly three**.
3. Toggle has `aria-expanded`, is ≥44px, and opens on **both** Enter and Space.
4. Expanded: insider tip first, then chips.
5. `/events/[id]` at that venue → **no first-timer chip**.

**Reverse:** remove the attendance (un-go) → callout returns, accordion disappears. This is the pass that catches an attendance predicate cached at the wrong layer.
**Repeat:** go → un-go → go again. The state must track attendance every time; nothing about the accordion may be sticky or dismissal-keyed.
**Resume:** open the same venue in a second browser session as the same user — returner state must follow the *user*, not the tab. Then open it signed out → first-timer, because `viewerHasAttended` is `null` and null must resolve to first-timer, never to a claim of `false`.

**Mutation-feedback sub-check (defect-class row 12):** the venue page is
server-rendered. Journey E's reverse pass is driven by a mutation on a *different*
page (`/history` or the event page). Throttle the network and confirm the venue
page reflects the change on next navigation without a stale-HTML flash.

---

## Hard pause points — stop and ask

- **Any migration run against the production database by hand.** `0068` deploys
  through the normal Render/Vercel pipeline like every other migration; that is
  not a pause. A hand-run `psql` against prod is.
- **Flipping `NEXT_PUBLIC_PUBLIC_BROWSE`.** Out of scope, Hugh's call, #794's runbook.
- **Backfilling or seeding guide content into production.** The vertical is
  meant to ship dark. If a "let's publish one venue so it's not empty" impulse
  arises, that is a product decision and it stops here.
- **Any change to Watching / Get Tickets / attendance behavior.** PR-4 *reads*
  `attending_at`; it never writes it.

## Notify-and-proceed

- **Deleting `MapPlaceholder`** (Task 11). Single call site, verified 2026-08-02.
  Removal is a locked R2 design decision. Proceed; note it in the PR body and
  the release notes `removed` item already drafted in the plan.
- **The Unpublish amendment above.** Additive, admin-only, audit-logged,
  reversible. Proceed; flag the un-voice-passed copy in the morning report.
- **Raising the prototype's 32px tap targets to 44px** in two places. Plan
  §Self-Review already records this as a deliberate deviation. Proceed.
- **Inverting the handoff README's "everyone sees the returner state
  pre-detection" line.** Plan lines 101-105 establish the correction and brief Q7
  locks it. Proceed on the plan's reading: first-timer is the default.

## Done means

- PR-1 → PR-4 merged at the full Copilot bar, in order, plus the reserved polish PR.
- Migration `0068` applied cleanly to local, staging and prod; `pnpm db:migrate` idempotent on re-run; the CHECK constraint demonstrably rejects both an empty non-placeholder body and a placeholder on a non-accessibility chip.
- Gate artifacts committed with **evidence, not attestation**: `state-coverage-764.md` (Gate 1, before PR-3's UI build), `journey-lifecycle-764.md` (Gate 5, journeys A–E), `design-tables/764.md` (Gate 4 Agent 1, before any UI code and fed into every build subagent's prompt). Gate 6 explicitly skipped with the reason recorded.
- Mid-run cold-eyes review run the moment Journey B is reachable end-to-end (i.e. during PR-3, not after PR-4), its triage closed in-run, and the remaining PR scopes re-read against its findings.
- A guide authored end-to-end on **staging** through the real admin UI: blocked → placeholder → published → unpublished → republished. Theme sweep across Electric / Jade / Light at 320 / 390 / 768 / 1280.
- The vertical is **live-capable but dark**: no prod venue has a published guide, and `NEXT_PUBLIC_PUBLIC_BROWSE` is untouched at `false`.
- `releases.ts` entries on PR-3 and PR-4; one `progress.md` row on PR-3 only; `Closes #764` on PR-3.
- Worktrees and `concert_crawl_test__*` DBs pruned for this run's branches only.
- Morning report produced via the `feature-run-report` skill.
