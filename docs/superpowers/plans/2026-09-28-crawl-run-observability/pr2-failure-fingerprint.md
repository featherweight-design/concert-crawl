# PR 2 — fingerprint crawl failures by cause (Task 5)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 5: Group crawl-failure Sentry events by error class, not call site

> **Amended before opening (pre-open review).** This task planned to fingerprint `crawl.ts`'s own `crawl.failed` report as well. Sharing the `['crawl.failed', key]` fingerprint would make Sentry merge that `captureMessage` into the same issue as `run.ts`'s `captureException` for every failure, doubling each issue's count (16 events for the 8 failures on 2026-09-28). As shipped, only the `run.ts` capture sites are fingerprinted; they carry the per-cause paging. `crawl.ts`'s report keeps default grouping, and `crawlFailureGrouping`'s docstring says why.

**Why:** each failed crawl reaches Sentry twice, and both paths group every cause into one issue:

1. `apps/crawler/src/run.ts` wraps the message in `new Error(...)` at both capture sites (triggers ~line 203, daily ~line 331), so Sentry groups on the call site. `CONCERT-CRAWL-CRAWLER-2` has absorbed every distinct cause since 2026-05-11.
2. `packages/crawler-core/src/crawl.ts` ~line 1793 calls `reportFailure({ event: 'crawl.failed', … })`, a `captureMessage('crawl.failed')` — one issue for every cause.

The issue-alert rule fires on transitions only, so a new cause landing in an ongoing issue never pages. Both paths get the same fingerprint, so one cause is one issue.

**Files:**

- Modify: `packages/crawler-core/src/lib/crawl-error-class.ts`, `packages/crawler-core/src/index.ts`
- Modify: `apps/crawler/src/run.ts` (the two capture sites), `packages/crawler-core/src/crawl.ts` (~line 1793)
- Test: `packages/crawler-core/src/lib/crawl-error-class.test.ts`, `apps/crawler/src/run.test.ts`

**Interfaces — Consumes:** `classifyCrawlError`, `CrawlErrorKind` (Task 1); `FailureReport.fingerprint` (Task 3). **Produces:**

```ts
export function crawlFailureGrouping(message: string): {
  fingerprint: string[]
  errorKind: CrawlErrorKind
}
```

- [x] **Step 1: Failing tests.** In `crawl-error-class.test.ts` (reusing its `QUOTA` fixture):

```ts
describe('crawlFailureGrouping', () => {
  it('fingerprints on the class, so one cause is one Sentry issue', () => {
    expect(crawlFailureGrouping(QUOTA)).toEqual({
      fingerprint: ['crawl.failed', 'llm_quota'],
      errorKind: 'llm_quota',
    })
  })
  it('gives different causes different fingerprints', () => {
    expect(crawlFailureGrouping('HTTP 403').fingerprint).not.toEqual(
      crawlFailureGrouping('HTTP 500').fingerprint,
    )
  })
})
```

In `run.test.ts`, add to the crawler-core mock factory:

```ts
  crawlFailureGrouping: vi.fn(() => ({ fingerprint: ['crawl.failed', 'k'], errorKind: 'other' })),
```

and add a case:

```ts
it('fingerprints a failed venue by cause', async () => {
  mockCrawlVenue.mockResolvedValueOnce({
    ...SUCCESSFUL_CRAWL_RUN,
    status: 'failed',
    errorMessage: 'boom',
  })
  const { runDailyCrawl } = await import('./run.js')

  await runDailyCrawl()

  expect(Sentry.captureException).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      fingerprint: ['crawl.failed', 'k'],
      tags: { crawl_error_kind: 'other' },
    }),
  )
})
```

(`Sentry` is the file's existing `@sentry/node` mock, ~line 8; import it the way the file's other Sentry assertions do.)

- [x] **Step 2: Run to verify both fail.**

- [x] **Step 3: Implement.** In `crawl-error-class.ts`:

```ts
/** Sentry grouping for a failed crawl: one issue per cause, on every path. */
export function crawlFailureGrouping(message: string) {
  const { kind, key } = classifyCrawlError(message)
  return { fingerprint: ['crawl.failed', key], errorKind: kind }
}
```

Re-export it from `packages/crawler-core/src/index.ts`. At both `run.ts` capture sites:

```ts
const message = result.value.errorMessage ?? 'Crawl failed'
const grouping = crawlFailureGrouping(message)
Sentry.captureException(new Error(message), {
  fingerprint: grouping.fingerprint,
  tags: { crawl_error_kind: grouping.errorKind },
  extra: { venueId: batch[idx]?.id, name: batch[idx]?.name },
})
```

(triggers path: `crawlRun.errorMessage`, `extra: { venueId: trigger.venueId, triggerId: trigger.id }`). Leave the `rejected` branch (~line 384) on default grouping — it carries a real stack trace, the right grouping for an unexpected throw.

In `crawl.ts` ~line 1793, spread the same grouping into the existing report (`fingerprint` goes to Sentry, `errorKind` to `extra`):

```ts
reportFailure({
  event: 'crawl.failed',
  severity: 'error',
  ...crawlFailureGrouping(String(err)),
  venueId,
  error: String(err),
  durationMs,
})
```

That one-line spread has no dedicated test: `crawl.test.ts` does not mock the logger, and the grouping itself is covered above. Typecheck and review cover the call.

- [x] **Step 4: Run** both packages' tests; PASS. Mutation-check: return `['crawl.failed']` from `crawlFailureGrouping` and confirm the "different causes" test fails.

- [x] **Step 5: Commit, run the §10b cold-eyes pass, open PR 2.** Ops step after deploy, recorded in the PR body: resolve `CONCERT-CRAWL-CRAWLER-2` and the `crawl.failed` message issue so the old buckets stop absorbing. Expect one first-seen email per distinct cause as new groups form — that is the change working.
