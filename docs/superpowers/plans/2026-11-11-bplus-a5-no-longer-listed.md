# B+ A5: No longer listed — phase plan

Part of the B+ umbrella plan (`2026-11-11-bplus-redesign.md`, Track A, item A5). Source: `design/design_handoff_bplus_redesign/status-and-dispute-fixes.md` §2, "Stale-sweep cancellations (Hugh decided)". The umbrella plan asks for this phase plan first because the change is crawl-adjacent.

## The problem

`sweepStaleEvents` (`packages/crawler-core/src/lib/stale-event-sweep.ts`) sets `events.status = 'cancelled'` on any `upcoming` row the crawler hasn't seen for 14 days. It writes an audit row (`actor_id = 'system:stale-event-sweep'`, `action = 'event.auto_cancel.stale'`) and notifies nobody. Every consumer surface then draws it exactly like a fan- or admin-confirmed cancellation: struck row, red Cancelled chip, "This show has been cancelled" banner. Nothing in the app reads the audit row, so a sweep cancellation can't be told apart from a human one.

Hugh's ruling: a sweep-removed show gets its own state, shown as **No longer listed** (a grey chip, a dashed row and the line "The venue took this show down. It may be off."), never "Cancelled". No cancellation notifications go out for it. When the sweep runs and its 14 days do not change.

## What the code settles

- **The crawler never revives a swept row.** The upsert's conflict target is the partial unique index `WHERE status = 'upcoming'` (`crawl.ts:1359-1373`), so a show that reappears on the venue page arrives as a new `upcoming` row. Unchanged by this plan.
- **`events.status` is a Postgres enum** (`event_status`, migration 0000), not a checked text column. Adding a value needs `ALTER TYPE … ADD VALUE`, and every exhaustive `Record<EventStatus, …>` on the web and in the API becomes a compile break, and a runtime break for any client older than the deploy.
- **Listing filters already include `cancelled`** (`SCHEDULED_STATUSES`, browse, search, artist upcoming) and exclude it from history, crew shows and past venue shows. A swept show should sit in exactly the same lists: it is still a show someone may hold tickets for.
- **The sweep is the only silent cancellation path.** Report promotion and the admin PATCH both fan out `watch.cancelled`.
- **`StatusChip` already has the state.** F3 shipped `removed` (neutral tone, always dashed). Nothing passes it yet.

## Decision: a marker column, not a new status

Add `events.delisted_at timestamptz NULL`. The sweep sets it in the same statement that sets `status = 'cancelled'`. A show is **No longer listed** when `status = 'cancelled' AND delisted_at IS NOT NULL`.

Why not a new enum value:

| | `delisted_at` column (recommended) | `status = 'removed'` enum value |
| --- | --- | --- |
| Migration | One nullable column. Expand-only, instant. | `ALTER TYPE ADD VALUE`; cannot be used in the same transaction the migrator wraps it in. |
| Old clients during deploy | Read `cancelled`, as today. | Hit an unknown status; exhaustive maps crash. |
| Every status filter in the API | Unchanged. | Each one must learn the new value or the show vanishes. |
| Rollback | Ignore the column. | Contract migration over live rows. |

The cost is that every consumer branch on `cancelled` has to ask one more question. That is contained by putting the derivation in one place per side (below).

### Leaving the state

