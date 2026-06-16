# Concert Crawl — Claude Context

A concert calendar application that crawls Denver venue websites daily to produce an accurate, filterable, searchable event listing. Private beta → public launch, with premium monetization and social features.

**This file exists so every Claude session starts with full context.** Read it before touching any code.

---

## What This Is

Concert Crawl aggregates live music events from Denver venue websites into a single searchable calendar. The core value is the data — if crawls fail or get blocked, the product has nothing to show. Crawl resilience is the highest-priority engineering concern.

**Key documents:**

- Original design spec: `docs/superpowers/specs/2026-04-23-denver-concert-calendar-design.md`
- **Beta-to-launch plan (current):** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
- DB rollback runbook: `docs/runbooks/db-rollback.md`

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/        # Next.js 14+ (App Router) — UI + admin
│   ├── api/        # Hono — REST API (/v1/...)
│   └── crawler/    # Playwright + Claude Haiku extraction (runs as two Render Cron Jobs: triggers every 10 min, daily at 3 AM MT)
├── packages/
│   ├── config/         # Shared ESLint, TypeScript, Tailwind configs
│   ├── crawler-core/   # Playwright + extraction logic (separated from API in PR #51)
│   ├── db/             # Drizzle ORM schema + migrations (shared)
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

| Decision           | Choice                                | Why                                                                                      |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| API style          | REST (not GraphQL)                    | One TS client; Zod + shared types gives equivalent type safety without resolver overhead |
| Auth provider      | Clerk                                 | Free tier, Next.js-native, supports Spotify OAuth without migration                      |
| Auth abstraction   | `packages/auth` utilities only        | Never import Clerk directly in app code — enables future provider swap                   |
| ORM                | Drizzle                               | TypeScript-native, parameterized queries, migration files are version-controlled         |
| Migration strategy | Expand/contract only                  | Never destructive schema changes in a single deploy                                      |
| Crawler extraction | Structured data first, LLM fallback   | JSON-LD is free and reliable; LLM only when needed                                       |
| Search             | Postgres full-text (`tsvector` + GIN) | Free, sufficient for this data volume; no external service                               |
| Timezones          | Store UTC, display Mountain Time      | All DB timestamps are UTC; conversion at API/display layer                               |
| Environments       | Local → Staging → Prod                | Staging is the canary; nothing reaches prod without staging validation                   |
| Component library  | shadcn/ui                             | Radix primitives (accessible), CSS variable theming, owned code                          |
| Styling            | Tailwind CSS                          | Responsive utilities, pairs with shadcn                                                  |
| Package manager    | pnpm                                  | Faster installs, disk-efficient, native workspace support                                |

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
- **All feature work must be done in a git worktree** — the primary repo directory (`/Users/huey/Projects/concert-crawl`) is reserved for the user's own use and testing. Worktrees live in `.worktrees/` at the project root (gitignored). Use `git worktree add .worktrees/<branch-name> -b <branch-name>` directly — do NOT use the `EnterWorktree` tool, which hardcodes `.claude/worktrees/` and cannot be configured.
- **⚠️ NEVER leave uncommitted files in the main repo directory** — this is a hard rule that is violated every session. The main repo (`/Users/huey/Projects/concert-crawl`) must always be clean (`git status` = nothing to commit). If you write or modify any file while working in a worktree, write it directly in the worktree path, not the main repo path. At the end of every session — and before any `git push` — run `git -C /Users/huey/Projects/concert-crawl status` and either commit stray changes to the appropriate worktree branch or restore them.

### Session handoff

Claude Code sessions are finite. To preserve continuity across sessions:

- Commit all in-progress work before ending a session — a fresh Claude reads the code, not the chat
- Leave a `## Next` section in `docs/superpowers/plans/` or update the relevant memory file with the immediate next step
- After significant changes, update `CLAUDE.md` (architecture decisions, new conventions) and memory files (`~/.claude/projects/*/memory/`) with anything non-obvious
- Optimize for cost-effectiveness: prefer smaller focused sessions over sprawling ones; use `/compact` when context grows large
- **When opening a PR** — add a 🔄 row to `docs/superpowers/progress.md` and commit the change as part of the branch
- **When starting a new session** — run `gh pr list --state merged --limit 10` and update `docs/superpowers/progress.md` before doing anything else

### Code

- **TypeScript strict mode** across all packages
- **Zod validation** at every Hono API endpoint — no raw input reaches the DB
- **No direct Clerk imports** outside `packages/auth`
- **All API routes** namespaced under `/v1/`
- **Drizzle only** for DB access — no raw SQL except in migration files
- **No single-character variable names** — ESLint enforces a minimum identifier length of 2. Use descriptive names (`err` not `e`, `idx` not `i`, `ctx` not `c`). This applies to all identifiers: variables, parameters, and destructured bindings.

### Testing

- Unit + integration tests: Vitest
- E2E tests: Playwright (runs against staging)
- Smoke tests: Playwright (runs against prod, hourly via GitHub Actions cron)
- **Branch protection:** all checks must pass before merge to `main`

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

**Workflows:**

- **Opening an issue:** `gh issue create --title "..." --label "type: feature,phase: pre-beta,priority: blocker,source: internal"` (always include one label from each prefix)
- **Linking a PR to an issue:** include `Closes #N` in the PR body — GitHub auto-closes the issue when the PR merges to `main`
- **When user says "open an issue for X":** create it with `gh issue create` using the correct labels; do not skip the label step

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
2. Microdata / schema.org markup — free, reliable
3. Claude Haiku LLM extraction — paid, flexible, handles unstructured pages
4. Manual admin entry — last resort for blocked/incompatible venues

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
