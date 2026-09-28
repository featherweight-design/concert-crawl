# Gap Report — Crawl run health alert (PR 1)

Spec: `docs/superpowers/plans/2026-09-28-crawl-run-observability/00-index.md` (Background) and PR 1's plan files. No design handoff and no UI surface, so `feature-acceptance` and `design-review` do not apply.

## IMPLEMENTED (9)

- Shared error classifier: `llm_quota` for both Anthropic account refusals, normalized key otherwise [`packages/crawler-core/src/lib/crawl-error-class.ts`]
- Normalization keeps 3-digit status codes apart and collapses URLs, request ids, UUIDs and 4+ digit runs [`crawl-error-class.ts` `normalizeErrorMessage`]
- Run-level evaluation: failure rate (>=3 venues and >=25%) and shared cause (>=2 distinct venues), thresholds sized from 91 days of prod `crawl_runs` [`packages/crawler-core/src/lib/run-health.ts` `evaluateRunHealth`]
- Report names the cause and the venues, and calls an `llm_quota` cause account-wide [`run-health.ts` `describeDegradation`]
- One Sentry event, and so one issue, per shared cause, via a new optional `fingerprint` on `FailureReport` [`packages/logger/src/index.ts`; `run-health.ts` `runHealthFingerprints`]
- Sentry reported before the admin email; a failed email cannot suppress it [`run-health.ts` `reportRunHealth`]
- Admin email and its test-email picker sample [`packages/crawler-core/src/lib/email.ts` `sendRunDegradedEmail`; `apps/api/src/emails/test-fixtures.ts`]
- Daily run collects one outcome per venue and returns `degraded`; the check cannot break a crawl [`apps/crawler/src/run.ts`]
- Degraded run exits 1 so Render marks the cron run failed [`apps/crawler/src/index.ts`]

## GAPS (0)

## DEFERRED (0)

Not in PR 1 by design (the plan's own boundaries, not deferrals): Sentry fingerprinting of the per-venue capture sites (PR 2), the `llm_quota` three-strikes exemption (PR 3), the budget warning (PR 4, deferred until a per-app Anthropic key).
