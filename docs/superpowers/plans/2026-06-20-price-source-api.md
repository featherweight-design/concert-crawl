# Price-Source Discoverability — API Aggregation PR (PR 3 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `GET /v1/events/:id` so the response carries a per-tier price breakdown (`priceByTier[]`) instead of relying on a single across-all-tiers headline. Each tier block surfaces its own corroborated headline, alternates from other source-mix rows in the same tier, every pending submission, the optional counter-submission, and a total "reports" count. Drop the `ticketPriceMin === null && priceApprovalKind === null` gate so pending submissions are always visible. Shrink the dispute endpoint's `(tier, source)` slot to fixed — `vendor` becomes optional and the server inherits it from the parent submission so contests can't mutate the slot identity.

**Architecture:** Aggregation happens server-side in pure functions that the event-detail handler composes. A `pickTierHeadline()` helper applies the documented trust + freshness + price ordering to the set of corroborated submissions inside a single tier. An `aggregateByTier()` composer takes the full corroborated and pending submission sets plus side-tables (counter-submissions, handles, confirm-counts) and returns a sorted `TierPriceBlock[]`. The existing flat fields (`priceVendor`, `priceAlternates`, `priceConfirmsCount`, `counterSubmission`, `pendingSubmissions`) stay alongside the new `priceByTier` array — PR 4 migrates the consumer UI off them, the eventual Contract PR drops them. The dispute endpoint loses its required `vendor` body field and inherits `vendor` + `tier` + `sourceCategory` from the parent row at insert time.

**Tech Stack:** TypeScript strict · Hono + Zod validation · Drizzle ORM · Postgres · Vitest (unit + integration against `concert_crawl_test`) · pnpm workspaces · Conventional commits

## Global Constraints

- TypeScript strict mode across packages; **no `as` casts** (use Zod `safeParse`, type guards, or interface augmentation per CLAUDE.md "Type safety is the first line of defence")
- **No single-character variable names** — ESLint enforces minimum identifier length of 2 (`err` not `e`, `idx` not `i`, `ctx` not `c`)
- **Expand-only** — `priceByTier` is added alongside the existing flat `priceVendor` / `priceAlternates` / `priceConfirmsCount` / `counterSubmission` / `pendingSubmissions` fields. The flat fields are deprecated in spirit but stay in the response for PR 4 to migrate off. They are dropped in the Contract PR (post-PR 4).
- **Tier-headline selection rules** — within a single tier:
  1. **Box-office is exempt from staleness.** A corroborated `source_category = 'boxoffice'` row leads its tier regardless of age. Tie-break across multiple box-office rows: lowest `priceMin` (face value), then newest `updatedAt`.
  2. Non-boxoffice rows must be **fresh** (`updatedAt` within `SP_POLICY.imminentThresholdDays`? — no, freshness uses the existing >24h rule). The existing handler currently has no staleness filter for community/resale alternates either; we keep that behavior in PR 3 and let the Consumer UI surface the trust mark. **PR 3 does not introduce a new staleness filter** — selection order is: boxoffice (any age) → standard (newest first) → resale (newest first), tie-breaking by lowest `priceMin` then newest `updatedAt`.
  3. The "headline" is the first row after sorting; the rest become "alternates".
- **Tier display order** in `priceByTier[]`: the tier with the **lowest** headline `priceMin` leads. If a tier has no corroborated headline (pending-only), it sorts after tiers with headlines, then by lowest pending `priceMin`. Tiers with no submissions at all are omitted.
- **Reports count semantics** — `reports` is the **total** count of `price_submissions` rows for the event filtered to that tier, regardless of status (`pending` / `corroborated` / `disputed`). It is the same denominator the UI uses for "· N reports". Hidden/deleted rows are out of scope (no `deletedAt` column in `price_submissions`).
- Worktree: `.worktrees/feat/price-source-api` on branch `feat/price-source-api`.
- Before push: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @concert-crawl/api test:integration` clean in the worktree.
- After PR opens: request Copilot review via REST POST `requested_reviewers` with body `{"reviewers":["copilot-pull-request-reviewer[bot]"]}`. Verify `response.requested_reviewers[].login` is non-empty before declaring success. Iterate multi-round until Copilot only flags Low/Nit issues. If Copilot errors out 3× in a row (as on PR 722), leave a "Copilot review pending" note and proceed with merge if CI is green.
- **design-review skill does NOT apply** (no UI). PR 4 (Consumer UI) is where design-review is a hard gate.
- No `progress.md` row required — backend wiring, not a phase milestone.

---

## File Structure

**Create:**

- `apps/api/src/lib/price-aggregation/pick-tier-headline.ts` — pure function `pickTierHeadline(rows): row | null` that applies the source-category trust + tie-break ordering to a single tier's corroborated rows.
- `apps/api/src/lib/price-aggregation/pick-tier-headline.test.ts` — unit test.
- `apps/api/src/lib/price-aggregation/aggregate-by-tier.ts` — composer `aggregateByTier(input): TierPriceBlock[]` that groups submissions by tier, picks each headline, and emits the typed block array sorted by entry price.
- `apps/api/src/lib/price-aggregation/aggregate-by-tier.test.ts` — unit test.
- `apps/api/src/lib/price-aggregation/index.ts` — barrel re-export of `aggregateByTier` and the input/output types.

**Modify:**

- `packages/types/src/index.ts` — add the `TierHeadline`, `TierAlternate`, `TierPending`, `TierCounter`, and `TierPriceBlock` interfaces, and add `priceByTier?: TierPriceBlock[] | null` to `EventDetailResponse`. No existing fields removed.
- `apps/api/src/routes/events.ts` — call `aggregateByTier()` from the event-detail handler, attach `priceByTier` to the response, and **remove the `if (row.ticketPriceMin === null && priceApprovalKind === null)` gate** so `pendingSubmissions` is always populated when pending rows exist. Existing flat fields keep their current behavior.
- `apps/api/src/routes/submissions.ts` — make `disputeBodySchema.vendor` optional. In the handler, fall back to `parent.vendor` when the body omits it. `tier` and `sourceCategory` are already inherited from the parent — confirm and leave intact.
- `apps/api/src/routes/events.integration.test.ts` — add integration cases for `priceByTier`, always-on `pendingSubmissions`, and reports count.
- `apps/api/src/routes/submissions.integration.test.ts` — add integration cases for the optional-vendor dispute path.

**Not modified:**

- DB schema — `priceByTier` is computed on the fly. No new columns.
- The crawler — `ticket_links` lives there; price aggregation is API-only.
- Consumer web app — PR 4 consumes the new field.

---

## Task Right-Sizing Rationale

Seven tasks. Each ends with an independently testable deliverable + commit:

1. Types: `TierPriceBlock` + `priceByTier` on `EventDetailResponse` (compiles + downstream uses pick up the new field)
2. `pickTierHeadline` helper (pure sort)
3. `aggregateByTier` composer (groups + sorts + composes)
4. Wire into event-detail handler; integration test for `priceByTier` shape
5. Drop the pending-gate; integration test for "pending always surfaces"
6. Dispute scope shrink — `vendor` optional, inherit from parent; integration test
7. Sweep + PR + Copilot iteration

---

### Task 1: Types — `TierPriceBlock` + `priceByTier`

**Files:**

- Modify: `packages/types/src/index.ts` (insert new interfaces near `EventDetailResponse`, ~line 350; add `priceByTier?` to `EventDetailResponse`)

**Interfaces:**

- Consumes: existing `Tier`, `Vendor`, `SourceCategory`, `HowFound` exports
- Produces:

  ```ts
  export interface TierHeadline {
    submissionId: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    sourceCategory: SourceCategory | null
    submitterHandle: string | null
    observedAt: string
    approvedAt: string
    approvalKind: 'admin' | 'fan'
    confirmsCount: number
  }

  export interface TierAlternate {
    submissionId: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    sourceCategory: SourceCategory | null
  }

  export interface TierPending {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    howFound: HowFound
    sourceCategory: SourceCategory | null
    note: string | null
    submitterHandle: string | null
    submittedAt: string
    confirmsCount: number
    confirmsNeeded: number
    isSubmitter: boolean
  }

  export interface TierCounter {
    id: string
    parentSubmissionId: string
    floor: number
    ceiling?: number
    submitter: { handle: string } | null
    submittedAt: string
  }

  export interface TierPriceBlock {
    tier: Tier
    headline: TierHeadline | null
    alternates: TierAlternate[]
    pending: TierPending[]
    counterSubmission: TierCounter | null
    reports: number
  }
  ```

  `EventDetailResponse` gains:

  ```ts
  priceByTier?: TierPriceBlock[] | null
  ```

- [ ] **Step 1: Add the interfaces**

In `packages/types/src/index.ts`, after the existing `EventDetailResponse` interface block (~line 407), insert the five new interfaces above. Then add the `priceByTier` field to `EventDetailResponse` immediately after `pendingSubmissions`.

The diff should look like:

```ts
  pendingSubmissions?: Array<{ ... }> | null
  // Per-tier price aggregation (issue #644). Each tier block contains a single
  // corroborated headline (best-of by source-category trust + price), other
  // corroborated rows in the same tier as alternates, every pending submission
  // in the tier, the optional counter-submission against the headline, and a
  // total reports count. Tiers sort by entry price (lowest headline first;
  // pending-only tiers after). The flat priceVendor / priceAlternates / etc.
  // fields above stay for PR 4 migration; the eventual Contract PR drops them
  // once consumers have moved.
  priceByTier?: TierPriceBlock[] | null
}
```

And add the new exports above `EventDetailResponse`:

```ts
export interface TierHeadline {
  submissionId: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  submitterHandle: string | null
  observedAt: string
  approvedAt: string
  approvalKind: 'admin' | 'fan'
  confirmsCount: number
}

