# PR 2 — fingerprint crawl failures by cause (Task 5)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 5: Group Sentry issues by error class, not call site

**Why:** both capture sites wrap the message in `new Error(...)`, so Sentry groups every crawl failure on the call site. `CONCERT-CRAWL-CRAWLER-2` has absorbed every distinct cause since 2026-05-11; the issue-alert rule fires on transitions only, so a new cause in an ongoing group never pages.

**Files:**

- Modify: `packages/crawler-core/src/lib/crawl-error-class.ts`, `packages/crawler-core/src/index.ts`
- Modify: `apps/crawler/src/run.ts` (triggers capture ~line 203, daily capture ~line 331)
- Test: `packages/crawler-core/src/lib/crawl-error-class.test.ts`, `apps/crawler/src/run.test.ts`

**Interfaces — Produces:**

```ts
export function crawlFailureCaptureContext(message: string): {
  fingerprint: string[]
  tags: { crawl_error_kind: CrawlErrorKind }
}
```

- [ ] **Step 1: Failing test** (in `crawl-error-class.test.ts`):

```ts
describe('crawlFailureCaptureContext', () => {
  it('fingerprints on the class, so one cause is one Sentry issue', () => {
    expect(crawlFailureCaptureContext(QUOTA)).toEqual({
      fingerprint: ['crawl.failed', 'llm_quota'],
      tags: { crawl_error_kind: 'llm_quota' },
    })
  })
  it('gives different causes different fingerprints', () => {
    expect(crawlFailureCaptureContext('HTTP 403').fingerprint).not.toEqual(
      crawlFailureCaptureContext('HTTP 500').fingerprint,
    )
  })
})
```

In `run.test.ts`, add `crawlFailureCaptureContext: vi.fn(() => ({ fingerprint: ['crawl.failed', 'k'], tags: { crawl_error_kind: 'other' } }))` to the crawler-core mock, and assert the daily failed path calls `Sentry.captureException` with `expect.objectContaining({ fingerprint: ['crawl.failed', 'k'] })`.

- [ ] **Step 2: Run to verify both fail.**

- [ ] **Step 3: Implement.**

```ts
export function crawlFailureCaptureContext(message: string) {
  const { kind, key } = classifyCrawlError(message)
  return {
    fingerprint: ['crawl.failed', key],
    tags: { crawl_error_kind: kind },
  }
}
```

At both capture sites:

```ts
const message = result.value.errorMessage ?? 'Crawl failed'
Sentry.captureException(new Error(message), {
  ...crawlFailureCaptureContext(message),
  extra: { venueId: batch[idx]?.id, name: batch[idx]?.name },
})
```

(triggers path: `crawlRun.errorMessage`, `extra: { venueId: trigger.venueId, triggerId: trigger.id }`). Leave the `rejected` branch (~line 384) on default grouping — it carries a real stack trace, which is the right grouping for an unexpected throw.

- [ ] **Step 4: Run** both packages' tests; PASS. Mutation-check the fingerprint assertion.

- [ ] **Step 5: Commit, open PR 2.** Ops step after deploy (record in the PR body): resolve `CONCERT-CRAWL-CRAWLER-2` so the old bucket stops absorbing. Expect one first-seen email per distinct cause as new groups form — that is the change working.

---
