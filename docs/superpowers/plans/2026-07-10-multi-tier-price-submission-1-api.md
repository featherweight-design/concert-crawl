# Multi-Tier Price Submission Implementation Plan — Part 1 of 4 (API)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user submit prices for multiple tiers (GA $45 + VIP $120) of one event in a single act, via a new atomic batch endpoint and a repeatable-tier-panel submit form.

**Architecture:** No schema change — a bundle of N tiers persists as N ordinary `price_submissions` rows inserted by one atomic `POST /v1/events/:id/price-submissions/batch` request. The existing `SubmitPriceModal` is refactored in place into a bundle form (bundle-level source/vendor + repeatable per-tier panels). All downstream behavior (corroboration, staleness, disputes, display) is per-row and unchanged.

**Tech Stack:** Hono + Zod + Drizzle (API), React + Vitest + Testing Library (web), pnpm + Turborepo monorepo.

**Spec:** `docs/superpowers/specs/2026-07-10-multi-tier-price-submission-design.md` (approved). Issue #832.

**Plan files (read all four):**

1. `2026-07-10-multi-tier-price-submission-1-api.md` (this file) — Tasks 1–2: batch endpoint
2. `2026-07-10-multi-tier-price-submission-2-modal-ui.md` — Tasks 3–4: ChipGroup, copy, multi-tier panel UI
3. `2026-07-10-multi-tier-price-submission-3-modal-batch.md` — Task 5: batch submit wiring + per-row errors
4. `2026-07-10-multi-tier-price-submission-4-integration.md` — Tasks 6–7: EventDetailClient, release note, ship

## Global Constraints

Every task's requirements implicitly include all of these:

- Package manager is **pnpm**; run commands from the repo worktree root unless a step says otherwise.
- **TypeScript strict mode**; `as` casts are forbidden in app code (use type guards / Zod). Existing test files use `as` on `res.json()` results — matching that established test-file pattern is acceptable in tests only.
- **No single-character identifiers** (ESLint enforces min length 2: `idx` not `i`, `err` not `e`).
- **Zod validation at every Hono endpoint** — no raw input reaches the DB.
- **Drizzle only** for DB access.
- **ALL customer-facing strings** live in `definitions/copy.ts` files — never hardcoded in JSX.
- **Mobile/desktop parity** — behavior must be identical on both; layout may differ.
- **Conventional commits** (`feat:`, `test:`, `refactor:`, `docs:`).
- **Never `--no-verify`**; pre-commit hooks (Prettier + ESLint via lint-staged) must pass.
- Components use **arrow-function style helpers**, descriptive names (no `handleX` for new names where avoidable — existing `handleSubmit` names stay).
- API integration tests need the local Docker Postgres running: `docker compose up -d` from the repo root.

---

## Task 1: Batch endpoint — schema, route, happy path

**Files:**

- Modify: `apps/api/src/routes/price-submissions.ts` (415 lines; add batch schema after `submissionBodySchema` ends at line 44, add batch route at end of file)
- Test: `apps/api/src/routes/price-submissions-batch.integration.test.ts` (new)

**Interfaces:**

