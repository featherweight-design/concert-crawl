# DB Rollback Runbook

**When to use this:** A migration has been applied to staging or production that needs to be reversed — data loss risk, breakage in prod, or a schema change that went out before the matching code was deployed.

---

## 0 — Stop the bleeding first

Before touching the database, reduce inbound pressure:

1. **Suspend the crawler crons** — In the Render dashboard, pause both `concert-crawl-crawler-triggers` and `concert-crawl-crawler-daily` so no new data is written during rollback.
2. **Take the API offline (if necessary)** — If the broken schema is actively causing 500s, suspend the `concert-crawl-api` web service on Render. Users will see the Next.js error boundary served from Vercel; that's preferable to corrupt data.

---

## 1 — Identify the target migration

```bash
# List applied migrations in the DB
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

On staging/prod (which run on Neon, not Render Postgres), use the Neon dashboard's SQL editor to run read-only queries for confirmation, or `docker run --rm postgres:16 psql "<neon URL>"` from your laptop using the **direct** (non-pooled) connection string. (Neon's SQL editor can also execute writes and DDL — treat it as a general-purpose console, not a read-only safety harness; stick to `SELECT` while diagnosing.) The Render MCP `query_render_postgres` tool no longer applies — Render Postgres is not the prod/staging DB.

The migration filename to roll back is in `packages/db/migrations/` — match the hash from the query above to the file on disk.

---

## 2 — Write the down migration

Drizzle does not generate down migrations automatically. You must write the inverse SQL by hand.

**Example:** if the up migration added a column:
```sql
ALTER TABLE events ADD COLUMN foo text;
```

The down migration is:
```sql
ALTER TABLE events DROP COLUMN IF EXISTS foo;
```

Save it as a raw `.sql` file (do NOT create a new Drizzle migration file — that would advance the journal forward).

---

## 3 — Apply on staging first

Never roll back production without validating on staging.

```bash
# Connect to staging DB — use Neon staging branch DIRECT URL (not pooled) for DDL
docker run --rm -i postgres:16 psql "$NEON_STAGING_DIRECT" -f path/to/down_migration.sql
```

Confirm:
- The table/column/index is gone (or restored, depending on the change)
- The API starts cleanly against staging
- E2E smoke tests pass

```bash
pnpm --filter @concert-crawl/e2e test:staging
```

---

## 4 — Apply to production

Only after staging passes.

```bash
docker run --rm -i postgres:16 psql "$NEON_PROD_DIRECT" -f path/to/down_migration.sql
```

Then remove the rolled-back entry from the Drizzle migrations log (the `drizzle.__drizzle_migrations` table — distinct from the `meta/_journal.json` file, which you do not need to edit):

```bash
docker run --rm postgres:16 psql "$NEON_PROD_DIRECT" \
  -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = '<id-from-step-1>';"
```

---

## 5 — Deploy the matching code rollback

The schema rollback is useless if the application code still expects the new shape. Deploy the previous release:

**API or crawler crons (Render):**
1. Render dashboard → service → **Builds** tab
2. Find the last green build before the bad migration
3. Click **Rollback** → Render redeploys that image without rebuilding from `main`

**Web (Vercel):**
1. Vercel dashboard → `concert-crawl` project → **Deployments**
2. Find the last green deploy before the bad migration
3. Click the **⋯** menu → **Promote to Production** — instant cutover, no rebuild

---

## 6 — Restore normal operations

1. Re-enable both crawler cron jobs in Render (`concert-crawl-crawler-triggers`, `concert-crawl-crawler-daily`)
2. Re-enable the API service if it was suspended (`concert-crawl-api`)
3. Verify a clean crawl run completes in the Render logs
4. File a post-incident note in `docs/runbooks/` capturing what happened and what the permanent fix is

---

## Operational notes

### Rate limits reset on redeploy

API-level rate limits (feedback, invite code validation, waitlist) are **in-memory** and reset on every deploy or service restart. There is no Redis backing them. This means:

- A rollback + redeploy clears all active rate limit windows
- On multi-instance scale-out (if Render ever runs more than one instance), each instance has its own independent counter
- See issue #528 for the tracking ticket to replace these with a durable store

During a rollback incident, treat rate limits as non-functional until a Redis-backed implementation ships.

### Expand/contract is the prevention

The migration strategy (expand/contract only — see `CLAUDE.md`) is specifically designed to make rollbacks safe: new columns are nullable, old columns are not dropped until the new code is proven in prod. A rollback under expand/contract should only require removing the new nullable column or index — never restoring data.

If a migration ever *deletes* a column or *renames* one without an expand phase first, that is a process violation — the post-incident note should capture this and the violation should inform future review criteria.
