# Plan — Admin Dashboard Cost Panel (#112 + #114)

**Issues:** #112 (LLM spend chart, 30-day) · #114 (top spend by venue)
**Design source:** `design/design_handoff_admin_ui/admin-dashboard.jsx` — `CostPanel` (lines 103–186)
**Readiness verdict:** 🟡 Yellow — `design/design_handoff_admin_ui/READINESS.md` (merged PR #867)

## Goal

Add the CostPanel to the admin dashboard: a 30-day LLM spend area chart with budget context,
plus a top-spend-by-venue ranked list, backed by two new read-only admin endpoints. Rebase the
existing "LLM cost" StatCard onto the same data so both surfaces agree.

## Decisions

Rows marked **READINESS** were locked by the readiness audit; rows marked **this plan** were
left open/recommended by READINESS.md and are resolved here.

| Decision                | Resolution                                                                                                                                                | Locked by |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Chart implementation    | Mock's dependency-free SVG (`CostChart`), token-only. No Recharts.                                                                                        | READINESS |
| Budget source           | Keep `LLM_BUDGET_USD` constant. No `app_config` table (KISS).                                                                                             | READINESS |
| Day bucketing           | Group by America/Denver day boundaries (timestamps stored UTC).                                                                                           | READINESS |
| Spend window            | Rolling 30 days, not calendar-month. No "resets" copy.                                                                                                    | this plan |
| Panel placement         | Between `AttentionFeed` and the "Crawl health · today" panel.                                                                                             | this plan |
| StatCard cost figure    | Rebased on the daily-costs endpoint (30-day total), replacing the last-20-runs sum.                                                                       | this plan |
| "Open billing ›" action | **Dropped.** No in-app billing surface exists; an external Anthropic console link from the dashboard adds little. Panel title carries the wow badge only. | this plan |

## Task 1 — API: costs admin router

**New file:** `apps/api/src/routes/admin/costs.ts`, mounted in
`apps/api/src/routes/admin/index.ts` as `costsAdminRouter` under `/costs`.
GET-only, so the existing audit-log middleware skips it automatically.

### `GET /v1/admin/costs/daily?days=30`

- Zod query schema: `days` optional, coerced number, int, min 1, max 90, default 30.
- Drizzle aggregation over `crawl_runs`: sum `llm_cost_usd` grouped by MT-local day via
  `sql<string>` day-bucket expression
  (`` sql`(${crawlRuns.createdAt} AT TIME ZONE 'America/Denver')::date` `` — qualified column
  reference, safe under joins/aliases) —
  a parameterized Drizzle `sql` fragment, consistent with the "Drizzle only" rule.
  `llm_cost_usd` is nullable, so the aggregate must be `coalesce(sum(...), 0)`.
- Response: `{ success: true, data: { days: Array<{ date: string; costUsd: number }>, totalUsd: number } }`.
  Zero-fill missing days server-side so the chart never has gaps.

### `GET /v1/admin/costs/top-venues?days=30`

- Same `days` schema.
- Sum `llm_cost_usd` per venue (join `venues` for name), filter to runs in window with
  cost > 0, order desc.
- Return top 3 + an aggregated `others` remainder row (matching the mock's
  "(others)" line): `{ success: true, data: { venues: Array<{ venueId: string | null; name: string; costUsd: number; pct: number }>, totalUsd: number } }`.
  `pct` is share of window total, rounded; `venueId` null for the others row.

### Types

Shared response types in `packages/types` (`DailyCost`, `TopSpendVenue`, etc.), imported by
both API and web — same pattern as existing admin contracts.

### Tests

`costs.test.ts` (route-level with mocked db, following `crawl.test.ts` conventions) covering:
window filtering, MT day bucketing (a run at 2026-07-11T03:00Z lands on 2026-07-10 MT),
zero-fill, others aggregation, pct math, `days` validation bounds.

## Task 2 — Web: CostPanel

**New files** under `apps/web/src/components/admin/dashboard/`:

- `CostPanel.tsx` — `Panel` with composite title (`LLM spend, last 30 days` + wow
  `StatusBadge` when computable), `padding={0}`, internal grid `1fr 280px` on desktop,
  single column (chart above list) below `lg`. Left cell: 30-day total (JetBrains Mono
  stack — the same monospace styling `CostText`/`MonoLabel` use, inline like the other
  dashboard components — 32px) +
  "of $X budget" caption + `CostChart` + month-axis labels. Right cell: `MonoLabel`
  "top spend" + ranked rows (`CostText` + `ProgressBar kind="signal"` — the primitive's fixed 4px height already matches the mock).
- `CostChart.tsx` — the mock's SVG (area gradient + line + terminal dot + dashed gridlines),
  token-only (`var(--signal)`, `var(--border)`), `role="img"` + `aria-label` summarizing the
  window total. Unique gradient id via `useId`.

**Wow badge:** week-over-week delta computed from the daily series (last 7 days vs prior 7);
omitted when the prior window is $0.

**Empty state:** when the 30-day total is $0, render a quiet single-line message inside the
panel (copy in `ADMIN_COPY.dashboard.costPanel`), no chart/list skeletons.

**Copy:** every string in `apps/web/src/components/admin/definitions/copy.ts`.

**Placement:** `apps/web/src/app/(protected)/admin/page.tsx`, between `AttentionFeed` and the
crawl-health `Panel`. Data fetched in the same `Promise.all` as the rest of the dashboard,
`.catch` fallbacks consistent with existing entries (never break the page).

## Task 3 — StatCard rebase

In `page.tsx`, replace the LLM-cost StatCard's `runs`-derived figures:

- `totalCost` → the daily endpoint's 30-day `totalUsd`.
- `costTrend` → same wow computation as the panel badge (shared helper in
  `dashboard/lib/dashboard.ts`).
- Budget % + progress bar unchanged, still against `LLM_BUDGET_USD`.
- Label stays `LLM cost` with the existing 30d framing from `ADMIN_COPY`.

Update `dashboard.ts` unit tests accordingly.

## Task 4 — Verification

- `pnpm typecheck && pnpm lint && pnpm test` in the worktree.
- Local visual pass: `pnpm dev`, seed data, check desktop + mobile (320px) layouts, all-zero
  empty state, and theme token rendering.
- design-review skill against the mock before opening the PR.

## Out of scope

- #115 SSE live indicator (launch phase).
- Budget configurability (`app_config`) — revisit only if the budget changes often enough
  to justify it.
- "Open billing" affordance (dropped, see locked decisions).
- Consumer-facing anything — this is admin-only; no `releases.ts` entry, no `progress.md` row.

## PR shape

Single implementation PR (`feat/admin-cost-panel`) closing both issues:
API router + types + tests, CostPanel UI, StatCard rebase. Body: `Closes #112`, `Closes #114`.
No new env vars.
