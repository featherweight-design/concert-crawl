# Concert Crawl — Claude Context

A concert calendar application that crawls Denver venue websites daily to produce an accurate, filterable, searchable event listing. Private beta → public launch, with premium monetization and social features.

**This file exists so every Claude session starts with full context.** Read it before touching any code.

---

## What This Is

Concert Crawl aggregates live music events from Denver venue websites into a single searchable calendar. The core value is the data — if crawls fail or get blocked, the product has nothing to show. Crawl resilience is the highest-priority engineering concern.

**Key documents:**

- Original design spec: `docs/superpowers/specs/2026-04-23-denver-concert-calendar-design.md`
- **Beta-to-launch plan (current):** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
- DB rollback runbook: `docs/runbooks/db-rollback.md` (to be written)

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
- **When opening a PR** — update the Phase Sequence table and Current Status bullet list in this file to reflect the new work, then commit the CLAUDE.md change as part of the branch
- **When starting a new session** — run `gh pr list --state merged --limit 10` to check for merges since the last CLAUDE.md update; if any are unrecorded, update Current Status and the Phase Sequence table before doing anything else

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
- Identify with honest user agent: `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)`
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

Phase: **Pre-Beta Sprint — target open May 25, 2026**

- Phase 6a complete (PR #26 merged 2026-05-07): pino + Sentry SDK across all three apps
- Phase 6b complete (PR #28 merged 2026-05-07): Vitest integration tests for `apps/api` (20 tests, real Postgres)
- Phase 6c complete (PR #29 merged 2026-05-07): Playwright `apps/e2e` package — staging E2E suite + prod smoke cron (every 6h, `SMOKE_ENABLED=false` until launch)
- Price transparency spec merged (PR #30): `docs/superpowers/specs/2026-05-06-price-transparency-design.md`
- Price transparency implementation complete (PR #32 merged 2026-05-08): 6-tier pipeline, community submissions, admin dashboard
- Price transparency cleanup complete (PR #37 merged 2026-05-08): PriceSource consolidation + price_retrieval_log.source enum migration
- Phase 7.5 complete (PR #39 merged 2026-05-08): IdentityArt generative engine — 5 templates × 8 palettes, wired to all image surfaces
- Phase 7.6 complete (PR #44 merged 2026-05-08): Admin UI redesign — new design system, dashboard, crawl/events/venues/prices/invite-codes pages; RSC boundary fixes, today-stats fix, statusFilter wired, admin auth on crawl trigger
- Phase 8a complete (PR #43 merged 2026-05-08): landing page, waitlist modal, invite code gate, onboarding flow, Clerk sign-up gate, code redemption; DB migration 0006
- Phase 8a follow-up complete (PR #45 merged 2026-05-08): CTA priority flip, horizontal desktop layout, animation gap fix (4th card), indicator dots, dynamic hero shows from API
- Price transparency v2 complete (PR #46 merged 2026-05-08): community submissions, confirm/dispute, admin review
- Phase 8b Part 1 complete (PR #49 merged 2026-05-08): user profile + settings (handle, avatar, theme, submissions)
- AdminTable theme fix complete (PR #50 merged 2026-05-08): electric/jade theme support in admin
- Betterment: crawler separated from API service (PR #51 merged 2026-05-08): crawler-core + price-pipeline packages, two Render Cron Jobs
- Legal pages complete (PR #108 merged 2026-05-09): beta agreement, T&C stub, Privacy Policy stub
- Invite code error states complete (PR #43/onboarding flow): invalid code, expired code, no-code wall handled in onboarding — pending manual confirmation by Hugh
- Venue seeding complete (ongoing — 10-12 venues crawled and live before private beta)
- Empty state design handoff added (PR #118 merged 2026-05-09): design assets for empty states
- Domain: `concertcrawl.app` via Cloudflare Registrar (~$15/yr)
- Watching bug fixes complete (PR #140 merged 2026-05-10): IdentityArt thumbnail in WatchingItem; watch state rehydration on Browse via auth + fetchWatching
- Admin dashboard polish complete (PR #127 merged 2026-05-10): topbar, sign-out popover, stat cards, crawl health table, activity feed
- Browse filters + genre tagging complete (PR #130 merged 2026-05-10): Price + Vibe filter chips wired end-to-end; LLM genre-tagging pipeline in crawler
- Crawler: shared browser instance (PR #144 merged 2026-05-10): single Playwright browser across venue crawls
- Empty states complete (PR #145 merged 2026-05-10): hybrid design wired into browse (list + calendar), venue page, and watching
- Feedback modal + user menu redesign complete (PR #146 merged 2026-05-10): identity card, theme switcher, beta channel, admin section, feedback submission
- Genre tagger resilience (PR #147 merged 2026-05-10): open enum for unknown genres, batch size limit
- Search implementation complete (PR #171): `/search` page, `SearchPalette` desktop command palette (⌘K), `useSearch` hook, `GET /v1/search/popular` endpoint, venue name in event search
- Onboarding polish in PR #173 (fix/onboarding-polish): desktop card layout, top chrome, back button, step 5 copy, Caveat font, returning-user redirect (#134, #135, #138, #80)
- Active Claude workers: admin/crawl UI fixes (issues #148–163), admin sidebar polish (issue #139)
- Admin sidebar polish in PR #167 (issue #139): badge contrast, CCMark centralization, Invite Codes icon, OPERATIONS label
- Admin crawl data + run-all in PR (feat/admin-crawl-data-and-run-all): DB migration 0014 (llm_cost_usd, events_updated), crawler writes new fields, API selects them + bulk trigger endpoint, "Run all" button in CrawlSplitView; closes #150, #155, #156
- Auto-versioning + release notes in PR #183 (feat/auto-versioning, issue #154): semantic-release on root package.json, CI→Release→Deploy-Staging pipeline chain, version injected from package.json into next.config.ts

### Phase Sequence

| Phase       | Name                                     | Status                                         |
| ----------- | ---------------------------------------- | ---------------------------------------------- |
| 1           | Foundation                               | ✅ Complete                                    |
| 2           | Venue Management (Admin)                 | ✅ Complete                                    |
| 3           | Crawler v1                               | ✅ Complete                                    |
| 4           | Design System / Theming Architecture     | ✅ Complete                                    |
| 5           | Consumer Calendar UI (functional)        | ✅ Complete                                    |
| 5b          | Consumer UI Design Polish                | ✅ Complete (PRs #22–24)                       |
| 6a          | Observability SDK                        | ✅ Complete (PR #26)                           |
| 6b          | Integration Tests                        | ✅ Complete (PR #28)                           |
| 6c          | E2E + Smoke Tests                        | ✅ Complete (PR #29)                           |
| 7           | Automation + Scheduling                  | ✅ Complete (PR #34)                           |
| 7.5         | IdentityArt generative engine            | ✅ Complete (PR #39)                           |
| 7.6         | Admin UI Redesign                        | ✅ Complete (PRs #44, #50)                     |
| 8a          | Beta Launch Prep — Landing + Auth        | ✅ Complete (PRs #43, #45)                     |
| 8b pt.1     | User Profile + Settings                  | ✅ Complete (PR #49)                           |
| —           | Price Transparency v1                    | ✅ Complete (PRs #32, #37)                     |
| —           | Price Transparency v2                    | ✅ Complete (PR #46)                           |
| —           | Betterment: Crawler separation           | ✅ Complete (PR #51)                           |
| **8b pt.2** | **Saving Shows (Watching)**              | ✅ **Complete (PR #117 merged 2026-05-09)**    |
| —           | Legal pages                              | ✅ Complete (PR #108)                          |
| —           | Watching bug fixes                       | ✅ Complete (PR #140 merged 2026-05-10)        |
| —           | Admin dashboard polish                   | ✅ Complete (PR #127 merged 2026-05-10)        |
| —           | Browse filters + LLM genre tagging       | ✅ Complete (PR #130 merged 2026-05-10)        |
| —           | Empty states                             | ✅ Complete (PR #145 merged 2026-05-10)        |
| —           | Feedback modal + user menu redesign      | ✅ Complete (PR #146 merged 2026-05-10)        |
| —           | Crawler: shared browser + genre fixes    | ✅ Complete (PRs #144, #147 merged 2026-05-10) |
| —           | Admin sidebar polish                     | 🔄 In PR #167 (issue #139)                     |
| —           | Admin crawl data + run-all               | 🔄 In PR (feat/admin-crawl-data-and-run-all)   |
| —           | Search nav item                          | ✅ Complete (PR #171, issue #57)               |
| —           | Onboarding polish                        | 🔄 In PR #173 (issues #134, #135, #138, #80)   |
| —           | Auto-versioning + release notes          | 🔄 In PR #183 (feat/auto-versioning, issue #154) |
| Pre-beta    | UI interactions audit + bug fixes        | 🔄 In progress (admin/crawl, sidebar)          |
| Beta period | Jun 16 – Aug 3 (see beta-to-launch spec) | —                                              |
| Launch prep | Aug 4–17                                 | —                                              |
| **Launch**  | **~Aug 18–22, 2026**                     | —                                              |

Full forward plan: `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Design Backlog

### Pre-beta hard blockers (must ship before May 25)

| Item                         | Notes                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Saving shows (Watching)**  | ✅ Complete (PR #117 merged 2026-05-09). Heart button → `user_events` table. Design handoff: `design/design_handoff_watching/`.    |
| **Browse filters wired**     | ✅ Complete (PR #130 merged 2026-05-10). Price + Vibe filter chips end-to-end; LLM genre-tagging pipeline in crawler.              |
| **Search nav item**          | ✅ Complete (PR #171): `/search` mobile page, `SearchPalette` desktop (⌘K), `useSearch` hook, popular endpoint, venue name search. |
| **UI interactions sweep**    | Walk every clickable element on every route. Log and fix dead interactions.                                                        |
| **Invite code error states** | ⚠️ Believed complete via Phase 8a onboarding flow (PR #43) — Hugh confirming via manual test.                                      |
| **Feedback modal**           | ✅ Complete (PR #146 merged 2026-05-10). Auth-only, rate-limited (1/hour), category + message → `feedback` table.                  |
| **Empty states**             | ✅ Complete (PR #145 merged 2026-05-10). Hybrid design wired into browse (list + calendar), venue page, and watching.              |
| **FounderNote content**      | Hugh writes the personal message for onboarding step 1.                                                                            |
| **FounderNote admin page**   | `app_config` table + admin editor so copy can update without redeploy.                                                             |
| **Legal for beta**           | ✅ Complete (PR #108): beta agreement, T&C stub, Privacy Policy stub.                                                              |
| **Seed additional venues**   | ✅ Complete: 10-12 venues crawled and live before private beta.                                                                    |

### Beta period deliverables (Jun 16 – Aug 3)

| Item                               | Notes                                                                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture diagram in README** | Mermaid flowchart: apps, packages, Render services, external services, data flow. Renders natively on GitHub.                                                                                                                                               |
| **Cost tracking admin**            | `cost_tracking` table exists. Admin UI + manual entry form + monthly summary dashboard.                                                                                                                                                                     |
| **Phase 7.1 Trust chrome**         | Additive display layer on price transparency: TrustMark pill (RESALE/COMMUNITY), VerifiedStamp (attribution + 7d staleness), revised SourceLink. Design complete: `design_handoff_price_transparency/README_PHASE_7_1.md`. Ships standalone, eng issue #96. |
| **404 page**                       | "We couldn't find that show."                                                                                                                                                                                                                               |
| **Sign-out → landing transition**  | Polish.                                                                                                                                                                                                                                                     |
| **Returning-user onboarding edge** | Abandoned-flow recovery.                                                                                                                                                                                                                                    |
| **Stripe integration**             | Subscription tiers, upgrade flow, gifted premium mechanism.                                                                                                                                                                                                 |
| **Concert history**                | Past attended shows. `user_events.status = 'attended'`. Empty state first experience.                                                                                                                                                                       |
| **Calendar export**                | iCal + Google Calendar. Supporter tier feature.                                                                                                                                                                                                             |
| **Shareable show cards**           | IdentityArt generative cards for saved/attended shows. 9:16, 1:1, link preview formats. Built around generative art — no photo swap. Design handoff: `design/design_handoff_shareable_cards/`.                                                              |
| **"Who else is watching"**         | Aggregate count on event cards/detail. Number only — no names.                                                                                                                                                                                              |
| **Setlist preview**                | Setlist.fm API. Collapsed in Event Detail. Degrades gracefully.                                                                                                                                                                                             |
| **Venue first-timer guide**        | Static per-venue info card: parking, bag policy, age restriction, doors gap.                                                                                                                                                                                |
| **"Last time in Denver"**          | Derived from crawl history. Lives on Event Detail / artist surfaces.                                                                                                                                                                                        |
| **Spotify sync**                   | Clerk OAuth → Spotify API → populate `user_artist_follows`. Premium feature. User-gated; platform-level artist photo integration is a separate post-launch item.                                                                                            |
| **Teaser UI**                      | Locked/preview states for artist following + price alerts (not built yet — just shown).                                                                                                                                                                     |

### Launch features (not beta)

| Item                                    | Notes                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Artist following + new show alerts**  | Background job, Resend delivery. Smart batching. See notification design principles in spec.                                                                             |
| **Price drop alerts**                   | Compare price snapshots. Alert when `price_min` drops for a watched event.                                                                                               |
| **Notification preferences settings**   | Per-artist instant vs. digest, 60-day threshold, delivery time.                                                                                                          |
| **Support act spotlight**               | Opener given card-level prominence on event detail.                                                                                                                      |
| **Concert passport**                    | Visual shareable grid of attended shows. Includes per-venue passport card ("10 shows at Red Rocks") using venue identity art — design together, same visual language.    |
| **Venue passport card**                 | Per-venue attended show recap card. Generative venue identity art + typographic layout listing artists, show count, date range. Issue #99.                               |
| **Public profile pages**                | `/u/<handle>` — read-only. Settings model supports it.                                                                                                                   |
| **Artist images via Spotify treatment** | Platform-level Spotify Client Credentials API for artist photos + graphic treatment overlay (pop-art style). No user OAuth required. Ships after Spotify sync is proven. |

### Intentionally deferred

| Item                              | Notes                                                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Photo upload**                  | Deferred indefinitely. Tracked so we don't accidentally ship a half-promise.                                                                                                                 |
| **Concert Roulette**              | Hold as a surprise for post-launch. Don't tease.                                                                                                                                             |
| **AI recommendations**            | Taste-based from Spotify + history. Post-launch.                                                                                                                                             |
| **Multi-city**                    | Post-launch. Denver-only through launch.                                                                                                                                                     |
| **Real photo swap (Bandsintown)** | Decided 2026-05-09: generative art stays through launch. Bandsintown is not a tracked dependency. Artist treatment via Spotify is post-launch (see above). No Phase 8 design pass on photos. |

---

### Keeping this section current

**Update this section whenever:**

- A PR is merged — mark the corresponding phase/sub-phase complete with the PR number and merge date
- A new phase or sub-phase begins — add a row to the table and update the summary line at the top
- A plan file is created — link it in the relevant row's notes
- **When opening a PR** — update Phase Sequence + Current Status in this file and commit the change on the feature branch before opening the PR
- **At the start of every session** — run `gh pr list --state merged --limit 10`, check for unrecorded merges, and update this file before doing any other work

This keeps any future Claude session (or human) immediately oriented without needing to run `gh pr list`.
