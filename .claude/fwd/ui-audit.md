# Concert Crawl extension for ui-audit

These add to the plugin's `ui-audit` skill and win where they conflict. The user is Hugh.

The sweep command is `uiSweep` in `.claude/fwd.json`.

## Sweep engine

- Engine lives in `apps/e2e/src/audit/` (shipped in PR #946). Marker file for the preflight
  repo check: `apps/e2e/src/audit/manifest.ts`.
- Default clone: `REPO_DIR="${REPO_DIR:-$HOME/Projects/concert-crawl}"`. Repo slug:
  `featherweight-design/concert-crawl`.
- **Output directory (`<outDir>`):** `apps/e2e/audit-output/`. Artifacts land in
  `apps/e2e/audit-output/<runId>/`.
- **Base URL:** `PLAYWRIGHT_AUDIT_BASE_URL`, or default staging.
- **Prod guard:** `assertNotProdBaseUrl`. The sweep never targets prod.
- **Script name gotcha:** the script is `audit:sweep`, not `audit` — `audit` collides with
  pnpm's built-in `audit` subcommand and silently doesn't dispatch.
- **Empty tags:** a bare `--tags=""` used to reach the parser as `[""]` (fixed in PR 3 of the
  ui-audit plan); stay defensive anyway.
- Auth for admin routes needs `E2E_AUDIT_ADMIN_EMAIL` and `E2E_AUDIT_ADMIN_PASSWORD`; when unset,
  `prepareAuditAuth` reports an `auth` sweep error.

## Preflight checks

1. **Staging population.** Query the upcoming-events count via the staging DB env var already in
   Hugh's shell:
   ```bash
   PGPASSWORD_FROM_URL=$(node -e "console.log(new URL(process.env.NEON_STAGING_DIRECT).password)")
   count=$(psql "$NEON_STAGING_DIRECT" -t -c "SELECT count(*) FROM events WHERE date >= CURRENT_DATE" | tr -d ' ')
   ```
   Threshold: `count` < 50 means unseeded. Prompt: "Staging looks unseeded (only $count upcoming
   events). Run `pnpm db:seed:staging` first — ...". Seed command: `pnpm db:seed:staging`.
2. **Fixture users.** Check `scripts/seed-staging/fixture-users.ts`. If the ids still contain
   `user_2fixture_alpha` (placeholder), skip the auth-required routes `admin-feedback`,
   `admin-contests`, `admin-events`, `my-shows`, and warn Hugh the audit is consumer-only until
   fixtures land.

## Route tags and triage buckets

- Tags include `admin` and `consumer` ("skip admin" → `--tags=consumer`).
- Buckets: **Admin** = every capture whose `routeId` starts with `admin-`; **Consumer** =
  everything else.
- The engine emits the heuristic JSON shape the triage brief describes, and filenames
  `<routeId>__<state>__<viewport>.png`.

Calibration examples from this app: the Admin Feedback "CONTEXT" column wraps one character per
line at 320px/390px (`admin-feedback`, state `expand-first-card`, `overflow`, `balk`); broken
venue thumbnails (`image`); `venue-detail` header hero image (`image`, `degraded`).

## Issue labels

Label set (besides `ui-audit`; it deliberately holds no priority label):

```
-f "labels[]=type: bug" \
-f "labels[]=source: internal" \
-f "labels[]=phase: beta" \
```

Priority label, exactly one, from the severity mapping: `balk` → `priority: high`,
`degraded` → `priority: normal`. Every ui-audit issue therefore carries 5 labels in total.

## Related docs

- Sweep engine spec: `docs/superpowers/specs/2026-07-11-ui-audit-staging-seeder-design.md` §2a-§2d
- Plan doc: `docs/superpowers/plans/2026-07-12-ui-audit-plan.md` §PR 4

## Follow-ups tracked in `project_pickup_ui_audit_seeder.md`

- Issue #951 — `pnpm audit` CI check bypassed via `continue-on-error: true`; replacement scanner needed
- Batch INSERTs in `scripts/seed-staging/sync-*.ts` — non-urgent perf hint from PR 1 R24
- Delete paused staging crawler Render cron (sync replaces it)

## Sweep invocation (added in the public-plugin pass)

- `uiSweep` is a pnpm script, and pnpm forwards trailing arguments to the script, so the skill's
  appended `--tags=admin` reaches the engine with no `--` separator. (The private skill wrote
  `pnpm --filter e2e audit:sweep -- --tags=admin`; both forms worked here.)
- Calibration example lost from the generic text: the Admin Feedback "CONTEXT" column wrap was
  originally classed `overflow` in the example JSON at 390x844; by the triage rules it is a
  `wrap` finding reported at 320x568.
