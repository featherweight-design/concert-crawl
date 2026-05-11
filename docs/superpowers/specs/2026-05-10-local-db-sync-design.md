# Local DB Sync — Design Spec

**Date:** 2026-05-10  
**Status:** Approved  
**Goal:** Make the local development database prod-like so Hugh can test features against real data before merging a PR and deploying to staging.

---

## Problem

The existing `seed.ts` is minimal: 5 venues, 15 fake events, no price submissions, no feedback, no watching data. It is not representative of what staging (and eventually production) looks like, making it hard to catch UI/UX bugs or data-edge cases locally.

---

## Approach

Two-phase operation, run once manually:

1. **Staging sync** — Query the staging Postgres (via Render MCP) to export real venue, event, and crawl data into a local SQL snapshot file, then apply it to the local Docker Postgres.
2. **Enriched seed** — Expand `packages/db/seed.ts` to generate representative user-linked data (profiles, watching, price submissions, feedback, etc.) after the sync.

Neither step is automated or recurring — this is a one-time setup command documented in the project README.

---

## Part 1: Staging Snapshot

### Mechanism

Use `mcp__render__query_render_postgres` (read-only, no credentials exposed) to query the staging DB. Results are used to generate a SQL file at `scripts/staging-snapshot.sql`.

### Tables synced

| Table | Notes |
|---|---|
| `venues` | All rows — real crawl configs, consecutive failures, wait-until settings |
| `events` | Up to 50 rows per venue (ORDER BY date DESC) — real artists, dates, prices |
| `crawl_runs` | Last 5 runs per venue — drives admin sparklines and health display |
| `price_retrieval_log` | Last 10 entries per venue — drives price pipeline history |

### Tables excluded

| Table | Reason |
|---|---|
| `waitlist_entries` | May contain real email addresses |
| `crawl_triggers` | Ephemeral scheduler state |
| `audit_log` | Staging-specific actor IDs, not meaningful locally |
| `notifications` | Staging-specific, not meaningful locally |
| All user tables | Seeded synthetically (see Part 2) |

### Output

`scripts/staging-snapshot.sql` — a standalone SQL file containing:
- `TRUNCATE` statements (in safe dependency order: price_retrieval_log → crawl_runs → events → venues)
- `INSERT` statements for all synced rows
- Committed to the repo so it can be re-applied without re-querying staging

### Apply command

```bash
docker exec -i concert-crawl-db psql -U postgres -d concert_crawl_db < scripts/staging-snapshot.sql
```

A convenience wrapper `pnpm db:sync-local` will be added to the root `package.json` that runs the above command then immediately runs `pnpm db:seed`.

---

## Part 2: Enriched Seed

Expands `packages/db/seed.ts`. All inserts use `onConflictDoNothing` — fully idempotent and safe to re-run after a fresh sync.

### Synthetic users

| Handle | Clerk user ID | Role | Purpose |
|---|---|---|---|
| `hugh` | `user_3CoSI01LtxRAvremTpL0yDfuEJ6` | admin | Hugh's local user |
| `jess_r` | `user_fake_jess_0001` | user | Active watcher + price submitter |
| `marco_d` | `user_fake_marco_0002` | user | Price submitter, light watching |
| `amy_k` | `user_fake_amy_0003` | sub_admin | Sub-admin permissions testing |
| `ghost` | `user_fake_ghost_0004` | user | Minimal profile, no activity |

Fake user IDs use the prefix `user_fake_` — clearly non-Clerk, safe to store locally.

### Seeded tables

| Table | Volume | Detail |
|---|---|---|
| `user_profiles` | 5 | Varied themes (electric, jade, pulse, forge, cedar); `ghost` has no handle |
| `user_roles` | 5 | Hugh=admin (priceCredScore=15), amy_k=sub_admin (priceCredScore=5), jess_r=user (priceCredScore=8), marco_d=user (priceCredScore=3), ghost=user (priceCredScore=0) |
| `invite_codes` | 7 | 5 unused; 2 used (by jess_r + marco_d, with `usedAt` timestamps) |
| `user_events` | ~15 | Hugh watches 6 events; jess_r + marco_d watch others; mix of `watching`, `going`, `interested` |
| `price_submissions` | 10 | Mix of pending/corroborated/disputed; GA/VIP/Reserved tiers; AXS/Ticketmaster/SeatGeek vendors; some with `savedPrice` |
| `submission_confirms` | 4 | Corroboration rows for the `corroborated` submissions |
| `feedback` | 6 | bug×2, idea×2, praise×2; from Hugh + jess_r + marco_d |
| `notifications` | 4 | Admin alerts: 1 crawl failure, 1 venue blocked, 2 low-confidence events |
| `waitlist_entries` | 8 | `test+N@example.com` emails |

### Event references in seed

Price submissions and `user_events` reference real event IDs. At seed time, the script will `SELECT id FROM events ORDER BY date DESC LIMIT 50` and distribute synthetic records across the returned IDs. If no events exist (e.g., sync not yet run), seed gracefully skips those tables and logs a warning.

---

## Delivery

| Artifact | Path |
|---|---|
| Staging snapshot SQL | `scripts/staging-snapshot.sql` |
| Enriched seed script | `packages/db/seed.ts` (expanded in-place) |
| Convenience script | `pnpm db:sync-local` in root `package.json` |
| README section | `## Local Development → Seeding with staging data` |

---

## Running the full setup

```bash
# 1. Wipe and re-migrate local DB
docker compose down -v && docker compose up -d
pnpm db:migrate

# 2. Apply staging snapshot
pnpm db:sync-local   # runs staging-snapshot.sql then pnpm db:seed
```

This leaves local Postgres in a state that mirrors staging core data + representative user activity.
