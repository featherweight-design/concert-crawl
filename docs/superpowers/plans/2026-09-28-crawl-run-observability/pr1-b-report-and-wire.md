# PR 1b — report run health and wire the daily run (Tasks 3–4)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 3: Report run health — Sentry and email

> **Amended in review (PR #1744, round 1).** The code below plans a single `runHealthFingerprint` returning one array for the whole run. Sentry groups on the entire fingerprint array, so a run with causes A and B would have become one `[A, B]` issue that a later A-only night could never join. As shipped, `runHealthFingerprints` returns one `['crawl.run_degraded', key]` per shared cause (or one `failure_rate` fingerprint), and `reportRunHealth` emits one Sentry event per fingerprint while still sending a single email. `sendRunDegradedEmail` also gained direct tests in `email.test.ts`.

**Channels, and why not an in-app row.** No admin screen lists `admin_alert` notifications in general: `apps/api/src/routes/admin/crawl.ts:276-285` reads only four categories and pins each to a crawl-run row through `metadata.crawlRunId`, and the notification panel (`apps/api/src/routes/notifications.ts:109-111`) is scoped to a user's own `user_notification` rows. A `crawl.run_degraded` row would reach no screen, so this task writes none. The run-level alert goes out as a Sentry event and an admin email, plus the failed cron run from Task 4. Building an admin surface for run-level alerts is a separate decision, not part of this plan.

**Files:**

- Modify: `packages/logger/src/index.ts` (`FailureReport`, ~line 61; the destructure at ~line 94; `captureMessage` at ~line 123)
- Modify: `packages/logger/src/index.test.ts`
- Modify: `packages/crawler-core/src/lib/run-health.ts` (append)
- Modify: `packages/crawler-core/src/lib/email.ts` (add `sendRunDegradedEmail` after `sendCrawlFailureEmail`, ~line 194)
- Modify: `packages/crawler-core/src/index.ts` (re-exports)
- Modify: `apps/api/src/emails/test-fixtures.ts` (sample for the admin test-email picker)
- Test: `packages/crawler-core/src/lib/run-health.test.ts` (extend)

**Interfaces — Consumes:** `RunDegradation` (Task 2). **Produces:**

```ts
// @concert-crawl/logger
export interface FailureReport {
  event: string
  severity: FailureSeverity
  /** Sentry grouping override. Omit for the default: one issue per `event`. */
  fingerprint?: string[]
  [key: string]: unknown
}
// run-health.ts
export function describeDegradation(degradation: RunDegradation): string
export function runHealthFingerprint(
  degradations: readonly RunDegradation[],
): string[]
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

- [x] **Step 1: Failing tests.**

In `packages/logger/src/index.test.ts`, beside the existing `captureMessageSpy` cases:

```ts
it('forwards a fingerprint to Sentry when the report carries one', () => {
  reportFailure({
    event: 'crawl.run_degraded',
    severity: 'error',
    fingerprint: ['crawl.run_degraded', 'llm_quota'],
  })
  expect(captureMessageSpy).toHaveBeenCalledWith(
    'crawl.run_degraded',
    expect.objectContaining({
      fingerprint: ['crawl.run_degraded', 'llm_quota'],
    }),
  )
})

it('keeps the fingerprint out of extra, and out of the context when absent', () => {
  reportFailure({
    event: 'crawl.failed',
    severity: 'error',
    fingerprint: ['crawl.failed', 'k'],
  })
  expect(captureMessageSpy.mock.calls.at(-1)?.[1]?.extra).not.toHaveProperty(
    'fingerprint',
  )

  reportFailure({
    event: 'llm.no_tool_use',
    severity: 'warn',
    sourceUrl: 'https://x.example',
  })
  expect(captureMessageSpy.mock.calls.at(-1)?.[1]).not.toHaveProperty(
    'fingerprint',
  )
})
```

At the top of `packages/crawler-core/src/lib/run-health.test.ts` (hoisted, so it applies to Task 2's tests too — they don't touch either module):

```ts
import { beforeEach, vi } from 'vitest'

const { mockSendRunDegradedEmail, mockReportFailure } = vi.hoisted(() => ({
  mockSendRunDegradedEmail: vi.fn(),
  mockReportFailure: vi.fn(),
}))
vi.mock('./email.js', () => ({
  sendRunDegradedEmail: mockSendRunDegradedEmail,
}))
vi.mock('@concert-crawl/logger', () => ({ reportFailure: mockReportFailure }))

beforeEach(() => {
  vi.clearAllMocks()
  mockSendRunDegradedEmail.mockResolvedValue(undefined)
})
```

Then append:

```ts
const QUOTA_CAUSE: RunDegradation = {
  kind: 'shared_cause',
  errorKey: 'llm_quota',
  errorKind: 'llm_quota',
  venueNames: ['Hi-Dive', 'Red Rocks'],
}
const RATE: RunDegradation = { kind: 'failure_rate', failed: 8, total: 20 }

describe('describeDegradation', () => {
  it('says an llm_quota cause is account-wide, not a venue problem', () => {
    const line = describeDegradation(QUOTA_CAUSE)
    expect(line).toContain('account-wide')
    expect(line).toContain('Hi-Dive, Red Rocks')
  })
})

describe('runHealthFingerprint', () => {
  it('groups by the shared causes, sorted, so each cause is its own Sentry issue', () => {
    const other: RunDegradation = {
      ...QUOTA_CAUSE,
      errorKey: 'TypeError: fetch failed',
      errorKind: 'other',
    }
    expect(runHealthFingerprint([RATE, other, QUOTA_CAUSE])).toEqual([
      'crawl.run_degraded',
      'TypeError: fetch failed',
      'llm_quota',
    ])
  })
  it('falls back to failure_rate when no cause is shared', () => {
    expect(runHealthFingerprint([RATE])).toEqual([
      'crawl.run_degraded',
      'failure_rate',
    ])
  })
})

describe('reportRunHealth', () => {
  it('does nothing for a healthy run', async () => {
    await reportRunHealth([], { failed: 0, total: 20 })
    expect(mockReportFailure).not.toHaveBeenCalled()
    expect(mockSendRunDegradedEmail).not.toHaveBeenCalled()
  })

  it('reports to Sentry with the cause fingerprint and emails the admin', async () => {
    await reportRunHealth([RATE, QUOTA_CAUSE], { failed: 8, total: 20 })
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'crawl.run_degraded',
        severity: 'error',
        fingerprint: ['crawl.run_degraded', 'llm_quota'],
      }),
    )
    expect(mockSendRunDegradedEmail).toHaveBeenCalledWith({
      title: 'Daily crawl degraded: 8 of 20 venues failed',
      lines: [describeDegradation(RATE), describeDegradation(QUOTA_CAUSE)],
    })
  })

  it('reports to Sentry before emailing, and survives the email throwing', async () => {
    mockSendRunDegradedEmail.mockRejectedValueOnce(new Error('resend down'))
    await expect(
      reportRunHealth([RATE], { failed: 8, total: 20 }),
    ).resolves.toBeUndefined()
    expect(mockReportFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ event: 'crawl.run_degraded' }),
    )
    expect(mockReportFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: 'crawl.email_error' }),
    )
  })
})
```

- [x] **Step 2: Run to verify they fail** — `pnpm --filter @concert-crawl/logger test` and `pnpm --filter @concert-crawl/crawler-core test -- run-health`.

- [x] **Step 3: Implement.**

`packages/logger/src/index.ts` — add the optional `fingerprint?: string[]` field to `FailureReport` above the index signature, destructure it out of `extra`, and pass it through only when set:

```ts
const { event, severity, fingerprint, ...extra } = report
// …console side unchanged…
Sentry.captureMessage(event, {
  level: severity === 'error' ? 'error' : 'warning',
  extra,
  ...(fingerprint ? { fingerprint } : {}),
})
```

Append to `run-health.ts`:

```ts
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

