# Concert Crawl — Design Spec

**Date:** 2026-04-23
**Status:** Draft — awaiting implementation planning

---

## Overview

A production-ready concert calendar application that crawls Denver venue websites daily to produce an accurate, filterable, searchable event listing. Designed for a private beta launch with a path to public access, premium monetization, and social features.

**Guiding principles:**
- Human-in-the-loop — automated systems surface data, humans approve and refine it
- Security by default — validate at every boundary, audit every admin action, ship nothing insecure
- Mobile-first — designed at 320px, expands up; PWA-ready from day one
- Cost-conscious — free tooling preferred; all LLM and infrastructure costs are visible in-app
- Only ship good, secure, well-tested code

---

## System Architecture

### Monorepo Structure (Turborepo + pnpm workspaces)

```
/
├── apps/
│   ├── web/        # Next.js 14+ (App Router) — UI, admin, auth-gated pages
│   ├── api/        # Hono — REST API, business logic, data access
│   └── crawler/    # Node.js — Playwright scraping + Claude Haiku extraction
├── packages/
│   ├── db/         # Drizzle ORM schema + migrations (shared)
│   ├── types/      # Shared TypeScript types across apps
│   └── config/     # Shared ESLint, TypeScript, Tailwind configs
```

### Render Services (4)

| Service | Type | App |
|---------|------|-----|
| Web (Next.js) | Web Service | `apps/web` |
| API (Hono) | Web Service | `apps/api` |
| Crawler | Cron Job (daily) | `apps/crawler` |
| Database | Managed Postgres | — |

### Technology Decisions

