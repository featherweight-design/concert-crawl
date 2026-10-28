# Concert Crawl extension for epic-run

- UI sweep: `pnpm --filter @concert-crawl/e2e audit:sweep` (`uiSweep` in `.claude/fwd.json`).
- Lint backstop: `react/jsx-no-literals` in `apps/web/eslint.config.mjs` forbids inline literals, so a clean lint covers the "new string in a .tsx" trigger.
- complete-and-ship worktrees live in `.worktrees/feat/<name>` (gitignored).

## Moved from the generic epic-run skill (public-plugin scrub)

- Worktree setup: after `git worktree add .worktrees/<branch> -b <branch>`, copy `apps/web/.env.local`, `apps/api/.env.local` and `apps/crawler/.env.local` from the main checkout into the same paths in the worktree.
- Run checkpoint: the pickup memory `project_pickup_<epic>_run.md` is the checkpoint note. Kickoff reads CLAUDE.md → pickup memory → briefing → execution plan; update it after EVERY merged PR.
- Review wait: the original cadence was ScheduleWakeup 240–270s; superseded by pr-review's watcher (`pr-watch.mjs` via Monitor).
- Merge: rebase-merge, under the standing authorization of 2026-07-10. A merge done through the API can skip the staging deploy workflow (the "API-merge quirk"); verify it ran and dispatch staging manually if not. Production is promoted by a human after staging validation (`docs/runbooks/auto-deploy-prod.md`): never dispatch it, and report the staging result for that decision.
- Bookkeeping per PR (same branch, before merge): a `releases.ts` entry for user-facing PRs, a `progress.md` row for substantive PRs, and follow-ups collected as **Proposed intake** for the morning report (`backlog-audit` Step 5), filed as issues only with Hugh's sign-off.
- Design follow-ups: the label is `type: design`; the tracker is `docs/superpowers/design-pipeline-status.md`.
- Hosting: `render.yaml` is descriptive only (its header says editing it deploys nothing); provision crons/workers/queues/buckets/DBs through the Render or Neon MCP tools or the dashboard, in staging and prod.
- UI sweep capture: add the epic's routes to `apps/e2e/src/audit/manifest.ts` (surface-adding PRs do this in the same PR). The sweep writes a screenshot + overflow JSON per route × viewport under `audit-output/<runId>/`, supports `auth: 'user' | 'admin' | 'none'`, needs `E2E_AUDIT_USER_*` / `E2E_AUDIT_ADMIN_*`, and runs against staging only (`assert-not-prod` enforces it; it reads staging-seeded data).
- Headless admin auth exists: `apps/e2e/src/audit/audit-auth.ts` exports `prepareAuditAuth('admin')` (admin is behind Clerk). One epic wrongly reported a gate blocked on "no headless admin login" while thirteen admin routes already swept with it.
- Regression tests: project rule, hotfixes require tests. Route- or auth-shaped walk bugs get a `manifest.ts` route rather than a bespoke test.
- Locked customer-facing vocabulary lives in CLAUDE.md (and the copy-review binding); the cold-eyes critic gets it.
- Copy inventory and frozen areas for Gate 7: see `concert-crawl.copy-review.md` / `.claude/fwd/copy-review.md`.

### History behind the gates (figures from this app's audits)

- The gates were added 2026-07-31 after a forensic pass over three epics that leaked 23 post-merge UI/UX bugs past the old single design-review gate. Distribution: state reachability 6 · interaction/loading/flow 6 · visual fidelity 4 · copy 3 · cross-surface 2 · responsive 1 (as recorded this sums to 22 against the stated 23; the original never placed the 23rd). The dominant 12 were "matches the mock, never handed the props".
- Gate 3: five of the 23 were mechanical — a vendor list shipped to `CounterSubmitSheet` while `DisputeForm` kept a byte-identical copy; a nav tab mislabelled against `/history`. Three copy bugs were locked-vocabulary violations.
- Gate 4: the 4 visual-fidelity misses were mostly second-order regressions from sibling PRs, found by clicking through staging with real data.
- Gate 5 was added 2026-08-01 after two epics leaked 22 more bugs with Gates 1–4 in force. Canonical cases: the "I'm going!" button that looked inert (server-rendered, no optimistic path), and the #70 watching nudge keyed by `eventId` instead of `userEventId`, so unwatch → re-watch never brought it back.
- Gate 7: the 2026-08 full-codebase copy audit found 191 findings.
- Premise questions: one epic made the private-beta app publicly browsable the moment PR-H merged. #70 introduced "I'm going" separate from "watching" and shipped with no home for a user who is going but not watching (still open).
- Mid-run cold-eyes: one epic shipped all 8 PRs before a whole-vertical look, then the walk produced 15 bugs across 4 cleanup PRs, and the next produced 7 more. Expectation: ~15 morning findings become ~4. Redundant reassurance was 7 of the 22. A third of one run's Copilot rounds were stale.
- Defect classes, the escapes behind each row: 1 ReportSheet's Continue · 2 Landing hover arrow · 3 ModalShell inside a filter chip · 4 "Watching is free" shown on an _I'm going_ tap · 5 signed-out price submission · 6 `/changelog` · 7 Landing pager dots · 8 five strings, then two more · 9 Eye + "Watch this show" · 10 History export rail · 11 Supporter chip on `/history` · 12 "I'm going!" · 13 Watching nudge.
