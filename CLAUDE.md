# Concert Crawl — Claude Context

A concert calendar application that crawls Denver venue websites daily to produce an accurate, filterable, searchable event listing. Private beta → public launch, with premium monetization and social features.

**This file exists so every Claude session starts with full context.** Read it before touching any code.

---

## What This Is

Concert Crawl aggregates live music events from Denver venue websites into a single searchable calendar. The core value is the data — if crawls fail or get blocked, the product has nothing to show. Crawl resilience is the highest-priority engineering concern.

**Key documents:**

- Original design spec: `docs/superpowers/specs/2026-04-23-denver-concert-calendar-design.md`
- **🚩 Launch bar (authoritative):** `docs/superpowers/launch-bar.md` — the four gates that decide when we launch. **There is no launch date.** An item is launch-gating if and only if it appears there; the `phase: launch` label does not make it so. Never widen the bar without Hugh's sign-off.
- **Beta-to-launch plan (historical):** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md` — its Aug 18–22 window is superseded by the launch bar; read it for tier/feature intent, not for schedule
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md` — two-track design pipeline (Track 1: build pending, gated by Readiness Review; Track 2: needs design, workshopped before handoff)
- DB rollback runbook: `docs/runbooks/db-rollback.md`

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/        # Next.js 14+ (App Router) — UI + admin
│   ├── api/        # Hono — REST API (/v1/...)
│   ├── crawler/    # Playwright + Claude Haiku extraction (runs as two Render Cron Jobs: triggers every 10 min, daily at 3 AM MT)
│   └── e2e/        # Playwright end-to-end tests (runs against staging)
├── packages/
│   ├── config/         # Shared ESLint, TypeScript, Tailwind configs
│   ├── crawler-core/   # Playwright + extraction logic (separated from API in PR #51)
│   ├── db/             # Drizzle ORM schema + migrations (shared)
│   ├── entitlements/   # Subscription tier / entitlement logic
│   ├── logger/         # Shared Pino logger
│   ├── price-pipeline/ # Price fetch + submission pipeline (extracted from packages/crawler-core in PR #51)
│   └── types/          # Shared TypeScript types
├── docs/
│   ├── superpowers/specs/  # Design specs
│   └── runbooks/           # Operational playbooks
├── docker-compose.yml      # Local Postgres (+ future Redis)
└── CLAUDE.md               # This file
```

**Package manager:** pnpm (not npm, not yarn)
**Monorepo orchestration:** Turborepo

---

## Running Locally

Prerequisites: Docker Desktop, pnpm (`npm install -g pnpm`)

```bash
# 1. Start local services
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up environment (copy and fill in dev values)
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/crawler/.env.example apps/crawler/.env.local

# 4. Run migrations + seed local DB
pnpm db:migrate
pnpm db:seed

