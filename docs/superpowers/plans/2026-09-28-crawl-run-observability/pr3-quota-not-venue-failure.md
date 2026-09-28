# PR 3 — an account-wide LLM refusal is not a venue failure (Task 6)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 6: Exempt `llm_quota` from the three strikes

**Why:** on 2026-09-28 the rule would have set `active = false` on 8 working venues at the Sept 30 run, ~15 hours before the quota reset, needing manual re-activation of each. **Decision:** an `llm_quota` failure neither increments `consecutive_failures` nor notifies per venue. Incrementing would leave every LLM venue one real failure from a pause once the account recovers. The run-level alert (PR 1) is the channel that reports it. The `crawl_runs` row is still written as `failed`, and the final `reportFailure('crawl.failed')` still fires.

**Verified precondition:** the Anthropic error reaches the outer `catch (err)` in `crawlVenue` (~line 1655). `extractWithLlm` does not catch around `stream.finalMessage()` (`lib/extractors/llm.ts` ~362–392), and `runExtraction` (`crawl.ts` ~293) and its call sites propagate. Nothing declared between `const isHttpBlocked` and the end of the `if (newFailureCount >= 3)` block is used after it, so the wrap below breaks no scope.

**Files:**

- Modify: `packages/crawler-core/src/crawl.ts` (outer `catch (err)` at ~line 1655)
- Modify: `CLAUDE.md` (Crawl Architecture → non-negotiable crawl rules)
- Test: `packages/crawler-core/src/crawl.test.ts`

- [x] **Step 1: Failing test.** Append to `crawl.test.ts`. Read venues from `stores.venues`, as the existing tests at ~lines 959 and 991 do. Note what the in-memory `update()` builder does (~line 108): it `Object.assign`s the `set()` payload onto the row verbatim, and `drizzle-orm` is not mocked — so after a real three-strikes update, `consecutiveFailures` holds a Drizzle SQL object, not a number. That is what makes "still the number 2" a sound assertion that no update ran, and why the control asserts "no longer 2" rather than 3.

```ts
describe('crawlVenue — account-wide LLM quota', () => {
  const QUOTA =
    'Error: 400 {"error":{"message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}'

  const storedVenue = (id: string) => stores.venues.find((row) => row.id === id)
  const arrangeLlmPath = (venue: { websiteUrl: string }) =>
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })

  it('records the run as failed without touching the three-strikes counter', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    arrangeLlmPath(venue)
    mockExtractWithLlm.mockRejectedValueOnce(new Error(QUOTA))

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('failed')
    expect(storedVenue(venue.id)?.consecutiveFailures).toBe(2)
    expect(storedVenue(venue.id)?.active).toBe(true)
  })

  it('still runs the three-strikes update for an ordinary failure (control)', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    arrangeLlmPath(venue)
    mockExtractWithLlm.mockRejectedValueOnce(
      new Error('TypeError: fetch failed'),
    )

    await crawlVenue(venue.id, mockBrowser)

    expect(storedVenue(venue.id)?.consecutiveFailures).not.toBe(2)
  })
})
```

- [x] **Step 2: Run to verify the first fails and the control passes** — `pnpm --filter @concert-crawl/crawler-core test -- crawl.test`.

- [x] **Step 3: Implement.** Import `classifyCrawlError` from `./lib/crawl-error-class.js`. After the debug-HTML capture block and before `const isHttpBlocked`:

```ts
// An account-wide LLM refusal (usage limit, exhausted credit) says nothing
// about this venue: every LLM venue fails identically until the account
// recovers. Counting it toward the three strikes would pause venues that
// were never broken — on 2026-09-28 it would have deactivated eight, ~15
// hours before the quota reset. It neither increments nor notifies; the
// run-level alert (lib/run-health.ts) reports it. The crawl_runs row below
// is still written as failed.
const isAccountQuota = classifyCrawlError(String(err)).kind === 'llm_quota'
```

Wrap everything from `const isHttpBlocked` through the end of the `if (newFailureCount >= 3) { … }` block in `if (!isAccountQuota) { … }`. The `const durationMs` line, the `crawl_runs` insert and the final `reportFailure` stay outside it, unconditional.

In `CLAUDE.md`, change the rule line to:

`- 3 consecutive failures → pause venue + notify admin via in-app notification. An account-wide LLM refusal (usage limit, exhausted credit) is not a venue failure and does not count; the daily run-level alert reports it.`

- [x] **Step 4: Run** the crawler-core suite; PASS. Mutation-check: force `isAccountQuota = false` and confirm the first test fails.

- [x] **Step 5: Commit, run the §10b cold-eyes pass, open PR 3.**
