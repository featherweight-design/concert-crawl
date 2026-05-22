# DB Rollback Runbook

**When to use this:** A migration has been applied to staging or production that needs to be reversed — data loss risk, breakage in prod, or a schema change that went out before the matching code was deployed.

---

## 0 — Stop the bleeding first

Before touching the database, reduce inbound pressure:

1. **Suspend the daily crawl** — In the Render dashboard, pause the `concert-crawl-crawler-prod` cron job so no new data is written during rollback.
2. **Take the API offline (if necessary)** — If the broken schema is actively causing 500s, suspend the `concert-crawl-api-prod` web service. Users will see the Next.js error boundary; that's preferable to corrupt data.

---

## 1 — Identify the target migration

```bash
# List applied migrations in the DB
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

On staging/prod, use the Render MCP tool (`mcp__render__query_render_postgres`) — it is read-only, so you can query but cannot roll back via it. Use it only to confirm state.

The migration filename to roll back is in `packages/db/drizzle/` — match the hash from the query above to the file on disk.

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
# Connect to staging DB (get connection string from Render dashboard or env)
psql "$STAGING_DATABASE_URL" -f path/to/down_migration.sql
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
psql "$PROD_DATABASE_URL" -f path/to/down_migration.sql
```

Then manually update the Drizzle migrations journal to remove the rolled-back entry:

```bash
psql "$PROD_DATABASE_URL" \
  -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = '<id-from-step-1>';"
```

---

## 5 — Deploy the matching code rollback

The schema rollback is useless if the application code still expects the new shape. Deploy the previous release from Render:

1. Render dashboard → Service → **Deploys**
2. Find the last green deploy before the bad migration
3. Click **Rollback to this deploy**

Render will redeploy from that commit SHA without rebuilding from `main`.

---

## 6 — Restore normal operations

1. Re-enable the crawler cron job in Render
2. Re-enable the API service if it was suspended
3. Verify a clean crawl run completes in the Render logs
4. File a post-incident note in `docs/runbooks/` capturing what happened and what the permanent fix is

---

## Operational notes

### Rate limits reset on redeploy

API-level rate limits (feedback, invite code validation, waitlist) are **in-memory** and reset on every deploy or service restart. There is no Redis backing them. This means:

- A rollback + redeploy clears all active rate limit windows
- On multi-instance scale-out (if Render ever runs more than one instance), each instance has its own independent counter
- See issue #525 for the tracking ticket to replace these with a durable store

During a rollback incident, treat rate limits as non-functional until a Redis-backed implementation ships.

### Expand/contract is the prevention

The migration strategy (expand/contract only — see `CLAUDE.md`) is specifically designed to make rollbacks safe: new columns are nullable, old columns are not dropped until the new code is proven in prod. A rollback under expand/contract should only require removing the new nullable column or index — never restoring data.

If a migration ever *deletes* a column or *renames* one without an expand phase first, that is a process violation — the post-incident note should capture this and the violation should inform future review criteria.