# 5. Start all apps
pnpm dev
```

Local services:

- Web: http://localhost:3000
- API: http://localhost:3001
- Postgres: localhost:5432

---

## Architecture Decisions

These were made deliberately — understand them before proposing changes.

| Decision           | Choice                                | Why                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API style          | REST (not GraphQL)                    | One TS client; Zod + shared types gives equivalent type safety without resolver overhead                                                                                                                                                                                         |
| Auth provider      | Clerk                                 | Free tier, Next.js-native, supports Spotify OAuth without migration                                                                                                                                                                                                              |
| Auth usage         | Clerk imported directly               | A `packages/auth` wrapper was originally planned but never built; Clerk is imported directly across `apps/web` and `apps/api`. A future provider swap would require introducing that abstraction first.                                                                          |
| ORM                | Drizzle                               | TypeScript-native, parameterized queries, migration files are version-controlled                                                                                                                                                                                                 |
| Migration strategy | Expand/contract only                  | Never destructive schema changes in a single deploy                                                                                                                                                                                                                              |
| Crawler extraction | Structured data first, LLM fallback   | Cascade is HTML fetch → JSON-LD → Claude Haiku LLM. JSON-LD is free and reliable; LLM only when needed                                                                                                                                                                           |
| Search             | Postgres full-text (`tsvector` + GIN) | Free, sufficient for this data volume; no external service                                                                                                                                                                                                                       |
| Timezones          | Store UTC, display Mountain Time      | All DB timestamps are UTC; conversion at API/display layer                                                                                                                                                                                                                       |
| Environments       | Local → Staging ∥ Prod                | Staging and prod auto-deploy in parallel from `main` (#786); CI on the PR is the pre-merge gate. Staging is a parallel canary, not a pre-prod gate. Prod has post-deploy smoke + auto-rollback. If we ever scale past solo, look at GitHub merge queue for a true pre-prod gate. |
| Component library  | shadcn/ui                             | Radix primitives (accessible), CSS variable theming, owned code                                                                                                                                                                                                                  |
| Styling            | Tailwind CSS                          | Responsive utilities, pairs with shadcn                                                                                                                                                                                                                                          |
| Package manager    | pnpm                                  | Faster installs, disk-efficient, native workspace support                                                                                                                                                                                                                        |

---

## Guiding Principles

1. **Human-in-the-loop** — automated systems surface data; humans approve and refine it
2. **Security by default** — Zod validation at every API boundary; audit every admin action
3. **Mobile-first** — 320px baseline, expand up; PWA-ready
4. **Cost-conscious** — all LLM and infrastructure costs tracked in-app and visible to admin
5. **Crawl ethics are existential** — respect robots.txt, rate limit, identify honestly; without venue data the product is nothing
6. **Type safety is the first line of defence** — `as` casts are a last resort. They silence the compiler without verifying anything at runtime, and bugs they hide are hard to find. Prefer: (a) interface/declaration merging for library types you control (e.g. `CustomJwtSessionClaims`, `UserPublicMetadata`), (b) Zod `safeParse` for data crossing a system boundary (JWTs, API responses, env vars), (c) type guards for discriminated union narrowing. If a cast feels necessary, stop and find the right augmentation or validator instead.

---

## Conventions

### Git

- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- **Branch naming:** `feat/short-description`, `fix/short-description`
- **Never commit to `main` directly** — always via PR
- **Never commit `.env` files** — use `.env.example` with placeholder values only
- **Always open a PR for code changes** — never merge to main locally, never discard changes
- **Always use `.github/pull_request_template.md`** when opening a PR
- **Copilot review** — the canonical review policy (request mechanism, merge bar, triage, cadence) lives in `~/.claude/CLAUDE.md` (user scope). Project specifics: Copilot does NOT auto-review — run `./scripts/request-copilot-review.sh <pr-number>` after opening a PR and after every fix push (the script hardcodes the `copilot-pull-request-reviewer[bot]` login and fails loudly if the attach doesn't take; do NOT hand-write the `requested_reviewers` call with `"Copilot"`, which returns HTTP 200 but silently attaches nothing).
- **All feature work must be done in a git worktree** — the primary repo directory (`/Users/huey/Projects/concert-crawl`) is reserved for the user's own use and testing. Worktrees live in `.worktrees/` at the project root (gitignored). Use `git worktree add .worktrees/<branch-name> -b <branch-name>` directly — do NOT use the `EnterWorktree` tool, which hardcodes `.claude/worktrees/` and cannot be configured.
- **⚠️ NEVER leave uncommitted files in the main repo directory** — this is a hard rule that is violated every session. The main repo (`/Users/huey/Projects/concert-crawl`) must always be clean (`git status` = nothing to commit). If you write or modify any file while working in a worktree, write it directly in the worktree path, not the main repo path. At the end of every session — and before any `git push` — run `git -C /Users/huey/Projects/concert-crawl status` and either commit stray changes to the appropriate worktree branch or restore them.
- **⚠️ Prune your own worktrees + test DBs after every merge** — once a PR merges, run `pnpm worktree:prune <branch>...` with the branch(es) **this session** worked on to remove those worktrees (if PR-less) and drop orphaned `concert_crawl_test__*` databases. This is a required cleanup step; skipping it is why 180+ stale worktrees accumulated. Preview first with `pnpm worktree:prune --dry-run <branch>...` — it never removes an open-PR worktree or the base `concert_crawl_test` DB. **Never sweep other PR-less worktrees** — they may belong to concurrent agent sessions; the full sweep (`pnpm worktree:prune --all`) is reserved for the user.

### Session handoff

Claude Code sessions are finite. To preserve continuity across sessions:

- Commit all in-progress work before ending a session — a fresh Claude reads the code, not the chat
- Leave a `## Next` section in `docs/superpowers/plans/` or update the relevant memory file with the immediate next step
- After significant changes, update `CLAUDE.md` (architecture decisions, new conventions) and memory files (`~/.claude/projects/*/memory/`) with anything non-obvious
- Optimize for cost-effectiveness: prefer smaller focused sessions over sprawling ones; use `/compact` when context grows large
- **When opening a PR for a substantive change** — add a ✅ Complete row to `docs/superpowers/progress.md` with today's date as the merge date, and commit the change as part of the branch. progress.md is a high-level phase tracker, not a per-PR log — only land a row when the PR delivers a meaningful feature, a major bug fix, or a phase milestone. Skip the row for small chores, copy edits, dependency bumps, doc tweaks, runbook nudges, hand-off drops, and similar low-impact changes. Use judgment: if the row would meaningfully add to a session-start "what's the state of the project" read, include it. Otherwise leave it off — concurrent PR insertions in the same file area otherwise create needless merge conflicts. Open-then-merge is the assumed flow when a row is added; if such a PR ends up closed without merging, the row is removed as part of cleanup.
- **When starting a new session** — run `gh pr list --state merged --limit 10` and update `docs/superpowers/progress.md` before doing anything else

