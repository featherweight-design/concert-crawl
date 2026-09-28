# PR 3 — an account-wide LLM refusal is not a venue failure (Task 6)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 6: Exempt `llm_quota` from the three strikes

**Why:** on 2026-09-28 the rule would have set `active = false` on 8 working venues at the Sept 30 run, ~15 hours before the quota reset, needing manual re-activation of each. Decision: an `llm_quota` failure **neither increments** `consecutive_failures` **nor notifies** per venue. Incrementing would leave every LLM venue one real failure from a pause after the account recovers; the run-level alert (PR 1) is the channel that reports it. The `crawl_runs` row is still written as `failed`.

**Files:**

- Modify: `packages/crawler-core/src/crawl.ts` (outer `catch (err)` at ~line 1655)
- Modify: `CLAUDE.md` (Crawl Architecture → non-negotiable rules)
- Test: `packages/crawler-core/src/crawl.test.ts`

- [ ] **Step 1: Failing test** (append a `describe` to `crawl.test.ts`; `seedVenue`, `mockFetchPage`, `mockExtractWithLlm`, `HTML_V1`, `db`, `venues`, `notifications`, `eq` are already in scope):

```ts
describe('crawlVenue — account-wide LLM quota', () => {
  const QUOTA =
    'Error: 400 {"error":{"message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}'

  const arrangeLlmPath = (venue: { websiteUrl: string }) =>
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })

  it('records the run as failed without counting it toward the three strikes', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    arrangeLlmPath(venue)
    mockExtractWithLlm.mockRejectedValue(new Error(QUOTA))

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('failed')
    const [after] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(after?.consecutiveFailures).toBe(2)
    expect(after?.active).toBe(true)
    const alerts = await db.select().from(notifications)
    expect(
      alerts.filter((row) => row.category === 'crawl.failed'),
    ).toHaveLength(0)
  })

  it('still auto-pauses on an ordinary third failure', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    arrangeLlmPath(venue)
    mockExtractWithLlm.mockRejectedValue(new Error('TypeError: fetch failed'))

    await crawlVenue(venue.id, mockBrowser)

    const [after] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(after?.consecutiveFailures).toBe(3)
    expect(after?.active).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify the first fails and the control passes.**

- [ ] **Step 3: Implement.** Import `classifyCrawlError` from `./lib/crawl-error-class.js`. After the debug-HTML capture block and before `const isHttpBlocked`:

```ts
// An account-wide LLM refusal (usage limit, exhausted credit) says nothing
// about this venue: every LLM venue fails identically until the account
// recovers. Counting it toward the three strikes would pause venues that
// were never broken — on 2026-09-28 it would have deactivated eight, ~15
// hours before the quota reset. It neither increments nor notifies; the
// run-level alert (lib/run-health.ts) is what reports it. The crawl_runs
// row below is still written as failed.
const isAccountQuota = classifyCrawlError(String(err)).kind === 'llm_quota'
```

Wrap everything from `const isHttpBlocked` through the end of the `if (newFailureCount >= 3) { … }` block in `if (!isAccountQuota) { … }`. The `const durationMs` line and the `crawl_runs` insert after it stay outside, unconditional.

In `CLAUDE.md`, change the rule line to:
`- 3 consecutive failures → pause venue + notify admin via in-app notification. An account-wide LLM refusal (usage limit, exhausted credit) is not a venue failure and does not count; the daily run-level alert reports it.`

- [ ] **Step 4: Run** `pnpm --filter @concert-crawl/crawler-core test`; PASS. Mutation-check: force `isAccountQuota = false`; the first test must fail.

- [ ] **Step 5: Commit, open PR 3.**

---
