# Gate 6 — Side-effect provenance: #737 in-app notifications

Run 2026-08-01, during PR-A. This epic's risk shape is **event-driven**: the thing
users see is a record created by something else happening, so the characteristic
failure is silent — never fires, fires twice, or fires for the wrong person. None
of those are visible from clicking through a rendered list, which is why this gate
exists and why it is the primary gate for this epic.

#737 adds **no new writer**. Three already write `type = 'user_notification'`, and
until now nothing has ever read them. That is the actual subject of this audit: the
panel is about to make months of silent writer behaviour visible for the first
time.

## Writers

| Writer                                                  | Trigger                                                                                                              | Categories written                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/push/src/watch-fanout.ts`                     | User confirms an event report; admin PATCHes an event; admin marks sold-out / available; admin price corroboration   | `watch.cancelled`, `watch.postponed`, `watch.soldout`, `watch.backonsale`, `watch.pricedrop` |
| `packages/crawler-core/src/lib/spotify-fanout/index.ts` | Venue crawl inserts new events — both the triggered path (`apps/crawler/src/run.ts:163`) and the daily cron (`:296`) | `spotify.new_show`                                                                           |
| `apps/api/src/lib/contest-notifications.ts`             | Admin resolves or defers a price check (`admin/contests.ts:799`, `:1021`)                                            | `contest.resolved`, `contest.needs_info`                                                     |

`actionUrl` is `/events/<id>` in all three and is never null in practice. `readAt`
was written by nothing before this PR — only `packages/db/seed.ts` sets it.

## 1. Fires

| Writer                | Evidence                                                                                                                                                                                                               | Verdict |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| watch-fanout          | `pnpm --filter @concert-crawl/push test` → 22 passed, 2 files. Covers each of the five categories inserting a row per watcher.                                                                                         | ✅      |
| spotify-fanout        | `pnpm --filter @concert-crawl/crawler-core test:integration` → 126 passed, 7 files. `'free tier gets auto-watch only; premium gets push + tray row'` (`spotify-fanout.integration.test.ts:121`) asserts the row lands. | ✅      |
| contest-notifications | `'writes notification rows for parent + challenger submitters'` (`admin/contests.integration.test.ts:1438`) and `'writes 2 notification rows … with kind=defer'` (`:1805`).                                            | ✅      |

## 2. Fires once

| Writer                | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                | Verdict |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| spotify-fanout        | Genuine exactly-once. `claimAlert` (`index.ts:159-170`) does `insert(spotifyAlertLog).onConflictDoNothing().returning()` against the unique index `spotify_alert_log_user_event_kind_idx` on `(user_id, event_id, kind)` (migration 0053:88-89). The notification insert at `:316` is gated on the claim succeeding. Proven by `'re-running the fan-out sends nothing twice'` (`:316` in the test file). | ✅      |
| watch-fanout          | **No ledger, no unique constraint.** The only guard is `hasEventStateChanged()` (`event-reports.ts:54-79`), which reads current state and compares — and the fanout call (`:382`) is _outside_ the transaction that commits the state change. Two concurrent confirms both read pre-state and both fan out.                                                                                              | ⚠️      |
| contest-notifications | **No replay protection at all.** The only dedup is the self-contest check `challengerUserId !== parentUserId` (`contest-notifications.ts:89`), which is about audience, not idempotency. A retried resolve/defer writes a second identical row.                                                                                                                                                          | ⚠️      |

Both ⚠️ rows are **pre-existing** — they long predate #737 and are not caused by it.
This epic does not fix them, deliberately: adding an idempotency ledger to two
writers is its own change with its own migration and its own blast radius, and
bundling it into the read-path epic would make PR-A un-reviewable.

What #737 _does_ is change their cost. A duplicate that nobody could see was
harmless; a duplicate in a list the user reads is a visible defect. That
escalation is the reason this is being filed as a follow-up issue rather than
noted and forgotten.

**The panel must not assume distinct rows.** Each row has a distinct `id`, so
React keys are safe and marking one read leaves its twin unread — which will look
like a bug to a user. Recorded here so PR-B does not design around an
exactly-once assumption that only one of the three writers actually honours.

## 3. Fires for exactly the right audience

- **watch-fanout** (`watch-fanout.ts:179-194`) — `user_events` where `status = 'watching'`
  for that event. Correct set, with one wrinkle: there is no self-action filter, so a
  user who watches an event _and_ confirms the report that cancels it notifies
  themselves. Longstanding, arguably correct (it is a confirmation), not changed here.
- **spotify-fanout** (`index.ts:221-240`) — users with a non-revoked Spotify connection
  whose `user_artist_follows` (sources `spotify_followed` / `spotify_top` only; manual
  follows deliberately excluded) match the event's `canonical_artist` or
  `canonical_supporting`. Correctly scoped.
- **contest-notifications** (`:79-96`) — the parent and challenger submitters, deduped
  when they are the same person. Correctly scoped.

Cross-user leakage on the **read** side is closed by construction: every query in
`apps/api/src/routes/notifications.ts` carries `eq(notifications.userId, userId)`,
including the two writes. Cross-user mark-read returns 404, not 403, so existence
is not leaked. Asserted in `notifications.integration.test.ts`.

### Preferences do not gate the row

Worth stating plainly because it will look wrong from the panel:
`user_notification_preferences` gates **push only**, never the bell row.
watch-fanout consults it in `send-push.ts:108-132`; spotify-fanout gates push on
per-connection `pushEnabled` plus the `spotify-sync` entitlement; contest-notifications
consults nothing. So a user with push fully disabled still accumulates rows, and once
#737 ships they will suddenly see all of them.

This is the intended design — the panel is the always-on surface and push is the
opt-in interrupt — but it means the first thing a push-disabled user sees is a full
backlog. The briefing's launch-gating section already accepts this (backfill is the
intended first impression); it is repeated here because it is a _side-effect_
consequence, not a UI choice.

## 4. Lifecycle

- **What marks it handled** — two independent things, deliberately. `readAt` per row
  (`POST /:id/read`, idempotent via `coalesce`, and `POST /read-all`), and
  `user_profiles.notifications_seen_at`, the panel-open watermark
  (`POST /mark-panel-seen`). Seen ≠ read: opening the panel clears the pip without
  marking anything read.
- **Second device** — both markers are server-side columns, so a read on one device
  is a read everywhere. Nothing about this state lives in localStorage. This is the
  specific thing that went wrong on #70, where a dismissal keyed to an immortal id
  silenced a nudge forever; there is no client-held key here to get wrong.
- **Watermark monotonicity** — `mark-panel-seen` writes
  `greatest(notifications_seen_at, now())`. `now()` is transaction-start time, so two
  concurrent marks can commit out of order; `greatest` stops the later writer stamping
  an earlier timestamp and walking the watermark backwards.
- **Retention** — nothing pruned `notifications` before this PR; rows were permanent.
  `apps/api/src/lib/prune-notifications.ts` now runs as task 8 of `jobs/billing-daily.ts`,
  and the list query is bounded to the same backfill window, so a row leaving the
  window disappears from the panel before it is deleted. Covered by
  `prune-notifications.integration.test.ts`.
- **Query cost** — migration 0071 adds two partial indexes, both filtered to
  `type = 'user_notification'`:
  - `notifications_user_created_idx` on `(user_id, created_at DESC, id DESC)` — exactly
    the list query's shape, including the `id` tiebreak the keyset cursor pages on.
  - `notifications_created_idx` on `(created_at)` — the retention prune filters on
    `(type, created_at)` across all users, which the `user_id`-leading index cannot
    serve.

  Before this PR the table had no index at all beyond its primary key, so both the
  first consumer read and every prune would have been sequential scans.

  Verified rather than assumed — 40,000 rows across 500 users spanning 400 days,
  `ANALYZE`d, then `EXPLAIN (COSTS OFF)` on the prune's exact predicate:

  ```
  Delete on notifications
    ->  Bitmap Heap Scan on notifications
          ->  Bitmap Index Scan on notifications_created_idx
  ```

  Note the honest limit: at a cutoff that matches most of the table, the planner
  correctly picks a sequential scan instead. That is the right plan for a one-time
  bulk delete, and it is not the steady state — the daily prune only ever sweeps the
  slice that just aged past the window, which is where the index earns its keep.

- **Empty state** — a brand-new user has zero rows and `seenAt = null`. That is what
  most users actually see first, and PR-B owns it. `seenAt = null` must render as "no
  divider," not as "everything is backfill."

## Not verified here

Honest limits, so this does not read as an attestation:

- The three triggers were exercised via their **existing integration tests**, not by
  driving the real upstream UI. Those tests call the fan-out functions against a real
  database, which is what proves the row lands — but the route → fan-out wiring for the
  admin paths is verified by reading the call sites (cited above), not by clicking.
- The **concurrency** failure in section 2 is derived from reading the transaction
  boundaries, not from a forced race. I did not write a racing test, because the
  conclusion (no ledger exists) does not need one — there is nothing that _could_ stop
  the duplicate.
- Fan-out on **staging** with real crawl data is walked as part of the epic's staging
  validation, after PR-C. Named here so it is not quietly skipped.

## Follow-up

File an issue for the writer-idempotency gap: watch-fanout and contest-notifications
need either a claim ledger of the `spotify_alert_log` shape or a unique constraint on
a natural key. Out of scope for #737; escalated in priority by it.
