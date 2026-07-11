# UI Audit Skill + Staging Seeder — Design

**Date:** 2026-07-11
**Status:** Approved design (brainstormed with Hugh 2026-07-11)
**Tracks:** Two build tracks — the seeder lands first and unblocks manual staging testing immediately; the audit skill depends on it.

## Problem

Small UI breaks ship and go unnoticed until much later — especially on mobile.
Example: the Admin > Feedback expanded card looks correct on desktop, but at
mobile widths the CONTEXT column collapses to one-character-per-line wrapping
(unreadable) and the layout crams. It was missed on first pass because nobody
opened that exact route, at that exact viewport, in that exact interaction
state.

Two root causes:

1. **No systematic sweep.** Manual QA covers the routes and states a human
   happens to visit. There is no repeatable pass over route × viewport ×
   interaction state.
2. **Staging is barren.** Staging has almost no user-shaped data, so even a
   sweep would render empty states. Hugh currently hand-seeds data for every
   manual test session, which is tedious and non-reproducible.

## Goals

- A repeatable, on-demand sweep that catches **pure UI breakage** a user would
  immediately balk at: horizontal overflow, clipped/unreadable text wrapping,
  overlapping elements, broken images, crushed tap targets.
- Findings reviewed by Hugh **before** any GitHub issues are opened; approved
  findings become labeled issues with screenshots, ready for another agent to
  pick up.
- Staging populated with prod-like data via one idempotent command — useful for
  the audit, manual testing, demos, and E2E depth.

## Non-Goals (deliberately excluded)

- **Theming/token drift checks** — theming is rock-solid; single-theme sweeps.
- **UX judgment** ("feels cramped", hierarchy, copy) — Hugh catches these
  manually; including them would flood the report with false positives.
- **Pixel-diff visual regression** — flags every intentional change; wrong tool
  for "is this broken?".
- **Prod runs** — staging + seeder IS the prod-like surface; no reason to point
  Playwright at prod beyond existing smoke tests.
- **CI/cron scheduling** — on-demand skill invocation only, until precision is
  proven over several runs.
- **Auto-filing without review** — report-first is locked. A future
  confidence-split mode (auto-file high-confidence overflow findings) may be
  revisited after calibration.

---

## Track 1 — Staging Seeder (`pnpm db:seed:staging`)

One idempotent command that makes staging prod-like. Two halves with different
data-safety rules.

### 1a. Prod → staging sync (public data)

Copies **non-personal, crawled/public data** from prod Neon to staging Neon:
events, venues, artists, event-artist links, prices (venue/vendor-sourced price
rows only — not user submissions).

