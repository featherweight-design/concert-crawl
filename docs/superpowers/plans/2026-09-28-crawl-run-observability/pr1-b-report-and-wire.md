# PR 1b — report run health and wire the daily run (Tasks 3–4)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 3: Report run health — notification, email, Sentry

**Files:**

- Modify: `packages/crawler-core/src/lib/run-health.ts` (append)
- Modify: `packages/crawler-core/src/lib/email.ts` (add `sendRunDegradedEmail` after `sendCrawlFailureEmail`, ~line 194)
- Modify: `packages/crawler-core/src/index.ts` (re-export)
- Modify: `apps/api/src/emails/test-fixtures.ts` (sample for the admin test-email picker)
- Test: `packages/crawler-core/src/lib/run-health.test.ts` (append)

**Interfaces — Produces:**

```ts
export function describeDegradation(degradation: RunDegradation): string
export async function reportRunHealth(
  degradations: readonly RunDegradation[],
  summary: { failed: number; total: number },
): Promise<void>
// email.ts
export interface RunDegradedInput {
  title: string
  lines: string[]
}
export async function sendRunDegradedEmail(
  input: RunDegradedInput,
): Promise<void>
```

- [ ] **Step 1: Write the failing tests.** Mock the side-effect modules the way `event-count-alert.test.ts` does (`vi.mock('@concert-crawl/db', …)`, `vi.mock('./email.js', …)`, `vi.mock('@concert-crawl/logger', …)`); copy that file's mock block rather than inventing one.

```ts
describe('describeDegradation', () => {
  it('says an llm_quota cause is account-wide, not a venue problem', () => {
    const line = describeDegradation({
      kind: 'shared_cause',
      errorKey: 'llm_quota',
      errorKind: 'llm_quota',
      venueNames: ['Hi-Dive', 'Red Rocks'],
    })
    expect(line).toContain('account-wide')
    expect(line).toContain('Hi-Dive, Red Rocks')
  })
})

describe('reportRunHealth', () => {
  it('does nothing for a healthy run', async () => {
    await reportRunHealth([], { failed: 0, total: 20 })
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSendRunDegradedEmail).not.toHaveBeenCalled()
  })

  it('writes one admin notification, one email and one Sentry report', async () => {
    await reportRunHealth([{ kind: 'failure_rate', failed: 8, total: 20 }], {
      failed: 8,
      total: 20,
    })
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'admin_alert',
        category: 'crawl.run_degraded',
        title: 'Daily crawl degraded: 8 of 20 venues failed',
      }),
    )
    expect(mockSendRunDegradedEmail).toHaveBeenCalledTimes(1)
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'crawl.run_degraded',
        severity: 'error',
      }),
    )
  })

  it('still reports to Sentry when the email throws', async () => {
    mockSendRunDegradedEmail.mockRejectedValueOnce(new Error('resend down'))
    await reportRunHealth([{ kind: 'failure_rate', failed: 8, total: 20 }], {
      failed: 8,
      total: 20,
    })
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'crawl.run_degraded' }),
    )
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'crawl.email_error' }),
    )
  })
})
```

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement.** Append to `run-health.ts`:

```ts
import { db, notifications } from '@concert-crawl/db'
import { reportFailure } from '@concert-crawl/logger'
import { sendRunDegradedEmail } from './email.js'

export function describeDegradation(degradation: RunDegradation): string {
  if (degradation.kind === 'failure_rate') {
    return `${degradation.failed} of ${degradation.total} venues failed this run.`
  }
  const names = degradation.venueNames.join(', ')
  const count = degradation.venueNames.length
  if (degradation.errorKind === 'llm_quota') {
    return `${count} venues failed on the LLM account's usage limit. This is account-wide, not a venue problem: ${names}.`
  }
  return `${count} venues failed with the same error ("${degradation.errorKey}"): ${names}.`
}

export async function reportRunHealth(
  degradations: readonly RunDegradation[],
  summary: { failed: number; total: number },
): Promise<void> {
  if (degradations.length === 0) return

  const title = `Daily crawl degraded: ${summary.failed} of ${summary.total} venues failed`
  const lines = degradations.map(describeDegradation)

  // The notification first: it is the durable record the admin UI reads.
  await db.insert(notifications).values({
    type: 'admin_alert',
    category: 'crawl.run_degraded',
    title,
    body: lines.join('\n'),
    metadata: JSON.stringify({ degradations }),
  })

  reportFailure({
    event: 'crawl.run_degraded',
    severity: 'error',
    failed: summary.failed,
    total: summary.total,
    sharedCauses: degradations
      .flatMap((d) => (d.kind === 'shared_cause' ? [d.errorKey] : []))
      .join(' | '),
  })

  try {
    await sendRunDegradedEmail({ title, lines })
  } catch (emailErr) {
    reportFailure({
      event: 'crawl.email_error',
      severity: 'error',
      error: String(emailErr),
    })
  }
}
```

Add to `email.ts`, after `sendCrawlFailureEmail`:

```ts
export interface RunDegradedInput {
  title: string
  lines: string[]
}

