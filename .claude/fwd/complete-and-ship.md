# Concert Crawl extension for complete-and-ship

- Worktrees live in `.worktrees/feat/<name>` (gitignored). Allowlist uses `pnpm`.
- Quality gate: `pnpm --filter <app> typecheck|lint|test` for each touched app.
- Step 2.5 example response type: `EventDetailResponse`.
- Step 5 env-var "Service" column: where the variable is set, from the service inventory in `docs/runbooks/production-launch.md`: the Vercel projects (web, staging and prod), the Render web services (API), or the Render cron jobs (crawlers).
- Step 5b copy inventory and grep:
  - `definitions/copy.ts` files (including `consumer/definitions/copy.ts`), `apps/web/src/lib/definitions/releases.ts`, email templates, push-notification strings, and `design/design_handoff_*` folders containing copy.
  - `COPY_PATHS='(^|/)definitions/copy\.ts$|(^|/)apps/web/src/lib/definitions/releases\.ts$|(^|/)emails?/|(^|/)design_handoff_[^/]+/'` (add the push-notification module path).
  - The `react/jsx-no-literals` lint rule (`apps/web/eslint.config.mjs`) forbids inline literals, so a clean lint satisfies the inline-string trigger.
  - Frozen: merged `releases.ts` entries are a historical record. Flag drift there, never edit. Price-region copy is editable like any other copy; update the string tests that assert it in the same PR, keeping their behavioural checks.
  - Why the gate exists: the 2026-08 copy audit was 191 findings, all of which entered through un-reviewed PRs.
- PR body: never include "Generated with Claude Code" or any AI attribution.
- Force-push only when the rebase rewrote commits (`feedback_force_push_only_when_needed`).
- Design follow-ups: label `type: design` (also `bug`/`polish` tickets that are design work); tracker `docs/superpowers/design-pipeline-status.md`.