### Code

- **TypeScript strict mode** across all packages
- **Zod validation** at every Hono API endpoint — no raw input reaches the DB
- **Clerk is imported directly** — there is no `packages/auth` wrapper (see Architecture Decisions). Keep auth usage thin so a future abstraction stays feasible
- **All API routes** namespaced under `/v1/`
- **Drizzle for DB access** — no hand-built raw SQL strings; Drizzle's parameterized `sql` template tag is fine and used in non-migration code (seeds, crawler queries)
- **Descriptive identifiers** — ESLint `id-length` enforces a 2-char minimum (`err` not `e`, `ctx` not `c`) but permits `i`, `j`, `k`, `x`, `y`, `z`, and `_`. Applies to variables, parameters, and destructured bindings.
- **Release notes on user-facing PRs** — any PR shipping a meaningful user-facing feature MUST add an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch. Mirror the `progress.md` substantive-only rule: skip chores, dep bumps, doc tweaks, refactors, and customer-invisible bug fixes. For features with spotlight assets in `design/design_handoff_spotlight_heroes/`, wire up the spotlight as part of the entry. See `docs/superpowers/design-pipeline.md`.
- **Copy edits go through the `copy-review` skill** — any change to a `definitions/copy.ts`, an email template, push copy, `releases.ts`, or a design handoff containing copy. The skill (`~/.claude/skills/copy-review/SKILL.md`, user scope) carries the weight-class model, the length caps, the no-em-dash rule, and the locked vocabulary. A full-codebase audit of ~1,728 strings lives in `docs/superpowers/copy-audit/` — start at `00-README.md`.

#### How copy quality is enforced

Three layers, mechanical first. The 2026-08 audit found 191 issues in ~1,728 strings; roughly 290 of the ~340 strings it eventually touched fell into two classes a machine can detect, which is why the first layer exists at all.

