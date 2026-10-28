# Concert Crawl — Claude Context

A concert calendar that crawls Denver venue websites daily into a filterable, searchable event listing. Private beta, heading to public launch with premium tiers and social features. The core value is the data: if crawls fail or get blocked, the product has nothing to show, so crawl resilience is the top engineering concern.

pnpm monorepo on Turborepo: `apps/web` (Next.js App Router, UI and admin), `apps/api` (Hono, REST under `/v1/`), `apps/crawler` (Playwright and Claude Haiku, two Render cron jobs), `apps/e2e` (Playwright against staging), and `packages/` (`db` Drizzle schema and migrations, `crawler-core`, `price-pipeline`, `entitlements`, `logger`, `types`, `config`). Local setup: `docker compose up -d`, `pnpm install`, copy each app's `.env.example` to `.env.local`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev` (web :3000, API :3001, Postgres :5433).

**Background, tables and reasons for everything below: `docs/agents/conventions.md`.**

## Key documents

- **Launch bar (authoritative):** `docs/superpowers/launch-bar.md`. **There is no launch date.** An item is launch-gating if and only if it appears there; the `phase: launch` label does not make it so. Never widen the bar without Hugh's sign-off.
- Original spec: `docs/superpowers/specs/2026-04-23-denver-concert-calendar-design.md`. The beta-to-launch plan (`specs/2026-05-09-beta-to-launch-design.md`) is historical: read it for tier and feature intent, not schedule.
- Design pipeline: `docs/superpowers/design-pipeline.md`. DB rollback: `docs/runbooks/db-rollback.md`.
- **Render config:** `render.yaml` plus `docs/runbooks/render-service-config.md`. Neither syncs to Render; the live config is edited in its dashboard. Update both in the same session you change a setting. A lapsed sync caused the 2026-08-31 prod outage.
- Production env vars (Vercel, Render, GitHub Actions): `docs/runbooks/production-launch.md`. Local vars: each app's `.env.example`.

## Architecture rules

