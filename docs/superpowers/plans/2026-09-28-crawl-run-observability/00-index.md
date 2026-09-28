# Crawl Run Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a crawl run that fails for one shared reason say so on the first night — naming the cause and the venues, in an admin email, a Sentry issue per cause, and a failed cron run — and stop that reason from auto-pausing venues that were never broken.

**Architecture:** One shared, pure classifier (`classifyCrawlError`) turns a crawl error message into a stable kind + grouping key. A run-level health check consumes it at the end of `runDailyCrawl`; Sentry fingerprinting consumes it at the capture sites; the three-strikes path consumes it to exempt account-wide LLM refusals. An optional budget warning reads `cost_tracking` against a per-app monthly figure.

**Tech Stack:** TypeScript, Vitest, Drizzle, `@sentry/node`, Resend (via the existing `sendAdminAlert`).

**Spec:** none separate — the incident record in **Background** is the spec.

## Global Constraints

- pnpm only; all work in a worktree under `.worktrees/`; one PR at a time off fresh `main` — **no stacked PRs**.
- No `as` casts. Parse any JSON read back from the DB with Zod `safeParse` (CLAUDE.md principle 6).
- ESLint `id-length`: identifiers ≥ 2 chars (`err`, `ctx`), except `i j k x y z _`.
- Monitoring code must never break a crawl: every new side effect on the run path is wrapped so a throw is reported and swallowed.
- Every fix that ships with a test is mutation-checked: revert the fix, watch the test fail, restore.
- Admin-only surfaces: no `releases.ts` entry, no copy-review gate.

---

## Background — the 2026-09-28 incident

At 09:00–09:04 UTC the daily crawl hit Anthropic's account spend cap:

```
400 invalid_request_error: "You have reached your specified API usage limits.
You will regain access on 2026-10-01 at 00:00 UTC."
```

8 of 20 active venues failed (every LLM-extracted venue); the other 12 use JSON-LD or platform fetchers and succeeded. The cap is shared with another project, so concert-crawl's own spend (flat ~$0.70/day, $18.96 month-to-date, lower than August's $22.62) could not have predicted it.

**What detected it, verified after the fact:**

| Channel                                                               | Result                                                                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Sentry volume monitor `7918751` (legacy `445152`, >4 error events/hr) | **Fired.** Email alert `3764581` last triggered 2026-09-28T10:03:56Z.                                       |
| Sentry issue `CONCERT-CRAWL-CRAWLER-2`                                | Absorbed all 8 events — open since 2026-05-11, 54 occurrences, substatus `ongoing`. A new cause looked old. |
| In-app admin notification                                             | **Silent.** `crawl.ts:1732` gates on `newFailureCount >= 3`.                                                |
| Admin email (`sendCrawlFailureEmail`)                                 | **Silent.** Gated on the exact 3rd failure.                                                                 |
| `event_count_dropped` / `url_coverage_gap` / `event_ceiling`          | **Silent by construction** — all run on the success path (`crawl.ts:1615`).                                 |
| Render cron status                                                    | **Success.** Per-venue failures are caught inside `runDailyCrawl`; `index.ts` exits 0.                      |

**This plan does not add an in-app alert.** No admin screen lists `admin_alert` rows in general — the crawl dashboard reads four categories pinned to a crawl-run row (`apps/api/src/routes/admin/crawl.ts:276-285`) — so a run-level row would reach nobody. Surfacing run-level alerts in the admin UI is a separate decision.

So the signal arrived, but as "sustained error volume" — not "the LLM account is out of budget, 8 named venues, auto-pause in 48 hours." And the three-strikes rule (`crawl.ts:1720`, non-block branch) would have set `active = false` on all 8 at the Sept 30 09:00 run — ~15 hours before the quota reset — requiring manual re-activation of each.

