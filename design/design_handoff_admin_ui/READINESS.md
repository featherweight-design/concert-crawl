# Design Readiness Review — Admin Dashboard Cost Panel

**Handoff:** `design/design_handoff_admin_ui/admin-dashboard.jsx` — `CostPanel` (chart + top-spend list)
**Issues:** #112 (LLM spend chart), #114 (top spend by venue)
**Audit date:** 2026-07-10

## Scope of this review

This audit covers ONLY the `CostPanel` region of the dashboard mock. The rest of the handoff
(stat row, crawl health table, shell, primitives) shipped in the Phase 7.6 admin redesign and is
not re-audited here. The SSE badge (#115, `phase: launch`) and the Activity panel
(#116, closed as stale — superseded by `AttentionFeed`) are deliberately excluded.

## Verdict: 🟡 Yellow

Ready to build with eng-side clarifications. No Design round-trip required — the gaps are
mechanical (mobile stacking, empty state) and follow patterns already established on the
live dashboard.

## Per-dimension findings

### 🗺️ Scope

Mock matches both issues cleanly: 30-day area chart + budget line (#112) and ranked
top-spend list with mini progress bars (#114) render side-by-side in one panel. #114 is a
strict subset and can ship first, as its issue notes.

### 🎭 State coverage

- **Full state:** fully specified in the mock. ✅
- **Empty state:** NOT in the mock. Reachable in practice — a 30-day window where every crawl
  used structured data yields $0 / no rows. Eng defines a quiet empty treatment (copy in
  `ADMIN_COPY`), consistent with existing dashboard fallbacks (e.g. `RunHistoryBlocks` renders
  nothing when data is empty).
- **Loading:** covered by the existing route-level `loading.tsx` (RSC page). ✅
- **Mobile:** mock grid is fixed `1fr 280px` (desktop-only). Parity rule applies: stack chart
  above list on narrow viewports, mirroring the stat row's `grid-cols-2 xl:grid-cols-4`
  responsive approach. Behavioral parity is unaffected — display-only surface.

### 🔌 Data contract

- `crawl_runs.llm_cost_usd`, `venue_id`, `created_at` all exist (`packages/db/src/schema/crawl-runs.ts`). ✅
- Both endpoints are new: `GET /v1/admin/costs/daily?days=30` and
  `GET /v1/admin/costs/top-venues?days=30`. Straightforward Drizzle `groupBy` aggregations;
  follow existing admin route conventions (AdminVariables, Zod query validation, audit-log
  exempt — read-only).
- **Day bucketing:** timestamps are UTC; daily buckets should use America/Denver day boundaries
  per the store-UTC/display-MT decision.
- ⚠️ **`app_config` does not exist.** Issue #112 says "budget stored in `app_config`" but there
  is no such table. Current budget is a hardcoded `LLM_BUDGET_USD = 20` constant in
  `apps/web/.../dashboard/lib/dashboard.ts`. Per the KISS rule (exhaust existing fields first),
  keep the constant and skip the table — building `app_config` for one value is not justified.
  Plan PR should state this explicitly.

### 🧱 Codebase fit

- All required primitives exist: `Panel`, `ProgressBar`, `StatusBadge`, `CostText`, `MonoLabel`. ✅
- **No chart library needed.** Issue #112 suggests "Recharts or similar," but the mock's
  `CostChart` is a ~25-line dependency-free SVG using only tokens, and the codebase already has
  the same pattern in the `Sparkline` primitive. Build the mock's SVG; do not add Recharts.
- Copy rule applies: all panel strings land in `components/admin/definitions/copy.ts`.

### ♿ Cross-cutting

- Token-only colors throughout the mock (`var(--signal)`, `var(--border)`, gradient stops). ✅
- A11y: SVG chart needs an accessible label (`role="img"` + `aria-label` summarizing spend);
  the top-spend bars are decorative alongside visible text values. Low effort.
- No analytics/telemetry requirements — admin-only surface.

### ⏰ Drift from reality

- **Panel placement:** mock's dashboard order is stat row → CostPanel → crawl health → Activity.
  The live dashboard is stat row → AttentionFeed → crawl health. Natural slot: between
  AttentionFeed and the crawl health panel. Eng call; no design implications.
- **Budget semantics:** mock hint says "of $40 budget · resets May 31" (calendar-month reset),
  while the live StatCard computes cost over the last 20 runs against `LLM_BUDGET_USD`. The new
  panel introduces a true 30-day window; the StatCard's 20-run sum will disagree with the panel's
  30-day total. Recommendation: rebase the StatCard's cost figure on the same
  `costs/daily` data so the two surfaces agree. Treat "resets May 31" as mock flavor —
  a rolling 30-day window is simpler and matches both issue titles.
- **"+18% wow" badge:** week-over-week delta, computable from the daily series. ✅
- **"Open billing ›" action:** no in-app billing page exists. Options: link out to the Anthropic
  console (external), or drop the action. Eng/product call at plan time.

### 📝 Decision log

| Decision | Status |
| --- | --- |
| Chart implementation: mock's SVG, no chart dependency | Locked by this audit |
| Budget source: keep `LLM_BUDGET_USD` constant, no `app_config` table | Locked by this audit (KISS) |
| Rolling 30-day window (not calendar-month reset) | Recommended — confirm in plan PR |
| Panel placement below AttentionFeed | Recommended — confirm in plan PR |
| StatCard cost figure rebased on daily-costs data | Recommended — confirm in plan PR |
| "Open billing" target (external link vs drop) | Open — resolve in plan PR |
| Empty-state copy | Eng writes at build time (`ADMIN_COPY`) |
| Mobile stacking layout | Eng follows existing responsive dashboard patterns |