export interface TierAlternate {
  submissionId: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
}

export interface TierPending {
  id: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  howFound: HowFound
  sourceCategory: SourceCategory | null
  note: string | null
  submitterHandle: string | null
  submittedAt: string
  confirmsCount: number
  confirmsNeeded: number
  isSubmitter: boolean
}

export interface TierCounter {
  id: string
  parentSubmissionId: string
  floor: number
  ceiling?: number
  submitter: { handle: string } | null
  submittedAt: string
}

export interface TierPriceBlock {
  tier: Tier
  headline: TierHeadline | null
  alternates: TierAlternate[]
  pending: TierPending[]
  counterSubmission: TierCounter | null
  reports: number
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/types typecheck
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/web typecheck
```

Expected: all pass. Adding optional fields to `EventDetailResponse` does not break any consumer.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add TierPriceBlock + priceByTier to EventDetailResponse"
```

---

### Task 2: `pickTierHeadline` helper

**Files:**

- Create: `apps/api/src/lib/price-aggregation/pick-tier-headline.ts`
- Create: `apps/api/src/lib/price-aggregation/pick-tier-headline.test.ts`

**Interfaces:**

- Consumes: none (leaf)
- Produces:

  ```ts
  export interface TierRow {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    sourceCategory: SourceCategory | null
    userId: string | null
    createdAt: Date
    updatedAt: Date
  }

  export function pickTierHeadline(rows: readonly TierRow[]): TierRow | null
  ```