export async function sendRunDegradedEmail(
  input: RunDegradedInput,
): Promise<void> {
  const url = adminCrawlUrl()
  await sendAdminAlert('sendRunDegradedEmail', {
    subject: input.title,
    html: `
      ${input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n')}
      <p>Visit the <a href="${url}">admin crawl dashboard</a> to investigate.</p>
    `,
  })
}
```

Re-export from `packages/crawler-core/src/index.ts`: `evaluateRunHealth`, `reportRunHealth`, `type VenueRunOutcome`, `type RunDegradation`, `classifyCrawlError`.

In `apps/api/src/emails/test-fixtures.ts`: add `'run_degraded'` to `OperationalTestKey` (line ~24); add `{ key: 'run_degraded', label: 'Degraded crawl run alert', group: 'Operational' }` to the options list after `event_count_drop`; add a builder mirroring `buildCrawlFailureSample` and register it in `OPERATIONAL_BUILDERS` (the `Record` type makes a missing builder a compile error):

```ts
function buildRunDegradedSample(): BuiltTestEmail {
  const url = `${SAMPLE_ADMIN_URL}/admin/crawl`
  const line =
    "8 venues failed on the LLM account's usage limit. This is account-wide, not a venue problem: Cervantes, Hi-Dive, Red Rocks."
  return {
    fromCategory: 'alert',
    subject: 'Daily crawl degraded: 8 of 20 venues failed',
    html: `<p>${line}</p><p>Visit the <a href="${url}">admin crawl dashboard</a> to investigate.</p>`,
    text: `${line} Visit ${url} to investigate.`,
  }
}
```

- [ ] **Step 4: Run** `pnpm --filter @concert-crawl/crawler-core test` and `pnpm --filter @concert-crawl/api test -- test-fixtures`; expected PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(crawler): alert admins when a daily run degrades"`

### Task 4: Wire it into the daily run, and fail the cron on a degraded run

**Files:**

- Modify: `apps/crawler/src/run.ts` (the batch loop ~lines 322–400 and the return at ~425)
- Modify: `apps/crawler/src/index.ts` (`main` and the `.then` at ~line 44)
- Test: `apps/crawler/src/run.test.ts`

**Interfaces — Consumes:** `evaluateRunHealth`, `reportRunHealth`, `VenueRunOutcome` from `@concert-crawl/crawler-core`. **Produces:** `runDailyCrawl(): Promise<{ succeeded: number; failed: number; total: number; degraded: boolean }>`.

- [ ] **Step 1: Write the failing test.** `run.test.ts` mocks `@concert-crawl/crawler-core` wholesale (line ~101); add `evaluateRunHealth: mockEvaluateRunHealth` and `reportRunHealth: mockReportRunHealth` to that factory, then:

```ts
it('hands every venue outcome to the run-health check and returns degraded', async () => {
  mockCrawlVenue
    .mockResolvedValueOnce({
      id: 'run-1',
      status: 'failed',
      errorMessage: 'quota',
      eventsFound: 0,
      durationMs: 1,
    })
    .mockResolvedValueOnce({
      id: 'run-2',
      status: 'success',
      eventsFound: 3,
      eventsInserted: 0,
      durationMs: 1,
      insertedEventIds: [],
    })
  mockEvaluateRunHealth.mockReturnValue([
    { kind: 'failure_rate', failed: 1, total: 2 },
  ])

  const result = await runDailyCrawl()

  expect(mockEvaluateRunHealth).toHaveBeenCalledWith([
    expect.objectContaining({ errorMessage: 'quota' }),
    expect.objectContaining({ errorMessage: null }),
  ])
  expect(mockReportRunHealth).toHaveBeenCalledTimes(1)
  expect(result.degraded).toBe(true)
})

it('never lets a run-health failure break the crawl', async () => {
  mockEvaluateRunHealth.mockReturnValue([
    { kind: 'failure_rate', failed: 1, total: 2 },
  ])
  mockReportRunHealth.mockRejectedValueOnce(new Error('db down'))
  await expect(runDailyCrawl()).resolves.toMatchObject({ degraded: true })
})
```

Seed `mockVenues` with two venues for these cases, following the existing tests' setup.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement.** In `runDailyCrawl`, declare `const outcomes: VenueRunOutcome[] = []` beside `succeeded`/`failed`. In the loop take `const venue = batch[idx]` and, when `venue` is defined, push one outcome per branch:
  - fulfilled + `status === 'failed'`: `errorMessage: result.value.errorMessage ?? 'Crawl failed'`
  - fulfilled otherwise: `errorMessage: null`
  - rejected: `errorMessage: String(result.reason)`

  After `requestLandingRevalidationSafely(eventsInserted)`:

```ts
// Run-level health: the only check that sees a failure shared across venues
// on the night it happens. Monitoring must never break the crawl.
const degradations = evaluateRunHealth(outcomes)
try {
  await reportRunHealth(degradations, { failed, total: activeVenues.length })
} catch (healthErr: unknown) {
  Sentry.captureException(healthErr)
  logger.error(
    { healthErr },
    'Run-health report failed — crawl data unaffected',
  )
}
const degraded = degradations.length > 0

logger.info(
  { succeeded, failed, total: activeVenues.length, degraded },
  'Daily crawl complete',
)
return { succeeded, failed, total: activeVenues.length, degraded }
```

In `index.ts`, make `main()` return `{ degraded: boolean }` (`false` unless the daily branch ran and reported it), and change the success handler:

```ts
main().then(async ({ degraded }) => {
  await flushQuietly()
  // A degraded run exits 1 so Render marks the cron run failed. Before this,
  // 40% of venues failing still exited 0 and read as a healthy run.
  process.exit(degraded ? 1 : 0)
})
```

- [ ] **Step 4: Run** `pnpm --filter @concert-crawl/crawler test`; PASS. Mutation-check: drop the `reportRunHealth` call; the first test must fail.

- [ ] **Step 5: Commit, add a `progress.md` ✅ row (substantive reliability fix), open PR 1** with this plan file included. Ops note for the PR body: confirm Render → Notifications emails on a failed cron run — the crawler services carry `notifyOnFail: default`, which defers to the workspace setting.

---
