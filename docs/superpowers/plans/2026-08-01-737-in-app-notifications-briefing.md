# Epic Run Briefing — In-app notification surface (#737)

Companion to the merged execution plan. The plan owns sequencing and task detail;
this file owns the feature-specific facts `epic-run` needs, the three premise
answers the plan predates, and the corrections that four days of `main` drift
have made necessary.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-27-737-in-app-notifications.md` — master sequencing: PR-A → PR-B → PR-C, strictly serial. Follow its order exactly, **as amended by "Plan corrections" below.**
2. `docs/superpowers/specs/2026-07-21-737-in-app-notification-surface-design-brief.md` — scope.
3. `design/design_handoff_in_app_notifications/` — visual ground truth. `READINESS.md` verdict **🟢 Green (R2, 2026-07-25)**. `README.md` carries the locked decisions (Option B: one anchor, one surface, one Escape). Prototypes: `notifications-chrome.jsx`, `notifications-panel.jsx`, `notifications-data.jsx`.

Where this briefing and the plan disagree, **this briefing wins** — every
divergence below is a verified observation about current `main`, not a
preference.

---

## Plan corrections (verified against `main` @ `004fea2e`, 2026-08-01)

The plan was written 2026-07-27. Six of its factual claims are now stale. Five
of the six *reduce* scope; none changes the feature's intent.

| # | Plan says | Actually, now | Impact |
|---|---|---|---|
| 1 | Next migration is `0064`, journal `when` > `1785628800000` | `0064`–`0067` all exist. Last journal entry is `idx: 67`, `when: 1785974400000`, tag `0067_drop_inbox_reads` | **Ship `0068_notifications_seen_at`** with `when` > `1785974400000`. A `0064` would collide and `db:migrate` would misorder. |
| 2 | "the only bell in the app is admin-only" and cites `apps/api/src/routes/admin/notifications.ts` for the route-ordering comment, plus `admin/notification-bell/NotificationBell.tsx` for the 30s-`setInterval` anti-pattern | **PR #1269 deleted both** (merged 2026-07-31). `admin/notification-bell/` no longer exists; the admin router's `GET /`, `POST /read-all`, `PATCH /:id/read` are gone | The consumer router is fully greenfield — nothing to harmonize with and no sibling to cite. Keep the `/read-all`-before-`/:id/read` ordering comment; write it as original prose, not "the admin router carries this same comment". |
| 3 | Task 12: the 4th bottom-nav slot "hard-navigates to `/me`" and must be converted into a menu trigger; `UserMenuSheet` is "currently unreachable" | **PR #794 already did this.** `BottomNav.tsx:239` calls `toggleFrom(menuTriggerRef.current)`; `UserMenuSheet` renders at `UserMenu.tsx:305` under `open && isMobile` and **is reachable** | **Task 12 Steps 1–2 are already done.** Do not re-do them. Steps 3–4 (sheet-mode panel body swap, parity tests) remain. This materially shrinks PR-C. |
| 4 | `MobileProfileEntry.tsx` has "zero importers"; delete it if unused | It **is** imported at `AppHeader.tsx:14` and rendered at `:73` | **Do not delete it.** The plan's "reuse or delete" row in the Files table is resolved to *neither* — leave it alone unless PR-C's mount genuinely supersedes it. |
| 5 | Update `bottomNav.nav.profileAriaLabel` at `consumer/definitions/copy.ts:620-630` | **That key does not exist.** `bottomNav.nav` has only `ariaLabel` and `tabs`. Slot 4's name comes from `userMenu.ariaLabels` — `MENU_LABELS.accountMenu` / `.accountMenuSignedOut` (`BottomNav.tsx:241-244`), and a comment at `copy.ts:660-661` says so deliberately | Carry the unread count on **`userMenu.ariaLabels.accountMenu`**, which fixes desktop and mobile in one edit. Do not reintroduce a `bottomNav` label — that comment exists because the two triggers name the same thing. |
| 6 | Task 6: wire the prune into "the existing daily cron alongside the 3 AM MT crawl job" | **No 3 AM MT job exists in `apps/api`.** The daily cron is `apps/api/src/jobs/billing-daily.ts` (Render Cron Job `concert-crawl-billing-jobs`, `0 15 * * *`), which already hosts seven independently try/caught sub-tasks | Add the prune as **task 8 in `billing-daily.ts`**, matching the existing per-task try/catch + `apiLogger` shape. No new Render cron job, no `render.yaml` change. |

**Also stale: every line number in PR-C's tasks.** Current values —
`UserMenu.tsx` trigger button `:353`, `aria-expanded` `:362`, avatar/`AnonDisc`
branch `:366-375`, Escape binding `:187`, `matchMedia` `:147`, sheet render
`:305`, popover `boxShadow` `:728`, `MenuBody` signed-out branch `:520-558`.
Re-read all three chrome files before writing PR-C rather than trusting any
number in the plan.

**Not stale, re-verified:** all eight category keys in
`packages/push/src/notification-categories.ts:16-25`; `notifications.body` is
`text().notNull()`; `notifications.metadata` is a **text column holding JSON**,
so it must be `JSON.parse`d inside a try/catch; `user_profiles.spotifyNudgeSeenAt`
at `:31` is the adjacency anchor for the new column; the shipped
`watch.pricedrop` title really is `` `${newPrice} tickets for ${artistAtVenue} just went on sale.` ``
(the handoff fixture is wrong — plan Global Constraint 4 stands).

---

## Current state (verified 2026-08-01)

- **No new env vars.** This epic adds none. Nothing to place in Vercel, Render or GitHub Actions.
- **No new services.** One additive column, one new router, one new sub-task on an existing cron.
- **The three fan-out writers are shipped and in production**, and this epic re-authors none of them:
  - `packages/push/src/watch-fanout.ts` — five `watch.*` categories. Called from `apps/api/src/routes/event-reports.ts:382` and `apps/api/src/routes/admin/events.ts`.
  - `apps/api/src/lib/contest-notifications.ts` — `contest.resolved` / `contest.needs_info`, `actionUrl = /events/${eventId}` (`:135`). Called from `admin/contests.ts:799` and `:1021`.
  - `packages/crawler-core/src/lib/spotify-fanout/index.ts` — `spotify.new_show`. Called on venue-crawl completion.
- **Idempotency of the writers is uneven, and that is pre-existing, not this epic's to fix:** only `spotify-fanout` has true exactly-once (claims `(userId, eventId, kind)` in `spotifyAlertLog` via `onConflictDoNothing().returning()` before writing). `watch-fanout` is guarded only by `hasEventStateChanged()`; `contest-notifications` has no replay protection at all. **Consequence for this epic:** the panel must render a duplicate pair sanely (it will — two rows, same title, distinct ids) and Gate 6's "fires once" check will *fail* for two of three writers. Record that as an observation with a filed follow-up issue; do **not** widen this epic to add dedupe.
- **`E2E_AUDIT_*` credentials are present in the shell** (4 vars). The cold-eyes capture can run for real via `pnpm --filter @concert-crawl/e2e audit:sweep` against staging. `apps/e2e/src/audit/audit-auth.ts` exports `prepareAuditAuth('user' | 'admin')`. Note the manifest currently uses only `'user'` and `'admin'`; a signed-out sweep entry may need `auth` support added.
- **Known anomaly to ignore:** the staging crawler is intentionally paused. Notification rows on staging therefore come from seeds and admin actions, not from live crawls — the `spotify.new_show` path is the one writer that cannot be triggered naturally on staging.
- **Deliberately does not exist yet:** the Submitted-prices screen (#1176). Until it lands, `contest.*` rows keep pointing at `/events/${eventId}`. This epic changes no `actionUrl`.

---

## Risk shape — **event-driven**

The feature's core is a record created by something *else* happening, and the
whole surface is a reader over rows this epic does not write. Bugs will come
from two places, neither of which a screenshot can show:

1. **Audience and window correctness.** The list query is four predicates stacked
   — `user_id`, `type = 'user_notification'`, the 30-day backfill window, and the
   `before` cursor. A missing predicate leaks another user's notifications or
   silently truncates the list, and both look completely normal from a single
   seeded account. This is the highest-severity thing in the epic.
2. **The two-level read model.** `seenAt` (panel-open watermark, clears the pip)
   and `readAt` (per-row, clears the unread rail) are deliberately different, and
   the `greatest(...)` guard on `mark-panel-seen` exists because `now()` is
   transaction-start time. Every bug here is a *repeat*-pass bug: open, close,
   receive a new row, reopen.

**Therefore: Gate 6 is the ballgame, and Gate 5's repeat pass is second.**
Gate 2's loading/error/empty forcing matters for PR-B but is not where the
severe bugs live. Do not spend the night forcing skeleton states while the
`type` predicate is missing.

---

## Launch gating — **(a) reachable on merge, deliberately**

Nothing gates this vertical. No flag, no env var, no runbook step. **PR-C makes
it live** — it is the first PR that mounts anything into shipped chrome, and the
moment it merges every signed-in user sees the pip and the panel.

That is safe, and here is the reasoning rather than an assertion:

- The surface is **signed-in only**. PR #794 opened logged-out browsing, but the
  notification pip and panel must render for nobody who is anonymous — see the
  hard requirement below. There is no new public route, so the auth-matrix
  question that bit #794 does not arise here.
- The rows **already exist in production**. Three fan-outs have been writing
  `type = 'user_notification'` for weeks with no reader. This epic does not start
  a data flow; it opens a window onto one.
- **Backfill is the intended first impression, not an accident.** Every existing
  user has `notifications_seen_at IS NULL` on merge, which by design means "every
  row in the 30-day window is unread." A user with a month of watch alerts will
  open to a populated panel behind a pip. The panel is literally titled *"What
  you missed"* and the fresh/backfill divider exists to frame exactly this. No
  backfill suppression, no "mark everything seen at deploy time" migration —
  that would throw away the feature's best first run.

**Release notes:** the `releases.ts` entry ships on **PR-C**, per the plan's
Global Constraint 12 — the same PR that makes the feature live, so nothing needs
holding back. PR-A and PR-B are invisible to users and get no entry.

**One hard requirement that falls out of the gating answer:** because PR #794
replaced the old `!isSignedIn → null` behaviour with real anonymous variants
(`AnonDisc`, the `GetInCard` menu body), the pip is now capable of rendering for
a logged-out visitor if it is wired to the trigger unconditionally. It must not.
Gate the pip on `isSignedIn` **and** on a non-zero unread count, and assert the
anonymous case in a test — a signed-out visitor has no notifications and a dot
on the anonymous disc would be a nonsense affordance pointing at a menu that
offers them a sign-up card.

---

## Off-happy-path homes

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| Has unread notifications | Pip on the profile affordance (avatar desktop / slot 4 mobile) + `InboxStrip` at the top of the account menu | Any page — the affordance is in persistent chrome | Yes — reading clears it |
| Opened the panel but read no rows | Pip cleared (`seenAt` advanced), rows keep their unread rail | Reopen the menu; `InboxStrip` still shows the newest rows | Yes — rows stay unread until clicked or "Mark all read" |
| Read everything | Panel's all-read state; `InboxStrip` shows its zero-unread branch | Same affordance | No — `readAt` is a one-way stamp. Deliberate: there is no "mark unread", it was not in the brief and is not being invented here |
| Never had any notification | `NotifEmpty` — "All quiet." + CTA to `/events` | Same affordance | n/a. **This is what every brand-new user sees first** — it gets a real design pass, not a leftover |
| Notification older than 30 days | Nowhere. Excluded from the list and from the unread count | Not reachable by design | No. Row survives to 90 days for a future digest, then the prune deletes it |
| Notification whose `actionUrl` target is gone (event deleted/merged) | The row renders normally; the click lands on `/events/{id}`, which owns its own not-found handling | Panel | n/a — the panel renders whatever the writer stored and composes no sentences |
| `contest.*` row while #1176 is unbuilt | Lands on the event page, not a submissions screen | Panel | n/a — a known, documented seam. #1176 reroutes it later |
| Duplicate rows from a replayed `watch.*` / `contest.*` fan-out | Two adjacent rows, same title, distinct ids | Panel | n/a — pre-existing writer behaviour. File a follow-up issue; do not fix here |
| Signed out | **No pip, no panel, no `InboxStrip`.** The account menu shows `GetInCard` | n/a | Signing in reveals the surface |

Every row is filled and none required a product call from Hugh. The one that
came closest — "should merge suppress the backfill?" — is answered in Launch
gating above and is defensible either way; if Hugh disagrees the fix is a
one-line migration, not a rebuild.

---

## User journeys — walk script

Walked by the run at Gate 5 (all four passes: forward, reverse, repeat, resume)
and by Hugh afterwards. Journeys 1–3 run on local dev; journey 4 is
staging-only.

### Journey 1 — First open, with a backfill

Entry: signed in, ≥3 seeded `user_notification` rows across ≥2 days, `notifications_seen_at IS NULL`.

1. Load any page → pip visible on the avatar (desktop) and slot 4 (mobile). Trigger's `aria-label` announces the real unread count.
2. Open the account menu → `InboxStrip` at the top shows the newest 1–2 rows and `seeAll(n)`.
3. Activate `seeAll` → menu body swaps in place to the panel, behind a `‹ Menu` back row. Focus lands in the panel. Pip clears (`mark-panel-seen` fires once).
4. Rows grouped by day, newest first, "Today"/"Yesterday" dividers sticky. Unread rows carry a 2px left rail in the category ink.
5. Click a row → `readAt` set optimistically, rail clears, navigate to its `actionUrl`.

- **Reverse:** `‹ Menu` returns to the menu body; Escape from panel mode closes the *whole* menu in one press (locked "one Escape"). Focus restores to the originating trigger in both paths.
- **Repeat:** reopen → panel opens at the menu, not mid-panel (`mode` resets on close). Pip stays clear. Insert a new row → pip returns. **The critical assertion:** the pip must come back for a *new* row after a previous panel-open, i.e. unread is derived from `readAt`, not from "has the panel ever been opened".
- **Resume:** reload mid-panel → the menu is closed (component state, expected), pip state matches the server. Open in a second browser → `seenAt` already advanced, and the per-row read state agrees.

### Journey 2 — Mark all read

1. Open the panel with ≥2 unread. 2. Activate "Mark all read". 3. Count zeroes, `markedAll` ("All caught up.") shows, every rail clears.

- **Reverse:** none — one-way by design. Assert no UI implies otherwise.
- **Repeat:** activate again with zero unread → still 200, `updated: 0`, no error toast.
- **Resume:** reload → all rows still read, count still 0 (it persisted, not just optimistic).

### Journey 3 — Paging and the four states

1. Seed 21+ in-window rows → "Older notifications" renders. 2. Activate it → the next page appends, order holds, no duplicate row ids. 3. With ≤20 rows the end-of-list line renders instead.

Force each state and record what was forced: **loading** (throttle), **error**
(mock a 500 → `role="alert"` + working Retry that actually refetches),
**empty** (zero rows → "All quiet." + `/events` CTA), **all-read**.

- **Repeat:** Retry after a restored network must succeed, not stay stuck in error.
- **Resume:** reload after paging → back to page 1, no crash.

### Journey 4 — A real fan-out row, end to end *(staging only)*

Local dev cannot produce a genuine fan-out row. On staging: trigger a real
`contest.resolved` via the admin contest-resolve action, and a real `watch.*`
via an admin event state change, then confirm each lands in the correct user's
panel with the writer's verbatim `title`/`body`. `spotify.new_show` cannot be
triggered naturally (staging crawler is paused) — seed it directly and say so.

**Second-account check (Gate 6):** every one of the above is confirmed
*absent* from a second user's panel. Fan-out audience bugs are invisible from
one account.

---

## Hard pause points

- **Any production database migration.** `0068` applies to staging and prod through the normal deploy; that is not a pause. Hand-running SQL against prod is.
- **Any change to the three fan-out writers.** They are shipped, in production, and explicitly out of scope. If a Gate 6 finding seems to require a writer change, stop and ask — that is a new epic, not a task here.
- **Any suppression of the merge-day backfill.** It is a deliberate product decision (see Launch gating). Changing it is Hugh's call, not a build-time judgement.

## Notify-and-proceed

- **Filing follow-up issues** for the writer-idempotency gap and anything the cold-eyes review surfaces as out-of-scope. File them, link them in the run report, keep building.
- **Running the staging audit sweep** with the real `E2E_AUDIT_*` credentials. `assert-not-prod` is the safety control; capture the run id and screenshot path in the report, then continue.
- **Adding the epic's surfaces to `apps/e2e/src/audit/manifest.ts`** — the file's own convention says surface-adding PRs do this. Proceed.

## Done means

1. PR-A, PR-B, PR-C merged at the full Copilot bar, in that order, each with green CI.
2. `0068` applied cleanly to staging and prod; `pnpm db:migrate` is a no-op on re-run.
3. The retention prune runs as task 8 of `billing-daily.ts`, wrapped so its failure cannot fail the other seven.
4. Gate artifacts committed **with evidence, not attestation**: `docs/superpowers/state-coverage-737-notifications.md` (Gate 1, run between PR-A and PR-B), `docs/superpowers/journey-lifecycle-737-notifications.md` (Gate 5, all four passes × four journeys), `docs/superpowers/side-effects-737-notifications.md` (Gate 6 — fires / fires once / right audience, per writer, including the two known idempotency gaps), and `docs/superpowers/design-tables/737-notifications.md` (Gate 4 Agent 1, committed **before** any PR-B code and passed into every build subagent's prompt).
5. The mid-run cold-eyes review ran as soon as journey 1 was reachable end to end — i.e. immediately after PR-C, which is the first PR making anything reachable. Its triage list is closed: blockers fixed in-run, subjective calls landed in the reserved polish PR (PR-D).
6. Signed-out safety asserted by test: no pip, no panel, no `InboxStrip` for an anonymous visitor.
7. `releases.ts` entry on PR-C in Hugh's voice, locked vocabulary ("Watching", never "Saved"), and a `progress.md` row on PR-C only.
8. Follow-up issues filed for the writer-idempotency gap and the #1176 `actionUrl` seam.