/**
 * One Sentry issue per shared cause. Without this every degraded night lands in
 * a single `crawl.run_degraded` issue that stays open, and the issue-alert rule
 * — which fires on transitions only — never pages for a new cause again.
 */
export function runHealthFingerprint(
  degradations: readonly RunDegradation[],
): string[] {
  const causes = degradations
    .flatMap((degradation) =>
      degradation.kind === 'shared_cause' ? [degradation.errorKey] : [],
    )
    .sort()
  return [
    'crawl.run_degraded',
    ...(causes.length > 0 ? causes : ['failure_rate']),
  ]
}

export async function reportRunHealth(
  degradations: readonly RunDegradation[],
  summary: { failed: number; total: number },
): Promise<void> {
  if (degradations.length === 0) return

  const title = `Daily crawl degraded: ${summary.failed} of ${summary.total} venues failed`
  const lines = degradations.map(describeDegradation)

  // Sentry first: reportFailure never throws, so a failed email cannot cost the
  // loud channel.
  reportFailure({
    event: 'crawl.run_degraded',
    severity: 'error',
    fingerprint: runHealthFingerprint(degradations),
    failed: summary.failed,
    total: summary.total,
    causes: lines.join(' | '),
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

Add to `email.ts`, after `sendCrawlFailureEmail` (`escapeHtml`, `adminCrawlUrl` and `sendAdminAlert` are module-private there; `adminCrawlUrl`'s venue id is optional):

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

In `apps/api/src/emails/test-fixtures.ts`: add `'run_degraded'` to `OperationalTestKey` (line ~24); add `{ key: 'run_degraded', label: 'Degraded crawl run alert', group: 'Operational' }` after the `event_count_drop` option (`TEST_EMAIL_KEYS` derives from the options, so nothing else lists it); add this builder beside `buildCrawlFailureSample` and register it in `OPERATIONAL_BUILDERS` (~line 318 — a `Record`, so a missing builder fails to compile):

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

- [x] **Step 4: Run** `pnpm --filter @concert-crawl/logger test`, `pnpm --filter @concert-crawl/crawler-core test`, `pnpm --filter @concert-crawl/api test -- test-fixtures`; PASS. Mutation-check: drop `...(fingerprint ? { fingerprint } : {})` and confirm the first logger test fails; drop `fingerprint` from the destructure and confirm the second fails.

- [x] **Step 5: Commit** — `git commit -m "feat(crawler): alert when a daily run degrades, grouped by cause"`

### Task 4: Wire it into the daily run, and fail the cron on a degraded run

**Files:**

- Modify: `apps/crawler/src/run.ts` — the early return at ~line 303, the batch loop ~lines 316–397, the return at ~line 425
- Modify: `apps/crawler/src/index.ts` — `main()` and the `.then` at ~line 44
- Test: `apps/crawler/src/run.test.ts`, `apps/crawler/src/__tests__/exit-code.test.ts`

**Interfaces — Consumes:** `evaluateRunHealth`, `reportRunHealth`, `VenueRunOutcome` from `@concert-crawl/crawler-core`. **Produces:** `runDailyCrawl(): Promise<{ succeeded: number; failed: number; total: number; degraded: boolean }>`; `main(): Promise<{ degraded: boolean }>`.

- [x] **Step 1: Failing tests.**

`run.test.ts` — declare beside the other crawler-core mocks (~line 100) and add both to the `vi.mock('@concert-crawl/crawler-core', …)` factory:

```ts
const mockEvaluateRunHealth = vi.fn<(outcomes: unknown[]) => unknown[]>(
  () => [],
)
const mockReportRunHealth = vi.fn().mockResolvedValue(undefined)
```

In the `runDailyCrawl` describe's `beforeEach` (after `vi.clearAllMocks()`, which keeps implementations), re-pin the defaults so no test's override can leak:

```ts
mockEvaluateRunHealth.mockReturnValue([])
mockReportRunHealth.mockResolvedValue(undefined)
```

Then, following the file's pattern of importing `./run.js` inside each test (the default `where` mock already serves the four `mockVenues`):

```ts
it('hands one outcome per venue, in order, to the run-health check', async () => {
  mockCrawlVenue
    .mockResolvedValueOnce({
      ...SUCCESSFUL_CRAWL_RUN,
      status: 'failed',
      errorMessage: 'quota',
    })
    .mockResolvedValue(SUCCESSFUL_CRAWL_RUN)
  const { runDailyCrawl } = await import('./run.js')

  await runDailyCrawl()

  expect(mockEvaluateRunHealth).toHaveBeenCalledWith(
    mockVenues.map((venue, i) =>
      expect.objectContaining({
        venueId: venue.id,
        errorMessage: i === 0 ? 'quota' : null,
      }),
    ),
  )
})

it('returns degraded when the check finds a degradation', async () => {
  mockEvaluateRunHealth.mockReturnValueOnce([
    { kind: 'failure_rate', failed: 4, total: 4 },
  ])
  const { runDailyCrawl } = await import('./run.js')

  const result = await runDailyCrawl()

  expect(mockReportRunHealth).toHaveBeenCalledTimes(1)
  expect(result.degraded).toBe(true)
})

it('never lets the run-health report break the crawl', async () => {
  mockEvaluateRunHealth.mockReturnValueOnce([
    { kind: 'failure_rate', failed: 4, total: 4 },
  ])
  mockReportRunHealth.mockRejectedValueOnce(new Error('resend down'))
  const { runDailyCrawl } = await import('./run.js')

  await expect(runDailyCrawl()).resolves.toMatchObject({ degraded: true })
})
```

`__tests__/exit-code.test.ts` — the default at ~line 39 is `runDailyCrawl.mockResolvedValue(undefined)`, which crashes once `main()` reads `.degraded` off it. Change it to:

```ts
runDailyCrawl.mockResolvedValue({
  succeeded: 1,
  failed: 0,
  total: 1,
  degraded: false,
})
```

and add:

```ts
it('exits 1 without reporting a crash when the run is degraded', async () => {
  runDailyCrawl.mockResolvedValue({
    succeeded: 12,
    failed: 8,
    total: 20,
    degraded: true,
  })
  const exitSpy = await importEntrypoint()

  expect(exitSpy).toHaveBeenCalledTimes(1)
  expect(exitSpy).toHaveBeenCalledWith(1)
  expect(captureException).not.toHaveBeenCalled()
  expect(loggerError).not.toHaveBeenCalled()
})
```

- [x] **Step 2: Run to verify the new cases fail** — `pnpm --filter @concert-crawl/crawler test`.

- [x] **Step 3: Implement.** In `run.ts`, change the no-venues early return (~line 303) to `return { succeeded: 0, failed: 0, total: 0, degraded: false }`. Declare `const outcomes: VenueRunOutcome[] = []` beside `succeeded`/`failed`. In the loop, take `const venue = batch[idx]` and, when it is defined, push one outcome per branch:

- fulfilled with `status === 'failed'`: `{ venueId: venue.id, venueName: venue.name, errorMessage: result.value.errorMessage ?? 'Crawl failed' }`
- fulfilled otherwise: `errorMessage: null`
- rejected: `errorMessage: String(result.reason)`

After `await requestLandingRevalidationSafely(eventsInserted)`:

```ts
// Run-level health: the only check that sees a failure shared across venues
// on the night it happens. Evaluation sits inside the try too — monitoring
// must never break the crawl.
let degraded = false
try {
  const degradations = evaluateRunHealth(outcomes)
  degraded = degradations.length > 0
  await reportRunHealth(degradations, { failed, total: activeVenues.length })
} catch (healthErr: unknown) {
  Sentry.captureException(healthErr)
  logger.error({ healthErr }, 'Run-health check failed — crawl data unaffected')
}

logger.info(
  { succeeded, failed, total: activeVenues.length, degraded },
  'Daily crawl complete',
)
return { succeeded, failed, total: activeVenues.length, degraded }
```

In `index.ts`:

```ts
async function main(): Promise<{ degraded: boolean }> {
  const mode = process.env['CRAWL_MODE'] ?? 'all'

  if (mode !== 'triggers' && mode !== 'daily' && mode !== 'all') {
    logger.error(
      { mode },
      'Unknown CRAWL_MODE; expected triggers | daily | all',
    )
    process.exit(1)
  }

  if (mode === 'triggers' || mode === 'all') {
    await runTriggeredCrawls()
  }
  if (mode === 'daily' || mode === 'all') {
    const { degraded } = await runDailyCrawl()
    return { degraded }
  }
  // Triggers-only runs are admin-queued and a handful of venues at most; the
  // run-level check does not apply to them.
  return { degraded: false }
}

main().then(async ({ degraded }) => {
  await flushQuietly()
  // A degraded run exits 1 so Render marks the cron run failed. Before this,
  // 40% of venues failing still exited 0 and read as a healthy run.
  process.exit(degraded ? 1 : 0)
})
```

(the `.catch` branch is unchanged).

- [x] **Step 4: Run** `pnpm --filter @concert-crawl/crawler test`; PASS. Mutation-check: drop the `reportRunHealth` call and confirm "returns degraded…" fails; hard-code `process.exit(0)` and confirm the new exit-code case fails.

- [x] **Step 5: Commit, add a `progress.md` ✅ row (substantive reliability fix), run the §10b cold-eyes pass, open PR 1** with the whole plan directory included. PR body ops notes:
  - Render's `notifyOnFail` for the crawler crons is `default` (read from the Render API `list_services` on 2026-09-22; not recorded in `render.yaml`), which defers to the workspace setting — confirm Render → Notifications emails on a failed cron run.
  - `concert-crawl-crawler-daily-staging` runs the same code, so an un-suspended staging cron would also exit 1 on a degraded night and send `[STAGING]`-prefixed email. It was suspended as of the same read.