- Consumes: existing `submissionBodySchema` field rules, `SP_POLICY`, `deriveSourceCategory`, `moderateNote`, seed helpers.
- Produces: `POST /v1/events/:id/price-submissions/batch` returning:
  - `201` → `{ success: true, data: PriceSubmission[] }` (full inserted rows, same shape as single POST's `data` but an array)
  - `422` (Zod) → `{ success: false, error: 'Invalid input', errors: Array<{ index: number; tier: string | null; error: string }>, details: <zod flatten> }` — `errors[]` carries one entry per issue whose path is `['tiers', <index>, ...]`
  - `404` → `{ success: false, error: 'Event not found' }`
  - `401` without auth
    Later tasks (Task 5 UI) rely on exactly this error-item shape `{ index, tier, error }`.

- [ ] **Step 1: Write the failing test file (validation + happy path scenarios)**

Create `apps/api/src/routes/price-submissions-batch.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { eq } from 'drizzle-orm'
import { priceSubmissions } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedEvent,
  seedVenue,
  seedPriceSubmission,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId = 'user_abc123'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

// The API accepts any HowFound value regardless of vendor — 'at_the_venue'
// here exercises that. (The web client happens to derive 'bought_myself' for
// boxoffice via howFoundForSource; the endpoint does not enforce pairing.)
const BATCH_BODY = {
  vendor: 'VenueBoxOffice',
  howFound: 'at_the_venue',
  sourceCategory: 'boxoffice',
  tiers: [
    { tier: 'GA', priceMin: 45 },
    { tier: 'VIP', priceMin: 120, priceMax: 150 },
  ],
}

type RowError = { index: number; tier: string | null; error: string }

describe('POST /v1/events/:id/price-submissions/batch', () => {
  let eventId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  const postBatch = (body: unknown) =>
    app.request(`/v1/events/${eventId}/price-submissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(body),
    })

  it('returns 401 without auth', async () => {
    const res = await postBatch(BATCH_BODY)
    expect(res.status).toBe(401)
  })

  it('creates two pending rows for a 2-tier batch (happy path)', async () => {
    setAuth()
    const res = await postBatch(BATCH_BODY)
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{
        id: string
        status: string
        tier: string
        priceMin: string
        priceMax: string | null
        vendor: string
        howFound: string
        sourceCategory: string | null
        corroborationCount: number
        disputedSubmissionId: string | null
      }>
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    const gaRow = body.data.find((row) => row.tier === 'GA')
    const vipRow = body.data.find((row) => row.tier === 'VIP')
    expect(gaRow).toBeDefined()
    expect(vipRow).toBeDefined()
    expect(parseFloat(gaRow!.priceMin)).toBe(45)
    expect(gaRow!.priceMax).toBeNull()
    expect(parseFloat(vipRow!.priceMin)).toBe(120)
    expect(parseFloat(vipRow!.priceMax!)).toBe(150)
    for (const row of body.data) {
      expect(row.status).toBe('pending')
      expect(row.vendor).toBe('VenueBoxOffice')
      expect(row.howFound).toBe('at_the_venue')
      expect(row.sourceCategory).toBe('boxoffice')
      // Submitter counts as observation #1 (1/2 confirmation model)
      expect(row.corroborationCount).toBe(1)
      expect(row.disputedSubmissionId).toBeNull()
    }
    const dbRows = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(dbRows).toHaveLength(2)
  })

  it('accepts a single-tier batch (N=1) identically to the single endpoint insert', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      tiers: [{ tier: 'GA', priceMin: 45 }],
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      data: Array<{ tier: string; status: string; corroborationCount: number }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]!.tier).toBe('GA')
    expect(body.data[0]!.status).toBe('pending')
    expect(body.data[0]!.corroborationCount).toBe(1)
  })

  it('derives sourceCategory from (vendor, howFound) when omitted, on every row', async () => {
    setAuth()
    const res = await postBatch({
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      tiers: [
        { tier: 'GA', priceMin: 30 },
        { tier: 'Pit', priceMin: 60 },
      ],
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      data: Array<{ sourceCategory: string | null }>
    }
    for (const row of body.data) {
      expect(row.sourceCategory).toBe('boxoffice')
    }
  })

  it('rejects an empty tiers array with 422', async () => {
    setAuth()
    const res = await postBatch({ ...BATCH_BODY, tiers: [] })
    expect(res.status).toBe(422)
  })

  it('rejects more than 10 tier rows with 422', async () => {
    setAuth()
    const elevenRows = Array.from({ length: 11 }, () => ({
      tier: 'GA',
      priceMin: 45,
    }))
    const res = await postBatch({ ...BATCH_BODY, tiers: elevenRows })
    expect(res.status).toBe(422)
  })

  it('rejects duplicate tiers within the request with 422, before any insert', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      tiers: [
        { tier: 'GA', priceMin: 45 },
        { tier: 'GA', priceMin: 50 },
      ],
    })
    expect(res.status).toBe(422)
    const dbRows = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(dbRows).toHaveLength(0)
  })

  it('returns a per-row indexed error when one row price is out of range, inserts zero rows', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      tiers: [
        { tier: 'GA', priceMin: 45 },
        { tier: 'VIP', priceMin: 5000 },
      ],
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { success: boolean; errors: RowError[] }
    expect(body.success).toBe(false)
    expect(body.errors.some((rowError) => rowError.index === 1)).toBe(true)
    const dbRows = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(dbRows).toHaveLength(0)
  })

  it('rejects disputedSubmissionId in the batch body with 422', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      disputedSubmissionId: '2b3f8a10-0000-4000-8000-000000000000',
    })
    expect(res.status).toBe(422)
  })

  it('returns 404 for an unknown event', async () => {
    setAuth()
    const res = await app.request(
      `/v1/events/2b3f8a10-0000-4000-8000-000000000000/price-submissions/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(BATCH_BODY),
      },
    )
    expect(res.status).toBe(404)
  })
})
```

Note: `seedPriceSubmission` is imported now but first used in Task 2 — if ESLint flags it as unused at this step, defer the import to Task 2 Step 1.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test -- price-submissions-batch`
Expected: FAIL — every authed test gets a 404 (route does not exist yet; Hono returns 404 for unmatched paths). The 401 test may pass incidentally only if `REQUIRE_BETA_AUTH` gating applies; a 404 there is also an acceptable failure signal.

- [ ] **Step 3: Implement the batch schema + route**

In `apps/api/src/routes/price-submissions.ts`, insert after the `submissionBodySchema` definition (after line 44):

```typescript
// Batch bundle schema (#832). Per-row rules mirror submissionBodySchema's
// price fields exactly; bundle-level fields are shared across every row.
// disputedSubmissionId is deliberately NOT accepted — counters stay
// single-row through the existing endpoint.
const batchTierRowSchema = z
  .object({
    priceMin: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    priceMax: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']),
  })
  .refine((data) => !data.priceMax || data.priceMax >= data.priceMin, {
    message: "Ceiling can't be below floor.",
    path: ['priceMax'],
  })

const batchBodySchema = z
  .object({
    vendor: z.enum([
      'AXS',
      'Ticketmaster',
      'SeatGeek',
      'DICE',
      'Eventbrite',
      'VenueBoxOffice',
    ]),
    howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
    sourceCategory: z.enum(['boxoffice', 'standard', 'resale']).optional(),
    note: z.string().max(280).optional(),
    tiers: z.array(batchTierRowSchema).min(1).max(10),
  })
  .strict()
  .refine(
    (data) =>
      new Set(data.tiers.map((row) => row.tier)).size === data.tiers.length,
    { message: 'Tiers must be unique within a batch.', path: ['tiers'] },
  )
```

`.strict()` is what rejects `disputedSubmissionId` (and any other stray key) with 422 — the single-POST schema is non-strict, but the batch contract explicitly excludes counters, so unknown keys failing loudly is the spec behavior.

Then append the route at the end of the file (after the single POST handler, line 415):

```typescript
// POST /v1/events/:id/price-submissions/batch — atomic multi-tier bundle
// (#832). A bundle of N tiers inserts as N ordinary pending rows in one
// statement: all rows or none. Rows are NOT linked after insert — the
// bundle is an ephemeral submission-time concept only (spec §1).
priceSubmissionsRouter.post(
  '/:id/price-submissions/batch',
  clerkAuth,
  requireAuth,
  zValidator('json', batchBodySchema, (result, ctx) => {
    if (!result.success) {
      // Surface per-row Zod failures as {index, tier, error} items so the
      // UI can annotate the exact tier panel (spec §2 error contract).
      // Issues outside tiers[<n>] (bundle-level fields, uniqueness refine)
      // stay in `details` only.
      const rowErrors = result.error.issues.flatMap((issue) => {
        const [rootKey, rowIndex] = issue.path
        if (rootKey !== 'tiers' || typeof rowIndex !== 'number') return []
        return [{ index: rowIndex, tier: null, error: issue.message }]
      })
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          errors: rowErrors,
          details: result.error.flatten(),
        },
        422,
      )
    }
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const body = ctx.req.valid('json')

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)
    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404)

    // Shared bundle-level derivation — identical for every row, mirroring
    // the single POST's expand-phase fallback.
    const sourceCategory =
      body.sourceCategory ?? deriveSourceCategory(body.vendor, body.howFound)

    // Atomicity: a single multi-row INSERT is one implicit transaction —
    // all rows land or none do (spec §2 "one request, one atomic insert").
    // No explicit db.transaction wrapper: it adds nothing to a single
    // statement, and doesn't fix the check-then-insert TOCTOU either.
    const created = await db
      .insert(priceSubmissions)
      .values(
        body.tiers.map((row) => ({
          eventId,
          userId,
          priceMin: String(row.priceMin),
          priceMax: row.priceMax != null ? String(row.priceMax) : null,
          tier: row.tier,
          vendor: body.vendor,
          howFound: body.howFound,
          sourceCategory,
          // Submitter counts as observation #1 (1/2 confirmation model),
          // same as the single POST.
          corroborationCount: 1,
          note: body.note ?? null,
          disputedSubmissionId: null,
        })),
      )
      .returning()

    return ctx.json({ success: true, data: created }, 201)
  },
)
```

Also add a deprecation pointer on the existing single POST — immediately above line 132's comment (`// POST /v1/events/:id/price-submissions — authenticated users submit price data`), extend it:

```typescript
// POST /v1/events/:id/price-submissions — authenticated users submit price data.
// @deprecated for the consumer submit form — SubmitPriceModal now posts to
// the /batch sibling below (#832). Kept for old clients and because the
// counter flow (disputedSubmissionId) depends on it. Do not remove.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/api test -- price-submissions-batch`
Expected: PASS for all Task 1 scenarios above.

Also run the existing single-endpoint suite to catch regressions:
Run: `pnpm --filter @concert-crawl/api test -- price-submissions.integration`
Expected: PASS (no existing behavior touched).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/price-submissions.ts apps/api/src/routes/price-submissions-batch.integration.test.ts
git commit -m "feat(api): atomic batch price-submission endpoint for #832 — schema + happy path"
```

---

## Task 2: Batch endpoint — pending-tier conflict, moderation, rate limit

**Files:**

- Modify: `apps/api/src/routes/price-submissions.ts` (the batch handler added in Task 1)
- Test: `apps/api/src/routes/price-submissions-batch.integration.test.ts` (extend)

**Interfaces:**

- Produces (relied on by Task 5 UI):
  - `422` pending-tier conflict → `{ success: false, errors: [{ index, tier: '<Tier>', error: 'already_submitted' }] }`, zero rows inserted
  - `422` note moderation reject → `{ success: false, error: '<reason>' }` (bundle-level, no `errors` array)
  - `429` rate-limit window active → `{ success: false, error: 'Rate limit: 1 submission per 24h' }`

- [ ] **Step 1: Add the failing tests**

Append inside the existing `describe` block of `price-submissions-batch.integration.test.ts`:

```typescript
it('returns 422 {index, tier, already_submitted} when a tier is already pending, inserts zero rows (atomic)', async () => {
  setAuth()
  // Pending GA row by this user, older than the 24h rate-limit window so
  // only the per-tier duplicate check fires (not the rate limit).
  const staleCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000)
  await seedPriceSubmission(eventId, {
    userId: 'user_abc123',
    tier: 'GA',
    status: 'pending',
    createdAt: staleCreatedAt,
  })
  const res = await postBatch(BATCH_BODY) // tiers: GA (index 0) + VIP (index 1)
  expect(res.status).toBe(422)
  const body = (await res.json()) as { success: boolean; errors: RowError[] }
  expect(body.success).toBe(false)
  expect(body.errors).toEqual([
    { index: 0, tier: 'GA', error: 'already_submitted' },
  ])
  // Atomicity: the valid VIP row must NOT have been inserted.
  const dbRows = await testDb
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.eventId, eventId))
  expect(dbRows).toHaveLength(1) // only the seeded GA row
})