- **Mechanism:** tsx script (`scripts/seed-staging/sync-prod-public-data.ts`)
  following the existing `scripts/` + `db:sync-local` patterns. Reads via
  `NEON_PROD_DIRECT`, writes via `NEON_STAGING_DIRECT` (both already exported
  in Hugh's shell).
- **Prod is read-only, structurally.** The script opens the prod connection
  with a client wrapper that only exposes `select`. The write path takes the
  staging connection explicitly. No code path can write to prod.
- **Idempotent:** upsert on natural keys (the same canonical keys the crawler's
  ON CONFLICT paths use — venue slug, event source hash / canonical identity).
  Re-running refreshes rather than duplicates.
- **Row scope:** events within a rolling window (past 30 days → all future) to
  keep staging light; all venues and artists referenced by those events.
- **FK order:** venues → artists → events → event-artists → prices, honoring
  the Drizzle schema graph.

### 1b. Synthetic user data

Generates user-shaped data attached to **staging Clerk test users** (~5 users,
listed in a checked-in fixture config with their staging Clerk IDs; the config
carries IDs only — no secrets).

Data generated, shaped to be layout-hostile on purpose:

| Table                                   | Shapes                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| watches / attendance                    | Mixes of few/many per user; past + future events                                                                                           |
| feedback                                | Long unbroken URLs in bodies, full mobile user-agent context blobs, unread/flagged/issue-opened/resolved mix, with and without admin notes |
| price submissions (+ confirms/disputes) | Pending counter cases, long venue/event names, edge amounts (free, $0.50, $999+)                                                           |
| user profiles                           | Long display names, missing avatars                                                                                                        |
| notifications                           | Read/unread mix                                                                                                                            |

- **Tagging:** every synthetic row is identifiable — user-owned rows via the
  reserved fixture Clerk IDs; any table without a user FK gets a reserved
  marker in an existing text field only if one exists naturally (no schema
  changes for tagging; if a table can't be tagged, it's keyed by fixture-user
  ownership transitively).
- **Idempotent:** re-run = delete all fixture-tagged rows, regenerate. Real
  staging data (Hugh's own manual accounts) is never touched.
- **Determinism:** seeded RNG so two runs produce the same shapes — audit runs
  are comparable over time.

### Env/infra notes

- No new env vars. Uses `NEON_PROD_DIRECT` / `NEON_STAGING_DIRECT` from the
  shell (never committed).
- Never run from CI (prod credentials stay local). Manual, local-only command.
- **Consequence:** with public-data sync in place, the paused staging crawler
  is permanently unnecessary — sync replaces its purpose. Its Render cron can
  be deleted in a follow-up (issue to be opened at implementation time).

### Guard rails

- Script refuses to run if `DATABASE_URL`-resolved host for the _write_ side
  matches the prod host (belt-and-braces against swapped env vars).
- Dry-run flag (`--dry-run`) prints row counts per table without writing.

---

## Track 2 — UI Audit Skill (`ui-audit`)

A user-level skill (`~/.claude/skills/ui-audit/`) orchestrating three stages:
sweep → vision triage → report/filing. The repo carries the manifest and the
sweep script; the skill carries the judgment and workflow.

### 2a. Route manifest (repo, `apps/e2e/src/audit/manifest.ts`)

One entry per auditable surface:

```ts
type AuditRoute = {
  id: string // "admin-feedback"
  path: string // "/admin/feedback"
  tags: ('consumer' | 'admin')[]
  auth: 'none' | 'user' | 'admin'
  interactions?: AuditInteraction[] // named steps executed before capture
}

type AuditInteraction = {
  id: string // "expand-first-card"
  description: string
  run: (page: Page) => Promise<void>
}
```

- Each interaction produces an **additional** capture state beyond the default
  page-load capture.
- The manifest is a maintained artifact. Follow-up convention (documented in
  the skill, added to CLAUDE.md when the audit proves itself): PRs that add a
  consumer/admin surface add a manifest entry in the same PR.

### 2b. Sweep engine (repo, `apps/e2e/src/audit/sweep.ts`)

Playwright script, run via `pnpm --filter e2e audit -- --tags admin`:

- **Targets:** staging URLs; reuses the existing `apps/e2e` auth setup for
  user/admin Clerk sessions.
- **Matrix:** selected routes × viewports **320×568, 390×844, 1440×900** ×
  capture states. Single theme (default). ~30 routes × 3 viewports × ~1.5
  states ≈ 130 screenshots full-sweep; tag-scoped runs are the everyday mode.
- **Capture:** full-page PNG per state into
  `apps/e2e/audit-output/<run-id>/<route>__<state>__<viewport>.png`
  (gitignored).
- **DOM heuristics** (hints for triage, not verdicts), written per-capture into
  `<same-name>.json`:
  - horizontal scroll present (`scrollWidth > clientWidth` on documentElement)
  - elements extending past viewport right edge
  - interactive elements with bounding box < 32×32 at mobile widths
  - images with naturalWidth 0 (broken)
- **Stability:** wait for network idle + fonts; disable animations via
  `prefers-reduced-motion` emulation to avoid mid-transition captures.

### 2c. Vision triage (skill)

The orchestrating Claude session reads each screenshot (multimodal) alongside
its heuristic JSON and judges against the locked bar — **pure UI breakage
only**:

- horizontal overflow / content cut off
- unreadable text wrapping (the CONTEXT-column failure class)
- overlapping/colliding elements
- broken or missing images
- tap targets crushed or off-screen at mobile widths

Each finding records: route, viewport, capture state, severity
(`balk` = user immediately notices / `degraded` = visibly wrong but usable),
screenshot reference, one-line description of what's broken and where.

**Dedupe:**

- within-run: same root cause across viewports/states = one finding, listing
  all affected combinations;
- cross-run: before reporting, fetch open GH issues labeled `ui-audit` and drop
  findings whose route + description substantially match an open issue.

**Subagent split:** screenshots are triaged by parallel subagents (batched per
tag/section) to protect orchestrator context; the orchestrator concatenates,
dedupes, and owns everything from report onward.

### 2d. Report → approval → filing

1. Findings land in `apps/e2e/audit-output/<run-id>/REPORT.md` (gitignored)
   with embedded relative screenshot links; the orchestrator presents a summary
   table in-chat.
2. **Hugh reviews** — strikes false positives, adjusts severities. Nothing is
   filed without his go-ahead (locked decision; auto-file is a future
   calibrated mode, not v1).
3. On "file": screenshots for approved findings are committed to a dedicated
   **orphan branch** `ui-audit-artifacts` (never merged; exists solely so
   `raw.githubusercontent.com` URLs resolve in issue bodies), then issues are
   opened via `gh` REST with:
   - title: `[ui-audit] <route> @ <viewport>: <one-liner>`
   - body: description, affected combinations, embedded screenshot, run id
   - labels: `type: bug`, `source: internal`, `phase: beta`,
     `priority: high` for `balk` / `priority: normal` for `degraded`, plus
     **`ui-audit`** (new label, created once) for cross-run dedupe.

### Failure handling

- Route fails to load / auth fails → recorded as a sweep error in the report
  (not a UI finding); sweep continues with remaining routes.
- Interaction step throws (selector drift) → capture the page as-is, flag the
  manifest entry as stale in the report so it gets fixed.
- Empty-state renders (seeder not run / data missing) → triage marks the
  capture `insufficient-data` rather than judging a blank page.

### Testing

- **Seeder:** Vitest unit tests for shape generators + tag/idempotency logic
  (mirroring `packages/db` seed tests and `scripts/*-helpers.ts` patterns);
  one integration assertion that re-running produces identical row counts.
  Prod-sync path tested against local Postgres with a fixture "prod" schema —
  never against real prod in tests.
- **Sweep engine:** heuristics unit-tested against crafted HTML fixtures
  (overflowing div, 0-width image, tiny button); manifest type-checked; a
  smoke assertion that a sweep of one known-good route produces a screenshot +
  JSON pair.
- **Skill:** verified per writing-skills discipline — scenario-tested with
  subagents before deployment (triage judgment on known-bad/known-good
  screenshots, report-before-file compliance).

---

## Build sequence

| PR  | Contents                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Seeder — prod→staging public-data sync (guard rails, dry-run, tests)                                              |
| 2   | Seeder — synthetic user data generators + fixture user config + tests                                             |
| 3   | Sweep engine — manifest schema, initial manifest (admin + consumer routes), sweep script, heuristics + tests      |
| 4   | Skill authoring (`~/.claude/skills/ui-audit/`, not a repo PR) + first calibration run + `ui-audit` label creation |

Each repo PR follows the standard bar: worktree, TDD, Copilot review cycle,
staging validation where applicable. PR 4's calibration run doubles as the
skill's acceptance test.

## Open items (resolved at implementation, not blockers)

- Exact staging Clerk test-user set (create via Clerk staging dashboard;
  fixture config records their IDs).
- Rolling-window size for event sync (start at past-30-days→future; tune).
- Whether `apps/e2e` audit script needs its own Playwright project entry in
  `playwright.config.ts` or a third config (decide in PR 3 against the
  existing config structure).
