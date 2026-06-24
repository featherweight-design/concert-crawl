# Admin Contest-Review UI — Bridging Spec

> **Status:** Approved by Hugh 2026-06-23. All §15 sign-offs and §16 open questions resolved (see §18 Resolution log). Plan drafted at `docs/superpowers/plans/2026-06-22-admin-contest-review.md` and shipping for review alongside this spec. Closes a gap surfaced during the price-source discoverability cycle: contests can be filed and corroborated by fans, but admins have no UI to triage stalled contests — and resolving one today silently overturns a confirmed price with no audit trail tying the parent and challenger together.
>
> **Sources:**
> - Design property table: `docs/superpowers/design-tables/admin-contest-review.md`
> - Code recon: `docs/superpowers/recon-admin-contest-review.md`
> - Design handoff: `design/design_handoff_phase8_5_corroboration/` (admin-queues.jsx, dispute-surfaces.jsx, README.md)
> - Hard-dependency relationship: gates the consumer-side elevated contest entry in PR 4 of the price-source cycle (#641 / #644).

---

## 1. What this is

The contest-review surfaces are the admin-side adjudication for two parallel adjudication families:

1. **Price disputes** — a fan submitted a corroborated price; another fan submitted a counter with a different price for the same `(tier, source_category)` slot. Backend exists (`priceSubmissions.disputedSubmissionId` self-ref, `POST /v1/submissions/:id/dispute`, parent flipped to `status='disputed'`). Admin UI does not.

2. **Event status reports** — fans report a show is sold-out / cancelled / postponed / has tickets available. Backend exists (`event_reports` table, `event.report.resolve` audit action). Admin UI does not for the contest-review surface (a queue + adjudication panel).

Designs cover both families with mirror-shape chrome (queue → per-event adjudication panel). This spec covers both, but **§14 Scope** locks ship order.

## 2. Why this is fundamental

The system has a moderation foot-gun today: an admin who approves a pending price submission via the existing `PATCH /v1/admin/prices/submissions/:id` endpoint may not realize the submission is a contest against a corroborated price. The existing admin review page shows pending submissions as a flat list with no `disputedSubmissionId` context. Approving a counter today silently overturns a confirmed price with no audit linkage between the parent and the challenger.

The price-source discoverability cycle (`#641 / #644`) makes contests more discoverable on the consumer side (`PendingCardB`'s "Saw a different number?" surfaces across multi-tier event cards). More discoverability → more contests → more chances of an admin blind-approving an overturn. The admin contest-review UI closes that loop before PR 4 (Consumer UI) ships.

---

## 3. Scope

### In scope (PR 1 — price disputes)

- New admin route or tab surfacing price disputes as their own queue
- Per-contest adjudication panel showing both sides (parent + counter) with full submission shape, admin reason field, and three actions
- **Atomic** resolution: a single DB transaction that flips winner, archives loser, updates `events` denormalized projection, awards cred, and writes audit
- `priceSubmissionStatusEnum` extended with `archived` (was previously only `pending` / `corroborated` / `disputed` / `stale`)
- `archived_reason` column on `price_submissions` (admin's written reason for the archive)
- New API endpoints: `GET /v1/admin/contests/prices`, `GET /v1/admin/contests/prices/:contestId`, `POST /v1/admin/contests/prices/:contestId/resolve`, `POST /v1/admin/contests/prices/:contestId/defer`
- In-app notification to both parties on resolution
- Audit log capturing the full state transition (parent before/after, challenger before/after, resolution, reason, event price change)
- Defensive existing endpoint: `PATCH /v1/admin/prices/submissions/:id` learns that a submission whose `disputed_submission_id` is not null OR whose `status === 'disputed'` cannot be approved via that endpoint — admins must use the contest endpoints instead. This closes the foot-gun even if the new UI is bypassed.

### In scope (PR 2 — event reports)

Spec covers it, but **implementation deferred to a follow-up PR**:

- Mirror UI surfaces for `EventReportsQueue` and `EventReportResolutionPanel`
- Filter chips (`All`, `Sold out`, `Cancelled`, `Postponed`)
- `imminent · <7 days` row tell when `events.date < now + 7 days` AND `report.kind === 'cancelled'`
- Atomic resolution against the existing `event_reports` schema

Split rationale: backend semantics are different (events vs price submissions), and the price-side foot-gun is the gating concern for PR 4 of the price-source cycle. Event-report adjudication is shipped today (via existing `event.report.resolve`) — there's no parallel "blind-approval" bug to close.

### Out of scope

- Bulk operations (resolve N contests at once) — defer to a follow-up if admin volume warrants it
- Submitter trust history / drill-through from admin handle to submitter profile — defer to a separate "Reporter trust view" PR per README §8.4
- Email notifications on resolution — in-app only for v1
- Mobile-optimized layout — admin chrome is desktop-first (min-width recommendation, no mobile fallback chrome)
- Counter-against-counter chains — only one pending counter per parent is supported (see §10)
- Replacing the existing admin/review flat-list approve/reject for non-contest pending submissions — those keep their current path

---

## 4. Architecture decisions

### 4.1 Route + integration

**Locked: extend `/admin/review` with a new tab.** Reasons:
- The existing review page already surfaces "stuff admin needs to triage" — pending submissions, event flags, missing events
- Adding a separate `/admin/contests` route would split the mental model and require its own nav badge plumbing
- Existing `useReviewCounts()` extends cleanly to add a `contests` field

The review page already has a tabs pattern; adding `Contests · {count}` as a sibling to `Pending submissions` is a small, additive change. URL: `/admin/review?tab=contests`. Tab state persists via URL query param.

### 4.2 Backend ownership

The contest endpoints live under `apps/api/src/routes/admin/contests.ts` (new file) and mount on `adminRouter` alongside `admin/prices.ts`. Reasons:
- Distinct from the single-row PATCH flow in `prices.ts` — different transaction shape, different audit metadata
- Keeps the contest resolution semantics in one file for review

### 4.3 Resolution as a single transaction

**Locked: every resolution is one DB transaction.** Mirrors the existing consumer pattern at `apps/api/src/routes/price-submission-confirms.ts` and the admin PATCH transaction at `apps/api/src/routes/admin/prices.ts`. Steps (in order):

```
BEGIN
  SELECT id, status, price_min, price_max, user_id, event_id, tier, source_category
    FROM price_submissions
    WHERE id IN (:parentId, :challengerId)
    FOR UPDATE  -- prevents concurrent admin actions / races with consumer confirms

  -- Sanity gates (return 409 conflict if any fail):
  ASSERT parent.disputed_submission_id IS NULL
  ASSERT challenger.disputed_submission_id = parent.id
  ASSERT parent.status IN ('corroborated', 'disputed')   -- not already archived
  ASSERT challenger.status = 'pending'                    -- not withdrawn
  -- Same-slot assertions: defensive against any upstream bug or parameter
  -- mix-up. The slot identity is (event_id, tier, source_category); if any
  -- diverges between parent and challenger we never propagate a wrong
  -- price to the events row.
  ASSERT parent.event_id = challenger.event_id
  ASSERT parent.tier = challenger.tier
  ASSERT parent.source_category IS NOT DISTINCT FROM challenger.source_category

  IF resolution = 'challenger_wins':
    UPDATE price_submissions SET status = 'corroborated', updated_at = NOW()
      WHERE id = :challengerId
    UPDATE price_submissions SET status = 'archived', archived_reason = :reason, updated_at = NOW()
      WHERE id = :parentId
    UPDATE events SET ticket_price_min = :challenger.price_min,
                      ticket_price_max = :challenger.price_max,
                      price_source = 'community',
                      updated_at = NOW()
      WHERE id = :event_id
    UPDATE user_roles SET price_cred_score = price_cred_score + 1
      WHERE user_id = :challenger.user_id

  ELSE IF resolution = 'parent_wins':
    UPDATE price_submissions SET status = 'corroborated', updated_at = NOW()
      WHERE id = :parentId
    UPDATE price_submissions SET status = 'archived', archived_reason = :reason, updated_at = NOW()
      WHERE id = :challengerId
    -- events row already reflects parent's price; no propagation
    -- parent submitter already received cred when corroborated; no re-award

  -- Mark any OTHER pending counters against the now-archived loser as
  -- 'orphaned' so they don't surface in the queue (see §10 multi-counter).
  IF resolution = 'challenger_wins':
    UPDATE price_submissions SET status = 'archived',
                                  archived_reason = 'parent was archived in a contest; refile against new winner',
                                  updated_at = NOW()
      WHERE disputed_submission_id = :parentId
        AND id != :challengerId
        AND status = 'pending'

COMMIT
```

Both audit and notification writes happen **after** the resolution transaction commits (so failures in either cannot roll the resolution back), but via distinct mechanisms:

- **Audit log** — written by the existing audit middleware (`apps/api/src/routes/admin/index.ts:31–59`), driven by `ctx.set('auditAction', ...)`, `ctx.set('auditTargetId', ...)`, `ctx.set('auditMeta', ...)` calls inside the handler. The middleware runs `await next()` first (so the handler completes and the resolution transaction commits), then writes the audit row inside a try/catch that swallows insert failures. The insert is part of the request lifecycle — not literally post-response-flush — but its failures cannot roll back the resolution because the resolution transaction has already committed. Handler code does NOT call `db.insert(auditLog)` directly.
- **Notification rows** — written explicitly by the handler via `await writeContestNotifications({...})` (the helper in `apps/api/src/lib/contest-notifications.ts`), wrapped in a try/catch so failures don't fail the response. Distinct from audit: the helper inserts into `notifications`, not `audit_log`.

Both run outside the resolution transaction so a Sentry-tagged error in either telemetry path leaves the DB resolution intact.

### 4.4 `events` projection on contest resolution

The `events` table carries a denormalized `(ticketPriceMin, ticketPriceMax, priceSource)` headline price for the consumer browse card. When a contest resolves with `challenger_wins`, that projection must update to the challenger's price atomically with the status flip. PR 3 of the price-source cycle introduced `priceByTier` on the detail endpoint, but the browse-card chip still reads from `events.ticket_price_min` directly. Until that consumer migration completes (PR 4), this denorm must stay correct.

### 4.5 Notification policy

The consumer-side notification UI gap (no bell, no panel, no consumer endpoint to discover `user_notification` rows) makes "push-style" notifications impossible for v1 without expanding scope. Tracked as **#737** with a design prompt.

**Locked: hybrid data + passive surfacing.**

1. **Write `notifications` rows on every action** — both `resolve` and `defer`. Schema supports `user_notification` type today; the rows accumulate so when the consumer notification UI ships (#737), there's an audit trail to backfill.

   Per action, one row per party (parent submitter + challenger submitter, deduped if same user):
   - `type: 'user_notification'`
   - `category: 'contest.resolved'` (or `'contest.needs_info'`)
   - `title: 'Your price submission was reviewed.'` (or `'More info requested on your price submission.'`)
   - `body: <admin's reason text>`
   - `actionUrl: /events/<eventId>`
   - `metadata: JSON.stringify({ submissionId, contestId, resolution })`

2. **Passive surfacing on the event detail page** — extend the existing `priceByTier[].counterSubmission` shape (introduced in PR 3 of the price-source cycle) with two fields:
   - `lastAdminActionAt: string | null` — ISO timestamp of the most recent admin action on the contest
   - `lastAdminActionKind: 'defer' | null` — set on defer, cleared on resolve (resolution closes the contest, so no need to surface)

   The Consumer UI shows a quiet pill on the counter card when `lastAdminActionKind === 'defer'`: *"Admin requested more info"*. Anyone visiting the event page sees the engagement signal — no notification system needed.

3. **No bell, no panel, no push** in this PR. The submitters don't get a push-style alert; they find out by revisiting the event page. Acceptable trade-off because:
   - Submitters are already engaged with the event (they filed a submission for it)
   - The event detail page is the natural place to check
   - #737 will add the bell when it ships, and the notification rows already in the table get backfilled

**Operational note (not enforced in code):** admins should default to making a decision (`Keep original` / `Promote counter`) rather than deferring. The `Need more info` action is for genuine edge cases — bad URL, vendor mismatch, ambiguous tier — not for indecision. The flexibility is preserved because the cost is low, but it's not the primary path.

Email notifications: out of scope for v1. Email infra exists (Resend) but is admin-only today. Consumer email notifications are a separate concern with deliverability + opt-out implications, tracked outside this PR.

### 4.6 One contest per parent — schema-enforced 1-to-1

**Locked: one pending counter per parent. Enforced at the schema level via partial unique index.**

```sql
CREATE UNIQUE INDEX price_submissions_pending_counter_unique_idx
  ON price_submissions (disputed_submission_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
```

The DB makes it impossible to have two pending counters against the same parent. Application code returning 409 is now belt-and-braces, not the primary defense. The orphaned-counter auto-archive logic in §4.3 becomes dead-by-construction (a graceful cleanup path that never fires in steady state, but is kept to handle migration-window in-flight rows).

Rationale:
- The system is naturally 1-to-1 (one dispute at a time per slot). 1-to-many adds complexity without product value.
- Eliminates the design's ambiguity around 1-vs-N adjudication (A5)
- Keeps `AdminDisputePanel` literally one-vs-one as designed
- Simpler audit trail, simpler queue rendering, simpler edge cases
- If consumer feedback later asks for parallel dispute support, that's a separate, opinionated PR

**Server-side defense — both counter-creation routes get the same treatment:** counters today can be inserted from TWO places (see recon §gap-5):
- `POST /v1/submissions/:id/dispute` (`apps/api/src/routes/submissions.ts`) — initial dispute from DisputeForm
- `POST /v1/events/:eventId/price-submissions` (`apps/api/src/routes/price-submissions.ts`) — CounterSubmitSheet path; allowed when the body includes `disputedSubmissionId` (server validates the referenced parent has `status='corroborated'`)

The DB partial unique index is the source of truth and catches duplicates in either route. Both handlers add the same pre-insert check + DB unique-violation (Postgres SQLSTATE `23505`) translation so consumers see a clean 409 instead of a 500:

```ts
const existingCounter = await db.select({ id: priceSubmissions.id })
  .from(priceSubmissions)
  .where(and(
    eq(priceSubmissions.disputedSubmissionId, parentId),
    eq(priceSubmissions.status, 'pending'),
  ))
  .limit(1)
if (existingCounter.length > 0) {
  return ctx.json({ success: false, error: 'Another challenge is already pending against this submission.' }, 409)
}

// Plus, wrap the insert in a try/catch and translate SQLSTATE 23505 on
// price_submissions_pending_counter_unique_idx to the same clean 409 —
// belt-and-braces against the narrow race window between the SELECT and INSERT.
```

**Consistency fix — both routes must also flip the parent to `disputed`.** Today only `/v1/submissions/:id/dispute` updates `parent.status` in the same transaction; `/v1/events/:eventId/price-submissions` inserts the child but leaves the parent on `corroborated`. The admin queue query in §6.1 is therefore keyed off the pending counter row (`disputed_submission_id IS NOT NULL AND status='pending'`) — not the parent's status field — so contests are discoverable regardless of the creation route. For data hygiene, the price-submissions route also gets the parent-flip in the same transaction as the insert (matches the existing dispute-route behavior).

**Slot-identity inheritance — both routes must lock the child to the parent's slot.** The resolve transaction's same-slot assertions (event_id / tier / source_category match) will 409 at admin resolution time if a counter was ever inserted with a mismatched slot. `/v1/submissions/:id/dispute` already inherits `eventId`, `tier`, `vendor`, and `sourceCategory` from the parent (`apps/api/src/routes/submissions.ts:155–168`). `/v1/events/:eventId/price-submissions` does NOT — it currently lets the submitter supply `tier`, `vendor`, `howFound`, and `sourceCategory` from the request body, and only validates that the referenced parent is `status='corroborated'`. When `disputedSubmissionId` is provided in that route, the server MUST overwrite the submitter-supplied slot fields with the parent's values (or reject with 400 if they don't match) so the contest is guaranteed to be a clean 1-vs-1 same-slot adjudication at admin resolve time. Without this, well-meaning UI changes upstream (or a malicious client) can create contests that always 409 at resolve.

**Consumer-side UX (locked for PR 4 of the price-source cycle, not this PR):** when `priceByTier[tier].counterSubmission !== null`, the Consumer UI hides the dispute affordance for that tier and surfaces a CTA to engage with the existing contest instead (confirm or wait). This rule is saved as `memory:project_pr4_dispute_affordance_hiding` (out-of-repo session memory, not a repo file). A user should never see a 409 from filling out a dispute form — the affordance is hidden BEFORE they reach the form, not after they submit it.

### 4.7 Defensive update to existing PATCH endpoint

The current `PATCH /v1/admin/prices/submissions/:id` lets an admin set status to `corroborated`, `disputed`, or `stale` on any submission, including counters. This is the foot-gun. The fix:

```ts
// In PATCH /v1/admin/prices/submissions/:id handler, after fetching the submission:
if (submission.disputedSubmissionId !== null || submission.status === 'disputed') {
  apiLogger.warn(
    { submissionId: id, status: submission.status, disputedSubmissionId: submission.disputedSubmissionId },
    'PATCH lockout: contest row reached the non-contest endpoint',
  )
  // Sentry tag for triage — see §11.3
  Sentry.captureMessage('Contest row hit PATCH /v1/admin/prices/submissions/:id', {
    level: 'warning',
    tags: { endpoint_lockout: 'contest_row' },
    extra: { submissionId: id, status: submission.status },
  })
  return ctx.json({
    success: false,
    error: 'This submission is part of a contest. Resolve via /v1/admin/contests/prices/:contestId instead.',
  }, 409)
}
```

This closes the foot-gun even if the new contest UI is bypassed (e.g. an admin shell-curls the existing endpoint or a future feature surfaces it).

**Loud telemetry rationale:** baseline volume should be near-zero in steady state (the new contest UI never routes through this endpoint, and humans don't directly curl it). When the Sentry event fires, it's a real signal — UI regression, bot abuse, or stale client code reaching for the old endpoint. The `endpoint_lockout: contest_row` tag separates these from ordinary 409s in triage. Trade-off accepted: a tiny amount of telemetry noise in exchange for catching real bypass attempts.

---

## 5. Data model changes

### 5.1 `price_submission_status` enum gets `archived`

Migration adds an enum value:
```sql
ALTER TYPE price_submission_status ADD VALUE 'archived';
```

**Semantics distinct from `stale`:**
- `stale`: admin marked as outdated/no-longer-valid (existing usage — e.g., event passed without resolution)
- `archived`: lost a contest; the row is preserved for audit and reputation but never returned by consumer queries

Both archived AND stale rows are excluded from the corroborated/pending consumer view.

### 5.2 New `archived_reason` column

Migration adds:
```sql
ALTER TABLE price_submissions
  ADD COLUMN archived_reason text;
```

Plain text (no length limit chosen — admin reasons can be longer than the 280-char `note` cap). Nullable; set in two cases:

1. **Steady state** — admin resolution and defer flows set `archived_reason` together with `status = 'archived'` on the losing row in the same transaction. This is the primary use case.
2. **Migration-window cleanup** — the §12 defensive pre-index cleanup also writes `archived_reason` while marking pre-existing orphaned pending counters as `status = 'stale'` (not `'archived'`). The cleanup can't use `'archived'` because Postgres forbids referencing a newly-`ALTER TYPE ADD VALUE`'d enum label inside the same transaction that added it (see migration `0034_crawl_status_skipped.sql:21–24` for the documented precedent). `'stale'` is the closest existing enum value semantically; `archived_reason` still carries the audit trail of WHY the row was swept.

Implication for downstream code: do NOT assume `archived_reason IS NOT NULL ⇒ status = 'archived'`. The relationship is "archived_reason is the admin/system rationale for why this row is no longer active". Query by `status` for behavior; read `archived_reason` for the explanation.

Why not reuse `note`: `note` is the submitter's free-text. Stomping it with admin text would lose context. Separate column makes the intent legible.

### 5.3 Partial indexes for queue performance

Migration adds:
```sql
CREATE INDEX price_submissions_disputed_status_idx
  ON price_submissions (created_at)
  WHERE status = 'disputed';

CREATE INDEX price_submissions_pending_counters_idx
  ON price_submissions (disputed_submission_id, created_at)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
```

These power the contest-queue query and the counter-lookup join. **The queue query is keyed off pending counter rows** (`status='pending' AND disputed_submission_id IS NOT NULL`), not parent rows in `disputed` state — see §4.6 for why (two counter-creation routes exist and historically only one flipped the parent). The `disputed`-status index on the parent side is still useful for the §6.5 event-detail aggregation that surfaces the per-event contest pill, and post-§4.6 the two indexes will agree in steady state. Current volume is small (4 submissions in prod) but the cost is near-zero and the queue query is the hot path for the new UI.

### 5.4 `PriceSubmission` shared type extension

`packages/types/src/index.ts` interface — must match every column added by migration 0041 (§12) so the shared type is the single source of truth for both API and web app:

```ts
export interface PriceSubmission {
  // ... existing fields
  note: string | null              // was missing from shared type — added
  archivedReason: string | null    // NEW — admin's archive reason
  lastAdminActionAt: string | null // NEW — ISO timestamp of most recent admin action
  lastAdminActionKind: 'defer' | null  // NEW — drives the "Admin requested more info" pill on consumer event detail
}
```

Also: the `status` union literal must include the new `'archived'` value. Update the existing union from `'pending' | 'corroborated' | 'disputed' | 'stale'` to `'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'`.

`note` was always in the DB but missing from the shared interface — recon caught this. `archivedReason`, `lastAdminActionAt`, `lastAdminActionKind` are added in step 3 of the migration. The admin panel needs `note` for the per-side display per design table §3 (`AdminEntry.note`); the consumer event-detail handler reads `lastAdminActionAt`/`Kind` from the counter row to surface the engagement-signal pill per §4.5.

---

## 6. API endpoints

### 6.1 List contests — `GET /v1/admin/contests/prices`

**Auth:** admin only.

**Query params:** `limit` (default 20, max 100), `offset` (default 0). Sort is locked to `filedAt asc` (counter.createdAt ascending — oldest contest first) per §7.8; no `sort` param in v1. Configurable sort is deferred to a follow-up alongside the "All disputes" full-list view.

**Response shape:**
```ts
{
  success: true,
  data: {
    items: Array<{
      contestId: string                    // parent submission id (stable cursor for the contest itself)
      eventId: string
      eventTitle: string
      venueName: string
      eventDate: string                    // ISO date
      tier: Tier
      sourceCategory: SourceCategory | null
      parent: {
        id: string
        priceMin: string
        priceMax: string | null
        vendor: Vendor
        submitter: { userId: string, handle: string | null }
        confirms: { fans: number, admin: number }
        observedAt: string                 // parent.createdAt
        lastUpdatedAt: string              // parent.updatedAt — the most recent
                                            // server-side row update (bumped on
                                            // dispute-file, confirm, and admin
                                            // action). NOT a reliable "approved at"
                                            // since disputing flips parent to
                                            // 'disputed' + bumps updatedAt. Honest
                                            // name; an actual approvedAt would need
                                            // a separate column or audit-log lookup
                                            // (deferred).
        note: string | null
      }
      counter: {
        id: string
        priceMin: string
        priceMax: string | null
        vendor: Vendor
        submitter: { userId: string, handle: string | null }
        confirms: { fans: number, admin: number }  // mirrors parent shape;
                                                    // fans = counter.corroborationCount
                                                    // (pending counter starts at 1 — submitter
                                                    // is implicit observation #1). Drives the
                                                    // queue row's counter attribution text
                                                    // per design table §2.
        observedAt: string                 // counter.createdAt
        note: string | null
      }
      filedAt: string                      // counter.createdAt — "filed" is when the dispute was opened
    }>
    total: number
    limit: number
    offset: number
  }
}
```

One row per `(parent, counter)` pair. Sort is `filedAt asc` (oldest = highest priority).

**A17 resolution:** `confirms` is structured `{ fans: number, admin: number }`. Display layer formats as `"{fans} fans · {admin} admin"`.

### 6.2 Detail — `GET /v1/admin/contests/prices/:contestId`

Returns the same shape as a single row from §6.1, plus an optional `history` field showing prior admin actions on either side (e.g., if this parent has been involved in a previous contest that was resolved). For v1, history is empty array — defer to a follow-up.

### 6.3 Resolve — `POST /v1/admin/contests/prices/:contestId/resolve`

**Auth:** admin only.

**Request body (Zod):**
```ts
{
  resolution: 'parent_wins' | 'challenger_wins',
  reason: z.string().min(10).max(2000),
}
```

`reason` required, min 10 chars (forces deliberate text, blocks accidental empty submits), max 2000 chars (generous; admins occasionally need to write paragraphs).

**Response:**
- 200 with `{ success: true, data: { resolution, parent: <updatedRow>, challenger: <updatedRow>, eventPriceUpdated: boolean } }`
- 404 if either submission not found
- 409 if any precondition fails (status mismatch — parent already archived, challenger withdrawn, etc.) — error body includes which precondition

### 6.4 Defer — `POST /v1/admin/contests/prices/:contestId/defer`

**Auth:** admin only.

**Request body:**
```ts
{
  reason: z.string().min(10).max(2000),
}
```

**Effect:**
- No status changes to either submission (both stay as they are — parent `disputed`, challenger `pending`)
- **Sets `last_admin_action_at = NOW()` and `last_admin_action_kind = 'defer'` on the COUNTER row** (not the parent — the pill in §4.5 surfaces on the counter card via `priceByTier[].counterSubmission`). This is the mechanism that lights up the "Admin requested more info" pill on the consumer event-detail page; without setting these columns, the defer action is invisible to consumers.
- Writes audit row `contest.defer` with the reason via `ctx.set('auditAction', ...)` (the audit middleware handles the insert)
- Writes `notifications` rows for both parties with `category: 'contest.needs_info'` and the admin's reason as the body, via `writeContestNotifications({ action: 'defer', ... })`

Admin can revisit the contest later. The queue still shows it (no state change). This is intentional: "Need more info" creates a pause, not a resolution.

The column writes happen inside a small transaction (or single UPDATE — no concurrency risk because there's no atomicity requirement with anything else). Audit + notification writes happen outside per §4.3 (best-effort).

### 6.5 Counts extension

`GET /v1/admin/review/counts` adds a `priceContests: number` field. Drives the `Contests · {count}` tab pill on `/admin/review`.

### 6.6 Audit metadata schema

For `contest.resolve`:
```ts
{
  resolution: 'parent_wins' | 'challenger_wins',
  parentId: string,
  challengerId: string,
  eventId: string,
  tier: Tier,
  sourceCategory: SourceCategory | null,
  reason: string,
  parentBefore: { status: PriceSubmissionStatus, priceMin: string, priceMax: string | null },
  parentAfter: { status: PriceSubmissionStatus, priceMin: string, priceMax: string | null },
  challengerBefore: { status: PriceSubmissionStatus, priceMin: string, priceMax: string | null },
  challengerAfter: { status: PriceSubmissionStatus, priceMin: string, priceMax: string | null },
  eventPriceUpdated: boolean,    // true when challenger_wins propagates to events row
  orphanedCounterIds: string[],  // ids of OTHER pending counters auto-archived per §4.3 final step
}
```

For `contest.defer`:
```ts
{
  parentId: string,
  challengerId: string,
  eventId: string,
  reason: string,
}
```

---

## 7. Frontend surfaces

The design property table at `docs/superpowers/design-tables/admin-contest-review.md` is the source of truth for visual values; this section locks the **integration** decisions only.

### 7.1 Route + layout

- `/admin/review?tab=contests` — new tab on the existing review page
- Tab pill copy: `Contests · {count}` (count from `priceContests` field of counts API)
- Default tab when count > 0: `contests` (so unresolved adjudication work surfaces immediately when admin opens the review page; within the tab, the queue is sorted `filedAt asc` per §7.8 — oldest contest first)
- Default tab when count === 0: `pending` (existing behavior preserved)
- URL is the source of truth for tab selection (shareable admin links)

### 7.2 Components

| Component | Location | Notes |
|---|---|---|
| `PriceDisputesQueue` | `apps/web/src/components/admin/review/PriceDisputesQueue.tsx` | Auto-hides when `items.length === 0` per design |
| `PriceDisputesQueueRow` | inline in same file | One per `(parent, counter)` pair |
| `AdminDisputePanel` | `apps/web/src/components/admin/review/AdminDisputePanel.tsx` | Modal-style; opens in a new route `/admin/review/contests/:contestId` (deep-linkable) |
| `AdminEntry` | `apps/web/src/components/admin/review/AdminEntry.tsx` | Shared sub-component for parent + counter columns |
| `useReviewContestsQuery` | `apps/web/src/lib/queries/admin-contests.ts` | List query |
| `useReviewContestDetail` | same | Single contest query |
| `useResolveContest`, `useDeferContest` | same | Mutations |

**A12 resolution — buttons commit on click.** The design's `Keep original` / `Promote counter` buttons are the action triggers directly; there is NO separate "Submit resolution" step. Each button requires a non-empty (min 10-char) reason before it enables. On click, the corresponding column gets the `winner` border treatment optimistically (preview UI while the API request is in flight) and the API call fires immediately. The `winner` parameter is therefore a transient client-side preview state derived from the action click, not a committed pre-decision.

### 7.3 Actions

**Locked: three buttons matching the design verbatim.**

- `Need more info` — outline / muted color, requires reason ≥ 10 chars before enabling, calls defer endpoint
- `Keep original` — gold outline (`GOLD_D`), requires reason ≥ 10 chars before enabling, calls resolve with `parent_wins`
- `Promote counter` — solid azure (`AZ_D`), requires reason ≥ 10 chars before enabling, calls resolve with `challenger_wins`

**Reason field validation:**
- Empty or < 10 chars: all three buttons disabled
- ≥ 10 chars: all three enabled
- 2000-char hard limit at the input level (textarea `maxLength`)

**On success:** Panel closes, navigates back to `/admin/review?tab=contests`, queue auto-refreshes, toast `Contest resolved. Both parties notified.` (or `Notified both parties that more info is needed.` for defer).

**On error (409 conflict):** Toast with the API error body's message. Panel stays open. Refresh button surfaces the latest state.

### 7.4 Edge case: parent already resolved (A4)

When the admin opens a contest detail page whose parent has been archived OR whose challenger has been withdrawn since the queue was fetched:

- Detail API returns the current state (status reflects archived/withdrawn)
- Panel renders **read-only stale-state view**: shows both sides' final state with a banner: `This contest was already resolved. View the new live price.` and a link back to `/admin/review`
- No actions available

This is the answer to A4 (parent already resolved) and A6 (withdrawn challenger). Same surface, banner copy varies by detected state.

### 7.5 Loading / error / success states (A10, A11)

| State | UI |
|---|---|
| Queue loading | Skeleton rows (3 placeholder rows with shimmer) |
| Queue empty | Auto-hides per design (`return null`) |
| Queue error | Inline error block with retry button |
| Panel loading | Skeleton in panel chrome (header, two columns, actions) |
| Panel error | Error toast + retry button in panel |
| Action in flight | Buttons disabled, spinner on the clicked button, optimistic `winner` highlight |
| Action success | Toast + navigation back to queue |
| Action error (409) | Toast with error body; panel reloads state |

### 7.6 Accessibility (A9)

Required for v1:
- `AdminDisputePanel` is a route (not a modal), so no `role="dialog"` needed. But it does need:
  - Focus management on mount: first focusable element receives focus
  - ESC keybind to close (navigate back to queue)
- Filter chips (when event-reports queue ships in PR 2): `aria-pressed={isActive}`
- Table headers: `<th scope="col">` on every column
- Action buttons: native `<button>` elements (already in design), with explicit text labels (no icon-only)
- Visible focus indicators on all interactive elements (admin theme provides this; verify in design-review Agent 2)

### 7.7 Mobile / responsive (A8)

**Carve-out: admin chrome is desktop-first.** Min recommended viewport: 1024×768. Below that:
- Existing admin shell (`AdminShellClient`) handles the responsive shell — sidebar collapses to mobile bottom bar
- `PriceDisputesQueue` table degrades to horizontal-scroll on viewports < 768px (no bespoke mobile chrome)
- `AdminDisputePanel` (760px design width) wraps to single-column at < 800px viewport — two-up becomes stacked

Acceptable trade-off: admin work happens on desktop. Mobile fallback isn't blocked, just degraded. Not building bespoke mobile components for admin.

### 7.8 Sort + filter affordances (A13, A14)

**Locked for v1:** sort is `filed-at ascending` (oldest first); no UI affordance to change. `All disputes` button (design's ghost button) is deferred to a follow-up — for v1 the queue shows ALL open disputes paginated at limit=20.

Filter chips (event-reports only, ships in PR 2) persist via URL query param: `/admin/review?tab=eventreports&filter=cancelled`.

### 7.9 Click-through on submitter handles (A7)

**Locked for v1: not clickable.** Submitter handles render as plain text in `AdminEntry`. Trust-history surface (README §8.4 "Reporter trust view") is a separate follow-up PR.

---

## 8. State machine summary

```
priceSubmissionStatus state transitions (this PR's additions in **bold**):

  pending          [initial state when a submission lands]
    ↓ via existing confirms / admin PATCH
  corroborated     [live, headlines the event]
    ↓ via consumer dispute filed
  disputed         [parent is contested; a pending counter exists]
    ↓ via admin contest resolve (parent_wins)
  corroborated     [winner stays live]
        OR
    ↓ via admin contest resolve (challenger_wins)
  **archived**     [loser preserved with archived_reason]

  (a counter's own pending → corroborated OR archived path mirrors the above)

  stale            [unchanged — admin uses for outdated/no-longer-valid OUTSIDE contest path]
```

Existing transitions still work for non-contest paths. The new `archived` value is the contest loser sink.

---

## 9. Atomicity guarantees

For every contest resolution:

1. **Single DB transaction** wraps all four mutations (status flips, events projection, cred award).
2. **`SELECT FOR UPDATE`** on both parent and challenger rows at the start prevents concurrent admin actions on the same contest.
3. **Sanity gates** inside the transaction reject any resolve where the submissions' state no longer matches what the admin saw (parent already archived, challenger withdrawn, etc.). The admin sees a 409 toast and the UI refreshes.
4. **`events` projection** updates atomically with the status flip when `challenger_wins`. This keeps the consumer browse-card chip consistent.
5. **Cred award** atomically increments `priceCredScore` for the winning submitter.
6. **Orphaned counters** (the rare case where multiple counters race in before §4.6's pre-insert check ships) get archived in the same transaction with a reason explaining the parent was archived first.

Audit logging and notifications are **outside** the transaction (in the response middleware path) — failures there should not roll back the resolution.

---

## 10. Edge cases — explicit lock table

Resolution of every ambiguity from the design table + recon report:

| Ref | Concern | Locked behavior |
|---|---|---|
| A1 | Atomicity of admin price-side promotion | Single DB transaction wraps status flips + events projection + cred. Audit + notifications outside transaction. See §9. |
| A2 | "Need more info" semantics | Records audit row `contest.defer`, sends in-app notifications, no state change to either submission. Contest stays in queue. See §6.4. |
| A3 | Reason required / optional | Required for all three actions, min 10 chars, max 2000. Buttons disabled until valid. See §7.3. |
| A4 | Parent already resolved when admin opens panel | Detail API returns current state; panel renders read-only stale-state view with banner. See §7.4. |
| A5 | Multiple concurrent counters | API rejects 2nd pending counter at submit time (409). Admin panel is always 1-vs-1. See §4.6. |
| A6 | Withdrawn challenger | Detail returns current state (challenger status=archived if withdrawn); panel renders stale-state view. See §7.4. |
| A7 | Clickable submitter handles | Plain text for v1; trust-history view is a separate PR. See §7.9. |
| A8 | Mobile / responsive | Admin chrome is desktop-first; min recommended 1024×768. Below that, table scrolls horizontally; panel stacks columns. No bespoke mobile chrome. See §7.7. |
| A9 | Accessibility | Focus management on panel mount, ESC to close, `aria-pressed` on filter chips, `<th scope>` on table headers, native semantic elements throughout. See §7.6. |
| A10 | Loading + error states | Skeleton rows for queue loading; inline error block with retry; panel-level skeleton + retry. See §7.5. |
| A11 | Success state after promote/keep/defer | Toast + navigate back to queue; optimistic UI sets `winner` border on click. See §7.5. |
| A12 | `winner` parameter semantics | Preview state set optimistically on action click. Commit happens via the action button; reason field validates client-side first. See §7.2. |
| A13 | Filter chip persistence | URL query param (e.g. `?tab=eventreports&filter=cancelled`). PR 2. See §7.8. |
| A14 | Sort affordances | v1 is `filed-at asc`, no UI control. "All disputes" defer. See §7.8. |
| A15 | Audit logging | Every action writes an audit row. Schema in §6.6. |
| A16 | 3-button vs 2-button race for event reports | PR 2 concern — handled by panel re-fetching state on focus + buttons disabled until counter confirmed present. |
| A17 | `confirms` field type inconsistency | API returns `{ fans: number, admin: number }`; display layer formats as `"{fans} fans · {admin} admin"`. See §6.1. |
| R1 | Contest queue visibility | New tab on `/admin/review?tab=contests`. See §4.1. |
| R2 | Parent+challenger atomicity | Single DB transaction. See §4.3. |
| R3 | UI layout for contest display | Per-(parent, counter) row in the queue table, opens to dedicated panel route. See §7.1, §7.2. |
| R4 | Admin actions / outcomes | Keep original / Promote counter / Need more info (defer). No "approve both" or "force-set arbitrary price". See §7.3. |
| R5 | Counter-submission API today | `POST /v1/submissions/:id/dispute` is the existing endpoint. No separate `/counter` route. Spec extends it with the §4.6 pre-insert duplicate check. |
| R6 | Partial indexes for contest queries | Migration adds two partial indexes. See §5.3. |
| R7 | Audit log metadata for contests | Schema locked in §6.6. |
| R8 | Cred for dispute winners | +1 `priceCredScore` for the winner's submitter (challenger if they win, parent submitter already had it). Losers lose nothing. See §4.3. |
| R9 | Consumer notifications on outcome | In-app to both parties on resolve and on defer. No email for v1. See §4.5. |
| R10 | Bulk contest operations | Out of scope. See §3. |

---

## 11. Non-functional requirements

### 11.1 Performance

Contest volume in prod today: 0 active disputes. Even at 10x consumer growth and 100x dispute filing rate, the queue query stays sub-millisecond with the partial indexes from §5.3. No performance work needed beyond those indexes for v1.

### 11.2 Security

- All endpoints gated by `requireAdminUser()` (existing convention)
- Zod validation on every request body (`resolution` enum, `reason` string bounds)
- All resolution-side mutations FOR UPDATE locked to prevent concurrent races
- Audit trail captures full before/after state for every action (parent + challenger + event projection + reason)

### 11.3 Observability

- Every action writes an audit row that admins can query
- Failed transactions log via `apiLogger.warn` with `{ contestId, parentId, challengerId, error }` context
- Sentry catches unhandled exceptions in the new endpoints (existing app-wide setup)

### 11.4 Testability

- Integration tests cover: list endpoint with various states, resolve endpoint atomicity (parent_wins + challenger_wins paths), defer endpoint, 409 conflicts on stale state, defensive PATCH endpoint rejecting contest rows, pre-insert duplicate counter check
- Unit tests cover: notification payload composition, audit metadata composition

---

## 12. Migrations

Single migration `0041_admin_contest_review.sql` (verified — `0040_price_source_category.sql` is current latest as of 2026-06-23):

```sql
-- 1. Add 'archived' to status enum (loser-of-contest sink)
ALTER TYPE price_submission_status ADD VALUE 'archived';
--> statement-breakpoint

-- 2. Add admin's archived reason
ALTER TABLE price_submissions
  ADD COLUMN archived_reason text;
--> statement-breakpoint

-- 3. Add the engagement-signal columns surfaced via priceByTier[].counterSubmission
ALTER TABLE price_submissions
  ADD COLUMN last_admin_action_at timestamptz,
  ADD COLUMN last_admin_action_kind text;
  -- Note: keeping last_admin_action_kind as text (not enum) — the only value
  -- today is 'defer'; new categories don't justify an enum yet. Validation
  -- happens at the application boundary.
--> statement-breakpoint

-- 4. Partial indexes for contest queue performance
CREATE INDEX price_submissions_disputed_status_idx
  ON price_submissions (created_at)
  WHERE status = 'disputed';
--> statement-breakpoint

CREATE INDEX price_submissions_pending_counters_idx
  ON price_submissions (disputed_submission_id, created_at)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
--> statement-breakpoint

-- 5. Defensive pre-index cleanup. If any in-flight contests already have
--    multiple pending counters against the same parent (possible via the
--    race-window prior to this PR), retire the older ones BEFORE adding
--    the unique index — otherwise the CREATE UNIQUE INDEX would fail in
--    any environment where such duplicates exist.
--
--    IMPORTANT: this UPDATE uses `'stale'` (an existing enum value), NOT
--    the new `'archived'` value added in step 1. Postgres refuses to USE a
--    newly added enum value inside the same transaction (Drizzle wraps
--    each migration in one transaction — see the warning at
--    packages/db/migrations/0034_crawl_status_skipped.sql:21–24 for the
--    same constraint). `archived_reason` still carries the audit trail.
--    Production has 0 active disputes today (verify at plan-execution time),
--    so this is expected to update 0 rows, but the safety net is essential.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY disputed_submission_id
           ORDER BY created_at DESC
         ) AS rn
  FROM price_submissions
  WHERE status = 'pending'
    AND disputed_submission_id IS NOT NULL
)
UPDATE price_submissions
   SET status = 'stale',
       archived_reason = 'superseded by newer counter before schema lock'
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint

-- 6. Schema-enforced 1-counter-per-parent (the §4.6 lock). Safe to add now
--    that step 5 has cleared any pre-existing duplicates.
CREATE UNIQUE INDEX price_submissions_pending_counter_unique_idx
  ON price_submissions (disputed_submission_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
```

Each `--> statement-breakpoint` is the Drizzle migrator's required separator between top-level SQL statements (see `packages/db/migrations/0039_events_hidden_from_consumer.sql` for the established pattern). Without these, multi-statement migrations may execute as a single batch or fail at runtime.

Expand-only per project convention. The Contract PR (post-PR 4 of price-source cycle) does NOT remove anything from this migration.

---

## 13. Implementation order

Within PR 1 (price disputes):

1. **DB migration** — enum + column + indexes
2. **Shared types** — add `note` and `archivedReason` to `PriceSubmission`
3. **Defensive PATCH update** — closes the foot-gun immediately, before the contest UI exists
4. **Pre-insert duplicate counter check** — `POST /v1/submissions/:id/dispute` (§4.6)
5. **Contest API endpoints** — list, detail, resolve, defer, counts extension
6. **Audit metadata** — capture parent/challenger before/after state, reason, eventPriceUpdated
7. **Notification writes** — in-app to both parties on resolve + defer
8. **Web app components** — queue, panel, queries, mutations
9. **Tab integration** — extend `/admin/review` with `Contests` tab
10. **Tests** — integration + unit

Each step has a discrete commit + test pass before moving on.

---

## 14. Scope split: PR 1 (now) vs. PR 2 (follow-up)

| Item | PR 1 | PR 2 |
|---|---|---|
| `archived` enum value + `archived_reason` column + indexes | ✅ | — |
| `PriceSubmission` shared type extension | ✅ | — |
| Defensive PATCH + duplicate-counter pre-insert check | ✅ | — |
| Price contest API endpoints (list / detail / resolve / defer / counts) | ✅ | — |
| `PriceDisputesQueue` + `AdminDisputePanel` + `AdminEntry` | ✅ | — |
| Audit `contest.resolve` + `contest.defer` actions | ✅ | — |
| In-app notifications on resolve + defer | ✅ | — |
| `EventReportsQueue` + `EventReportResolutionPanel` + filter chips + imminent tell | — | ✅ |
| Event-report adjudication API endpoints | — | ✅ |
| "All disputes" / "All reports" full-list views | — | ✅ |
| Submitter trust-history view (README §8.4) | — | Separate PR |
| Email notifications | — | Separate PR |
| Bulk contest operations | — | Separate PR if needed |

PR 1 is **#697** as originally filed. PR 2 ships separately under a new issue once #697 has been validated in staging + prod.

---

## 15. Out-of-band decisions Hugh should weigh in on

Items I've locked but want explicit confirmation on before the plan is written:

1. **Tab vs separate route.** Locked: extend `/admin/review` with a `Contests` tab. Alternative would be `/admin/contests` as a sibling nav item. Tab is less nav cruft; route is a clearer separation of concerns. (§4.1)
2. **`archived` as a distinct status.** Locked: separate from `stale`. Alternative would be repurposing `stale` for contest losers. Separation is cleaner for audit + admin filtering. (§5.1)
3. **Reason field min length: 10 chars.** Pretty arbitrary number. Tunable. (§7.3)
4. **No counter-against-counter chains.** Locked: 1 pending counter per parent. Alternative would be allowing chains. Chains add UX surface and edge cases without obvious benefit. (§4.6)
5. **In-app notification only, no email for v1.** Locked. Email is a separate concern with its own deliverability surface area. (§4.5)
6. **PR 1 = price disputes only; PR 2 = event reports.** Locked. Alternative would be one big PR covering both. Split lowers risk; price side has the active foot-gun. (§14)
7. **Pre-insert duplicate counter check ships with this PR.** It's a small consumer-side change but it's the precondition that makes the 1-vs-1 admin panel safe. Bundling avoids a deploy-order trap. (§4.6)

---

## 16. Open questions (genuinely not decided)

These can't be locked without product input:

**Q1. What happens to the consumer-side dispute submission if the admin defers?** The submitter sees the in-app notification; do they also see UI on the event detail page that says "Admin is reviewing this contest"? Currently the consumer side surfaces the counter via PR 3's `priceByTier.counterSubmission`. The deferred state is identical to the live disputed state from the consumer's POV — they can't tell admin has touched it. Acceptable for v1? Or do we want a "Admin requested more info" pill on the consumer-facing pending row?

**Q2. Cred award magnitude.** Locked +1 cred for the winner. Same as a standard approve. Should winning a contest be worth MORE (e.g. +2) because it required more effort? Or same?

**Q3. Should the existing `PATCH /v1/admin/prices/submissions/:id` endpoint's 409 lockout for contest rows be loud or quiet?** Loud = a Sentry event so we know if an admin (or a bot) hits the old endpoint and gets locked out, indicating UI bypass or staleness. Quiet = just a normal 409 response, no telemetry beyond the audit.

**Q4. Auto-archive orphaned counters on parent loss (§4.3 final step).** Currently locked: when challenger_wins, ALL other pending counters against the parent get archived with a "parent was archived" reason. Alternative: leave them pending so the admin sees them in the queue and adjudicates each. Auto-archive is simpler but loses signal; manual archive is more work but lets admin see the volume of dissent. Which?

**Q5. Should `Need more info` have a max defer count?** E.g., after 3 defers on the same contest, the system escalates somewhere (notification to all admins?). Or is unlimited deferral fine for v1?

These five want a yes/no or a directional answer, not full design work. Once resolved the plan can be drafted.

---

## 17. What ships next

Once this spec is approved:

1. `design-review` skill runs again (Agent 2 + 3) once the implementation exists — to verify against the property table at `docs/superpowers/design-tables/admin-contest-review.md`
2. `writing-plans` skill drafts `docs/superpowers/plans/2026-06-22-admin-contest-review.md` based on this spec + the property table + the recon
3. Plan goes through user review with sanity-check decisions
4. `complete-and-ship` with subagent-driven execution (PR is medium-sized — 12+ tasks)
5. Min 2 successful Copilot reviews before merge (corrected rule)
6. Then PR 4 of the price-source cycle can ship safely

---

## 18. Resolution log (Hugh's sign-offs — 2026-06-23)

### §15 locks confirmed

| # | Lock | Sign-off |
|---|---|---|
| 1 | Tab on `/admin/review` (not separate route) | ✅ Confirmed. Existing `ReviewTabs` primitive at `apps/web/src/components/admin/review/ReviewTabs.tsx` is WAI-ARIA-compliant and accepts a `ReviewTabDescriptor[]`. Adding a 4th tab is a one-line array addition + new `ContestsTabContent.tsx` mirroring the existing `_tabs/*.tsx` pattern. No design input needed. The `priceContests` count surfaces on the tab pill AND the admin nav sidebar badge — the sidebar badge plumbing in `apps/web/src/app/(protected)/admin/layout.tsx` currently sums `eventFlags + prices + missing` into `pendingReview`; this PR extends the `ReviewCounts` type and the sum so the badge includes `priceContests` (see plan task that touches `layout.tsx`). |
| 2 | `archived` as distinct status from `stale` | ✅ Confirmed |
| 3 | Reason min 10 chars | ✅ Confirmed |
| 4 | 1-pending-counter-per-parent | ✅ **Strengthened** — DB-enforced via partial unique index (not just app-level 409). Consumer side hides the dispute affordance entirely so users never fill out a form they'll 409 on. Saved as `memory:project_pr4_dispute_affordance_hiding` for PR 4 of the price-source cycle. |
| 5 | Pre-insert duplicate counter check ships with PR 1 | ✅ Confirmed, plus DB unique index per #4 above |

### §16 open questions resolved

| Q | Resolution |
|---|---|
| Q1 | **Surface engagement state on event detail page via a quiet pill** ("Admin requested more info") using new `lastAdminActionAt` + `lastAdminActionKind` columns on `price_submissions`. **Write `notifications` rows on every action** for future use, but no consumer notification UI in this PR. Consumer notification system tracked as **#737** with a design prompt — design pass required before implementation. |
| Q2 | +1 cred for contest winner (same as standard approve). Locked in §4.3. |
| Q3 | Loud Sentry on PATCH lockout with `endpoint_lockout: contest_row` tag. Baseline volume near-zero; firings are real signal. Locked in §4.7 + §11.3. |
| Q4 | 1-to-1 only — see §15 #4 above. Auto-archive of orphans is dead-by-construction (kept as graceful cleanup for migration-window in-flight rows). |
| Q5 | Unlimited defers for v1. Operational note: admins default to deciding, not deferring. `Need more info` is an edge case. Tracked operationally, not enforced in code. Locked in §4.5 + §16-Q5. |

### Adjacent decisions captured

- **GH issue #737** opened for "[consumer] Build the in-app notification surface (bell + panel + endpoints)" with a design prompt. Tracked as `memory:reference_consumer_notifications_gap` (out-of-repo session memory, not a repo file).
- **PR 4 of price-source cycle dispute affordance rule** saved as `memory:project_pr4_dispute_affordance_hiding` (out-of-repo session memory, not a repo file). Consumer UI hides the dispute entry when `priceByTier[tier].counterSubmission !== null`; replaces with a CTA to engage with the existing contest.

---

## 19. Final scope summary (post-resolution)

The implementation PR that closes issue #697 (drafted as the companion plan) will ship:

**Backend:**
- Migration: `archived` enum + `archived_reason` + `last_admin_action_at` + `last_admin_action_kind` columns + 3 indexes (queue perf × 2 + 1-counter-per-parent uniqueness) + defensive pre-index cleanup
- `PATCH /v1/admin/prices/submissions/:id` rejects contest rows with 409 + loud Sentry
- `POST /v1/submissions/:id/dispute` pre-insert duplicate check (belt-and-braces; DB now enforces)
- New file `apps/api/src/routes/admin/contests.ts`:
  - `GET /v1/admin/contests/prices` — paginated list
  - `GET /v1/admin/contests/prices/:contestId` — single contest detail
  - `POST /v1/admin/contests/prices/:contestId/resolve` — atomic resolution transaction
  - `POST /v1/admin/contests/prices/:contestId/defer` — sets `last_admin_action_*`, writes audit + notifications, no state change
- `GET /v1/admin/review/counts` adds `priceContests` field
- `notifications` row writes on resolve/defer (no consumer UI to surface — backfill for #737)
- `PriceSubmission` shared type extended with `note`, `archivedReason`, `lastAdminActionAt`, `lastAdminActionKind`
- Event detail handler (PR 3 of price-source cycle) extends `priceByTier[].counterSubmission` with `lastAdminActionAt` + `lastAdminActionKind` so the consumer pill works

**Frontend:**
- 4th tab on `/admin/review` — "Contests · {count}"
- `ContestsTabContent.tsx` + `PriceDisputesQueue.tsx` queue
- `AdminDisputePanel.tsx` per-contest panel at `/admin/review/contests/:contestId`
- `AdminEntry.tsx` shared per-side rendering
- Three actions: Keep original, Promote counter, Need more info (defer)
- Reason field with 10/2000-char bounds, all 3 buttons disabled until valid
- Stale-state read-only view when contest already resolved between queue load and panel open

**Audit:**
- `contest.resolve` action with full before/after metadata for both submissions + events projection
- `contest.defer` action with reason

**NOT in this PR (deferred):**
- Event reports adjudication queue (PR 2 follow-up)
- "All disputes" / "All reports" full-list views
- Submitter trust-history drill-through (README §8.4)
- Consumer notification UI (#737 — design pass required)
- Email notifications
- Bulk contest operations
- Submitter handle click-through