| Concern | Choice | Docs | Rationale |
|---------|--------|------|-----------|
| Frontend framework | Next.js 14+ (App Router) | [nextjs.org/docs](https://nextjs.org/docs) | SSR/SSG for SEO, natural progression from React |
| Backend framework | Hono | [hono.dev/docs](https://hono.dev/docs) | TypeScript-first, lightweight, familiar from Fastify |
| ORM | Drizzle | [orm.drizzle.team](https://orm.drizzle.team/docs/overview) | TypeScript-native, parameterized queries, excellent DX |
| Auth | Clerk | [clerk.com/docs](https://clerk.com/docs) | Free tier (10k MAU), Next.js integration, supports Spotify OAuth |
| Styling | Tailwind CSS | [tailwindcss.com/docs](https://tailwindcss.com/docs) | Responsive utilities, CSS variable theming |
| Component library | shadcn/ui | [ui.shadcn.com/docs](https://ui.shadcn.com/docs) | Radix primitives, accessible, CSS variable theming for dark/light mode |
| Crawler | Playwright | [playwright.dev/docs](https://playwright.dev/docs/intro) | Headless browser, handles JS-rendered sites |
| LLM extraction | Claude Haiku (Anthropic SDK) | [docs.anthropic.com](https://docs.anthropic.com) | Low cost, high accuracy for structured extraction; prompt caching enabled |
| Monorepo tooling | Turborepo | [turbo.build/repo/docs](https://turbo.build/repo/docs) | Build caching, task orchestration |
| Package manager | pnpm | [pnpm.io](https://pnpm.io/motivation) | Faster installs, efficient disk usage, native workspace support |
| Validation | Zod | [zod.dev](https://zod.dev) | Runtime type validation at all API boundaries |
| Containerization | Dockerfile per app | — | Render handles runtime; Dockerfiles ensure portability |
| Email | Resend | [resend.com/docs](https://resend.com/docs) | Free tier, excellent DX, developer-first |
| Payments | Stripe | [stripe.com/docs](https://stripe.com/docs) | Industry standard, excellent docs, webhook support |
| Logging | Pino | [getpino.io](https://getpino.io/#/) | Fastest Node.js structured logger |
| Error tracking | Sentry | [docs.sentry.io](https://docs.sentry.io) | Free tier, source maps, performance tracing |
| Metrics | Grafana Cloud | [grafana.com/docs](https://grafana.com/docs/grafana-cloud/) | Free tier, OpenTelemetry-native, alerting |
| Uptime | UptimeRobot | [uptimerobot.com](https://uptimerobot.com) | Free tier, 5-min checks, status pages |
| Product analytics | PostHog | [posthog.com/docs](https://posthog.com/docs) | Free tier, open-source, privacy-respecting; event views, search queries, user flows |
| API testing | Bruno | [usebruno.com](https://www.usebruno.com/docs) | Free, git-committable API collection; replaces Postman |
| Commit tooling | Husky + lint-staged | [typicode.github.io/husky](https://typicode.github.io/husky/) | Pre-commit hooks for formatting + linting |

### Architectural Decision: GraphQL

**Decision: Not included.** REST + Zod + the shared `types` package provides equivalent type safety across a single TypeScript client (Next.js). GraphQL's core value — letting multiple clients fetch varied shapes of the same data — does not apply at this stage. The resolver boilerplate adds meaningful complexity to Phase 1 without a clear payoff. Revisit if a mobile app or public API emerges in the future.

---

## Data Model

All tables use UUID primary keys and include `created_at` / `updated_at` timestamps unless noted.

### `venues`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | |
| slug | text | Unique, URL-safe |
| website_url | text | Crawl target |
| city | text | "Denver" initially |
| active | boolean | Controls whether crawler visits this venue |
| verified | boolean | Human-approved flag (human-in-the-loop) |
| last_crawled_at | timestamp | |
| crawl_notes | text | Admin notes on crawl behavior / extraction hints |
| crawl_delay_ms | integer | Per-venue delay between requests; default 3000 |
| robots_txt_allowed | boolean | Nullable; cached result of most recent robots.txt check |
| robots_txt_checked_at | timestamp | Nullable; when robots.txt was last evaluated |
| consecutive_failures | integer | Rolling count; reset to 0 on success; triggers pause at 3 |
| blocked_at | timestamp | Nullable; set when venue returns 403/429; triggers admin alert |
| extraction_strategy | enum | `structured_data` / `llm` / `manual`; set by crawler based on site |
| contact_email | text | Nullable; venue contact for partnership/permission outreach |

### `events`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| venue_id | uuid | FK → venues |
| title | text | Show title |
| artist | text | |
| date | date | |
| doors_time | time | Nullable |
| show_time | time | Nullable |
| ticket_url | text | |
| ticket_price_min | numeric | Nullable; populated in future hourly crawls |
| ticket_price_max | numeric | Nullable |
| description | text | |
| image_url | text | |
| genre | text[] | LLM-extracted genre tags (e.g., ["rock", "indie"]) |
| status | enum | upcoming / cancelled / postponed |
| confidence_score | numeric | LLM extraction confidence (0–1) |
| verified | boolean | Human-approved (human-in-the-loop) |
| source_url | text | Page the event was extracted from |
| source_hash | text | MD5 of source URL; used for deduplication upsert |
| extraction_strategy | enum | `structured_data` / `llm` / `manual` |
| search_vector | tsvector | Generated column; GIN-indexed for full-text search |
| raw_html | text | Stored for debugging/reprocessing; purged after 30 days |

### `crawl_runs`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| venue_id | uuid | FK → venues |
| started_at | timestamp | |
| completed_at | timestamp | |
| status | enum | success / failed / partial |
| events_found | integer | |
| events_created | integer | |
| events_updated | integer | |
| error_message | text | Nullable |
| http_status_code | integer | Nullable; HTTP response code from venue site |
| robots_txt_blocked | boolean | True if crawl was skipped due to robots.txt disallow |
| extraction_strategy_used | enum | `structured_data` / `llm` / `manual` |
| llm_tokens_used | integer | |
| llm_cost_usd | numeric | |

### `invite_codes`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| code | text | Unique |
| created_by | text | Clerk user ID |
| used_by | text | Clerk user ID; nullable |
| used_at | timestamp | Nullable |
| expires_at | timestamp | Nullable |
| revoked_at | timestamp | Nullable; presence = invalidated |
| revoked_by | text | Clerk user ID; nullable |

### `user_roles`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| role | enum | admin / sub_admin / user — mirrors Clerk `publicMetadata`; Clerk is source of truth, this is the DB-side audit record |
| permissions | jsonb | Scoped grants for sub_admin (e.g., ["venues:write"]); checked per-request for sub_admins |
| granted_by | text | Clerk user ID |

### `user_events`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| event_id | uuid | FK → events |
| status | enum | going / interested |

### `user_artist_follows`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| artist_name | text | |
| spotify_artist_id | text | Nullable; populated via Spotify OAuth |

### `cost_tracking`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| service | text | e.g., "claude", "render" |
| cost_usd | numeric | |
| tokens_used | integer | Nullable |
| recorded_at | timestamp | |
| metadata | jsonb | Additional context |

### `subscriptions`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| tier | enum | free / premium |
| founder | boolean | Locked at launch price forever if true |
| status | enum | active / cancelled / past_due |
| current_period_end | timestamp | |

### `feedback`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| page_url | text | Captured automatically from the browser |
| category | enum | bug / suggestion / praise |
| message | text | |
| created_at | timestamp | |

Rate-limited to one submission per user per hour. Bug reports are additionally routed through the Sentry User Feedback widget for session context.

### `notifications`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID; nullable for system-level notifications |
| type | enum | admin_alert / user_notification |
| category | text | e.g., "crawl.low_confidence", "crawl.failed", "event.flagged" |
| title | text | |
| body | text | |
| action_url | text | Nullable; deep link to relevant admin or app page |
| read_at | timestamp | Nullable; null = unread |
| metadata | jsonb | Additional context (e.g., event_id, crawl_run_id, confidence_score) |
| created_at | timestamp | |

### `audit_log`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| actor_id | text | Clerk user ID |
| action | text | e.g., "venue.create", "user.role.grant" |
| target_id | text | Nullable; affected resource ID |
| metadata | jsonb | Before/after state or relevant context |
| created_at | timestamp | |

---

## Timezone Strategy

All datetimes stored as **UTC** in the database. Conversion to Mountain Time (America/Denver) happens at the API response layer and in the Next.js display layer. This is enforced via:
- Drizzle column type: `timestamp('started_at', { withTimezone: true })`
- API responses include timezone-aware ISO 8601 strings
- Next.js uses `Intl.DateTimeFormat` with `timeZone: 'America/Denver'` for display

Never store local time directly. Never assume timezone in the crawler.

---

## Event Deduplication

The crawler runs daily. Without deduplication, every crawl creates duplicate events.

**Strategy: composite uniqueness + upsert**

A unique constraint on `(venue_id, date, artist)` prevents duplicate rows. The crawler uses an upsert (INSERT ... ON CONFLICT DO UPDATE) keyed on this constraint, updating `updated_at`, `ticket_url`, `ticket_price_min`, `ticket_price_max`, and `status` on conflict. New events are inserted; existing events are refreshed.

`source_hash` (MD5 of the source URL) provides a secondary deduplication signal for cases where artist name varies slightly between crawls (e.g., "Radiohead" vs "RADIOHEAD"). Admin can review and merge near-duplicate events via the data refinement UI.

---

## Search Implementation

**Choice: Postgres full-text search** (`tsvector` + `pg_trgm`) — no external service required at this data volume.

**How it works:**
- `events.search_vector` is a generated `tsvector` column combining `title`, `artist`, `description`, and `genre` fields with weighted priority (`artist` and `title` weighted higher)
- A GIN index on `search_vector` makes full-text queries fast
- Fuzzy matching via `pg_trgm` extension handles typos and partial matches ("radio" matches "Radiohead")
- API query: `WHERE search_vector @@ plainto_tsquery('english', $query)`

**Filter indexes** (see Database Indexes section) handle date range, venue, and genre filtering independently of full-text search.

**Future:** If search volume or complexity grows beyond Postgres's capabilities, [Typesense](https://typesense.org) (self-hosted, free) is the preferred upgrade path — not Algolia (paid).

---

## Database Indexes

Declared in Drizzle schema from day one. Missing indexes on a growing events table will cause slow queries that are painful to diagnose in production.

| Table | Index | Type | Query it serves |
|-------|-------|------|----------------|
| `events` | `(date, status)` | B-tree | Calendar view, upcoming events listing |
| `events` | `(venue_id)` | B-tree | Events by venue |
| `events` | `(artist)` | B-tree | Artist filter, artist follow matching |
| `events` | `search_vector` | GIN | Full-text search |
| `events` | `(date, venue_id)` | B-tree composite | Deduplication upsert lookup |
| `venues` | `(city, active)` | B-tree | Active venues by city |
| `venues` | `(consecutive_failures)` | B-tree | Admin: venues nearing failure threshold |
| `crawl_runs` | `(venue_id, started_at)` | B-tree | Crawl history per venue |
| `notifications` | `(user_id, read_at)` | B-tree | Unread notification count |
| `user_artist_follows` | `(artist_name)` | B-tree | Matching new events to followed artists |

---

## Crawl Ethics + Resilience

**Crawl resilience is existential.** Without venue data, the product has nothing to show. Every engineering decision in the crawler must weigh both ethical compliance and operational continuity.

### Extraction Priority (Cost + Reliability Hierarchy)

The crawler attempts extraction in this order, stopping at the first success:

1. **JSON-LD structured data** — check for `<script type="application/ld+json">` containing `@type: "Event"` or `@type: "MusicEvent"`. Many larger venues publish this for Google's benefit. Free, reliable, zero LLM cost.
2. **Microdata / schema.org** — check for `itemtype="https://schema.org/Event"` markup. Same benefit as JSON-LD.
3. **Claude Haiku LLM extraction** — send cleaned page HTML to Claude Haiku with a structured extraction prompt. Handles unstructured pages. Paid; prompt caching enabled to minimize token use.
4. **Manual admin entry** — last resort for venues that block automated extraction entirely. Admin UI provides a manual event entry form per venue.

`extraction_strategy` on both `venues` and `crawl_runs` tracks which path was taken, informing cost reporting and admin prioritization.

### robots.txt Compliance

```
Check robots.txt before every crawl run (cached per venue, refreshed weekly).
If User-agent: * disallows the events path → skip crawl, set robots_txt_allowed = false, notify admin.
Never override a robots.txt disallow. No exceptions.
```

Caching the robots.txt check avoids re-fetching it every daily crawl. The `robots_txt_checked_at` field on `venues` controls the weekly refresh.

### Honest Bot Identification

```
User-Agent: ConcertCrawl/1.0 (+https://concertcrawl.com/bot)
```

This is non-negotiable. Identifying honestly:
- Gives venue operators the ability to contact us rather than just block
- Is the ethical baseline for any web crawler
- Avoids the legal grey area of impersonating a browser

### Rate Limiting + Crawl Timing

- **Default delay:** 3 seconds between requests to the same domain (`crawl_delay_ms` on `venues`, configurable per venue)
- **Randomized jitter:** ±500ms added to each delay to avoid robotic fingerprinting
- **Concurrent crawls:** maximum 3 venues crawled in parallel
- **Daily schedule:** 3 AM Mountain Time (off-peak; minimizes load on venue servers)
- **Exponential backoff:** on 5xx responses, wait 10s → 30s → 90s before retrying, then fail

### Failure Detection + Response

| Condition | Response |
|-----------|----------|
| HTTP 403 (Forbidden) | Set `blocked_at`, increment `consecutive_failures`, send admin notification immediately |
| HTTP 429 (Rate Limited) | Exponential backoff; if persists, treat as 403 |
| HTTP 5xx | Retry with backoff; log as `partial` if some events extracted |
| `consecutive_failures` reaches 3 | Pause venue (`active = false`), admin notification with venue name and failure reason |
| `robots_txt_allowed = false` | Skip crawl entirely; flag in admin UI for outreach |
| Low `confidence_score` (< 0.7) | Write event as unverified; trigger admin notification for human review |
| Site structure changed (all scores low) | Admin notification with suggestion to update `crawl_notes` / extraction hints |

### Partnership Pathway

Venues are potential allies, not just targets. If a venue's site is incompatible with automated crawling:

1. Use `contact_email` on the `venues` table to reach out
2. Explain what Concert Crawl does and the benefit to them (free promotion)
3. Ask if they can provide a direct feed (RSS, JSON endpoint, or structured data markup)
4. If they ask to be removed, comply within 24 hours — no exceptions

The admin UI surfaces venues flagged for outreach. Building relationships with venues is a long-term competitive moat: a venue that provides a direct data feed is more reliable than one we scrape.

### Attribution + Data Use

- Every displayed event links to the original venue website and ticket URL
- Raw HTML is stored for debugging only and purged after 30 days
- Concert Crawl does not republish venue content — it surfaces structured metadata (artist, date, time, ticket link) that directs users back to the source
- If a venue requests removal of their data, all associated events are soft-deleted within 24 hours

---

## Application Layers

### Auth Layer (Clerk)

- Role stored in Clerk `publicMetadata`: `{ role: "admin" | "sub_admin" | "user" }`
- Sub-admin scoped permissions stored in `user_roles.permissions` (DB), checked per-request
- Auth abstracted behind app-level utilities (`getCurrentUser()`, `requireAuth()`, `requireRole()`) — no direct Clerk imports outside the auth package
- Spotify OAuth enabled via Clerk social connections — no separate provider migration needed
- Private beta: invite code required at signup; code validated before Clerk user creation completes

### API Layer (Hono)

- All routes namespaced `/v1/...`
- Request validation via Zod at every endpoint — no raw input reaches the DB
- Role middleware checks `publicMetadata` on every protected route
- Rate limiting middleware on all routes
- Structured logging via Pino
- Health endpoint: `GET /v1/health`

### Crawler Service

**Daily execution flow:**

1. Render cron triggers crawler at 3 AM MT
2. Crawler fetches all `active = true`, `verified = true` venues from DB
3. For each venue (max 3 parallel, respecting `crawl_delay_ms` + ±500ms jitter):
   a. Check cached `robots_txt_allowed`; skip if false
   b. Playwright launches headless browser, navigates to venue website
   c. **Attempt structured data extraction** (JSON-LD / microdata) — if events found, use them directly
   d. **Fallback: Claude Haiku LLM extraction** — send cleaned HTML with structured prompt; prompt caching enabled
   e. **Fallback: flag for manual entry** — if all automated strategies fail
4. Extracted events upserted to DB on `(venue_id, date, artist)` uniqueness constraint
5. Low-confidence events (`confidence_score < 0.7`) flagged as unverified; admin notification sent
6. `crawl_runs` record written (strategy used, token count, cost, HTTP status, success/fail)
7. `cost_tracking` record written per LLM call
8. Venue `consecutive_failures` reset on success; incremented + admin alerted on failure
9. Future: ticket price crawls run hourly via BullMQ + Upstash Redis targeting specific event ticket URLs

### User Feedback System

A lightweight, authenticated-only feedback mechanism for the private beta. Two complementary channels:

**Bug reports → Sentry User Feedback widget**
Triggered from a "Report a bug" button. Automatically captures current page, user session, recent events, and optional screenshot — richer context than any custom form. Lands in the Sentry dashboard linked to the session. No additional DB tables or admin UI required.

**Suggestions + general feedback → in-app form**
A persistent "Feedback" button (bottom corner of the UI) opens a modal with three fields: category (bug / suggestion / praise), message, and auto-captured page URL. Authenticated users only. Stored in the `feedback` table. Rate-limited to one submission per user per hour.

Admin UI surfaces all feedback entries in a simple table (Phase 7). No upvoting, threading, or public roadmap — unnecessary overhead at private beta scale.

### In-App Notification System

Persistent, real-time notification layer used initially for admin alerts, expandable to user-facing notifications.

**Delivery:** Server-Sent Events (SSE) via a Hono endpoint (`GET /v1/notifications/stream`) — one-way push from server to client, no WebSocket complexity required. Next.js connects on mount for authenticated sessions.

**Persistence:** All notifications written to the `notifications` table. Unread count shown in a notification bell in both the admin and consumer nav. Mark-as-read via `PATCH /v1/notifications/:id`.

**Admin alert triggers (Phase 1):**
- Crawl completed with low-confidence events (`confidence_score < 0.7`)
- Crawl failed for a venue
- New event flagged for human review
- Invite code used

**User notification triggers (future):**
- Artist follow has a new Denver show
- Ticket price dropped below user threshold
- Friend RSVPs to a show the user saved

### Admin UI (Next.js — `/admin` routes)

Protected by role middleware in Next.js middleware layer.

**Phase 1:**
- Invite code generation, list, revocation
- User access list

**Phase 2:**
- Venue CRUD (add, edit, activate/deactivate, verify)
- Crawl run history and status per venue
- Manual crawl trigger

**Phase 3:**
- User management (role grants, subscription overrides)
- Cost dashboard (LLM costs, crawl costs over time)
- Event data refinement (review low-confidence extractions, approve/reject)

**Phase 4:**
- System health monitoring
- Debug tooling (replay crawl, inspect raw HTML, reprocess with LLM)
- Audit log viewer

### Consumer UI (Next.js)

- Mobile-first responsive design (320px baseline)
- PWA manifest + service worker (next-pwa)
- Dark/light mode + custom theming via CSS variables (shadcn/ui)
- Structured event data as JSON-LD on all event pages (Google Event rich results)
- Auth-gated during private beta; public browsing available post-launch

**Core views:**
- Calendar view (month/week/list toggle)
- Event detail page
- Search + filter (artist, venue, date range, genre, price range)
- User profile (attended events, followed artists, saved events)
- Notifications settings

---

## Local Development

Local is the primary development environment. Every service has a local equivalent — no cloud dependencies required to run the app during development.

### Docker Compose Services

```yaml
# docker-compose.yml (repo root)
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
  redis:          # future — ticket price queue
    image: redis:alpine
    ports: ["6379:6379"]
```

### Environment Tiers

| Tier | Postgres | Auth | Payments | Email | Purpose |
|------|----------|------|----------|-------|---------|
| Local | Docker | Clerk dev instance | Stripe test mode | Resend dev (captured) | Feature development |
| Staging | Render Postgres | Clerk staging instance | Stripe test mode | Resend dev | PR E2E tests, integration validation |
| Production | Render Postgres | Clerk prod instance | Stripe live mode | Resend live | Real users |

**Staging is the canary.** A dedicated canary environment adds infra overhead without meaningful benefit at this team size. Every PR is validated against staging before reaching production.

### Per-App `.env.local`

Each app reads from `.env.local` (git-ignored). A committed `.env.example` documents every required variable with descriptions but no values. This is what Claude works from — actual secrets are entered by the human directly into each environment.

---

## Database Safety + Disaster Recovery

### Expand/Contract Migration Pattern

Never make a breaking schema change in a single deploy. Every migration follows this sequence:

1. **Expand** — add new columns as nullable; deploy code that handles both old and new schema
2. **Backfill** — populate new columns for existing rows
3. **Contract** — add constraints, remove old columns in a subsequent deploy

This means any migration can be rolled back without data loss. Drizzle generates migration files that are reviewed and version-controlled before running.

### Pre-Migration Safety Protocol (Production)

1. Trigger a manual Postgres snapshot via Render API (scriptable, no human input required beyond authorization)
2. Run migration on staging first — verify data integrity
3. Human approves production migration run (human-in-the-loop gate)
4. Run migration on production
5. Monitor error rates for 15 minutes post-migration

### Render PITR (Point-in-Time Recovery)

Render Managed Postgres includes automated daily backups and PITR on paid plans. In a worst-case scenario, the database can be restored to any point before the migration. This is the primary disaster recovery mechanism — no blue/green database complexity required at this stage.

### Rollback Playbook

Documented in the repo at `docs/runbooks/db-rollback.md`:
- How to identify the pre-migration snapshot
- Render PITR restoration steps
- How to revert the application deploy on Render
- Who to notify and how

---

## Security

- Zod validation at all API boundaries
- Drizzle ORM parameterized queries (SQL injection prevention by design)
- CSP, CORS, and security headers on both Next.js and Hono
- GitHub Dependabot + secret scanning enabled
- All secrets in Render environment variables — never in code or committed config
- HTTPS enforced (Render-managed TLS)
- Audit log for all admin actions
- User data export + deletion endpoints (GDPR-aligned)
- Raw HTML purged on 30-day rolling retention
- Rate limiting on all Hono routes

---

## Observability Stack (all free tier)

| Concern | Tool |
|---------|------|
| Structured logging | Pino (Node.js) |
| Error tracking | Sentry |
| Metrics + alerting | Grafana Cloud (OpenTelemetry) |
| Basic uptime | UptimeRobot (5-min checks) |
| Tracing | OpenTelemetry SDK |

---

## Testing Strategy

### PR Validation (GitHub Actions — required to merge)

| Check | Tool |
|-------|------|
| Type checking | `tsc --noEmit` |
| Linting | ESLint |
| Unit tests | Vitest |
| Integration tests | Vitest + test DB |
| Build verification | Turborepo build |
| E2E tests | Playwright (staging) |

Branch protection enforces all checks green before merge.

### Production Smoke Tests (GitHub Actions cron — hourly)

Playwright suite against production:
- App loads and returns valid response
- Auth redirect works
- Event listing returns data
- Search/filter returns results
- Admin route is protected
- API health endpoint responds
- Known venue's events are present (data freshness signal)

Failure triggers Grafana alert + Sentry event.

### Caching Strategy (Critical for Speed + Cost)

A cold PR run without caching can exceed 15 minutes — unacceptable. With the following cache layers, target is **3–5 minutes per PR run**:

| Cache | Tool | What it saves |
|-------|------|--------------|
| pnpm store | `actions/cache` on `~/.pnpm-store` | Dependency installs (biggest win) |
| Turborepo task cache | `actions/cache` on `.turbo` | Build, lint, type-check outputs |
| Playwright browsers | `actions/cache` on Playwright cache dir | ~400MB browser binary download |
| Docker layer cache | `docker/build-push-action` cache | Container build steps |

pnpm's content-addressable store means packages shared across workspaces are never downloaded twice. Turborepo skips tasks whose inputs haven't changed — a PR touching only `apps/web` won't re-run `apps/api` tests.

### Cost Estimate

| Source | Est. minutes/month |
|--------|-------------------|
| PR checks (~20 PRs × 4 min cached) | ~80 min |
| Hourly smoke tests (24 × 2 min × 30 days) | ~1,440 min |
| **Total** | ~1,520 min |

Fits comfortably within GitHub Pro (3,000 min/month, $4/month). The investment in caching configuration pays for itself within the first week of active development.

---

## CI/CD Pipeline

```
feature branch → PR → GitHub Actions (type check + lint + unit + integration + E2E on staging)
                    ↓ all green
              merge to main
                    ↓
         Render auto-deploy (webhook)
                    ↓
         Hourly smoke tests against prod
```

Three environments: `dev` → `staging` → `prod`. Nothing reaches prod without passing staging.

---

## Monetization

| Tier | Features | Price |
|------|----------|-------|
| Free | Browse, search, basic filters | $0 |
| Premium | Artist following, notifications, Spotify sync, price alerts, group planning, concert history | TBD |
| Founder | Full premium, price locked forever | Launch price |

- Stripe payment integration
- `founder: boolean` flag on `subscriptions` table — permanent price lock
- Founder pricing creates beta launch urgency

---

## Future Features (Post-Beta Roadmap)

- **Ticket price tracking** — hourly crawls for event-specific ticket URLs; BullMQ + Upstash Redis job queue; price alert notifications
- **Spotify integration** — connect account, auto-follow listened artists, instant personalization
- **Artist following + notifications** — email (Resend) + push notifications (PWA)
- **"I'm going" + friend groups** — RSVP, see friends attending, group coordination
- **Concert history** — personal attended event log
- **AI recommendations** — taste-based show suggestions from Spotify + attendance data
- **Social media crawling** — Instagram/Facebook Events as supplementary data sources
- **Public launch** — open registration, optional accounts, SEO-optimized public pages

---

## Human vs. Agentic Development

A clear boundary between what a human must do, what a human should do by policy, and what Claude can fully own.

### Where a Human IS Required
These tasks involve credentials, identity verification, billing, or external account creation that cannot and should not be delegated.

| Task | Why human required |
|------|--------------------|
| Create Render account + configure billing | Identity + payment required |
| Create GitHub repository + configure branch protection | Account ownership |
| Create Clerk application + copy API keys | Secret generation; keys must never be shared with Claude |
| Create Anthropic account + generate API key | Secret generation |
| Create Sentry organization + copy DSN | Account ownership |
| Create Grafana Cloud account + get credentials | Account ownership |
| Create UptimeRobot account + configure monitors | Account ownership |
| Create Stripe account + complete identity verification | Legal/financial identity required |
| Create Resend account + verify sending domain | Domain ownership verification |
| Set environment variables on Render | Secrets must be entered directly into Render dashboard, never committed or shared |
| Purchase and configure domain (Squarespace) | Payment + ownership |
| Configure DNS records | Domain account access |
| Invite beta users | Human judgment on who gets access |

### Where a Human SHOULD Be Required (by policy)
These are technically automatable but require human judgment or carry irreversible consequences. The human-in-the-loop principle applies here.

| Task | Why human gate matters |
|------|------------------------|
| Merging PRs to `main` | Final review before production deploy |
| Deploying to production | Deliberate action, not automatic |
| Running database migrations on production | Irreversible; human should verify before executing |
| Granting admin or sub-admin roles | Access control; human accountability |
| Revoking or invalidating invite codes | User-facing consequence |
| Approving low-confidence crawled events | Core human-in-the-loop data quality gate |
| Approving new venues for crawling | Ensures crawl targets are legitimate |
| Spend approval above a set threshold | Cost control; human authorization required |
| Any destructive operation (drop table, delete user) | Irreversible; requires explicit intent |

### What Claude Can Fully Own
All implementation, configuration, and automation work that does not touch secrets or require external account access.

- Monorepo scaffold, all configuration files (`turbo.json`, `tsconfig.json`, `pnpm-workspace.yaml`, `.eslintrc`, etc.)
- Drizzle schema, migrations, and seed scripts
- All application code (API routes, frontend components, crawler logic)
- GitHub Actions workflow files (using secrets injected by the human)
- Dockerfile configuration
- Test suites (unit, integration, E2E, smoke)
- Documentation
- `.env.example` files listing required variables (never `.env` files with values)

---

## Pre-Work: Account Setup Checklist

Complete all of the following before writing any code. Most Phase 1 work is blocked without these. Items marked **SECRET** must never be shared with Claude — enter them directly into Render's environment variable dashboard.

### Version Control + CI
- [ ] Create GitHub repository (`concert-crawl`, private)
- [ ] Enable Dependabot (security updates)
- [ ] Enable GitHub secret scanning
- [ ] Enable GitHub branch protection on `main` (require PR + passing checks)
- [ ] Subscribe to GitHub Pro ($4/month) for 3,000 CI minutes

### Hosting (Render)
- [ ] Create Render account + configure billing
- [ ] Create Managed Postgres instance (note connection string — **SECRET**)
- [ ] Create Web Service for `apps/api` (connect GitHub repo)
- [ ] Create Web Service for `apps/web` (connect GitHub repo)
- [ ] Create Cron Job for `apps/crawler` (daily schedule)
- [ ] Note Render deploy webhook URLs for GitHub Actions

### Auth (Clerk)
- [ ] Create Clerk application
- [ ] Create dev instance (for local development)
- [ ] Create staging instance (for Render staging)
- [ ] Create production instance
- [ ] Copy `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` per environment — **SECRET**

### LLM (Anthropic)
- [ ] Create Anthropic account
- [ ] Generate API key — **SECRET**
- [ ] Set usage limits/alerts to cap unexpected spend

### Payments (Stripe)
- [ ] Create Stripe account + complete identity verification
- [ ] Note test mode API keys (for local + staging) — **SECRET**
- [ ] Note live mode API keys (for production) — **SECRET**
- [ ] Configure Stripe webhook endpoints per environment

### Email (Resend)
- [ ] Create Resend account
- [ ] Verify sending domain
- [ ] Generate API key — **SECRET**

### Observability
- [ ] Create Sentry organization + project (copy DSN — **SECRET**)
- [ ] Create Grafana Cloud account (copy credentials — **SECRET**)
- [ ] Create UptimeRobot account + configure monitors (after first deploy)

### Domain
- [ ] Purchase `concertcrawl.com` (or chosen domain) via Squarespace
- [ ] Configure DNS to point to Render after first deploy

### Local Development
- [ ] Install Docker Desktop (for local Postgres)
- [ ] Install pnpm (`npm install -g pnpm`)
- [ ] Clone repository
- [ ] Copy `.env.example` → `.env.local` in each app and fill in dev values

---

## Phased Development Plan

### Phase 1 — Foundation
- Monorepo scaffold (Turborepo + pnpm workspaces)
- Shared packages: `db` (Drizzle schema + migrations + indexes), `types`, `config`
- Conventional commits + Husky + lint-staged (Prettier + ESLint on every commit)
- `CLAUDE.md` initialized at repo root
- Docker Compose for local Postgres
- `.env.example` files per app
- Hono API: health endpoint, auth middleware, role middleware, Zod validation
- Next.js: app shell, Clerk auth integration, protected routing
- Bruno API collection initialized (`apps/api/bruno/`)
- DB seed script with sample Denver venues and events (`pnpm db:seed`)
- Render deployment config (all 4 services)
- GitHub Actions CI with full cache strategy (pnpm store, Turborepo, Playwright browsers)
- **Milestone:** App deployed to Render, auth works end-to-end, API health check passes CI, PR run completes in under 5 minutes

### Phase 2 — Venue Management (Admin)
- Admin UI: invite code generation, user access list
- Venue CRUD via API + admin UI
- `venues` and `invite_codes` DB tables live
- Audit logging for admin actions
- **Milestone:** Admin can create invite codes, add/edit venues; all actions logged

### Phase 3 — Crawler v1
- Playwright crawler for a single venue (manual test)
- Claude Haiku extraction with prompt caching
- `events` and `crawl_runs` tables live
- Cost tracking written per crawl run
- Manual trigger endpoint (admin UI)
- Low-confidence event flagging
- **Milestone:** Admin can trigger a crawl, events appear in DB, cost is recorded

### Phase 4 — Consumer Calendar UI
- Calendar view (month/week/list)
- Event detail pages with JSON-LD structured data
- Search + filter (artist, venue, date range)
- User profile (saved events)
- Mobile-first responsive layout, dark/light mode
- PWA manifest
- **Milestone:** Authenticated users can browse, search, and save events

### Phase 5 — Observability + Testing
- Pino structured logging across API and crawler
- Sentry error tracking (API + web)
- OpenTelemetry → Grafana Cloud
- UptimeRobot uptime monitoring
- Vitest integration test suite
- Playwright E2E suite (staging)
- Hourly smoke tests (prod, GitHub Actions cron)
- Grafana alerts on smoke test failure
- **Milestone:** Full observability stack live; smoke tests running; alerts firing correctly

### Phase 6 — Automation + Scheduling
- Render cron job for daily crawler (all active venues)
- Crawl status dashboard in admin UI
- Admin data refinement tools (review low-confidence events)
- Email alerts on crawl failure (Resend)
- **Milestone:** Fully automated daily crawls, admin visibility into crawl health

### Phase 7 — Beta Launch Prep
- Seed with Denver venue list (~50–100 venues)
- End-to-end beta flow: invite code → signup → browse events
- Stripe integration (subscription tiers, founder pricing)
- User feedback system: Sentry User Feedback widget + in-app form + `feedback` table
- Feedback admin UI: simple table view of all submissions
- Performance audit (Core Web Vitals)
- Security review
- **Milestone:** Private beta live, founder tier purchasable, feedback collection active, first real users

### Future Phases
- Ticket price tracking (hourly crawls, BullMQ + Redis)
- Spotify integration
- Artist following + notifications
- Friend groups + social features
- Public launch