it('rejects a bundle whose note fails moderation, inserts zero rows', async () => {
  setAuth()
  const res = await postBatch({
    ...BATCH_BODY,
    note: 'buy cheap tickets at https://scam.example',
  })
  expect(res.status).toBe(422)
  const dbRows = await testDb
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.eventId, eventId))
  expect(dbRows).toHaveLength(0)
})

it('blocks the batch as a unit when the rate-limit window is active', async () => {
  setAuth()
  // Recent submission (any tier/status) inside the 24h window.
  await seedPriceSubmission(eventId, {
    userId: 'user_abc123',
    tier: 'Lawn',
    status: 'corroborated',
    createdAt: new Date(),
  })
  const res = await postBatch(BATCH_BODY)
  expect(res.status).toBe(429)
  const dbRows = await testDb
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.eventId, eventId))
  expect(dbRows).toHaveLength(1)
})

it('successful batch starts the rate-limit window — an immediate second batch is blocked', async () => {
  setAuth()
  const first = await postBatch(BATCH_BODY)
  expect(first.status).toBe(201)
  const second = await postBatch({
    ...BATCH_BODY,
    tiers: [{ tier: 'Reserved', priceMin: 80 }],
  })
  expect(second.status).toBe(429)
})
```

Check `apps/api/src/test/helpers/seed.ts` for `seedPriceSubmission`'s exact signature before writing — it takes `(eventId, overrides)` where overrides is `Partial<typeof priceSubmissions.$inferInsert>`. If `moderateNote` in `apps/api/src/lib/moderate-note.ts` uses a different trigger than URLs, read that file and adjust the moderation test's note string to one that its rules reject (the existing single-endpoint suite has a moderation test to copy the rejected string from).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @concert-crawl/api test -- price-submissions-batch`
Expected: FAIL — the four new tests: already-pending returns 201 with rows inserted; moderation note is accepted (201); rate-limited batches return 201.

