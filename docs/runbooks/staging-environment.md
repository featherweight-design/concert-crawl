# Staging Environment Runbook

How the staging environment gets its data, and the one line that must never be crossed.

---

## Staging data

Staging holds **prod content, never prod users.**

### Synced from prod

`venues`, `events` (rolling window), `artists`, `price_retrieval_log`
(excluding `source='community'`), `venue_guide_chips`.

Mechanism: `scripts/seed-staging/sync-prod-public-data.ts`, run weekly by
`.github/workflows/staging-content-sync.yml` (Mondays 15:00 UTC) and on demand
via `gh workflow run staging-content-sync.yml -f dry_run=true`.

By hand, with both connection strings exported:

```bash
pnpm db:seed:staging:sync -- --dry-run   # reports, writes nothing
pnpm db:seed:staging:sync                # commits
```

The workflow needs two repository secrets. A scheduled run always commits; a
manual dispatch defaults to `dry_run: true`, so writing is opt-in.

| Secret                | Purpose                                                      | How to create                                                                                                                                               |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEON_PROD_DIRECT`    | Read source — full Postgres URL for the prod Neon branch     | Neon console → project → prod branch → Connection string (direct, not pooled) → GitHub → Settings → Secrets and variables → Actions → New repository secret |
| `NEON_STAGING_DIRECT` | Write target — full Postgres URL for the staging Neon branch | Same path, staging branch                                                                                                                                   |

Until both exist the scheduled run fails at the preflight step with a named
error. That is intended — a sync that silently no-ops looks identical to a sync
that found nothing to do.

### Never synced

`price_submissions`, `submission_confirms`, `event_reports`,
`event_report_confirms`, `crews`, `social`, `notifications`, `user_profiles`,
`user_notification_preferences`, `users`, `commerce`, `spotify`,
`venue_fault_acknowledgements`.

**Why this line is hard:** the staging transactional-email gate (#1613) **fails
open**. A prod user row in staging, plus one of the suspended staging crons
being restored, is a path to emailing a real customer from staging. Content
tables carry no foreign key into any user table, which is what makes the split
enforceable rather than aspirational.

`event_reports` is excluded even though it holds no contact information: its
`reporter_id` is a Clerk user ID, and a moderation queue is not test data
anybody needs.

**A Neon branch from prod is the wrong tool here.** It is one command and it
copies every user row.

### Two safety layers

1. `assertWriteHostNotProd(prodUrl, stagingUrl)` throws before any connection
   opens if both URLs address the same Neon branch. Neon gives one branch both a
   direct and a `-pooler` hostname, so the comparison strips that marker first —
   otherwise naming the prod branch by its pooled endpoint would slip past a
   check against its direct one, which is a single dropdown in the console.
2. `openProdReadonly(prodUrl)` returns a client exposing only `.select`, whose
   inner Drizzle handle is a proxy exposing only `.select` and `.query`; every
   other property access throws.

Any table added to the sync must route through both. Never open a second prod
connection.

### Synthetic users

Staging user fixtures come from `scripts/seed-staging/seed-synthetic.ts`
(`pnpm db:seed:staging:synthetic`), not from prod. `pnpm db:seed:staging` runs
the content sync and the synthetic seed in that order.

---

## Known behaviours, not bugs

- **A fresh staging DB reports every chip and price-log row as
  `skippedMissingFk`.** The `venueIdMap` is built from a read-only SELECT
  against staging, so on a database that has never had a commit-mode venue sync
  the map is empty and every FK-dependent row is skipped. Run the sync once in
  commit mode, then the counts become realistic.
- **`artists` is synced in full, with no rolling window**, unlike `events` and
  `price_retrieval_log`. An artist row has no date to window on, and the table
  is a projection of the event funnel, so its size tracks distinct acts rather
  than show count.
- **Chips are upserted, never deleted.** A chip removed in prod stays in staging
  until someone truncates it. Staging is test data, and a delete pass is a new
  class of write against the staging DB for no test-value gain.
