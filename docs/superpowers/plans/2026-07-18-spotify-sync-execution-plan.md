# Spotify Sync (#763) — Execution Plan

**Status:** Roadmap for implementation
**Ticket:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) — note: the issue body predates the design handoff and still carries a stale "pre-handoff / NOT READY" warning; the merged design brief + eng spec below supersede it
**Eng spec:** `docs/superpowers/specs/2026-07-18-spotify-sync-eng-spec.md` (PR #1010) — decisions E1–E10 are locked there; this plan sequences them
**Design:** `design/design_handoff_spotify_sync/` — 🟢 Green (READINESS.md)
**Authored:** 2026-07-18

> This is a **roadmap / sequencing doc, not an implementation plan**. Per-PR implementation plans are written using `superpowers:writing-plans` at the start of each PR, referencing this document and the eng spec. Nothing here overrides the spec — where they disagree, the spec wins and this doc gets fixed.

---

## Purpose

Break the Spotify Sync feature into an ordered set of PRs that each ship independently, keep `main` deployable at every merge, and respect the spec's sequencing constraints (§14): schema first, free spine before premium payoff, entitlements re-cut early, crawler fan-out last.

## Inputs

- **Eng spec** (above) — schema, OAuth path, matching, jobs, push, entitlements. The single source of truth for *what*.
- **Design handoff** — layout/copy/behavior for every surface, locked. Mocks are reference-only; reimplement in the real stack.
- **READINESS.md** — the 11 prototype-polish items (aria-disabled locked chip, eye glyph, "Denver" capitalization, etc.) are build-time requirements, folded into the relevant UI PRs below.
- **Entitlements matrix** (`packages/entitlements/src/index.ts`) — `canUseFeature(state, 'spotify-sync')` is the only gate expression.

## Ground rules (apply to every PR)

- Worktree per PR; per-worktree test DB; typecheck + lint + test before push; Copilot merge bar per `~/.claude/CLAUDE.md`.
- Expand-only migrations; migration timestamps exceed all prior journal entries; JS-side canonicalization only (migration↔JS parity).
- All customer-facing strings in `apps/web/src/components/consumer/spotify/definitions/copy.ts` (new scope), lifted verbatim from the mocks.
- Token-only theming (9 themes); `--accent` never used for the follow signal; Spotify green only inside the official logo asset.
- Mobile 320px baseline with behavioral desktop parity in the same PR.
- New env vars listed in the PR body (name, purpose, creation steps) and added to `.env.example` + `docs/runbooks/production-launch.md` in the PR that first reads them.

---

## Sequenced phases

### Phase 0 — Foundations (no user-visible change)

**PR 1 · Schema + backfills** — `feat/763-spotify-schema`

- New tables: `user_spotify_connections`, `push_subscriptions`, `spotify_alert_log` (spec §4.1, §4.4, §4.5).
- Extend `user_artist_follows`: `source` enum, `canonicalName`, `rank`, `lastSyncedAt` + indexes (§4.2).
- Extend `events`: `canonical_supporting text[]` + GIN index (§4.3); crawler upsert set-clause writes it wherever `supportingArtists` is written.
- Extend `user_profiles`: `spotifyNudgeSeenAt`.
- One-shot backfill scripts (`packages/db/src/scripts/`): `canonicalName` over existing follow rows; `canonical_supporting` over existing events (both JS `canonicalizeArtist`).
- **E9 fix in the same PR:** scope the `billing-daily` 90-day purge to `source = 'manual'` + regression test (the column lands here, so the fix can't lag it).
- Gate: migrations run clean locally + staging; backfill scripts executed against staging + prod (human checkpoint below).

**PR 2 · Entitlements re-cut** — `feat/763-spotify-entitlements`

- `spotify-sync` cells: free/supporter → `paywall-on-tap`, logged-out → `tier-picker-on-tap` (§7); lockstep test table updated in the same commit.
- Safe to land early: nothing reads the cell until the taste chip ships.

### Phase 1 — Free spine (R1 backend)

**PR 3 · Spotify client + sync engine + connection API** — `feat/763-spotify-connect-api`

- `apps/api/src/lib/spotify.ts` — Zod-validated fetch wrapper, pagination, 429 Retry-After handling (§5).
- Sync engine: Clerk token fetch (`getUserOauthAccessToken`), replace-set-per-source upsert in a transaction, status/error bookkeeping (§4.2, §8.1 phase 1 logic as a reusable function).
- Routes: `GET/POST/PATCH/DELETE /v1/spotify/connection` + `POST /v1/spotify/connection/sync` (10-min rate limit, 429 + Retry-After) (§6).
- Shared purge function (disconnect deletes row; revoke retains `status='revoked'`), Clerk external-account delete on disconnect.
- Cost tracking rows (`service: 'spotify'`, `costUsd: '0'`).
- Integration tests: CRUD, purge invariants (watching survives, manual rows survive), replace-set semantics, rate limit.

**PR 4 · Weekly cron + digest email** — `feat/763-spotify-weekly`

- `apps/api/src/jobs/spotify-weekly.ts` (build artifact pattern from `billing-jobs`): sync phase → digest phase → observability summary (§8.1).
- `spotify_digest` template — key added to `EMAIL_TEMPLATE_KEYS` in `packages/db/src/schema/commerce.ts` (+ `schema.test.ts` lockstep), then registry + `EmailTemplateVars` + `email_template_config` seed: inline hex, ≤5 shows + "+N more", zero-week variant, plain-text fallback, per the mock (§8.2).
- New `'digest'` email family in `apps/api/src/emails/layout.ts`; per-family footer link is the one-click HMAC unsubscribe `GET /v1/email/unsubscribe?uid=…&family=digest&token=…` (`timingSafeEqual` verify) flipping `digestEnabled`; `EMAIL_UNSUBSCRIBE_SECRET` env var.
- `SPOTIFY_SYNC_DRY_RUN` support.
- `render.yaml` entries (the file is descriptive documentation, not blueprint-synced — services are still created manually) for `concert-crawl-spotify-weekly` + `concert-crawl-spotify-weekly-staging` (`30 15 * * 1`, offset from `billing-jobs`) ship **in PR 4**, mirroring the `billing-jobs` entries. The agent creates the **staging** cron service itself in the Render **concert-crawl > staging** project and sets `SPOTIFY_SYNC_DRY_RUN=1` on it for the first cycle (note: Render MCP create tools skip the env group — re-home env vars after creation); the **prod** cron remains a human checkpoint.
- Digest *sends* are premium-gated at send time via `canUseFeature`; landing this before the premium UI is safe — no premium users have connections yet, and dry-run covers the first staging cycle.

### Phase 2 — Free spine (R1 UI)

**PR 5 · Connect flow + Connections settings** — `feat/763-spotify-connect-ui`

- Settings ▸ Connections section (nav entry + `components/settings/connections/`): disconnected entry, connected card (account · count · last-synced · Refresh · auto-watch toggle · Disconnect + confirm sheet), refreshing state (§11).
- Honesty-rail interstitial → `user.createExternalAccount({ strategy: 'oauth_spotify' })` → return → `POST /v1/spotify/connection` → success screen + one-time auto-watch opt-in sheet (dismiss = no write).
- Post-first-watch nudge (single-fire via `spotifyNudgeSeenAt`, unconnected users only).
- Empty + failure + revoke states from `spotify-states.jsx`; revoke banner global on Browse.
- New copy scope `definitions/copy.ts`; official Spotify logo asset dropped in (never redrawn).
- READINESS polish items that live on these surfaces.
- Blocks on Hugh's Clerk provider enablement for **staging validation only** — code merges without it.

**PR 6 · "Following" highlighting** — `feat/763-spotify-following`

- API: optional `followedArtists: string[]` on event list/detail responses (batch overlap query, signed-in + connected only, zero cost on public path) (§9.2).
- Web: neutral Spotify-marked `Following` chip in the browse chip row, hero eyebrow slot, detail attribution strip under the Watching pill (§11). Never `--accent`.
- This PR makes the free feature usable end-to-end, so the `releases.ts` entry ships **here** (same-PR convention); PR 11 amends it for the premium surfaces if needed.

### Phase 3 — Premium payoff (R2, order-independent after Phase 2)

**PR 7 · Taste filter** — `feat/763-taste-filter`

- API: `taste=1` flag on `GET /v1/events` — entitlement check + `EXISTS` matched-events subquery, AND-composed (§9.3).
- Web: leading toggle chip on FilterBar (off / on `--signal` / locked `aria-disabled` → upsell sheet reusing the tier-picker paywall), `filterTaste` query param.
- First reader of the Phase-0 entitlements re-cut.

**PR 8 · Discovery shelf** — `feat/763-discovery-shelf`

- API: `GET /v1/spotify/taste-picks?limit=10` — deterministic ranking (top rank → followed → soonest), `reason` payload (§9.4).
- Web: "Based on your taste" shelf pinned atop Browse (premium + connected only), reason chips, empty ("quiet month") + failure (Reconnect) states.

**PR 9 · Web Push infrastructure** — `feat/763-web-push`

- `web-push` lib + VAPID env vars; `POST/DELETE /v1/push/subscriptions`; send helper with 404/410 soft-disable (§10.2).
- Serwist SW `push` + `notificationclick` handlers; subscription UI in Settings ▸ Connections (permission prompt, iOS-installed-PWA copy).
- Independent of Spotify data — can land any time in Phase 3, but must precede PR 10.

### Phase 4 — Fan-out (last backend PR)

**PR 10 · Crawler new-show fan-out** — `feat/763-spotify-fanout`

- Thread inserted-event IDs out of `crawl.ts`; post-crawl fire-and-forget hook in both crawler paths (§10.1).
- Auto-watch (free, `autoWatch=true`) + push (premium, `pushEnabled` + `canUseFeature`), both claimed through `spotify_alert_log`; `notifications` rows written for the #737 tray back-fill.
- Push copy variant keyed off `autoWatch` (design lock).
- Integration tests: idempotency across crashes/re-crawls, insert-only triggering, isolation (hook failure never fails a crawl).

### Phase 5 — Ship

**PR 11 · Release notes + wrap-up** — `feat/763-spotify-release`

- `releases.ts` entry (spotlight wiring if assets exist), `progress.md` row, any straggler polish from staging validation.
- May fold into PR 10 if nothing else surfaces — judgment call at the time.

**Estimated total: 10–11 PRs.** Each phase's PRs are sequential within the phase; Phase 3 PRs 7–9 may interleave.

---

## Human checkpoints (Hugh)

| When | Action |
|---|---|
| Before PR 5 staging validation | Create Spotify Developer app (staging + prod redirect URIs); enable Spotify provider in **both** Clerk instances with scopes `user-follow-read user-top-read` (spec §3) |
| As soon as the feature hits staging | File Spotify **Extended Quota Mode** request (dev mode = 25 allowlisted users; approval takes weeks; launch blocker — tracked as a GH issue at PR-5 time) |
| PR 1 merge | Approve running backfill scripts against prod (production DB touch = explicit approval) |
| PR 4 deploy | Create the **prod** `concert-crawl-spotify-weekly` Render cron (dashboard/API; cron jobs have no deploy-hook UI) + set `EMAIL_UNSUBSCRIBE_SECRET`, `SPOTIFY_SYNC_DRY_RUN=1` for the first cycle. (Staging cron + `render.yaml` entries are handled by the agent in PR 4 — see Phase 1.) |
| PR 9 deploy | Generate VAPID keys (`npx web-push generate-vapid-keys`); set the three api vars + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on Vercel |
| End-to-end staging pass | Connect with a real allowlisted Spotify account; verify Following chip, taste filter, discovery, digest test-send, push on an installed PWA |

## Rollback strategy

- All migrations expand-only — no PR requires a schema rollback to revert; reverting a PR is a normal `git revert` + deploy.
- Weekly cron: suspend the Render cron job (dashboard) to halt sync + digest instantly; `email_template_config` kill switch stops digests independently.
- Push: unset `pushEnabled` default risk is nil (sends also gate on entitlement + subscription rows); worst case delete `push_subscriptions` rows.
- Fan-out: the hook is fire-and-forget behind logged catches — a bad deploy degrades to "no alerts," never to a broken crawl.
- Connect flow: disabling the Spotify provider in Clerk instantly halts new connects without a deploy.

## What this plan does NOT cover

- In-app notification tray (#737) — rows are written, read path ships with #737.
- Social surfacing of Spotify taste (#762).
- Extended Quota approval timeline — external to us; only the *request* is scheduled here.
- Per-PR implementation detail — written per-PR via `superpowers:writing-plans`.

## Cross-references

- Eng spec: `docs/superpowers/specs/2026-07-18-spotify-sync-eng-spec.md`
- Design brief: `docs/superpowers/specs/2026-07-11-spotify-sync-design.md`
- Design handoff: `design/design_handoff_spotify_sync/` (+ `READINESS.md`)
- Entitlements matrix: `packages/entitlements/src/index.ts`
- Precedent structure: `docs/superpowers/plans/2026-06-27-monetization-execution-plan.md`