- [ ] **Step 3: Add the three guard blocks to the batch handler**

In the batch handler from Task 1, insert between the event 404 check and the `sourceCategory` derivation:

```typescript
// Content moderation for the bundle-level note — moderated once, exactly
// like the single POST (spec §2: note is shared across all rows).
if (body.note) {
  const modResult = moderateNote(body.note)
  if (!modResult.ok) {
    return ctx.json(
      { success: false, error: modResult.reason ?? 'Note rejected.' },
      422,
    )
  }
}

// 422 — one pending submission per (event, user, tier). The single POST
// checks per (event, user); the batch contract is per-tier (spec §1
// locked decision) so a user with a pending GA can still not double-GA
// but the error names the exact panel to fix.
const pendingRows = await db
  .select({ tier: priceSubmissions.tier })
  .from(priceSubmissions)
  .where(
    and(
      eq(priceSubmissions.eventId, eventId),
      eq(priceSubmissions.userId, userId),
      eq(priceSubmissions.status, 'pending'),
    ),
  )
const pendingTiers = new Set(pendingRows.map((row) => row.tier))
const duplicateErrors = body.tiers.flatMap((row, rowIndex) =>
  pendingTiers.has(row.tier)
    ? [{ index: rowIndex, tier: row.tier, error: 'already_submitted' }]
    : [],
)
if (duplicateErrors.length > 0) {
  return ctx.json({ success: false, errors: duplicateErrors }, 422)
}

// 429 — the batch is ONE rate-limit hit (one act of contribution). Same
// window query as the single POST; a batch inside the window is blocked
// as a unit, and a successful batch starts the window.
const cutoff = new Date(Date.now() - SP_POLICY.rateLimitHours * 60 * 60 * 1000)
const recent = await db
  .select({ id: priceSubmissions.id })
  .from(priceSubmissions)
  .where(
    and(
      eq(priceSubmissions.eventId, eventId),
      eq(priceSubmissions.userId, userId),
      gt(priceSubmissions.createdAt, cutoff),
    ),
  )
  .limit(1)
if (recent.length > 0) {
  return ctx.json(
    { success: false, error: 'Rate limit: 1 submission per 24h' },
    429,
  )
}
```

Guard ordering note (mirrors the single POST's spirit): moderation → duplicate-tier → rate limit. The duplicate check runs before the rate limit so a user who already has a pending tier sees the actionable per-panel message instead of a generic 429.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/api test -- price-submissions-batch`
Expected: PASS — all Task 1 + Task 2 scenarios.

Run the full API suite + typecheck + lint:
Run: `pnpm --filter @concert-crawl/api test && pnpm --filter @concert-crawl/api typecheck && pnpm --filter @concert-crawl/api lint`
Expected: PASS. (Known caveat: if unrelated main-branch API integration tests are red from test-DB schema drift, verify the failures are pre-existing on `main` before proceeding — do not fix unrelated tests in this task.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/price-submissions.ts apps/api/src/routes/price-submissions-batch.integration.test.ts
git commit -m "feat(api): batch endpoint per-tier conflict, moderation, and rate-limit guards"
```

---

**Continue to Part 2:** `2026-07-10-multi-tier-price-submission-2-modal-ui.md`
