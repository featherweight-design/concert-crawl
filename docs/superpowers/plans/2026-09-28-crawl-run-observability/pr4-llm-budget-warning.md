# PR 4 — monthly LLM budget warning (Task 7, recommended: defer)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Recommendation: build this only once concert-crawl has its own Anthropic API key with its own limit.** On a shared account it compares this app's spend against a number that does not govern this app's availability — it would not have fired on 2026-09-28 (the app was at $18.96 of a cap the other project consumed). With a per-app key, `LLM_MONTHLY_BUDGET_USD` equals that key's limit and the warning becomes exactly predictive. Until then, PR 1 reports the refusal on its first night.

**Known undercount — fix before trusting the percentage.** `cost_tracking` is written only for extraction (`crawl.ts` ~1559, from `tokenUsage`, which `crawl.ts` ~295 takes from `extractWithLlm` alone) and genre tagging (`genre-tagger.ts` ~243). `adjudicateEvent` (called via `deriveArtists`, `crawl.ts` ~877) also calls Anthropic and records nothing, so both this warning and the existing admin cost panel under-report. That is a defect against CLAUDE.md principle 4 in its own right, raised separately; this task assumes it is fixed first.

### Task 7: Warn at 80% and 100% of a per-app monthly budget

**Files:**

- Create: `packages/crawler-core/src/lib/llm-budget.ts` + `.test.ts`
- Modify: `apps/crawler/src/run.ts` (call after the run-health block, same try/catch pattern), `packages/crawler-core/src/index.ts`
- Modify: `render.yaml` (`concert-crawl-crawler-daily` envVars), `docs/runbooks/render-service-config.md`, `apps/crawler/.env.example`

**Interfaces — Produces:**

```ts
export function crossedBudgetThreshold(
  spentUsd: number,
  budgetUsd: number,
): 0.8 | 1 | null
export async function checkLlmBudget(now?: Date): Promise<void>
```

- [ ] **Step 1: Failing tests.** No existing crawler-core unit test mocks `@concert-crawl/db`'s query builders (`event-count-alert` has only an integration test against real Postgres), so this file carries its own mocks. At the top of `llm-budget.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSelect, mockInsertValues, mockReportFailure, selectQueue } =
  vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockInsertValues: vi.fn(),
    mockReportFailure: vi.fn(),
    // Each select().from().where() chain resolves to the next queued array.
    selectQueue: [] as unknown[][],
  }))

vi.mock('@concert-crawl/db', () => ({
  costTracking: {
    service: 'service',
    costUsd: 'cost_usd',
    recordedAt: 'recorded_at',
  },
  notifications: {
    category: 'category',
    createdAt: 'created_at',
    metadata: 'metadata',
  },
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return {
        from: () => ({
          where: () => Promise.resolve(selectQueue.shift() ?? []),
        }),
      }
    },
    insert: () => ({
      values: (row: unknown) => {
        mockInsertValues(row)
        return Promise.resolve()
      },
    }),
  },
}))
vi.mock('@concert-crawl/logger', () => ({ reportFailure: mockReportFailure }))

const mockSelectResults = (...results: unknown[][]) => {
  selectQueue.length = 0
  selectQueue.push(...results)
}

beforeEach(() => {
  vi.clearAllMocks()
  selectQueue.length = 0
})
```

(`drizzle-orm` stays real: `and`/`eq`/`gte`/`inArray`/`sql` only build expressions, which the mock ignores.) Then the tests, pure half first:

```ts
describe('crossedBudgetThreshold', () => {
  it.each([
    [79, 100, null],
    [80, 100, 0.8],
    [99.99, 100, 0.8],
    [100, 100, 1],
    [140, 100, 1],
    [5, 0, null],
  ])('spent %d of %d → %s', (spent, budget, expected) => {
    expect(crossedBudgetThreshold(spent, budget)).toBe(expected)
  })
})