**Threshold evidence (prod `crawl_runs`, 91 days to 2026-09-28):** 86 days with zero failures, 3 days with one, 1 day with two — both the _same venue_ (Levitt Pavilion, daily run plus a manual re-run) — and today with eight. The thresholds below fire on today only. Shared-cause counting is by **distinct venue** — defensive, since the daily loop crawls each venue once, but it keeps one venue from ever reading as a shared cause.

---

## PR boundaries (named before implementation, per `pr-review` §10)

| PR  | Branch                              | Tasks | Depends on                               |
| --- | ----------------------------------- | ----- | ---------------------------------------- |
| 1   | `fix/crawl-run-health-alert`        | 1–4   | —                                        |
| 2   | `fix/crawl-failure-fingerprint`     | 5     | PR 1 merged (`classifyCrawlError`)       |
| 3   | `fix/llm-quota-not-a-venue-failure` | 6     | PR 1 merged                              |
| 4   | `feat/llm-budget-warning`           | 7     | — (recommended **deferred**, see Task 7) |

Each PR carries its own plan file below, so spec, plan and code are reviewed together (`pr-review` §9). This index lands with PR 1.

| PR  | Plan file                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [`pr1-a-classify-and-evaluate.md`](pr1-a-classify-and-evaluate.md) (Tasks 1–2), [`pr1-b-report-and-wire.md`](pr1-b-report-and-wire.md) (Tasks 3–4) |
| 2   | [`pr2-failure-fingerprint.md`](pr2-failure-fingerprint.md)                                                                                         |
| 3   | [`pr3-quota-not-venue-failure.md`](pr3-quota-not-venue-failure.md)                                                                                 |
| 4   | [`pr4-llm-budget-warning.md`](pr4-llm-budget-warning.md)                                                                                           |

## File structure

| File                                                        | Responsibility                                                                   | PR   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ---- |
| `packages/crawler-core/src/lib/crawl-error-class.ts` (new)  | Pure: error message → `{ kind, key }`; later, Sentry capture context             | 1, 2 |
| `packages/crawler-core/src/lib/run-health.ts` (new)         | Pure `evaluateRunHealth` + side-effecting `reportRunHealth`                      | 1    |
| `packages/crawler-core/src/lib/email.ts`                    | `sendRunDegradedEmail` beside the other admin alerts                             | 1    |
| `packages/crawler-core/src/index.ts`                        | Re-exports                                                                       | 1, 2 |
| `apps/crawler/src/run.ts`                                   | Collect outcomes, report health, return `degraded`; fingerprint captures         | 1, 2 |
| `apps/crawler/src/index.ts` + `__tests__/exit-code.test.ts` | Exit 1 on a degraded run                                                         | 1    |
| `packages/logger/src/index.ts`                              | Optional `fingerprint` on `FailureReport`                                        | 1    |
| `apps/api/src/emails/test-fixtures.ts`                      | Sample for the admin test-email picker                                           | 1    |
| `packages/crawler-core/src/crawl.ts`                        | Fingerprint the `crawl.failed` report; exempt `llm_quota` from the three strikes | 2, 3 |
| `CLAUDE.md`                                                 | Amend the three-strikes crawl rule                                               | 3    |
| `packages/crawler-core/src/lib/llm-budget.ts` (new)         | Month-to-date spend vs `LLM_MONTHLY_BUDGET_USD`                                  | 4    |

---

## Verification after each deploy

- **PR 1:** trigger nothing destructive. Confirm the next daily run logs `degraded: false` and exits 0 in Render; send the `run_degraded` sample from Admin → Settings → test email and check it lands.
- **PR 2:** after the first failure post-deploy, confirm the Sentry issue title is the cause, not the call site, and carries `crawl_error_kind`.
- **PR 3:** covered by the integration-style tests; no prod experiment (reproducing needs the quota exhausted).

## Next

Implement PR 1 (Tasks 1–4) in a fresh worktree off `main`. PR 4 waits on a per-app Anthropic key.