- **A fan or admin confirms a real cancellation** of a delisted show: the promotion (or PATCH) clears `delisted_at`, and that counts as a real transition, so watchers get `watch.cancelled` then. Today `hasEventStateChanged` sees `cancelled → cancelled` and stays silent; that comparison changes to "status differs, or the row was delisted".
- **Admin sets it back to `upcoming`** (the Missing tab's opposite action): clears `delisted_at` too.
- **The show reappears on the venue page:** a new `upcoming` row, as today. The delisted row stays as it is. Merging the two is the moved-event flow's job, not this one.

## Build: two PRs

### PR 1 (risky: DB, crawler-core, API) — migration 0097 plus the marker

1. **Migration 0097** (expand-only): `ALTER TABLE events ADD COLUMN IF NOT EXISTS delisted_at timestamptz;`. Backfill in the same file, guarded so it only touches rows the sweep cancelled and nobody has touched since:
   ```sql
   UPDATE events e SET delisted_at = a.created_at
   FROM audit_log a
   WHERE a.action = 'event.auto_cancel.stale' AND a.target_id = e.id::text
     AND e.status = 'cancelled' AND e.delisted_at IS NULL
     AND e.updated_at <= a.created_at + interval '1 minute';
   ```
   The `updated_at` guard skips any row a human edited after the sweep. **Prod migration needs Hugh.** Journal `when` set at rebase-before-merge to max(origin/main) + 86400000 (the orchestrator's rule).
2. **Schema and types:** `delistedAt` on the Drizzle `events` table; `delistedAt: string | null` on `Event` (optional on the wire so an older API reads as not delisted).
3. **Sweep:** `.set({ status: 'cancelled', delistedAt: now, updatedAt: now })`. Same transaction, same audit row. No notification (unchanged, now asserted by a test).
4. **Leaving the state:** report promotion (`event-reports.ts`, `admin/events.ts` resolve) and admin PATCH clear `delisted_at` and treat a delisted row as a real transition to `cancelled`. Setting `upcoming` clears it too.
5. **API payloads:** every projection that already selects `events.status` for a consumer (browse list, detail, related, venue, artist upcoming, watching, search) adds `delistedAt`.
6. **Tests:** sweep integration (sets both, no notification rows); promotion of a cancelled report on a delisted show notifies and clears; PATCH to upcoming clears; payload carries the field; migration backfill on a fixture that includes a human-edited row.

### PR 2 (UI) — the state on every surface

One derivation per side, so no surface asks the question its own way:

- `resolveRowStatus(lifecycle, status, delistedAt)` in `event-row/lib/row-status.ts` returns `removed` for a delisted cancellation. `PriceStack` draws `StatusChip status="removed"`; the row takes the dashed edge and the support line "The venue took this show down. It may be off." in place of the strike. Rows on Browse, venue, artist and Watching all go through it.
- Event detail: the cancelled banner and title strike give way to the No longer listed card (same line), and the CTA keeps the ticket or venue link rather than Refund info, since nothing says the show is off.
- Watching's status copy (`WatchingContent.tsx:28`) gets the state.
- Admin surfaces are out of scope (the handoff says so).
- Copy through `/fwd:copy-review`: the chip label, the line, the detail card and its accessible name. A v-next release note.
- `feature-acceptance`: Browse, venue, artist, Watching and event detail at 390 and 1300 on staging, with a delisted fixture.

## Out of scope

- When the sweep runs and the 14 days (Hugh: unchanged).
- Any "No longer listed" notification. `COPY.md` lists "No longer listed (chip, row and notification)", but the handoff says no cancellation notifications go out and the rows board draws none. **Question for Hugh:** should watchers get a quiet, non-cancellation notice ("The venue took this show down") or nothing? This plan builds nothing until he answers.
- Reconciling a delisted row with its reappearance as a new row.
- Admin review screens.

## Risks

- **A surface that branches on `cancelled` and misses the derivation** draws a delisted show as Cancelled. The PR 2 inventory above is the list of every consumer branch found on origin/main (`row-status.ts`, `PriceStack.tsx`, `StatusChip`, `EventDetailCtaBlock.tsx:92`, `RunGroup.tsx:123`, `EventTitleBlock.tsx:106`, `WatchingContent.tsx:28`, `EventDetailClient.tsx` price and banner branches, event-row copy). A grep for `'cancelled'` in `apps/web/src/components/consumer` is part of PR 2's checklist.
- **The backfill writes prod rows.** It is guarded, idempotent and reversible (`UPDATE events SET delisted_at = NULL`), but it is still a prod data write, so it waits for Hugh with the migration.
