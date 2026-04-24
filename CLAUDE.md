# Concert Crawl — Claude Context

A concert calendar application that crawls Denver venue websites daily to produce an accurate, filterable, searchable event listing. Private beta → public launch, with premium monetization and social features.

**This file exists so every Claude session starts with full context.** Read it before touching any code.

---

## What This Is

Concert Crawl aggregates live music events from Denver venue websites into a single searchable calendar. The core value is the data — if crawls fail or get blocked, the product has nothing to show. Crawl resilience is the highest-priority engineering concern.

**Key documents:**

- Full design spec: `docs/superpowers/specs/2026-04-23-denver-concert-calendar-design.md`
- DB rollback runbook: `docs/runbooks/db-rollback.md` (to be written)

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/        # Next.js 14+ (App Router) — UI + admin
│   ├── api/        # Hono — REST API (/v1/...)
│   └── crawler/    # Playwright + Claude Haiku extraction
├── packages/
│   ├── db/         # Drizzle ORM schema + migrations (shared)
│   ├── types/      # Shared TypeScript types
│   └── config/     # Shared ESLint, TypeScript, Tailwind configs
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

---

## Conventions

### Git

- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- **Branch naming:** `feat/short-description`, `fix/short-description`
- **Never commit to `main` directly** — always via PR
- **Never commit `.env` files** — use `.env.example` with placeholder values only
- **Always open a PR for code changes** — never merge to main locally, never discard changes
- **Always use `.github/pull_request_template.md`** when opening a PR

### Session handoff

Claude Code sessions are finite. To preserve continuity across sessions:

- Commit all in-progress work before ending a session — a fresh Claude reads the code, not the chat
- Leave a `## Next` section in `docs/superpowers/plans/` or update the relevant memory file with the immediate next step
- After significant changes, update `CLAUDE.md` (architecture decisions, new conventions) and memory files (`~/.claude/projects/*/memory/`) with anything non-obvious
- Optimize for cost-effectiveness: prefer smaller focused sessions over sprawling ones; use `/compact` when context grows large

### Code

- **TypeScript strict mode** across all packages
- **Zod validation** at every Hono API endpoint — no raw input reaches the DB
- **No direct Clerk imports** outside `packages/auth`
- **All API routes** namespaced under `/v1/`
- **Drizzle only** for DB access — no raw SQL except in migration files

### Testing

- Unit + integration tests: Vitest
- E2E tests: Playwright (runs against staging)
- Smoke tests: Playwright (runs against prod, hourly via GitHub Actions cron)
- **Branch protection:** all checks must pass before merge to `main`

### Formatting

- Prettier handles formatting (enforced via Husky + lint-staged on commit)
- ESLint handles correctness
- Never skip pre-commit hooks (`--no-verify`)

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

## Role System

Three roles: `admin`, `sub_admin`, `user`

- Role is stored in **Clerk `publicMetadata`** (source of truth)
- `user_roles` DB table mirrors this for audit purposes + stores scoped `sub_admin` permissions
- Auth utilities: `getCurrentUser()`, `requireAuth()`, `requireRole()` — defined in `packages/auth`

---

## Crawl Architecture (Critical)

**Extraction priority:**

1. JSON-LD structured data (`<script type="application/ld+json">`) — free, reliable, no LLM cost
2. Microdata / schema.org markup — free, reliable
3. Claude Haiku LLM extraction — paid, flexible, handles unstructured pages
4. Manual admin entry — last resort for blocked/incompatible venues

**Non-negotiable crawl rules:**

- Always check `robots.txt` before crawling; never override a disallow
- Identify with honest user agent: `ConcertCrawl/1.0 (+https://concertcrawl.com/bot)`
- Minimum 3-second delay between requests per domain (configurable per venue)
- Schedule daily crawl at 3 AM MT (off-peak)
- 3 consecutive failures → pause venue + notify admin via in-app notification
- 403/429 response → immediately flag as blocked + admin notification

---

## Environment Variables

Each app has a `.env.example` at its root. Required variables:

**`apps/api`**

- `DATABASE_URL` — Postgres connection string
- `CLERK_SECRET_KEY` — from Clerk dashboard
- `ANTHROPIC_API_KEY` — for LLM extraction
- `STRIPE_SECRET_KEY` — Stripe payments
- `RESEND_API_KEY` — email delivery
- `SENTRY_DSN` — error tracking

**`apps/web`**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` — points to `apps/api`
- `SENTRY_DSN`

**`apps/crawler`**

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `SENTRY_DSN`

---

## Beta Feedback Strategy

Two channels, deliberately minimal:

- **Bug reports:** Sentry User Feedback widget (rich session context, no custom code needed)
- **Suggestions/praise:** In-app modal → `feedback` table → admin UI (rate-limited, auth-only)

Do not build upvoting, threading, status tracking, or public roadmaps. The list is small enough to read manually during private beta.

---

## Session Management

Claude Code sessions have a rolling token budget. Long debugging sessions burn it fast. Follow these rules to stay efficient.

### Automated warning

A `UserPromptSubmit` hook in `.claude/settings.json` counts assistant turns in the session transcript and injects warnings at:

- **20 turns** — suggest `/compact` if switching tasks or after heavy debugging
- **35 turns** — require `/compact` or recommend starting a fresh session

### When to suggest `/compact`

Proactively suggest it when:

- The user finishes a discrete task and is about to start something different
- A debugging sequence just resolved (drizzle-kit, port conflicts, CI failures, etc.)
- The user asks about a new file or feature that hasn't come up yet in this session

### When to recommend a fresh session

- Starting a new phase of work (Phase 2, Phase 3, etc.)
- Switching from implementation to planning/brainstorming
- The conversation has been compacted more than once

### Context is always recoverable

Nothing important lives only in conversation history:

- **CLAUDE.md** — architecture, conventions, what Claude can/cannot touch
- **Committed code** — all implementation decisions are in git
- **`docs/superpowers/`** — design specs and implementation plans
- **Memory files** — `~/.claude/projects/*/memory/` persists user preferences across sessions

Always commit work-in-progress before ending a session so a fresh Claude starts with full context from the files, not from conversation history.

---

## Current Status

Phase: **Phase 1 complete — Phase 2 (venue management) ready to begin**

- Phase 1 merged: `feat/phase-1-foundation` — CI in progress
- Phase 2 plan written: `docs/superpowers/plans/2026-04-23-phase-2-venue-management.md`
- Domain purchase pending: `concertcrawl.com` via Cloudflare Registrar

See the phased development plan in the design spec for the full roadmap (Phases 1–7).