| Layer                                    | What it catches                                                                                                    | Where                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **1. Lint (build-blocking)**             | Strings living in a `.tsx` instead of a `definitions/copy.ts`; em-dashes in copy files; banned vocabulary synonyms | `apps/web/eslint.config.mjs` — `react/jsx-no-literals` + two `no-restricted-syntax` blocks |
| **2. `copy-review` skill (pre-PR gate)** | Voice, length, redundancy, weight class, adjacency — everything that needs judgment                                | Run before `gh pr create`; wired in as `complete-and-ship` Step 5b and `epic-run` Gate 7   |
| **3. Periodic audit**                    | Cross-surface drift that only shows up in aggregate                                                                | `docs/superpowers/copy-audit/` — no fixed cadence now that 1 and 2 exist                   |

The lint decides _where_ a string lives; the skill decides _what it says_. Neither substitutes for the other.

**Scope and exemptions.** Admin copy is excluded from all three (CLAUDE.md already allows ad-hoc admin UI, and it has no copy-review bar). Release-note hero illustrations are artwork, not copy. Punctuation and icon glyphs are allowlisted. An em-dash is legal when it is the whole string (the empty-data placeholder) or leads it (the `— Hugh` sign-off, the `— end of log —` divider).

**Suppressing a rule requires a reason.** The eight surviving em-dashes carry an `eslint-disable-next-line` naming why: the 2026-08 audit recorded each fix without applying it, on the since-retired belief that Design owned the change. Copy is a copy-writer call (see below), so those eight are now in scope for a normal copy-review pass rather than parked. Never add a bare disable — a suppression with no reason is indistinguishable from a mistake later. Already-merged `releases.ts` entries are a frozen historical record and are never rewritten for style.

### Design pipeline

All design work — both new design tickets and the build of existing handoffs — follows the structured two-track pipeline documented at `docs/superpowers/design-pipeline.md`. Key gates:

- **Pre-existing handoffs** (merged before 2026-06-23) require a Design Readiness Review (verdict in `design/design_handoff_X/READINESS.md`) before opening a plan PR
- **New design tickets** (Track 2) use the handoff prompt template — objective problem + app context + technical requirements, design decisions left to Design
- **Plan PRs** live in `docs/superpowers/plans/` and go through the Copilot review loop (see the canonical merge bar in `~/.claude/CLAUDE.md`) before implementation
- **Copy is a copy-writer call, not a Design call** — Design owns layout, hierarchy, and which states exist; it does not own the words. Route every copy change to the `copy-review` skill, and give a handoff's strings a copy-review pass **before** implementing them, applying findings in place. Never send a handoff back to Design over wording, and never call a string design-locked as grounds for leaving it wrong. See design-pipeline.md § "Who owns copy"

#### Customer-facing vocabulary (locked)

Use these exact terms in UI copy, and don't invent synonyms — drift here has already produced one wrong design round.

