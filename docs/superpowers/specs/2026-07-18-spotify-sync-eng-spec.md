# Spotify Sync — Engineering Spec

**Status:** Draft for Copilot review
**Ticket:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763)
**Design:** `design/design_handoff_spotify_sync/` — 🟢 Green (READINESS.md, PR #925)
**Design brief:** `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` (PR #893)
**Authored:** 2026-07-18
**Downstream:** execution plan → `docs/superpowers/plans/2026-07-18-spotify-sync-execution-plan.md`, then epic-run

---

## 1. Scope

Users connect their Spotify account (read-only: followed artists + top artists). Concert Crawl matches those artists against Denver events and:

- **Free (R1 "connect chapter"):** connect flow (Settings ▸ Connections + one-time post-first-watch nudge), OAuth honesty-rail interstitial, connect success + one-time auto-watch opt-in, connected settings (refresh / auto-watch toggle / disconnect), neutral Spotify-marked "Following" treatment on browse / hero / event detail, empty + failure states.
- **Premium payoff (R2, gated `premium || founder` — plus `gifted` and role-comped, see §7):** taste filter chip on FilterBar, "Based on your taste" discovery shelf on Browse, weekly digest email, new-show push alerts.

Design owns layout/copy/behavior (locked, Green). This spec owns everything the brief marked eng-owned: OAuth provider path, token handling, schema, sync cron, matching, rate limits, push infrastructure, and the entitlements re-cut.

### Out of scope

- In-app notification tray (consumer read path) — hard dep on [#737](https://github.com/HartiganHM/concert-crawl/issues/737). We _write_ `notifications` rows so the tray back-fills when #737 ships; push-only for v1 per the handoff.
- Social surfacing of Spotify data (#762 territory).
- Playlist / track-history ingestion (brief Q4 lock).
- Recommendation ML — discovery ranking is deterministic (§9).

---

## 2. Locked engineering decisions (summary)

| #   | Decision                     | Choice                                                                                                                                                                           |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | OAuth path                   | **Clerk Spotify provider** — Clerk stores + refreshes tokens; we never persist Spotify refresh tokens                                                                            |
| E2  | Artist storage               | **Extend `user_artist_follows`** (source enum + rank + canonical name), not a new table                                                                                          |
| E3  | Matching                     | Equality join on canonicalized names: `events.canonical_artist` + new `events.canonical_supporting` (text[], GIN)                                                                |
| E4  | Sync cadence                 | New weekly Render cron (`spotify-weekly`) + on-demand refresh endpoint (per-user rate-limited)                                                                                   |
| E5  | Digest                       | Same weekly job, after sync; new template in the existing Resend/registry family; per-family unsubscribe via signed token                                                        |
| E6  | New-show alerts + auto-watch | Post-crawl background fan-out hook in the crawler (fire-and-forget, mirrors existing background-task pattern)                                                                    |
| E7  | Push                         | Web Push (VAPID + `web-push` lib + Serwist `push` handler + `push_subscriptions` table); in-app tray deferred to #737                                                            |
| E8  | Entitlements                 | `spotify-sync` free/supporter cells flip `hidden` → `paywall-on-tap`; connect flow itself is ungated                                                                             |
| E9  | Purge interaction            | 90-day premium purge only deletes `source = 'manual'` follow rows; Spotify rows live/die with the connection                                                                     |
| E10 | Cost/observability           | Spotify API calls recorded to `cost_tracking` (`service: 'spotify'`, `costUsd: '0'` — string, matching the numeric-column insert pattern in `crawl.ts`, call counts in metadata) |

---

## 3. OAuth — Clerk Spotify provider (E1)

Clerk already fronts auth everywhere (`@clerk/nextjs` ^7.5, `@clerk/backend` ^2.33) and `AccountManagementRow.tsx` already renders `user.externalAccounts`. Spotify is a supported Clerk provider; the brief left Clerk-vs-direct-SDK to eng.

**Decision: Clerk.**

- Clerk stores access + refresh tokens and refreshes them server-side. We fetch a live access token on demand via the Backend SDK: `clerkClient.users.getUserOauthAccessToken(userId, 'oauth_spotify')`. No Spotify tokens ever touch our DB — the cleanest possible privacy story for "disconnect = we forget."
- Scopes: `user-follow-read user-top-read` (configured in Clerk dashboard as custom scopes on the Spotify provider). Read-only; the honesty-rail copy ("we never see your password") stays literally true.
- **Connect:** client calls `user.createExternalAccount({ strategy: 'oauth_spotify', redirectUrl })` from the honesty-rail interstitial, then Clerk handles the Spotify authorize hop. On return, the web app calls `POST /v1/spotify/connection` which verifies the external account exists on the Clerk user, creates our connection row, and triggers the first sync inline.
- **Disconnect:** `DELETE /v1/spotify/connection` purges our rows (§6) and deletes the Clerk external account via Backend SDK (`users.deleteExternalAccount`), which revokes our grant.
- **External revoke / expired grant detection:** any sync that gets a Clerk token error or a Spotify `401` marks the connection `status = 'revoked'` **and immediately purges Spotify-sourced follow rows** (brief Q7: revoke ⇒ purge; `user_events` watching rows always survive). Unlike explicit disconnect, the connection row itself is **retained** in `revoked` status so `GET /v1/spotify/connection` can drive the revoke banner + Reconnect CTA from `spotify-states.jsx`. Reconnecting overwrites the row back to `connected`; explicit disconnect from a revoked state deletes it.

### Prerequisites (Hugh, manual — before staging validation)

1. Create a Spotify Developer app (dashboard → two apps or one app with both redirect URIs: staging + prod Clerk frontend API callback URLs; Clerk shows the exact redirect URI when enabling the provider).
2. Enable the Spotify provider in **both** Clerk instances (staging + prod) with the client ID/secret and custom scopes `user-follow-read user-top-read` (uncheck Clerk defaults we don't need).
3. ⚠️ **Spotify dev-mode quota:** new Spotify apps run in Development Mode, which caps them at **5 authenticated users**. That is enough for staging and early beta testing and is the whole audience the feature can ever have, because Extended Quota Mode is not open to us: since 2025-05-15 it is restricted to organizations with a launched service and at least 250k monthly active users. Spotify-as-personalization therefore ships behind a feature flag (`docs/superpowers/specs/2026-09-06-feature-flags-design.md`) rather than to the public.

   > **Corrected 2026-08-04.** This step originally read "max 25 allowlisted Spotify accounts" and instructed us to file an Extended Quota Mode request as soon as the feature reached staging. Both were wrong: the 25 is the per-developer-account _Client ID_ limit introduced by Spotify's 2026-07-23 quota update, a different quantity, and the request is not a form we qualify to file.

No new secrets in our env for OAuth itself (Clerk holds them). See §13 for the env vars we _do_ add (VAPID, unsubscribe secret).

---

## 4. Schema (E2, E9)

All migrations expand-only. Timestamps must exceed all prior journal entries.

### 4.1 `user_spotify_connections` (new)

One row per connected user. **Explicit disconnect deletes the row; external revoke retains it** (`status = 'revoked'`, artist rows purged) so the UI can render the revoked state + Reconnect.

```ts
export const spotifyConnectionStatusEnum = pgEnum('spotify_connection_status', [
  'connected', // healthy
  'error', // last sync failed (Spotify 5xx / rate limit) — retry next cycle
  'revoked', // grant gone (external revoke or Clerk token failure) — banner + purge
])

export const userSpotifyConnections = pgTable(
  'user_spotify_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Clerk ID
    spotifyUserId: text('spotify_user_id').notNull(),
    displayName: text('display_name'), // Spotify account display name for Settings
    status: spotifyConnectionStatusEnum('status')
      .notNull()
      .default('connected'),
    autoWatch: boolean('auto_watch').notNull().default(false),
    digestEnabled: boolean('digest_enabled').notNull().default(true),
    pushEnabled: boolean('push_enabled').notNull().default(true),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastSyncError: text('last_sync_error'),
    artistCount: integer('artist_count').notNull().default(0),
  },
  (table) => ({
    userIdUnique: uniqueIndex('user_spotify_connections_user_id_idx').on(
      table.userId,
    ),
  }),
)
```

Notes:

- `autoWatch` is the R1 opt-in (default false = highlight-only; modal dismissal writes nothing). It also selects the push copy variant (R2 §5 design decision).
- The single-fire post-first-watch nudge targets _unconnected_ users, so its guard does **not** live here: add `spotifyNudgeSeenAt timestamp with time zone` to `user_profiles` (already one-row-per-user, lazily created). The connection row keeps connection-lifecycle fields only.
- `digestEnabled` / `pushEnabled` are the per-family opt-outs surfaced in Connections settings and the digest unsubscribe link. Premium gating is enforced at send time via `canUseFeature`, not stored here.

### 4.2 `user_artist_follows` (extend)

```ts
export const artistFollowSourceEnum = pgEnum('artist_follow_source', [
  'manual',           // future manual follows (beta-to-launch §239); existing rows backfill here
  'spotify_followed', // Spotify followed-artists endpoint
  'spotify_top',      // Spotify top-artists endpoint (~50, 6-month window)
])

// added columns
source: artistFollowSourceEnum('source').notNull().default('manual'),
canonicalName: text('canonical_name').notNull().default(''),
rank: integer('rank'),                       // 1-based for spotify_top; null otherwise
lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

// added indexes
uniqueIndex('user_artist_follows_user_source_artist_idx')
  .on(table.userId, table.source, table.spotifyArtistId)  // sync upsert key (spotify rows)
index('user_artist_follows_canonical_name_idx').on(table.canonicalName)
```

No standalone `user_id` index — the unique index's leading column already satisfies `userId`-only filters via prefix scan.

- SQL backfill in the same migration: `UPDATE user_artist_follows SET canonical_name = ...` is impossible in pure SQL (canonicalization is JS) — instead, backfill script in the migration PR runs `canonicalizeArtist` over existing rows via a one-shot script (`packages/db/src/scripts/`), mirroring the canonical-artist backfill pattern from migration 0044. Migration↔JS parity rule applies: the canonical form is _only_ computed in JS; SQL never re-implements it.
- Sync writes are a **replace-set per source**: delete `(userId, source)` rows not in the fresh pull, upsert the rest (update name/rank/lastSyncedAt on conflict). A mid-sync crash leaves the previous set intact (whole per-user sync wrapped in a transaction).
- **E9 purge fix:** `apps/api/src/jobs/billing-daily.ts` 90-day premium purge (currently deletes all `user_artist_follows` for the user, line ~685) narrows to `source = 'manual'`. Spotify-sourced rows power _free_ highlighting and are governed by connection lifecycle, not premium lapse.

### 4.3 `events.canonical_supporting` (extend)

```ts
canonicalSupporting: text('canonical_supporting').array(),  // canonicalizeArtist over supportingArtists
```

- Maintained by the crawler at upsert time wherever `supportingArtists` is written (packages/crawler-core/src/crawl.ts upsert set-clause) — same write path, no second pass.
- GIN index for array-overlap matching: `CREATE INDEX events_canonical_supporting_idx ON events USING gin (canonical_supporting)`.
- Backfill script over existing `supporting_artists` rows in the same PR (JS canonicalization, same parity rule).

### 4.4 `push_subscriptions` (new)

```ts
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }), // 404/410 from push service
  },
  (table) => ({
    endpointUnique: uniqueIndex('push_subscriptions_endpoint_idx').on(
      table.endpoint,
    ),
    userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  }),
)
```

One row per user-device pair. `410 Gone`/`404` responses soft-disable (set `disabledAt`); a later successful re-subscribe from the same endpoint clears it.

### 4.5 `spotify_alert_log` (new)

Idempotency guard for new-show fan-out (mirrors `email_send_log`'s claim-then-flip):

```ts
export const spotifyAlertLog = pgTable(
  'spotify_alert_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'push' | 'auto_watch'
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dedupe: uniqueIndex('spotify_alert_log_user_event_kind_idx').on(
      table.userId,
      table.eventId,
      table.kind,
    ),
  }),
)
```

A crawler re-crawl that updates an existing event never re-alerts: fan-out only runs for _inserted_ rows, and this log makes even that idempotent across crashes.

---

## 5. Spotify API client (new: `apps/api/src/lib/spotify.ts`)

Thin fetch wrapper, Zod-validated responses at the boundary (no `as` casts):

- `GET https://api.spotify.com/v1/me` → spotifyUserId + display name (connect time only).
- `GET /v1/me/following?type=artist&limit=50` → paginate via `after` cursor until exhausted.
- `GET /v1/me/top/artists?time_range=medium_term&limit=50` → single page (6-month window per brief Q4).
- Honors `Retry-After` on 429 (sleep + retry once; second 429 fails the user's sync with `status='error'`, retried next weekly cycle).
- Typical cost: 2–4 calls per user per sync. At 500 connected users that's ~2K calls/week — far under Spotify limits (rolling 30-second window). Per-run call count recorded per E10.

---

## 6. Connection API (Hono, all under `/v1/spotify`, `requireAuth`, Zod-validated)

| Route                              | Behavior                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/spotify/connection`       | `{ status, displayName, artistCount, lastSyncedAt, autoWatch, digestEnabled, pushEnabled } \| { status: 'disconnected' }` — drives Settings ▸ Connections + all failure banners                                 |
| `POST /v1/spotify/connection`      | Post-OAuth-return: verify `oauth_spotify` external account exists on the Clerk user, upsert connection row, run first sync inline (so success screen shows a real artist count). Returns the connection payload |
| `POST /v1/spotify/connection/sync` | On-demand "Refresh my taste." Per-user rate limit: reject if `lastSyncedAt` < 10 minutes ago (429 + `Retry-After` header, matching the existing rate-limit pattern in `apps/api/src/routes/feedback.ts`)        |
| `PATCH /v1/spotify/connection`     | Body: `{ autoWatch?, digestEnabled?, pushEnabled? }` — Settings toggles + the one-time auto-watch opt-in write                                                                                                  |
| `DELETE /v1/spotify/connection`    | Purge: delete connection row + `user_artist_follows where source in ('spotify_followed','spotify_top')`; delete Clerk external account. Watching rows untouched. 204                                            |

**Purge invariant (brief Q7):** disconnect and revoke share one artist-data purge function (delete `user_artist_follows where source in ('spotify_followed','spotify_top')`); auto-watched `user_events` rows always survive. They differ only in connection-row fate: disconnect deletes it (Settings shows the disconnected entry state); revoke retains it as `status='revoked'` (Settings + Browse show the revoke banner with Reconnect). Premium surfaces degrade gracefully in both cases — no connection row → empty/upsell states; revoked row → "taste on pause" per design.

Free vs premium: none of these routes carry `requireFeature` — connecting, syncing, auto-watch, and highlighting are free. Premium enforcement lives on the R2 read surfaces (§7–§10).

---

## 7. Entitlements re-cut (E8)

`packages/entitlements/src/index.ts`:

```ts
'spotify-sync': {
  'logged-out': 'tier-picker-on-tap',
  free: 'paywall-on-tap',        // was 'hidden'
  supporter: 'paywall-on-tap',   // was 'hidden'
  premium: 'visible-active',
  founder: 'visible-active',
  gifted: 'visible-active',
},
```

- Matches the Green design: Free/Supporter _see_ the taste filter chip locked and tap into the upsell sheet (`paywall-on-tap`), rather than the surface being hidden. `logged-out` routes to the tier picker like every other visible feature.
- `gifted` + role-comped stay active — the design's `premium || founder` shorthand maps to `canUseFeature(state, 'spotify-sync')`, which is the _only_ gate expression used in code (never a hand-rolled tier comparison; grandfathering and comps flow through PlanState).
- The matrix's lockstep test table updates in the same commit.
- Digest + push sends re-check `canUseFeature` at send time (a lapsed premium user stops receiving without any unsubscribe action).
- Discovery shelf and digest/push are `hidden`-style for free users in the design (no locked previews) — that's a UI decision per surface: the _taste filter chip_ is the one locked-visible surface; discovery/digest/push simply don't render/send for non-entitled users. One matrix cell can't express both, so surfaces that don't render check `active` only and ignore `surface`. Noted here so the plan doesn't invent extra matrix entries.

---

## 8. Sync job + digest (E4, E5)

### 8.1 Weekly cron

New Render cron **`concert-crawl-spotify-weekly`**, `30 15 * * 1` (Monday 9:30 AM MDT / 8:30 AM MST — offset 30 min from `billing-jobs` at `0 15 * * *` to avoid stacking two email/DB-heavy jobs on the same minute), Node runtime, entry `apps/api/dist/jobs/spotify-weekly.js` — same build artifact pattern as `billing-jobs`. Separate cron (not folded into `billing-daily`) because cadence is weekly and failure isolation matters: a Spotify outage must not risk dunning emails.

Job phases (each user wrapped in try/catch; one user's failure never halts the run):

1. **Sync:** for each `user_spotify_connections` row with `status != 'revoked'` — fetch Clerk token → pull followed + top artists → canonicalize → replace-set upsert → update `artistCount`, `lastSyncedAt`, `status`/`lastSyncError`.
2. **Digest:** for each connection where `digestEnabled` and `canUseFeature(planState, 'spotify-sync')` — build the week's matches (§9 query, window = next 7 days), render the `spotify_digest` template, send via `sendTransactionalEmail` with `dedupeKey = ${userId}:${isoWeek}` (idempotent re-runs). Zero-match weeks send the light variant (design lock) with 2 taste picks.
3. **Observability:** one `cost_tracking` row (`service: 'spotify'`, `costUsd: '0'`, metadata: users synced, API calls, failures, digests sent) + Pino summary + Sentry capture on phase-level errors.

### 8.2 Digest template

- New key `spotify_digest` added to `EMAIL_TEMPLATE_KEYS` in `packages/db/src/schema/commerce.ts` (the typed source of truth for `EmailTemplateKey`; update the lockstep assertion in `packages/db/src/schema.test.ts` in the same commit), then wired through `apps/api/src/emails/registry.ts` + `EmailTemplateVars` + the `email_template_config` seed row (admin kill switch for free).
- Rendered per the design mock (`digest-email.jsx`): inline hex (email exception), table layout, ≤5 shows + "+N more", zero-week variant, plain-text fallback.
- **Unsubscribe:** the digest is a **new email family `'digest'`** — extend the `family: 'billing' | 'product'` union in `apps/api/src/emails/layout.ts` (HTML `EmFooter` + `renderTextShell`). For this family only, the per-family footer link is a one-click signed URL instead of the Settings page: `GET /v1/email/unsubscribe?uid=<userId>&family=digest&token=<hmac>` — token is `HMAC-SHA256(EMAIL_UNSUBSCRIBE_SECRET, uid + ':' + family)`, recomputed server-side from the URL params and compared with `crypto.timingSafeEqual`; on match, flips `digestEnabled = false` and renders a plain confirmation. No auth required (email links must work logged-out). The secondary "All email settings" link continues to point at Settings, per the footer contract.

---

## 9. Matching + premium read surfaces (E3)

### 9.1 Match definition

A user's taste matches an event when:

```sql
-- $1 = the user's canonical_name array (text[]), bound as a parameter
events.canonical_artist = ANY($1::text[])
OR events.canonical_supporting && $1::text[]
```

(In Drizzle: `sql` template with the array parameter — never string-built.)

Canonicalization on both sides is `canonicalizeArtist` (`packages/crawler-core/src/lib/canonical-artist.ts`) — the identical function at crawl-write and sync-write time; queries are pure equality/overlap, no fuzzy matching at read time. (The beta-to-launch note "fuzzy matching required" is satisfied by canonicalization — diacritics, casing, separator-splitting — without introducing a similarity threshold to tune.)

### 9.2 Free highlighting ("Following" treatment)

Event list/detail responses gain an optional `followedArtists: string[]` field (display names of the user's matched artists for that event), computed only for signed-in users with a connection row: one extra query per request — fetch the user's canonical set (indexed, ≤ ~600 rows), overlap in SQL against the page of events. No N+1: single `WHERE event_id IN (...)`-style batch. Anonymous/unconnected requests skip it entirely (zero overhead on the public path).

### 9.3 Taste filter (premium)

- `GET /v1/events?taste=1` — Zod-validated flag; when present, `requireAuth` + entitlement check (403 `entitlement_required` if not active) + `EXISTS` subquery restricting to matched events. Composes with all existing filters (AND semantics per design).
- Web: `filterTaste` query param on Browse; chip states from the design (off / on `--signal` / locked → upsell via `useEntitlement('spotify-sync')` `surface`).

### 9.4 Discovery shelf (premium)

- `GET /v1/spotify/taste-picks?limit=10` — upcoming matched events ranked deterministically: top-artist rank ascending (rank 1 strongest) → followed-artist matches → soonest date as tiebreaker. Each item carries a `reason` (`'top' | 'followed'` + rank) so the UI can render the design's reason chips ("In your top 5" / "You play them a lot" / "Following").
- Failure states: connection `status = 'error' | 'revoked'` → API returns the status; UI renders "taste on pause" / Reconnect per design.

---

## 10. New-show fan-out: auto-watch + push (E6, E7)

### 10.1 Crawler hook

After a venue crawl completes (post price-pipeline, `apps/crawler/src/run.ts` — both triggered + daily paths), fire a background task with the venue's _inserted_ event IDs (insert-vs-update is already distinguishable at the upsert site; thread the inserted IDs out of `crawl.ts`). The task:

1. Loads the inserted events' canonical artist sets.
2. Finds matching users via the §9.1 join.
3. **Auto-watch** (free): for matches where connection `autoWatch = true` — claim `spotify_alert_log (kind='auto_watch')`, then upsert `user_events` `status='watching'` (skip if any row already exists for that user+event).
4. **Push** (premium): for matches where `pushEnabled` and `canUseFeature` — claim `spotify_alert_log (kind='push')`, insert a `notifications` row (`type='user_notification'`, `category='spotify.new_show'`, for the #737 tray back-fill), and send Web Push to all active subscriptions. Copy variant keyed off `autoWatch` (design lock).

Failure isolation: the whole hook is fire-and-forget with logged catches (async-catch rule); it can never fail a crawl. Fan-out for a typical crawl (≤ ~30 new events) is a handful of queries.

### 10.2 Web Push infrastructure

- **API:** `web-push` npm lib; VAPID keys via env (§13). `POST /v1/push/subscriptions` (upsert by endpoint) + `DELETE /v1/push/subscriptions` (by endpoint, body-supplied). Send helper marks `disabledAt` on 404/410.
- **Web:** Serwist SW gets a `push` handler (`showNotification` with title/body/tag/icon + `actionUrl` to the event detail) and a `notificationclick` handler (focus/open the URL). Subscription management UI lives in Settings ▸ Connections per design (enable prompt requests `Notification.permission`).
- iOS PWA push requires the app installed to the home screen (iOS 16.4+) — a real-world constraint the Connections UI copy already accommodates (design's push section shows lock-screen mocks; no in-app permission nagging).

---

## 11. Web surfaces (build-to-design; reference mocks in `design/design_handoff_spotify_sync/`)

| Surface                                      | Mock                       | Real location                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings ▸ Connections section               | `connections-settings.jsx` | New `connections` section in `SettingsRoute(Desktop).tsx` NAV + `components/settings/connections/`                                                                                                    |
| Connect entry + honesty rail + OAuth handoff | `connect-flow.jsx`         | Same folder; interstitial before `createExternalAccount`                                                                                                                                              |
| Success + auto-watch sheet                   | `connect-flow.jsx`         | Sheet component; PATCH autoWatch on choice; dismissal = no write (highlight-only default)                                                                                                             |
| Post-first-watch nudge (single-fire)         | `connect-flow.jsx`         | Watch-toggle success path; guarded by `user_profiles.spotifyNudgeSeenAt`; only when no connection row                                                                                                 |
| "Following" chip on browse/hero/detail       | `follow-highlight.jsx`     | `EventCard` chip row / `HeroEventCard` eyebrow slot / detail attribution strip under Watching pill — driven by `followedArtists` in responses; neutral `--surface-3` + Spotify mark, never `--accent` |
| Taste filter chip + upsell                   | `taste-filter.jsx`         | `FilterBar` (`filter-defs.ts` + new leading toggle chip); upsell reuses tier-picker paywall surface                                                                                                   |
| Discovery shelf                              | `discovery-surface.jsx`    | Browse page, above the grid, premium + connected only                                                                                                                                                 |
| Empty/failure/revoke states                  | `spotify-states.jsx`       | Per-surface; revoke banner global on Browse                                                                                                                                                           |
| Digest email                                 | `digest-email.jsx`         | `apps/api/src/emails/templates/spotify-digest.ts`                                                                                                                                                     |
| Push alert rendering                         | `push-alert.jsx`           | SW `showNotification` payload                                                                                                                                                                         |

Cross-cutting build constraints (from the Green handoff — restated as requirements):

- Token-only theming across all 9 themes; the **only** Spotify green is inside the official logo asset (drop in Spotify's brand SVG — never redrawn; `--spotify-green` token exists solely for it).
- All customer-facing strings in `components/consumer/spotify/definitions/copy.ts` (new scope) — copy lifted verbatim from the mocks.
- WCAG AA per the on-canvas A11Y notes, including the 11 "prototype polish" items in READINESS.md §🧹 (aria-disabled locked chip, eye-not-heart glyph, "Denver" capitalization, etc.) — build to the documented contract, not the mock markup.
- Mobile 320px baseline; behavioral mobile/desktop parity.
- Release notes entry in `apps/web/src/lib/definitions/releases.ts` ships with the final UI PR.

---

## 12. Testing + validation

- **Unit:** spotify client (Zod schemas, pagination, 429 handling — mocked fetch), canonical matching queries, unsubscribe token HMAC, push payload builder, entitlement matrix lockstep table.
- **Integration (per-worktree test DB):** connection CRUD + purge invariants (watching survives, spotify rows gone, manual rows survive), replace-set sync semantics (transaction rollback mid-sync), taste-filter query composition, fan-out idempotency via `spotify_alert_log`, digest dedupe key, billing-purge source-scoping regression.
- **E2E (staging):** connect flow with a real allowlisted Spotify account (Hugh's), Following chip appears after sync, taste filter + discovery for a premium user, digest via admin test-email path.
- **Sync job:** staging dry-run mode (`SPOTIFY_SYNC_DRY_RUN=1` logs instead of sending digests) for the first staging cycle.
- Prod: hourly smoke untouched; feature validates behind the beta cohort.

---

## 13. Env vars (new)

| Var                                      | App        | Purpose                                                   |
| ---------------------------------------- | ---------- | --------------------------------------------------------- |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | api        | Web Push VAPID pair (`npx web-push generate-vapid-keys`)  |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`           | web        | Same public key, browser-side subscribe                   |
| `VAPID_SUBJECT`                          | api        | `mailto:hugh@featherweight.design` (push-service contact) |
| `EMAIL_UNSUBSCRIBE_SECRET`               | api        | HMAC secret for unsubscribe tokens (32+ random bytes)     |
| `SPOTIFY_SYNC_DRY_RUN`                   | api (cron) | Optional; staging first-run safety                        |

Spotify client ID/secret live only in the Clerk dashboard (E1). `.env.example` files + `docs/runbooks/production-launch.md` tables update in the relevant PRs.

---

## 14. Sequencing constraints (input to the execution plan)

1. Schema + canonicalization backfills first (everything reads them).
2. Clerk provider enablement (Hugh) can proceed in parallel; connect flow PR blocks on it for staging validation only.
3. Free spine before premium payoff: connect API + sync engine → connect UI + highlighting → then R2 surfaces in any order (taste filter, discovery, digest, push).
4. Push infra (VAPID + subscriptions + SW handler) is independent of Spotify and can land any time before the fan-out PR.
5. Entitlements re-cut is small but load-bearing — its own early PR (it flips a visible surface for free users only when the taste chip ships, since nothing else reads the cell yet).
6. Crawler fan-out hook last among backend PRs (needs schema + matching + push + auto-watch all live).
7. #737 is _not_ a dependency for anything here (notifications rows are write-only for now).
