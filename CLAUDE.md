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
- **All feature work must be done in a git worktree** — the primary repo directory (`/Users/huey/Projects/concert-crawl`) is reserved for the user's own use and testing. Use `git worktree add` to create an isolated workspace before starting any implementation. The `superpowers:using-git-worktrees` skill governs this.

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

## RBAC Model

Three roles: `admin`, `sub_admin`, `user` (ordered lowest → highest in `ROLE_HIERARCHY`).

### Source of truth

Clerk `publicMetadata.role` is the authoritative source. The `user_roles` DB table mirrors it for audit purposes only — it is not read for authorization decisions.

### Two paths for reading the role

| Context                         | How                                 | When to use                                                                                                                  |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Web server components / actions | `currentUser().publicMetadata.role` | Live Clerk API call — always reflects the current role. Use for page-level access gates (`requireAdminUser`, `requireRole`). |
| API middleware                  | `sessionClaims.metadata.role`       | Reads from the JWT snapshot — fast, no extra API call. Use in `requireRole` middleware on Hono routes.                       |

**Trade-off:** If a role is changed in Clerk, the web sees it immediately. The API will not see it until the user signs out and back in (JWT is reissued). This is acceptable — role changes are rare and the user can be asked to re-authenticate.

### JWT template

The Clerk dashboard session token template must include:

```json
{ "metadata": "{{user.public_metadata}}" }
```

This populates `sessionClaims.metadata` in the JWT. Without it, the API's `requireRole` middleware always fails with 403.

### TypeScript augmentation

`apps/web/src/types/clerk.d.ts` augments two Clerk interfaces:

- `CustomJwtSessionClaims` — types `sessionClaims.metadata.role` as `Role | undefined`
- `UserPublicMetadata` — types `user.publicMetadata.role` as `Role | undefined`

Both eliminate the need to cast. Never cast `publicMetadata` or `sessionClaims` to `Record<string, unknown>`.

### Role provisioning

- **Now (pre-Phase 3):** Set roles manually in the Clerk dashboard → User → Public Metadata: `{ "role": "admin" }`. User must sign out and back in after any change.
- **Phase 3+:** Admin UI at `/admin/users` will call `PATCH /v1/admin/users/:userId/role`, which calls the Clerk Management API (`clerkClient.users.updateUserMetadata`) and writes an audit row to `user_roles` with `granted_by`. Role changes require admin privileges and are always logged.

---

## Current Status

Phase: **Phase 6 complete — Price Transparency in review (PR #32); Phase 7 (Automation + Scheduling) next**

- Phase 6a complete (PR #26 merged 2026-05-07): pino + Sentry SDK across all three apps
- Phase 6b complete (PR #28 merged 2026-05-07): Vitest integration tests for `apps/api` (20 tests, real Postgres)
- Phase 6c complete (PR #29 merged 2026-05-07): Playwright `apps/e2e` package — staging E2E suite + prod smoke cron (every 6h, `SMOKE_ENABLED=false` until launch)
- Price transparency spec merged (PR #30): `docs/superpowers/specs/2026-05-06-price-transparency-design.md`
- Price transparency implementation open (PR #32, 2026-05-07): 6-tier pipeline, community submissions, admin dashboard — pending merge
- Domain: `concertcrawl.app` via Cloudflare Registrar (~$15/yr)

### Revised Phase Sequence

| Phase | Name                                 | Status                                   |
| ----- | ------------------------------------ | ---------------------------------------- |
| 1     | Foundation                           | ✅ Complete                              |
| 2     | Venue Management (Admin)             | ✅ Complete                              |
| 3     | Crawler v1                           | ✅ Complete                              |
| 4     | Design System / Theming Architecture | ✅ Complete                              |
| 5     | Consumer Calendar UI (functional)    | ✅ Complete                              |
| 5b    | Consumer UI Design Polish            | ✅ Complete (PRs #22–24)                 |
| 6a    | Observability SDK                    | ✅ Complete (PR #26)                     |
| 6b    | Integration Tests                    | ✅ Complete (PR #28)                     |
| 6c    | E2E + Smoke Tests                    | ✅ Complete (PR #29)                     |
| 7     | Automation + Scheduling              | —                                        |
| 8     | Beta Launch Prep                     | —                                        |
| —     | Price Transparency                   | PR #32 open (2026-05-07) — pending merge |

See the phased development plan in the design spec for the full roadmap (Phases 1–7).

### Keeping this section current

**Update this section whenever:**

- A PR is merged — mark the corresponding phase/sub-phase complete with the PR number and merge date
- A new phase or sub-phase begins — add a row to the table and update the summary line at the top
- A plan file is created — link it in the relevant row's notes

This keeps any future Claude session (or human) immediately oriented without needing to run `gh pr list`.