| Term                 | Means                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Never call it                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Watching**         | The only show-tracking concept, on mobile and desktop. Still the name of the list and its sub-tab — but the bottom-nav tab-3 _container_ is labelled **"My shows"**, since it now holds Watching and Concerts (per the #70 handoff README §3, which introduced it to avoid a Watching > Watching > History redundancy). Nothing renames Watching.                                                                                                                         | "Saved", "Favorites", "Following" |
| **Concerts**         | The nights you tapped "I'm going!" on, split into **Upcoming** and **Past** sections (#1357). It is the second "My shows" sub-tab. ⚠️ The code identifier is `history` everywhere and stays that way on purpose: the route (`/history`), the API path (`/v1/history`), the entitlement key (`concert-history`), `HISTORY_COPY` and the `.ics` filename all carry it. Only what the customer reads says "Concerts" — do not "helpfully" rename the key to match the label. | "History", "Attending", "Going"   |
| **Submitted prices** | A user's own price submissions and their review status.                                                                                                                                                                                                                                                                                                                                                                                                                   | "Submissions", "My prices"        |
| **Price check**      | The admin review of a submitted/disputed price. Neutral by design — a price update, not a callout.                                                                                                                                                                                                                                                                                                                                                                        | "Dispute", "Contest", "Challenge" |

There is no "Saved" concept in this product.

### Testing

- Unit + integration tests: Vitest
- E2E tests: Playwright (runs against staging)
- Smoke tests: Playwright (runs against prod, hourly via GitHub Actions cron)
- **Branch protection:** all checks must pass before merge to `main`
- **CI owns the test gate.** There is no `pre-push` hook — `.github/workflows/ci.yml` runs typecheck, lint, unit tests, build, and integration tests on every PR, and branch protection blocks merge until they pass. Don't reintroduce a hook that duplicates a CI job. Running `pnpm typecheck` / `pnpm lint` locally before pushing is still worthwhile (seconds, and it saves a CI round-trip), but it's discipline, not enforcement.
- **Per-worktree test DBs** — integration tests run against `concert_crawl_test__<worktree>` (derived from the worktree directory; the main repo uses plain `concert_crawl_test`). `apps/api/src/test/setup/global-setup.ts` auto-creates and migrates it on first run. Set `DATABASE_URL_TEST` to override (CI does this per job). This isolates concurrent worktrees so parallel runs never truncate each other's data.

### Formatting

- Prettier handles formatting (enforced via Husky + lint-staged on commit)
- ESLint handles correctness
- Never skip pre-commit hooks (`--no-verify`)

### Issue Tracking

Issues live in GitHub Issues (repo: `HartiganHM/concert-crawl`). The board is a GitHub Projects v2 named **Concert Crawl**.

**Label taxonomy:**

| Prefix      | Values                              | Purpose            |
| ----------- | ----------------------------------- | ------------------ |
| `type:`     | `bug`, `feature`, `polish`, `chore` | What kind of work  |
| `source:`   | `beta-feedback`, `internal`         | Where it came from |
| `phase:`    | `pre-beta`, `beta`, `launch`        | When it ships      |
| `priority:` | `blocker`, `high`, `normal`         | Relative urgency   |

**⛔ Standing intake rule — no new issue is opened without Hugh's explicit sign-off.**

The backlog reached 148 open issues, 131 with zero comments and 45 older than 60 days. An issue
filed is not a problem solved. Four layers gate intake; an item must survive all four:

1. **Fix it now** — a diagnosable, fixable defect gets fixed this session with a regression test. Prod-affecting and gate-retiring defects are never follow-ups.
2. **Decide it now** — if reading the code settles the question, make the call and record it in the artifact.
3. **Don't file the hypothetical** — an observed failure or user-visible bug is fileable; a speculative state combination is a one-line question in chat.
4. **Ask before filing** — anything surviving 1–3 is a _proposal_, not an issue. Ask as a one-line question; batch them, never a bulk-approve doc.

The only exception is Hugh saying "open an issue for X." During autonomous runs, collect
proposals under **Proposed intake** in the morning report and file only what comes back approved.

**Ceilings.** P2 caps at 40 open issues, P3 at 20. At cap the backlog is zero-sum — a new issue
must name the one it displaces. P3 items untouched for 90 days are proposed for closure at the
next audit. The `backlog-audit` skill (user scope) carries the full Scrum Leader persona and runs
monthly, or whenever open issues exceed the sum of the ceilings. Ledgers land in
`docs/superpowers/backlog/`.

**Both ceilings are currently breached** (P2 57/40, P3 46/20 as of 2026-08-08). Until an audit
brings them under, treat every band as at cap: filing anything means naming what it displaces.

**⚠️ The failure mode this exists to stop is agent-filed "deferred" tickets.** The backlog did not
grow because Hugh filed too much — it grew because agents mid-epic hit something out of scope and
quietly opened an issue for it. That is invisible to Hugh at the moment it happens and only
surfaces months later as a graveyard. So:

- **Run `pnpm backlog:status` before filing anything.** It prints open counts per band against the
  caps. If you are about to file without having run it, you are the failure mode.
- A deferral discovered mid-task is a **line in your final report**, not a `gh issue create`. Layer
  1 (fix it now) and layer 2 (decide it now) resolve the large majority of them.
- Never file during an autonomous run. Collect under **Proposed intake** and let Hugh choose.

**Workflows:**

- **Opening an issue:** only after sign-off — `gh issue create --title "..." --label "type: feature,phase: pre-beta,priority: blocker,source: internal"` (always include one label from each prefix)
- **Linking a PR to an issue:** include `Closes #N` in the PR body — GitHub auto-closes the issue when the PR merges to `main`
- **When user says "open an issue for X":** create it with `gh issue create` using the correct labels; do not skip the label step
- **Closing or commenting on an issue:** `gh issue close` / `gh issue comment` fail here (Projects-classic error). Use `gh api -X PATCH repos/HartiganHM/concert-crawl/issues/N -f state=closed -f state_reason=not_planned` and `gh api -X POST .../issues/N/comments -f body=...`. Post the reasoning _before_ closing — a silent close is indistinguishable from a mistake later.

---

## What Claude Can Own

- All application code (API routes, React components, crawler logic)
- Drizzle schema, migrations, seed scripts
- GitHub Actions workflow files
- Configuration files (turbo.json, tsconfig.json, docker-compose.yml, etc.)
- Dockerfiles
- Test suites
- `.env.example` files (descriptions only, never real values)
- Documentation and runbooks

## What Claude Must NOT Touch

- `.env.local` files or any file containing real secrets
- Git operations that affect `main` directly (force push, reset)
- Production database migrations without explicit human approval
- Any destructive operation without explicit user confirmation

---

## Crawl Architecture (Critical)

**Extraction priority:**

1. JSON-LD structured data (`<script type="application/ld+json">`) — free, reliable, no LLM cost
2. Claude Haiku LLM extraction — paid, flexible, handles unstructured pages
3. Manual admin entry — last resort for blocked/incompatible venues

(A per-venue `crawlWaitForSelector` is supported for render timing before extraction — it is not a per-venue scraping selector.)

**Non-negotiable crawl rules:**

- Always check `robots.txt` before crawling; never override a disallow
- Identify with honest user agent: `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)`
- Minimum 3-second delay between requests per domain (configurable per venue)
- Schedule daily crawl at 3 AM MT (off-peak)
- 3 consecutive failures → pause venue + notify admin via in-app notification
- 403/429 response → immediately flag as blocked + admin notification

---

## Environment Variables

Each app has a `.env.example` at its root — see those for local dev vars. Full production variable tables — Vercel web project (Step 6), Render API + crawler crons (Step 8), and GitHub Actions secrets (Step 9) — are in `docs/runbooks/production-launch.md`.

---

## Beta Feedback Strategy

Two channels, deliberately minimal:

- **Bug reports:** Sentry User Feedback widget (rich session context, no custom code needed)
- **Suggestions/praise:** In-app modal → `feedback` table → admin UI (rate-limited, auth-only)

Do not build upvoting, threading, status tracking, or public roadmaps. The list is small enough to read manually during private beta.

---

## Session Management

- Hooks warn at 20 turns (suggest `/compact`) and 35 turns (require `/compact` or fresh session)
- Compact after each committed task, not just at the warning threshold
- Commit all WIP before ending a session — a fresh Claude reads code and files, not chat history
- Context is always recoverable: CLAUDE.md, git log, `docs/superpowers/`, and memory files

---

## Current Status

Phase: **Prod stack live on Vercel + Neon + Render — beta open Jun 16, 2026**

Phase sequence and recent PR history: `docs/superpowers/progress.md` — update it whenever a PR merges or a new phase begins. At the start of every session run `gh pr list --state merged --limit 10` and sync it before doing any other work.