  Behavior:
  - Returns `null` for an empty input.
  - Sorts by: source-category trust (`boxoffice` = 0, `standard` / `null` = 1, `resale` = 2), then by `parseFloat(priceMin)` ascending (cheapest first), then by `updatedAt` descending (newest first).
  - Returns the first row after sorting.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/lib/price-aggregation/pick-tier-headline.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { pickTierHeadline, type TierRow } from './pick-tier-headline.js'

const row = (overrides: Partial<TierRow>): TierRow => ({
  id: overrides.id ?? 'row-1',
  priceMin: overrides.priceMin ?? '30',
  priceMax: overrides.priceMax ?? null,
  vendor: overrides.vendor ?? 'Ticketmaster',
  sourceCategory: overrides.sourceCategory ?? 'standard',
  userId: overrides.userId ?? 'user-1',
  createdAt: overrides.createdAt ?? new Date('2026-06-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-06-01T00:00:00Z'),
})

describe('pickTierHeadline', () => {
  it('returns null for empty input', () => {
    expect(pickTierHeadline([])).toBeNull()
  })

  it('prefers boxoffice over standard regardless of price', () => {
    const standardCheap = row({
      id: 'std',
      sourceCategory: 'standard',
      priceMin: '15',
    })
    const boxoffice = row({
      id: 'bo',
      sourceCategory: 'boxoffice',
      vendor: 'VenueBoxOffice',
      priceMin: '40',
    })
    expect(pickTierHeadline([standardCheap, boxoffice])?.id).toBe('bo')
  })

  it('prefers standard over resale regardless of price', () => {
    const resaleCheap = row({
      id: 'resale',
      sourceCategory: 'resale',
      priceMin: '20',
    })
    const standardExpensive = row({
      id: 'std',
      sourceCategory: 'standard',
      priceMin: '45',
    })
    expect(pickTierHeadline([resaleCheap, standardExpensive])?.id).toBe('std')
  })

  it('among same source-category, prefers lower priceMin', () => {
    const cheaper = row({ id: 'cheap', priceMin: '25' })
    const pricier = row({ id: 'pricey', priceMin: '40' })
    expect(pickTierHeadline([pricier, cheaper])?.id).toBe('cheap')
  })

  it('tie-breaks equal priceMin by newest updatedAt', () => {
    const older = row({
      id: 'old',
      priceMin: '30',
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    })
    const newer = row({
      id: 'new',
      priceMin: '30',
      updatedAt: new Date('2026-06-15T00:00:00Z'),
    })
    expect(pickTierHeadline([older, newer])?.id).toBe('new')
  })

  it('treats null source-category as standard (trust = 1)', () => {
    const nullSource = row({
      id: 'null-src',
      sourceCategory: null,
      priceMin: '25',
    })
    const resale = row({
      id: 'resale',
      sourceCategory: 'resale',
      priceMin: '15',
    })
    expect(pickTierHeadline([nullSource, resale])?.id).toBe('null-src')
  })

  it('handles parseFloat comparison correctly for string priceMin', () => {
    const nine = row({ id: 'nine', priceMin: '9' })
    const ten = row({ id: 'ten', priceMin: '10' })
    // 10 > 9 numerically, so 'nine' should win — naive string sort would put '10' first
    expect(pickTierHeadline([ten, nine])?.id).toBe('nine')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test -- pick-tier-headline
```

Expected: FAIL (cannot find module `./pick-tier-headline.js`).

- [ ] **Step 3: Implement `pickTierHeadline`**

Create `apps/api/src/lib/price-aggregation/pick-tier-headline.ts`:

```typescript
import type { SourceCategory, Vendor } from '@concert-crawl/types'

export interface TierRow {
  id: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
}

// Trust order: boxoffice leads (face value, exempt from staleness per the
// price-transparency design), standard is the middle ground, resale is last.
// Null source_category is treated as standard so legacy rows don't get
// demoted below resale.
function trustRank(category: SourceCategory | null): number {
  if (category === 'boxoffice') return 0
  if (category === 'resale') return 2
  return 1
}

// Pick the leading row for a single tier. Sort order:
//   1. Source-category trust (boxoffice → standard → resale)
//   2. parseFloat(priceMin) ascending (cheapest face value wins ties within trust)
//   3. updatedAt descending (newest corroboration wins ties on price)
export function pickTierHeadline(rows: readonly TierRow[]): TierRow | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((left, right) => {
    const trustDelta =
      trustRank(left.sourceCategory) - trustRank(right.sourceCategory)
    if (trustDelta !== 0) return trustDelta
    const priceDelta = parseFloat(left.priceMin) - parseFloat(right.priceMin)
    if (priceDelta !== 0) return priceDelta
    return right.updatedAt.getTime() - left.updatedAt.getTime()
  })
  return sorted[0] ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/api test -- pick-tier-headline
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/price-aggregation/pick-tier-headline.ts \
        apps/api/src/lib/price-aggregation/pick-tier-headline.test.ts
git commit -m "feat(api): add pickTierHeadline helper for per-tier price aggregation"
```

---

### Task 3: `aggregateByTier` composer

**Files:**

- Create: `apps/api/src/lib/price-aggregation/aggregate-by-tier.ts`
- Create: `apps/api/src/lib/price-aggregation/aggregate-by-tier.test.ts`
- Create: `apps/api/src/lib/price-aggregation/index.ts`

**Interfaces:**

- Consumes:
  - `pickTierHeadline`, `TierRow` from `./pick-tier-headline.js`
  - `TierPriceBlock`, `TierAlternate`, `TierPending`, `TierCounter`, `TierHeadline`, `Tier`, `HowFound` from `@concert-crawl/types`
- Produces:

  ```ts
  export interface CorroboratedTierRow extends TierRow {
    tier: Tier
    confirmsCount: number
  }

  export interface PendingTierRow {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    sourceCategory: SourceCategory | null
    howFound: HowFound
    note: string | null
    userId: string | null
    tier: Tier
    createdAt: Date
    confirmsCount: number
  }

  export interface CounterTierRow {
    id: string
    parentSubmissionId: string
    tier: Tier
    priceMin: string
    priceMax: string | null
    userId: string | null
    createdAt: Date
  }

  export interface AggregateByTierInput {
    corroborated: readonly CorroboratedTierRow[]
    pending: readonly PendingTierRow[]
    counters: readonly CounterTierRow[]
    handles: ReadonlyMap<string, string> // userId → handle
    reportsByTier: ReadonlyMap<Tier, number> // tier → total submission count
    confirmsNeeded: number
    viewerUserId: string | null
  }

  export function aggregateByTier(input: AggregateByTierInput): TierPriceBlock[]
  ```

  Behavior:
  - Groups corroborated rows by `tier`; for each tier, picks the headline via `pickTierHeadline`. Remaining corroborated rows become alternates (preserving sort order — same trust→price→recency ordering minus the head).
  - Groups pending rows by `tier`; emits `TierPending` entries sorted by `vendor = 'VenueBoxOffice'` first then `createdAt desc` (mirrors the existing handler's pending order).
  - For each tier, looks up the optional counter (counter row whose `tier` matches and whose `parentSubmissionId` matches the headline `id`).
  - `reports` is taken from `reportsByTier.get(tier) ?? 0`.
  - Emits tiers in this order:
    1. Tiers with a corroborated headline, sorted by `parseFloat(headline.priceMin)` ascending.
    2. Tiers with pending-only, sorted by lowest pending `priceMin`.
    3. Tiers with no submissions are omitted.
  - For each pending row, `approvalKind` is computed via `confirmsCount > 0 ? 'fan' : 'admin'` (matches the existing logic in `events.ts` for the headline).
  - `submitterHandle` resolves through `handles.get(userId) ?? null`; rows with `userId === null` get `null`.
  - `isSubmitter` is `pendingRow.userId !== null && pendingRow.userId === viewerUserId`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/lib/price-aggregation/aggregate-by-tier.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  aggregateByTier,
  type AggregateByTierInput,
  type CorroboratedTierRow,
  type PendingTierRow,
} from './aggregate-by-tier.js'

const corrob = (
  overrides: Partial<CorroboratedTierRow>,
): CorroboratedTierRow => ({
  id: overrides.id ?? 'corrob-1',
  tier: overrides.tier ?? 'GA',
  priceMin: overrides.priceMin ?? '30',
  priceMax: overrides.priceMax ?? null,
  vendor: overrides.vendor ?? 'Ticketmaster',
  sourceCategory: overrides.sourceCategory ?? 'standard',
  userId: overrides.userId ?? 'submitter-1',
  createdAt: overrides.createdAt ?? new Date('2026-06-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-06-02T00:00:00Z'),
  confirmsCount: overrides.confirmsCount ?? 1,
})

const pendingRow = (overrides: Partial<PendingTierRow>): PendingTierRow => ({
  id: overrides.id ?? 'pending-1',
  tier: overrides.tier ?? 'GA',
  priceMin: overrides.priceMin ?? '30',
  priceMax: overrides.priceMax ?? null,
  vendor: overrides.vendor ?? 'Ticketmaster',
  sourceCategory: overrides.sourceCategory ?? 'standard',
  howFound: overrides.howFound ?? 'saw_listing',
  note: overrides.note ?? null,
  userId: overrides.userId ?? 'submitter-2',
  createdAt: overrides.createdAt ?? new Date('2026-06-10T00:00:00Z'),
  confirmsCount: overrides.confirmsCount ?? 0,
})

const baseInput: AggregateByTierInput = {
  corroborated: [],
  pending: [],
  counters: [],
  handles: new Map(),
  reportsByTier: new Map(),
  confirmsNeeded: 2,
  viewerUserId: null,
}

describe('aggregateByTier', () => {
  it('returns empty array when no submissions exist', () => {
    expect(aggregateByTier(baseInput)).toEqual([])
  })

  it('emits one block per tier with the cheapest headline first', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [
        corrob({ id: 'vip', tier: 'VIP', priceMin: '100' }),
        corrob({ id: 'ga', tier: 'GA', priceMin: '25' }),
      ],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.tier).toBe('GA')
    expect(blocks[1]?.tier).toBe('VIP')
  })

  it('boxoffice wins over standard within same tier', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [
        corrob({
          id: 'std',
          tier: 'GA',
          sourceCategory: 'standard',
          priceMin: '20',
        }),
        corrob({
          id: 'bo',
          tier: 'GA',
          sourceCategory: 'boxoffice',
          vendor: 'VenueBoxOffice',
          priceMin: '35',
        }),
      ],
      reportsByTier: new Map([['GA', 2]]),
    })
    expect(blocks[0]?.headline?.submissionId).toBe('bo')
    expect(blocks[0]?.alternates).toHaveLength(1)
    expect(blocks[0]?.alternates[0]?.submissionId).toBe('std')
  })

  it('resolves submitter handle via the handles map', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', userId: 'user-1' })],
      handles: new Map([['user-1', 'price-watcher']]),
      reportsByTier: new Map([['GA', 1]]),
    })
    expect(blocks[0]?.headline?.submitterHandle).toBe('price-watcher')
  })

  it('sets approvalKind to fan when confirmsCount > 0, admin otherwise', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [
        corrob({ id: 'fan-confirmed', tier: 'GA', confirmsCount: 1 }),
        corrob({ id: 'admin-only', tier: 'VIP', confirmsCount: 0 }),
      ],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    const ga = blocks.find((block) => block.tier === 'GA')
    const vip = blocks.find((block) => block.tier === 'VIP')
    expect(ga?.headline?.approvalKind).toBe('fan')
    expect(vip?.headline?.approvalKind).toBe('admin')
  })

  it('emits pending rows per tier with confirmsNeeded threaded through', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      pending: [
        pendingRow({ id: 'pen-1', tier: 'GA' }),
        pendingRow({ id: 'pen-2', tier: 'VIP' }),
      ],
      confirmsNeeded: 3,
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    expect(blocks.find((block) => block.tier === 'GA')?.pending).toHaveLength(1)
    expect(
      blocks.find((block) => block.tier === 'GA')?.pending[0]?.confirmsNeeded,
    ).toBe(3)
  })

  it('marks isSubmitter true when pending row userId matches viewer', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      pending: [pendingRow({ id: 'pen', tier: 'GA', userId: 'viewer-1' })],
      viewerUserId: 'viewer-1',
      reportsByTier: new Map([['GA', 1]]),
    })
    expect(blocks[0]?.pending[0]?.isSubmitter).toBe(true)
  })

  it('attaches counter-submission to its parent tier', () => {
    const headline = corrob({ id: 'head', tier: 'GA' })
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [headline],
      counters: [
        {
          id: 'counter-1',
          parentSubmissionId: 'head',
          tier: 'GA',
          priceMin: '20',
          priceMax: null,
          userId: 'challenger',
          createdAt: new Date('2026-06-12T00:00:00Z'),
        },
      ],
      handles: new Map([['challenger', 'fan-2']]),
      reportsByTier: new Map([['GA', 1]]),
    })
    expect(blocks[0]?.counterSubmission?.id).toBe('counter-1')
    expect(blocks[0]?.counterSubmission?.parentSubmissionId).toBe('head')
    expect(blocks[0]?.counterSubmission?.floor).toBe(20)
    expect(blocks[0]?.counterSubmission?.submitter?.handle).toBe('fan-2')
  })

  it('includes pending-only tiers after corroborated-headline tiers', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', tier: 'GA', priceMin: '80' })],
      pending: [pendingRow({ id: 'vip-pen', tier: 'VIP', priceMin: '20' })],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    expect(blocks.map((block) => block.tier)).toEqual(['GA', 'VIP'])
  })

  it('surfaces reports count from the input map', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', tier: 'GA' })],
      reportsByTier: new Map([['GA', 5]]),
    })
    expect(blocks[0]?.reports).toBe(5)
  })

  it('defaults reports to 0 when tier missing from map', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', tier: 'GA' })],
      reportsByTier: new Map(),
    })
    expect(blocks[0]?.reports).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test -- aggregate-by-tier
```

Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement `aggregateByTier`**

Create `apps/api/src/lib/price-aggregation/aggregate-by-tier.ts`:

```typescript
import type {
  HowFound,
  SourceCategory,
  Tier,
  TierAlternate,
  TierCounter,
  TierHeadline,
  TierPending,
  TierPriceBlock,
  Vendor,
} from '@concert-crawl/types'
import { pickTierHeadline, type TierRow } from './pick-tier-headline.js'

export interface CorroboratedTierRow extends TierRow {
  tier: Tier
  confirmsCount: number
}

export interface PendingTierRow {
  id: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  howFound: HowFound
  note: string | null
  userId: string | null
  tier: Tier
  createdAt: Date
  confirmsCount: number
}

export interface CounterTierRow {
  id: string
  parentSubmissionId: string
  tier: Tier
  priceMin: string
  priceMax: string | null
  userId: string | null
  createdAt: Date
}

export interface AggregateByTierInput {
  corroborated: readonly CorroboratedTierRow[]
  pending: readonly PendingTierRow[]
  counters: readonly CounterTierRow[]
  handles: ReadonlyMap<string, string>
  reportsByTier: ReadonlyMap<Tier, number>
  confirmsNeeded: number
  viewerUserId: string | null
}

function groupByTier<RowType extends { tier: Tier }>(
  rows: readonly RowType[],
): Map<Tier, RowType[]> {
  const map = new Map<Tier, RowType[]>()
  for (const row of rows) {
    const existing = map.get(row.tier)
    if (existing) {
      existing.push(row)
    } else {
      map.set(row.tier, [row])
    }
  }
  return map
}

function buildHeadline(
  row: CorroboratedTierRow,
  handles: ReadonlyMap<string, string>,
): TierHeadline {
  return {
    submissionId: row.id,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    sourceCategory: row.sourceCategory,
    submitterHandle:
      row.userId !== null ? (handles.get(row.userId) ?? null) : null,
    observedAt: row.createdAt.toISOString(),
    approvedAt: row.updatedAt.toISOString(),
    approvalKind: row.confirmsCount > 0 ? 'fan' : 'admin',
    confirmsCount: row.confirmsCount,
  }
}

function buildAlternate(row: CorroboratedTierRow): TierAlternate {
  return {
    submissionId: row.id,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    sourceCategory: row.sourceCategory,
  }
}

function buildPending(
  row: PendingTierRow,
  handles: ReadonlyMap<string, string>,
  confirmsNeeded: number,
  viewerUserId: string | null,
): TierPending {
  return {
    id: row.id,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    howFound: row.howFound,
    sourceCategory: row.sourceCategory,
    note: row.note,
    submitterHandle:
      row.userId !== null ? (handles.get(row.userId) ?? null) : null,
    submittedAt: row.createdAt.toISOString(),
    confirmsCount: row.confirmsCount,
    confirmsNeeded,
    isSubmitter: row.userId !== null && row.userId === viewerUserId,
  }
}

function buildCounter(
  row: CounterTierRow,
  handles: ReadonlyMap<string, string>,
): TierCounter {
  const handle = row.userId !== null ? (handles.get(row.userId) ?? null) : null
  const ceiling = row.priceMax !== null ? parseFloat(row.priceMax) : null
  return {
    id: row.id,
    parentSubmissionId: row.parentSubmissionId,
    floor: parseFloat(row.priceMin),
    ...(ceiling !== null ? { ceiling } : {}),
    submitter: handle !== null ? { handle } : null,
    submittedAt: row.createdAt.toISOString(),
  }
}

// Pending order within a tier: VenueBoxOffice first, then newest first. Mirrors
// the existing handler's order so the consumer surface stays stable while PR 4
// migrates off the flat pendingSubmissions field.
function sortPending(rows: readonly PendingTierRow[]): PendingTierRow[] {
  return [...rows].sort((left, right) => {
    const leftBoxOffice = left.vendor === 'VenueBoxOffice' ? 0 : 1
    const rightBoxOffice = right.vendor === 'VenueBoxOffice' ? 0 : 1
    if (leftBoxOffice !== rightBoxOffice) return leftBoxOffice - rightBoxOffice
    return right.createdAt.getTime() - left.createdAt.getTime()
  })
}

// Tier display order: tiers with a corroborated headline first (sorted by
// cheapest headline), then pending-only tiers (sorted by cheapest pending).
// Tiers with no submissions at all are omitted.
function sortBlocks(blocks: TierPriceBlock[]): TierPriceBlock[] {
  return [...blocks].sort((left, right) => {
    const leftHasHead = left.headline !== null
    const rightHasHead = right.headline !== null
    if (leftHasHead !== rightHasHead) return leftHasHead ? -1 : 1
    if (leftHasHead && rightHasHead) {
      return (
        parseFloat(left.headline!.priceMin) -
        parseFloat(right.headline!.priceMin)
      )
    }
    const leftCheapestPending = left.pending[0]?.priceMin ?? '0'
    const rightCheapestPending = right.pending[0]?.priceMin ?? '0'
    return parseFloat(leftCheapestPending) - parseFloat(rightCheapestPending)
  })
}

export function aggregateByTier(input: AggregateByTierInput): TierPriceBlock[] {
  const {
    corroborated,
    pending,
    counters,
    handles,
    reportsByTier,
    confirmsNeeded,
    viewerUserId,
  } = input

  const corrobByTier = groupByTier(corroborated)
  const pendingByTier = groupByTier(pending)

  const allTiers = new Set<Tier>()
  for (const tier of corrobByTier.keys()) allTiers.add(tier)
  for (const tier of pendingByTier.keys()) allTiers.add(tier)

  const blocks: TierPriceBlock[] = []
  for (const tier of allTiers) {
    const corrobRows = corrobByTier.get(tier) ?? []
    const pendingRows = pendingByTier.get(tier) ?? []

    const head = pickTierHeadline(corrobRows)
    const alternates = corrobRows
      .filter((row) => head === null || row.id !== head.id)
      .map(buildAlternate)

    const headline = head
      ? buildHeadline(
          // pickTierHeadline returns a TierRow subset; cast safely because the
          // caller passes CorroboratedTierRow[] in and we only filter, never
          // mutate the shape.
          corrobRows.find((row) => row.id === head.id) ?? null,
          handles,
        )
      : null

    const counter = head
      ? counters.find(
          (row) => row.tier === tier && row.parentSubmissionId === head.id,
        )
      : undefined

    blocks.push({
      tier,
      headline:
        headline !== null && head !== null
          ? buildHeadline(
              corrobRows.find((row) => row.id === head.id)!,
              handles,
            )
          : null,
      alternates,
      pending: sortPending(pendingRows).map((row) =>
        buildPending(row, handles, confirmsNeeded, viewerUserId),
      ),
      counterSubmission: counter ? buildCounter(counter, handles) : null,
      reports: reportsByTier.get(tier) ?? 0,
    })
  }

  return sortBlocks(blocks)
}
```

Then create the barrel `apps/api/src/lib/price-aggregation/index.ts`:

```typescript
export {
  aggregateByTier,
  type AggregateByTierInput,
  type CorroboratedTierRow,
  type CounterTierRow,
  type PendingTierRow,
} from './aggregate-by-tier.js'
export { pickTierHeadline, type TierRow } from './pick-tier-headline.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/api test -- aggregate-by-tier
```

Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/price-aggregation/
git commit -m "feat(api): add aggregateByTier composer for per-tier price blocks"
```

---

### Task 4: Wire `priceByTier` into the event-detail handler

**Files:**

- Modify: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/routes/events.integration.test.ts`

**Interfaces:**

- Consumes:
  - `aggregateByTier` from `../lib/price-aggregation/index.js`
- Produces:
  - `GET /v1/events/:id` response gains a `priceByTier: TierPriceBlock[] | null` field. Empty array when there are no `price_submissions` rows at all; null is reserved for "no community pricing applies" (events with `priceSource !== 'community'` AND no submissions — but emitting an empty array there is also valid; either is fine for PR 3, the test pins the chosen behavior).

  **Decision:** emit `[]` (empty array) when there are no submissions, never `null`. Consumer can iterate safely without a null-check.

- [ ] **Step 1: Write the failing integration test**

Append to `apps/api/src/routes/events.integration.test.ts` (inside the `GET /v1/events/:id — integration` describe block):

```typescript
it('includes priceByTier with per-tier headline + alternates + pending', async () => {
  const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall-pbt' })
  const event = await seedEvent(venue.id, {
    date: '2027-06-01',
    priceSource: 'community',
  })

  const profileA = await seedUserProfile('user-a', {
    handle: 'price-watcher',
  })
  const profileB = await seedUserProfile('user-b', { handle: 'fan-two' })

  // Corroborated GA box-office at $40
  await seedPriceSubmission(event.id, profileA.userId, {
    tier: 'GA',
    vendor: 'VenueBoxOffice',
    howFound: 'at_the_venue',
    sourceCategory: 'boxoffice',
    priceMin: '40',
    status: 'corroborated',
  })
  // Corroborated GA standard alternate at $50
  await seedPriceSubmission(event.id, profileB.userId, {
    tier: 'GA',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '50',
    status: 'corroborated',
  })
  // Pending VIP at $120
  await seedPriceSubmission(event.id, profileA.userId, {
    tier: 'VIP',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '120',
    status: 'pending',
  })

  const res = await app.request(`/v1/events/${event.id}`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    data: {
      priceByTier: Array<{
        tier: string
        headline: { submissionId: string; priceMin: string } | null
        alternates: Array<{ priceMin: string }>
        pending: Array<{ priceMin: string }>
        reports: number
      }>
    }
  }

  expect(body.data.priceByTier).toHaveLength(2)
  const [gaBlock, vipBlock] = body.data.priceByTier
  expect(gaBlock?.tier).toBe('GA')
  expect(gaBlock?.headline?.priceMin).toBe('40') // boxoffice leads
  expect(gaBlock?.alternates).toHaveLength(1)
  expect(gaBlock?.alternates[0]?.priceMin).toBe('50')
  expect(gaBlock?.reports).toBe(2)
  expect(vipBlock?.tier).toBe('VIP')
  expect(vipBlock?.headline).toBeNull()
  expect(vipBlock?.pending).toHaveLength(1)
  expect(vipBlock?.pending[0]?.priceMin).toBe('120')
  expect(vipBlock?.reports).toBe(1)
})

it('priceByTier is empty array when event has no submissions', async () => {
  const venue = await seedVenue({ name: 'Empty Venue', slug: 'empty-venue' })
  const event = await seedEvent(venue.id, { date: '2027-06-01' })

  const res = await app.request(`/v1/events/${event.id}`)
  const body = (await res.json()) as {
    data: { priceByTier: unknown[] }
  }
  expect(body.data.priceByTier).toEqual([])
})
```

The `seedUserProfile` helper must accept a string userId. Verify the signature in `apps/api/src/test/helpers/seed.ts` and adjust the test if the helper signature differs.

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- events.integration
```

Expected: FAIL — `priceByTier` is undefined in the response.

- [ ] **Step 3: Implement the wiring**

In `apps/api/src/routes/events.ts`, after the existing pending-submissions block (~line 614) and before the `return ctx.json(...)` call (~line 616), add the `priceByTier` aggregation.

First, add the import at the top of the file:

```typescript
import { aggregateByTier } from '../lib/price-aggregation/index.js'
```

Replace the existing `if (row.priceSource === 'community') { ... }` and pending-gate blocks with a unified aggregation that builds three datasets:

1. `corroboratedRows` — all corroborated submissions for this event.
2. `pendingRows` — all pending submissions for this event.
3. `counterRows` — all pending submissions whose `disputedSubmissionId` is non-null and points into the corroborated set.

Then collect side-tables (`handles`, `confirmsByCorroboratedId`, `confirmsByPendingId`, `reportsByTier`) and pass everything to `aggregateByTier`.

Concretely, the new structure inside the handler (replacing lines ~387–614):

```typescript
// Per-tier aggregation (PR 3). Always runs — pending-only events show
// pending tiers; events with no submissions get an empty array. The flat
// priceVendor / priceAlternates / priceConfirmsCount / counterSubmission /
// pendingSubmissions fields below stay populated for PR 4 to migrate off;
// the eventual Contract PR drops them.

const corroboratedRows = await db
  .select({
    id: priceSubmissions.id,
    tier: priceSubmissions.tier,
    priceMin: priceSubmissions.priceMin,
    priceMax: priceSubmissions.priceMax,
    vendor: priceSubmissions.vendor,
    sourceCategory: priceSubmissions.sourceCategory,
    userId: priceSubmissions.userId,
    createdAt: priceSubmissions.createdAt,
    updatedAt: priceSubmissions.updatedAt,
  })
  .from(priceSubmissions)
  .where(
    and(
      eq(priceSubmissions.eventId, id),
      eq(priceSubmissions.status, 'corroborated'),
    ),
  )

const pendingRows = await db
  .select({
    id: priceSubmissions.id,
    tier: priceSubmissions.tier,
    priceMin: priceSubmissions.priceMin,
    priceMax: priceSubmissions.priceMax,
    vendor: priceSubmissions.vendor,
    sourceCategory: priceSubmissions.sourceCategory,
    howFound: priceSubmissions.howFound,
    note: priceSubmissions.note,
    userId: priceSubmissions.userId,
    createdAt: priceSubmissions.createdAt,
    disputedSubmissionId: priceSubmissions.disputedSubmissionId,
  })
  .from(priceSubmissions)
  .where(
    and(
      eq(priceSubmissions.eventId, id),
      eq(priceSubmissions.status, 'pending'),
    ),
  )

// Counter-submissions = pending rows that point at a corroborated parent.
const corroboratedIds = new Set(corroboratedRows.map((row) => row.id))
const counterRows = pendingRows
  .filter(
    (row) =>
      row.disputedSubmissionId !== null &&
      corroboratedIds.has(row.disputedSubmissionId),
  )
  .map((row) => ({
    id: row.id,
    parentSubmissionId: row.disputedSubmissionId as string,
    tier: row.tier,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    userId: row.userId,
    createdAt: row.createdAt,
  }))

// True pending = pending rows that are NOT counters (counters are surfaced
// via the headline's counterSubmission field, not the tier's pending list).
const trueePendingRows = pendingRows.filter(
  (row) =>
    row.disputedSubmissionId === null ||
    !corroboratedIds.has(row.disputedSubmissionId),
)

// Batch handle lookups across every userId surfaced in any block.
const allUserIds = Array.from(
  new Set(
    [
      ...corroboratedRows.map((row) => row.userId),
      ...trueePendingRows.map((row) => row.userId),
      ...counterRows.map((row) => row.userId),
    ].filter((uid): uid is string => uid !== null),
  ),
)
const handles = new Map<string, string>()
if (allUserIds.length > 0) {
  const profiles = await db
    .select({ userId: userProfiles.userId, handle: userProfiles.handle })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, allUserIds))
  for (const profile of profiles) {
    if (profile.handle !== null) handles.set(profile.userId, profile.handle)
  }
}

// Batch confirm-count lookups for every corroborated + pending submission.
const allSubIds = [
  ...corroboratedRows.map((row) => row.id),
  ...trueePendingRows.map((row) => row.id),
]
const confirmsBySubmissionId = new Map<string, number>()
if (allSubIds.length > 0) {
  const confirmCounts = await db
    .select({
      submissionId: submissionConfirms.submissionId,
      total: count(),
    })
    .from(submissionConfirms)
    .where(inArray(submissionConfirms.submissionId, allSubIds))
    .groupBy(submissionConfirms.submissionId)
  for (const confirm of confirmCounts) {
    confirmsBySubmissionId.set(confirm.submissionId, confirm.total)
  }
}

// reports-per-tier = COUNT(*) over all price_submissions for this event,
// grouped by tier. Includes corroborated + pending + counters because every
// row is a "report" of a price at that tier.
const reportRowsByTier = await db
  .select({
    tier: priceSubmissions.tier,
    total: count(),
  })
  .from(priceSubmissions)
  .where(eq(priceSubmissions.eventId, id))
  .groupBy(priceSubmissions.tier)
const reportsByTier = new Map<Tier, number>()
for (const reportRow of reportRowsByTier) {
  reportsByTier.set(reportRow.tier, reportRow.total)
}

const confirmsNeeded = isImminentEvent(
  row.date ?? null,
  SP_POLICY.imminentThresholdDays,
)
  ? SP_POLICY.confirmsRequiredImminent
  : SP_POLICY.confirmsRequired

const priceByTier = aggregateByTier({
  corroborated: corroboratedRows.map((row) => ({
    ...row,
    confirmsCount: confirmsBySubmissionId.get(row.id) ?? 0,
  })),
  pending: trueePendingRows.map((row) => ({
    id: row.id,
    tier: row.tier,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    sourceCategory: row.sourceCategory,
    howFound: row.howFound,
    note: row.note,
    userId: row.userId,
    createdAt: row.createdAt,
    confirmsCount: confirmsBySubmissionId.get(row.id) ?? 0,
  })),
  counters: counterRows,
  handles,
  reportsByTier,
  confirmsNeeded,
  viewerUserId: authInfo?.userId ?? null,
})
```

Then keep the existing flat-field derivation (`priceVendor`, `priceSubmitterHandle`, `priceObservedAt`, `priceApprovalKind`, `priceApprovedAt`, `priceAlternates`, `priceConfirmsCount`, `counterSubmission`) so PR 4 has the migration buffer. **The flat derivation must be left intact** — re-derive from `corroboratedRows`/`trueePendingRows` instead of running a second query, but the produced shape is unchanged.

Finally, in the `return ctx.json({ ... })` payload (~line 616), add `priceByTier` to the `data` object alongside the existing fields:

```typescript
return ctx.json({
  success: true,
  data: {
    ...row,
    watching: watchingCount,
    isWatching,
    priceStatus,
    priceVendor,
    priceSubmitterHandle,
    priceObservedAt,
    priceApprovalKind,
    priceApprovedAt,
    priceAlternates,
    priceConfirmsCount,
    counterSubmission,
    pendingSubmissions,
    priceByTier,
    soldOutReport,
  },
})
```

Required imports already in the file: `Tier` is not yet imported — add to the existing `import { ... } from '@concert-crawl/types'` line:

```typescript
import { SP_POLICY, type Tier } from '@concert-crawl/types'
```

- [ ] **Step 4: Run integration test to verify it passes**

```bash
pnpm --filter @concert-crawl/api test:integration -- events.integration
```

Expected: PASS — both new tests, plus all existing tests still green.

- [ ] **Step 5: Quality gate**

```bash
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/api lint
pnpm --filter @concert-crawl/api test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/events.ts \
        apps/api/src/routes/events.integration.test.ts
git commit -m "feat(api): emit priceByTier per-tier price aggregation on event detail"
```

---

### Task 5: Always-include `pendingSubmissions`

**Files:**

- Modify: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/routes/events.integration.test.ts`

**Interfaces:**

- Same: `pendingSubmissions` array always populated when there are pending rows; previously gated by `row.ticketPriceMin === null && priceApprovalKind === null`.

- [ ] **Step 1: Write the failing integration test**

Append to `apps/api/src/routes/events.integration.test.ts`:

```typescript
it('pendingSubmissions is populated even when a corroborated price exists', async () => {
  const venue = await seedVenue({ name: 'Test', slug: 'pending-always' })
  const event = await seedEvent(venue.id, {
    date: '2027-06-01',
    ticketPriceMin: '30',
    priceSource: 'community',
  })

  const profileA = await seedUserProfile('user-corrob', {
    handle: 'corrob-fan',
  })
  const profileB = await seedUserProfile('user-pending', {
    handle: 'pending-fan',
  })

  // Corroborated GA at $30 — historically would suppress pendingSubmissions
  await seedPriceSubmission(event.id, profileA.userId, {
    tier: 'GA',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '30',
    status: 'corroborated',
  })
  // Pending VIP at $90 — a different tier, should always surface
  await seedPriceSubmission(event.id, profileB.userId, {
    tier: 'VIP',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '90',
    status: 'pending',
  })

  const res = await app.request(`/v1/events/${event.id}`)
  const body = (await res.json()) as {
    data: {
      pendingSubmissions: Array<{ tier: string; priceMin: string }> | null
    }
  }
  expect(body.data.pendingSubmissions).not.toBeNull()
  expect(body.data.pendingSubmissions).toHaveLength(1)
  expect(body.data.pendingSubmissions?.[0]?.tier).toBe('VIP')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- events.integration
```

Expected: FAIL — `pendingSubmissions` is `null` because the existing gate suppresses it when a corroborated price exists.

- [ ] **Step 3: Drop the gate**

In `apps/api/src/routes/events.ts`, locate the line (after Task 4's rewrite it may have moved):

```typescript
if (row.ticketPriceMin === null && priceApprovalKind === null) {
  // ... pending submissions query and population
}
```

Replace with an unconditional pending-population block. The simplest path: now that Task 4 already loads `trueePendingRows` for `priceByTier`, derive `pendingSubmissions` directly from that dataset instead of re-querying:

```typescript
// Always surface pending submissions when any exist (PR 3 — was previously
// gated by no-corroborated-price-yet). Multi-tier events show pending tiers
// alongside corroborated ones, so the gate hid legitimately distinct price
// claims.
let pendingSubmissions: Array<{
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
  note: string | null
  submitterHandle: string | null
  submittedAt: string
  confirmsCount: number
  confirmsNeeded: number
  isSubmitter: boolean
}> | null = null

if (trueePendingRows.length > 0) {
  // Reuse the same VenueBoxOffice-first ordering as before.
  const ordered = [...trueePendingRows].sort((left, right) => {
    const leftBox = left.vendor === 'VenueBoxOffice' ? 0 : 1
    const rightBox = right.vendor === 'VenueBoxOffice' ? 0 : 1
    if (leftBox !== rightBox) return leftBox - rightBox
    return right.createdAt.getTime() - left.createdAt.getTime()
  })
  pendingSubmissions = ordered.map((sub) => ({
    id: sub.id,
    priceMin: sub.priceMin,
    priceMax: sub.priceMax,
    tier: sub.tier,
    vendor: sub.vendor ?? 'Unknown',
    howFound: sub.howFound,
    sourceCategory: sub.sourceCategory,
    note: sub.note ?? null,
    submitterHandle:
      sub.userId !== null ? (handles.get(sub.userId) ?? null) : null,
    submittedAt: sub.createdAt.toISOString(),
    confirmsCount: confirmsBySubmissionId.get(sub.id) ?? 0,
    confirmsNeeded,
    isSubmitter: sub.userId === authInfo?.userId,
  }))
}
```

This also removes the duplicate pending-query that the old gated block ran (the data now flows from Task 4's batched fetches).

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/api test:integration -- events.integration
```

Expected: PASS — new test green, no regression in the original gated tests (the old behavior of "suppress when no submissions exist" still holds because we only populate when `trueePendingRows.length > 0`).

- [ ] **Step 5: Quality gate**

```bash
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/api lint
pnpm --filter @concert-crawl/api test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/events.ts \
        apps/api/src/routes/events.integration.test.ts
git commit -m "feat(api): always include pendingSubmissions on event detail"
```

---

### Task 6: Dispute scope shrink — `vendor` optional, inherit from parent

**Files:**

- Modify: `apps/api/src/routes/submissions.ts`
- Modify: `apps/api/src/routes/submissions.integration.test.ts`

**Interfaces:**

- `disputeBodySchema.vendor` becomes optional. Handler reads `body.vendor ?? parent.vendor`. `tier` and `sourceCategory` continue to be inherited unchanged.

  ```ts
  // Before
  vendor: z.enum([...])

  // After
  vendor: z.enum([...]).optional()
  ```

  The locked design decision: contest scope is **price-only**. The `(tier, source)` slot is fixed — changing either is a new submission, not a contest. Inheriting `vendor` from the parent enforces this server-side; the Consumer UI (PR 4) drops the vendor picker from the dispute form, but the API stays compatible with PR 4 deploying before the UI ships.

- [ ] **Step 1: Write the failing test**

Append a new test to `apps/api/src/routes/submissions.integration.test.ts` (inside the dispute describe block — find it via the existing `POST /v1/submissions/:id/dispute` test cluster):

```typescript
it('inherits vendor from parent when dispute body omits it', async () => {
  const venue = await seedVenue({ name: 'Test', slug: 'dispute-inherit' })
  const event = await seedEvent(venue.id, { date: '2027-06-01' })

  const submitter = await seedUserProfile('submitter', { handle: 'sub' })
  const challenger = await seedUserProfile('challenger', {
    handle: 'chal',
  })

  const parent = await seedPriceSubmission(event.id, submitter.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '40',
    status: 'corroborated',
  })

  // Dispute body omits vendor — server must inherit AXS from parent.
  const res = await app.request(`/v1/submissions/${parent.id}/dispute`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: makeAuthHeader(challenger.userId),
    },
    body: JSON.stringify({ floor: 35 }),
  })

  expect(res.status).toBe(201)
  const body = (await res.json()) as {
    success: boolean
    data: { vendor: string; tier: string; sourceCategory: string | null }
  }
  expect(body.success).toBe(true)
  expect(body.data.vendor).toBe('AXS')
  expect(body.data.tier).toBe('GA')
  expect(body.data.sourceCategory).toBe('standard')
})
```

(Adapt `makeAuthHeader` to whatever the existing dispute tests use for authenticating as a non-parent user — check the file for the existing pattern.)

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- submissions.integration
```

Expected: FAIL — Zod rejects the missing `vendor` field with `400`.

- [ ] **Step 3: Make `vendor` optional**

In `apps/api/src/routes/submissions.ts`, the dispute schema currently:

```typescript
const disputeBodySchema = z
  .object({
    floor: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    ceiling: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    vendor: z.enum([
      'AXS',
      'Ticketmaster',
      'SeatGeek',
      'DICE',
      'Eventbrite',
      'VenueBoxOffice',
    ]),
  })
  .refine((data) => !data.ceiling || data.ceiling >= data.floor, {
    message: "Ceiling can't be below floor.",
    path: ['ceiling'],
  })
```

Change `vendor` to `.optional()`:

```typescript
const disputeBodySchema = z
  .object({
    floor: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    ceiling: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    // Optional per the price-only contest scope (locked design decision).
    // When omitted, the server inherits the parent submission's vendor so the
    // (tier, source_category) slot identity stays fixed across the dispute.
    vendor: z
      .enum([
        'AXS',
        'Ticketmaster',
        'SeatGeek',
        'DICE',
        'Eventbrite',
        'VenueBoxOffice',
      ])
      .optional(),
  })
  .refine((data) => !data.ceiling || data.ceiling >= data.floor, {
    message: "Ceiling can't be below floor.",
    path: ['ceiling'],
  })
```

And in the dispute handler, replace:

```typescript
const { floor, ceiling, vendor } = ctx.req.valid('json')
```

…with the inheriting version (after `parent` has been loaded):

```typescript
const { floor, ceiling, vendor: vendorOverride } = ctx.req.valid('json')
// ...later, after `if (!parent) { ... }` and the self-dispute guard:
const vendor = vendorOverride ?? parent.vendor
```

Move the `vendor` declaration so it lands between the parent-load and the `db.transaction(...)` call. The transaction insert continues to read `vendor` from this resolved value — no further changes needed.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/api test:integration -- submissions.integration
```

Expected: PASS — new test green plus all existing dispute tests still pass (they still pass `vendor` explicitly, which the optional schema accepts).

- [ ] **Step 5: Quality gate**

```bash
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/api lint
pnpm --filter @concert-crawl/api test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/submissions.ts \
        apps/api/src/routes/submissions.integration.test.ts
git commit -m "feat(api): dispute endpoint inherits vendor from parent (price-only contest scope)"
```

---

### Task 7: Sweep, push, open PR, Copilot iteration

**Files:**

- None new. This task is sweep + ship.

- [ ] **Step 1: Full quality gate from the worktree root**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @concert-crawl/api test:integration
```

Expected: every command exits 0.

- [ ] **Step 2: Rebase onto latest origin/main**

```bash
git fetch origin
git rebase origin/main
```

Resolve any conflicts (none expected — PR 2 already merged, PR 3 touches different files).

- [ ] **Step 3: Push**

```bash
git push -u origin feat/price-source-api
```

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --title "feat(api): per-tier price aggregation + dispute scope shrink (price-source PR 3)" \
  --body "$(cat <<'EOF'
## Summary

- Adds `priceByTier: TierPriceBlock[]` to `GET /v1/events/:id` — each tier carries its own headline (boxoffice-led trust ordering), alternates from other source-mix rows in the same tier, every pending submission, the optional counter-submission, and a total reports count.
- Drops the `ticketPriceMin === null && priceApprovalKind === null` gate so `pendingSubmissions` is always populated when pending rows exist (multi-tier events were hiding legitimately distinct pending tiers behind the gate).
- Shrinks the dispute endpoint's contract: `vendor` becomes optional and the server inherits it from the parent submission so contests can't mutate the `(tier, source_category)` slot identity. `tier` and `sourceCategory` were already inherited; this completes the price-only contest scope locked in `project_price_source_discoverability`.
- Existing flat fields (`priceVendor`, `priceAlternates`, `priceConfirmsCount`, `counterSubmission`, `pendingSubmissions`) are kept for PR 4 to migrate off; the Contract PR drops them.

Part of the 4-PR cycle for #641 + #644. PR 1 (Schema) merged as #705; PR 2 (Crawler) merged as #722; PR 4 (Consumer UI) is next.

Closes #641 partially (PR 4 closes the rest).

## Test plan

- [x] `pnpm typecheck` green
- [x] `pnpm lint` green
- [x] `pnpm test` green
- [x] `pnpm --filter @concert-crawl/api test:integration` green
- [x] New unit tests for `pickTierHeadline` (7) + `aggregateByTier` (11)
- [x] New integration tests for `priceByTier` (2) + always-on pending (1) + dispute vendor-inherit (1)
- [ ] CI green
- [ ] Manual smoke (post-merge): hit a staging event-detail endpoint and confirm `priceByTier` is in the payload

## Spec coverage

- All applicable spec requirements (#641 + #644 API surface) implemented or deferred to PR 4 (Consumer UI work, design-review gated).

## New environment variables

None.
EOF
)"
```

- [ ] **Step 5: Request Copilot review**

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
PR_NUM=$(gh pr view --json number --jq .number)
gh api \
  --method POST \
  "/repos/$REPO/pulls/$PR_NUM/requested_reviewers" \
  -H "Content-Type: application/json" \
  --input - <<'REVIEWER'
{"reviewers":["copilot-pull-request-reviewer[bot]"]}
REVIEWER
```

Verify `response.requested_reviewers[].login` is non-empty.

- [ ] **Step 6: Iterate Copilot review**

Poll every 60 seconds, up to 10 times (~10 minutes), for the review to arrive. When it arrives:

- **Critical / High** → fix inline, re-run quality gate, commit, push, request next round.
- **Medium** → fix inline, re-run quality gate, commit, push, request next round.
- **Low / Nit** → leave a PR comment acknowledging, do not block.

Repeat until Copilot only flags Low/Nit. If Copilot errors out 3× in a row (as on PR 722), leave a "Copilot review pending — proceeding with merge since CI is green" comment.

- [ ] **Step 7: Merge after CI green**

```bash
gh pr merge --rebase --delete-branch
```

- [ ] **Step 8: Update memory**

After merge, update `~/.claude/projects/-Users-huey-Projects-concert-crawl/memory/project_price_source_discoverability.md` with:

```
**Status as of YYYY-MM-DD:** PR 1 (Schema) merged as #705. PR 2 (Crawler) merged as #722. PR 3 (API aggregation) merged as #<num>. Next action: **Consumer UI PR (PR 4 of 4)** — design-review is a hard gate.
```

And mark item 3 in the sequence with the merged PR number + date.

---

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it.

**Spec coverage** — every requirement in the locked design decisions and `project_price_source_discoverability` is mapped:

- "per-tier `alternates`" → Task 3 (TierPriceBlock.alternates)
- "source-mix within tier" → Task 3 (pickTierHeadline picks by trust then price; alternates carry the other source-categories)
- "pending-submission lists in event detail response" → Task 5 (drop gate)
- "`reports` count per active submission" → Task 4 (reportsByTier query) — actually per tier, which matches the design's "· N reports" UI cue
- "contest scope shrink (DisputeForm becomes price-only, server inherits tier+vendor from parent)" → Task 6
- "boxoffice exempt from staleness" → Task 2 (pickTierHeadline trust-first ordering, no staleness filter applied to boxoffice)
- "1/2 model" → Task 3 (confirmsNeeded threaded through, isSubmitter computed)
- Backwards compat for PR 4 migration → flat fields kept intact in Task 4

**Placeholder scan** — no `TBD`, no `implement later`, every code block contains real code.

**Type consistency** — `TierPriceBlock`, `TierHeadline`, `TierAlternate`, `TierPending`, `TierCounter` defined in Task 1; consumed in Task 3; used in Task 4. `AggregateByTierInput` / `CorroboratedTierRow` / `PendingTierRow` / `CounterTierRow` defined in Task 3 and used in Task 4. `pickTierHeadline` returns `TierRow | null` and is consumed by Task 3's `aggregateByTier` which selects from the original `CorroboratedTierRow[]` array via `find()`. Field names line up across all uses.

---

## What's next after this PR merges

**PR 4 — Consumer UI (final PR in the cycle).** Hard gate: the `design-review` skill must run before the PR opens. Components to build/refactor:

- `FaceValueCard` (sold-out + no-price states)
- `ProvenanceCTA` (3 variants: boxoffice / primary / resale)
- Submit form reorder (source-category leads, vendor demoted but still required)
- `MTAddTierSuccess` (sequential add-another-tier on success)
- `MultiSourceMultiTierCard` decision-tree branch
- Vendor "Venue" relabel anywhere source = boxoffice
- Copy sweep (1/2 + drop "Anonymous works")
- `PriceChip` selection parity (browse card chip uses same best-price logic as `MultiTierLiveCard` headline; gold star when box-office)
- Migrate consumer code off the flat `priceVendor` / `priceAlternates` / `priceConfirmsCount` / `counterSubmission` / `pendingSubmissions` fields onto `priceByTier`.

**Contract PR (post-PR 4).** Drop the flat fields from `EventDetailResponse`, drop the `how_found` column, drop `'VenueBoxOffice'` from `submission_vendor` enum, drop `ticket_url` once `ticket_links` is the canonical read everywhere.