- REST, not GraphQL. Clerk is imported directly; there is no `packages/auth` wrapper, so keep auth usage thin.
- Drizzle for DB access: no hand-built raw SQL strings (Drizzle's parameterized `sql` tag is fine). **Migrations are expand/contract only**: never a destructive schema change in a single deploy.
- Crawler extraction cascade: HTML fetch, then JSON-LD, then Claude Haiku. Search is Postgres full-text. Store UTC, display Mountain Time.
- **Environments:** merging to `main` deploys staging only. Prod is promoted by dispatching **Deploy to Production** with a reason, after staging-smoke and staging-e2e (`docs/runbooks/auto-deploy-prod.md`). Promotion is a human decision.
- Principles: human-in-the-loop; Zod at every API boundary and an audit of every admin action; mobile-first from 320px; LLM and infra costs tracked in-app; crawl ethics are existential.
- **`as` casts are a last resort.** Prefer declaration merging for library types you control, Zod `safeParse` at system boundaries, and type guards for unions.

## Crawl rules (non-negotiable)

- Check `robots.txt` before crawling; never override a disallow. User agent: `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)`.
- Minimum 3-second delay between requests plus jitter, enforced per venue crawl in `fetchPage`, **not** per hostname. Do not restore a per-domain claim on `/bot` without building the coordination to back it.
- Daily crawl at 3 AM MT. 3 consecutive failures pause the venue and notify admin; an account-wide LLM refusal is not a venue failure and does not count. A 403 or 429 flags the venue blocked immediately and notifies admin.

## Git and PRs

- Conventional commits; branches `feat/…` and `fix/…`. Never commit to `main` directly, never commit `.env` files, always open a PR for code changes, and never skip pre-commit hooks (`--no-verify`).
- **Reviews follow the `pr-review` skill**, plus this repo's `.claude/fwd/pr-review.md` (the standing pre-open review grant, `./scripts/request-copilot-review.sh`, the PR template). Run its gate rather than recalling the state.
- **All feature work in a worktree under `.worktrees/`** (`git worktree add .worktrees/<branch> -b <branch>`), never the `EnterWorktree` tool. **The main checkout (`/Users/huey/Projects/concert-crawl`) must always be clean**: check `git -C /Users/huey/Projects/concert-crawl status` before every push and at session end.
- **After a merge, prune only your own worktrees and test DBs:** `pnpm worktree:prune [--dry-run] <branch>...`. Never sweep other worktrees; `--all` is the user's.
- Read the part of a large file you need (`sed -n`, `grep -n`, `rg`, `offset`/`limit`); delegate whole-file reads to a subagent. This overrides the preference for dedicated file tools, for large files only.

## Code

- TypeScript strict everywhere. ESLint `id-length` minimum 2 (`err`, `ctx`), except `i j k x y z _`.
- **Release notes:** a PR shipping a meaningful user-facing feature MUST add an entry to `apps/web/src/lib/definitions/releases.ts`, plus its spotlight if `design/design_handoff_spotlight_heroes/` has one. Skip chores, bumps, docs, refactors and invisible fixes. Merged entries are never rewritten for style.
- **Motion** uses `--motion-fast|base|slow` and `--motion-ease` (`globals.css`); nothing new joins the old hand-rolled `@keyframes`. Reduced motion is a blanket guard.
- **Copy:** every change to a `definitions/copy.ts`, an email, push copy, `releases.ts`, or a handoff's strings goes through the `copy-review` skill. Strings live in copy files (lint enforces it); no em-dashes in copy (except a whole-string placeholder or a leading one such as the `— Hugh` sign-off; admin copy is exempt); a lint suppression always names its reason. Copy is a copy-writer call, not Design's: never send a handoff back over wording.
- **Locked vocabulary:** **Watching** (never Saved, Favorites, Following; the tab-3 container is "My shows"), **Concerts** (never History, Attending, Going; the code identifier stays `history` on purpose), **Submitted prices** (never Submissions, My prices), **Price check** (never Dispute, Contest, Challenge). There is no "Saved" concept.
- Design: a pre-2026-06-23 handoff needs a Readiness Review verdict before its plan PR; plans live in `docs/superpowers/plans/` and go through review before implementation.

## Testing

- Vitest (unit and integration), Playwright e2e against staging, hourly prod smoke. **CI owns the test gate**; don't add a pre-push hook that duplicates a CI job. Run `pnpm typecheck` and `pnpm lint` before pushing anyway.
- Integration tests use a per-worktree DB, `concert_crawl_test__<worktree>`, auto-created on first run (`DATABASE_URL_TEST` overrides).

## Issues: no new issue without Hugh's explicit sign-off

- A defect you can diagnose gets fixed now, with a regression test; a question the code settles gets decided now; a hypothetical isn't filed. Anything left is a one-line proposal to Hugh. In an autonomous run, list proposals under **Proposed intake** in the report; never file.
- Run `pnpm backlog:status` before filing anything. Caps: P2 40, P3 20. Both were breached as of 2026-08-08 (P2 57, P3 46); until an audit brings them under, treat every band as at cap, so a new issue names the one it displaces. Always one label from each of `type:`, `source:`, `phase:`, `priority:`. `Closes #N` in PR bodies.
- `gh issue close` and `gh issue comment` fail here (Projects-classic error): use `gh api` PATCH and POST, and post the reasoning before closing.

## What Claude must not touch

`.env.local` or any real secret; git operations that rewrite `main`; production migrations without explicit human approval; anything destructive without explicit confirmation.

## Sessions

- Commit WIP before ending a session; leave a `## Next` in the plan or a memory update. Compact after each committed task. Prettier formats on commit (Husky and lint-staged).
- At session start, run `gh pr list --state merged --limit 10` and sync `docs/superpowers/progress.md`. A substantive PR adds its ✅ row on its branch; small chores don't.
- Bug reports come through the Sentry feedback widget and suggestions through the in-app modal. Don't build upvoting, threading, status tracking or roadmaps.