describe('checkLlmBudget', () => {
  const now = new Date('2026-09-28T09:30:00Z')

  it('stays dormant, touching nothing, when the budget is unset', async () => {
    delete process.env['LLM_MONTHLY_BUDGET_USD']
    await checkLlmBudget(now)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('records the 80% crossing once', async () => {
    process.env['LLM_MONTHLY_BUDGET_USD'] = '20'
    mockSelectResults([{ spent: '16.50' }], [])
    await checkLlmBudget(now)
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'cost.llm_budget',
        metadata: JSON.stringify({ month: '2026-09', threshold: 0.8 }),
      }),
    )
  })

  it('does not repeat a threshold already recorded this month', async () => {
    process.env['LLM_MONTHLY_BUDGET_USD'] = '20'
    mockSelectResults(
      [{ spent: '17.00' }],
      [{ metadata: JSON.stringify({ month: '2026-09', threshold: 0.8 }) }],
    )
    await checkLlmBudget(now)
    expect(mockInsertValues).not.toHaveBeenCalled()
  })

  it('treats a malformed prior row as no prior alert', async () => {
    process.env['LLM_MONTHLY_BUDGET_USD'] = '20'
    mockSelectResults([{ spent: '17.00' }], [{ metadata: '{not json' }])
    await checkLlmBudget(now)
    expect(mockInsertValues).toHaveBeenCalledTimes(1)
  })
})
```

`mockSelectResults` is defined in the mock block above.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement.**

```ts
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, costTracking, notifications } from '@concert-crawl/db'
import { reportFailure } from '@concert-crawl/logger'

// The services that spend on the Anthropic key (cost_tracking.service).
const LLM_SERVICES = ['claude', 'genre-tagger']
const BudgetMeta = z.object({
  month: z.string(),
  threshold: z.union([z.literal(0.8), z.literal(1)]),
})

export function crossedBudgetThreshold(
  spentUsd: number,
  budgetUsd: number,
): 0.8 | 1 | null {
  if (!(budgetUsd > 0)) return null
  const ratio = spentUsd / budgetUsd
  if (ratio >= 1) return 1
  if (ratio >= 0.8) return 0.8
  return null
}

export async function checkLlmBudget(now: Date = new Date()): Promise<void> {
  const budgetUsd = Number(process.env['LLM_MONTHLY_BUDGET_USD'] ?? '')
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) return // dormant until set

  // Anthropic resets limits at 00:00 UTC on the 1st, so the month is UTC.
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
  const month = monthStart.toISOString().slice(0, 7)

  const [row] = await db
    .select({ spent: sql<string>`coalesce(sum(${costTracking.costUsd}), 0)` })
    .from(costTracking)
    .where(
      and(
        inArray(costTracking.service, LLM_SERVICES),
        gte(costTracking.recordedAt, monthStart),
      ),
    )
  const spentUsd = Number(row?.spent ?? 0)
  const threshold = crossedBudgetThreshold(spentUsd, budgetUsd)
  if (threshold === null) return

  const prior = await db
    .select({ metadata: notifications.metadata })
    .from(notifications)
    .where(
      and(
        eq(notifications.category, 'cost.llm_budget'),
        gte(notifications.createdAt, monthStart),
      ),
    )
  const alreadySent = prior.some((alert) => {
    const parsed = BudgetMeta.safeParse(parseJson(alert.metadata))
    return (
      parsed.success &&
      parsed.data.month === month &&
      parsed.data.threshold === threshold
    )
  })
  if (alreadySent) return

  const pct = Math.round(threshold * 100)
  await db.insert(notifications).values({
    type: 'admin_alert',
    category: 'cost.llm_budget',
    title: `LLM spend at ${pct}% of the monthly budget`,
    body: `$${spentUsd.toFixed(2)} of $${budgetUsd.toFixed(2)} spent in ${month}.`,
    metadata: JSON.stringify({ month, threshold }),
  })
  reportFailure({
    event: 'cost.llm_budget',
    severity: threshold === 1 ? 'error' : 'warn',
    spentUsd,
    budgetUsd,
    month,
  })
}
```

Beside `BudgetMeta`, a malformed metadata row must read as "no prior alert", never throw:

```ts
function parseJson(text: string | null): unknown {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
```

Env var, `render.yaml` under `concert-crawl-crawler-daily` envVars:

```yaml
- key: LLM_MONTHLY_BUDGET_USD
  sync: false # Per-app monthly LLM budget; unset = warning dormant. Match the key's own limit.
```

Record it in `render-service-config.md` and `.env.example` in the same PR, and list it in the PR body per the env-var convention.

- [ ] **Step 4: Run tests; PASS; mutation-check the dedupe.**

- [ ] **Step 5: Commit, open PR 4.**

---
