# Epic Run Briefing — Spotify Sync (#763)

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-18-spotify-sync-execution-plan.md` — master sequencing: 5 phases, 10–11 PRs, gates. Follow its order exactly.
2. `docs/superpowers/specs/2026-07-18-spotify-sync-eng-spec.md` (merged PR #1010) — locked eng decisions E1–E10: schema, Clerk OAuth, matching SQL, jobs, push, entitlements. Where plan and spec disagree, the spec wins.
3. Design brief `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` (merged PR #893) — the 7 locked product decisions. (Issue #763 itself carries a stale "pre-handoff / NOT READY" body — do not treat it as authoritative.)
4. Design handoff `design/design_handoff_spotify_sync/` — visual ground truth (README decisions, R1 + R2 mock files, READINESS.md 🟢 with 11 build-time polish items).

## Current state (verified 2026-07-18)

- **Spec merged:** PR #1010 (`c7a6ba4d`). Execution plan + this briefing: PR #1018.
- **Clerk Spotify provider: NOT enabled** in either Clerk instance (staging or prod). Hugh enables it manually with scopes `user-follow-read user-top-read` — required only for PR 5 *staging validation*; all code merges without it.
- **Spotify Developer app: does not exist.** Hugh creates it (redirect URIs = Clerk callback URLs, shown in the Clerk dashboard when enabling the provider). New apps are in Development Mode — **25 allowlisted Spotify accounts max**; Extended Quota Mode request (weeks-long Spotify review) is a **launch blocker**, filed as a GH issue when the feature hits staging.
- **Env vars that do not exist yet** (created in the PR that first reads them; values set by Hugh, listed in each PR body): `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (Render api), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Vercel), `EMAIL_UNSUBSCRIBE_SECRET` (Render api), `SPOTIFY_SYNC_DRY_RUN` (weekly cron, `1` for the first staging cycle).
- **Render cron `concert-crawl-spotify-weekly` does not exist** — created at PR 4 deploy (`30 15 * * 1`). Render cron gotchas (memory-verified): no Deploy Hook UI (deploy via `POST /v1/services/{id}/deploys`), rejects `commitId`, no `/rollback` endpoint (dashboard-only rollback).
- **Schema today:** `user_artist_follows` = `{id, userId, artistName, spotifyArtistId, createdAt}` — no `source`/`canonicalName` yet. `apps/api/src/jobs/billing-daily.ts` 90-day purge deletes ALL follow rows for a lapsed user (~line 685) — PR 1 scopes it to `source='manual'`.
- **Email system:** template keys live in `EMAIL_TEMPLATE_KEYS` (`packages/db/src/schema/commerce.ts`) with a lockstep assertion in `packages/db/src/schema.test.ts`; footer families are `'billing' | 'product'` in `apps/api/src/emails/layout.ts` — PR 4 adds `'digest'`.
- **Entitlements:** `spotify-sync` row exists in `packages/entitlements/src/index.ts` with free/supporter `hidden` — PR 2 re-cuts per spec §7.
- **Known anomalies to ignore:** staging crawler intentionally paused (prod is crawl-health evidence); #737 in-app tray not shipped — `notifications` rows are write-only back-fill.

## Hard pause points — stop and ask, do not proceed

- **Prod backfill scripts (PR 1):** running `canonicalName` / `canonical_supporting` backfills against the prod DB is a production-DB touch — explicit Hugh approval per run.
- **Anything needing the Clerk or Spotify dashboards** (provider enablement, app creation, quota request submission): Hugh-only; pause the affected validation, keep building unaffected PRs.
- **First non-dry-run digest cycle in prod** (unsetting `SPOTIFY_SYNC_DRY_RUN`): Hugh confirms after reviewing the dry-run log output.

## Notify-and-proceed

- **Staging backfills (PR 1):** run against staging directly; capture before/after row counts as evidence. Safe: expand-only columns, idempotent scripts.
- **Entitlements re-cut merge (PR 2):** flips matrix cells nobody reads until PR 7 — merge and note it; no user-visible change.
- **Creating the Render weekly cron (PR 4):** create suspended-or-dry-run first (`SPOTIFY_SYNC_DRY_RUN=1`), capture the first run's log summary. Safe: dry-run sends nothing; `email_template_config` kill switch is a second brake.
- **Push subscription endpoints + SW handler (PR 9):** merge and validate on staging with a self-subscribed device; no sends occur until PR 10's fan-out exists.

## Done means

- Phases 0–5 merged (10–11 PRs), each through the full Copilot bar with green CI.
- Staging E2E pass end-to-end: connect with a real allowlisted Spotify account → Following chip on browse/hero/detail → taste filter + discovery shelf as premium → digest test-send renders (HTML + plain text, zero-week variant) → push received on an installed PWA.
- Purge invariants regression-tested: disconnect purges Spotify rows + Clerk external account, watching survives, manual rows survive, billing purge is source-scoped.
- Extended Quota GH issue open (launch-blocker labels) and request filed by Hugh.
- `releases.ts` entry shipped; `progress.md` row landed; `.env.example` files + `docs/runbooks/production-launch.md` env tables updated.
- Dormant-but-built: `notifications` rows accumulating for the #737 tray back-fill; push copy variants wired to `autoWatch`.
