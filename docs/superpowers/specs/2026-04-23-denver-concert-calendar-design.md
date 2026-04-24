# Denver Concert Calendar — Design Spec

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

### Monorepo Structure (Turborepo + npm workspaces)

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

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Frontend framework | Next.js 14+ (App Router) | SSR/SSG for SEO, natural progression from React |
| Backend framework | Hono | TypeScript-first, lightweight, familiar from Fastify |
| ORM | Drizzle | TypeScript-native, parameterized queries, excellent DX |
| Auth | Clerk | Free tier (10k MAU), Next.js integration, supports Spotify OAuth |
| Styling | Tailwind CSS + shadcn/ui | Responsive utilities, CSS variable theming, Radix accessibility |
| Crawler | Playwright | Headless browser, handles JS-rendered sites |
| LLM extraction | Claude Haiku (Anthropic SDK) | Low cost, high accuracy for structured extraction; prompt caching enabled |
| Monorepo tooling | Turborepo | Build caching, task orchestration |
| Containerization | Dockerfile per app | Render handles runtime; Dockerfiles ensure portability |

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
| crawl_notes | text | Admin notes on crawl behavior |

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

1. Render cron triggers crawler daily
2. Crawler fetches active, verified venues from DB
3. Playwright launches headless browser, navigates to venue website
4. Raw HTML extracted and passed to Claude Haiku with structured extraction prompt (prompt caching enabled to reduce token costs)
5. Extracted events written to DB with `confidence_score`; low-confidence events flagged for admin review
6. Crawl run record written with token count and cost
7. Cost record written to `cost_tracking`
8. Future: ticket price crawls run hourly via BullMQ + Upstash Redis job queue targeting specific event URLs

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

### Cost Estimate

| Source | Est. minutes/month |
|--------|-------------------|
| PR checks (~20 PRs × 15 min) | ~300 min |
| Hourly smoke tests (24 × 2 min × 30 days) | ~1,440 min |
| **Total** | ~1,740 min |

Fits within GitHub Pro (3,000 min/month, $4/month). Cache aggressively (`node_modules`, Turborepo, Playwright browsers) to keep per-run time low.

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

## Phased Development Plan

### Phase 1 — Foundation
- Monorepo scaffold (Turborepo + workspaces)
- Shared packages: `db` (Drizzle schema + migrations), `types`, `config`
- Hono API: health endpoint, auth middleware, role middleware
- Next.js: app shell, Clerk auth integration, protected routing
- Render deployment config (all 4 services)
- GitHub Actions CI (type check + lint + unit tests)
- **Milestone:** App deployed to Render, auth works end-to-end, API health check passes CI

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
- Performance audit (Core Web Vitals)
- Security review
- **Milestone:** Private beta live, founder tier purchasable, first real users

### Future Phases
- Ticket price tracking (hourly crawls, BullMQ + Redis)
- Spotify integration
- Artist following + notifications
- Friend groups + social features
- Public launch
