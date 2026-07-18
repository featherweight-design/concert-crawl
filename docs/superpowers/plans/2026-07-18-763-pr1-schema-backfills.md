# #763 PR 1 — Spotify Sync Schema + Backfills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land every schema expansion the Spotify Sync epic needs (3 new tables, 3 extended tables), the two canonicalization backfill scripts, the crawler `canonical_supporting` writes, and the E9 billing-purge scope fix — all expand-only.

**Architecture:** New Drizzle schema file `spotify.ts` for the three net-new tables; column/enum additions to `social.ts`, `events.ts`, `user-profiles.ts`; one generated migration (plus manual GIN-index SQL if drizzle-kit won't emit it); canonicalization stays JS-only (`canonicalizeArtist`) — backfills are idempotent tsx scripts in repo-root `scripts/`, never SQL re-implementations.

**Tech Stack:** Drizzle ORM + drizzle-kit, Vitest, tsx one-shot scripts, pnpm/Turborepo.

## Global Constraints

- Spec source of truth: `docs/superpowers/specs/2026-07-18-spotify-sync-eng-spec.md` §4 (schema) + E9 (purge scope). Spec wins over this plan on conflict.
- Expand-only migration — no drops, no type changes, all new columns nullable or defaulted.
- Migration journal: latest entry is idx=50, `when`=1784311501329. The generated entry's `when` MUST exceed it (drizzle-kit uses current epoch ms — verify anyway).
- Canonicalization logic exists ONLY in JS (`canonicalizeArtist`, `packages/crawler-core/src/lib/canonical-artist.ts:63`). No SQL copy (Ø/ø parity rule).
- Backfill scripts: repo-root `scripts/` following the `2026-07-11-gifted-comps-backfill.ts` pattern (helpers file + test + dry-run default + `--commit` flag + CLI entrypoint guard). The spec's `packages/db/src/scripts/` location is overridden: scripts need `canonicalizeArtist` from `@concert-crawl/crawler-core`, and crawler-core depends on db — importing it from inside packages/db would create a workspace cycle. Repo-root scripts import both packages today; note this deviation in the PR body.
- ESLint `id-length` ≥2 (`err`, `ctx`, `idx`); TypeScript strict; no `as` casts.
- Snake_case DB names, camelCase TS names, `timestamp(..., { withTimezone: true })` everywhere.
- Staging backfill runs = notify-and-proceed (capture before/after counts). Prod backfill runs = HARD PAUSE for Hugh.

---

## File Structure

- Create: `packages/db/src/schema/spotify.ts` — `user_spotify_connections`, `push_subscriptions`, `spotify_alert_log`
- Modify: `packages/db/src/schema/social.ts` — extend `userArtistFollows` (enum + 4 columns + 2 indexes)
- Modify: `packages/db/src/schema/events.ts` — `canonicalSupporting` column + GIN index
- Modify: `packages/db/src/schema/user-profiles.ts` — `spotifyNudgeSeenAt`
- Modify: `packages/db/src/schema/index.ts` — export `./spotify.js`
- Modify: `packages/db/src/schema.test.ts` — new `describe` block, spec-lockstep assertions
- Create: `packages/db/migrations/0051_*.sql` + journal entry (drizzle-kit generate)
- Modify: `apps/api/src/jobs/billing-daily.ts:684-687` — purge scoped to `source = 'manual'`
- Modify: `apps/api/src/jobs/billing-daily.test.ts` — regression test for the scope
- Modify: `packages/crawler-core/src/crawl.ts:524,636,~718` — compute + write `canonicalSupporting`
- Modify: `packages/crawler-core/src/crawl.test.ts` — canonical_supporting write coverage
- Create: `scripts/2026-07-18-follows-canonical-name-backfill.ts` + `-helpers.ts` + `.test.ts`
- Create: `scripts/2026-07-18-events-canonical-supporting-backfill.ts` (shares helpers)

---

### Task 1: New tables — `packages/db/src/schema/spotify.ts`

**Files:**

- Create: `packages/db/src/schema/spotify.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/schema.test.ts`

**Interfaces:**

- Produces: `userSpotifyConnections`, `pushSubscriptions`, `spotifyAlertLog`, `spotifyConnectionStatusEnum`, plus `$inferSelect`/`$inferInsert` type exports — consumed by PRs 3/4/9/10.

- [ ] **Step 1: Write failing lockstep tests** — append to `packages/db/src/schema.test.ts` (import the new tables at top alongside existing imports):

```ts
describe('spotify sync schema (eng spec §4, PR 1)', () => {
  it('spotify_connection_status enum has exactly the spec values', () => {
    expect(spotifyConnectionStatusEnum.enumValues).toEqual([
      'connected',
      'error',
      'revoked',
    ])
  })

  it('user_spotify_connections has the spec §4 columns', () => {
    const cols = getTableColumns(userSpotifyConnections)
    expect(Object.keys(cols).sort()).toEqual(
      [
        'id',
        'userId',
        'spotifyUserId',
        'displayName',
        'status',
        'autoWatch',
        'digestEnabled',
        'pushEnabled',
        'connectedAt',
        'lastSyncedAt',
        'lastSyncError',
        'artistCount',
      ].sort(),
    )
    expect(cols.userId.notNull).toBe(true)
    expect(cols.status.notNull).toBe(true)
    expect(cols.status.default).toBe('connected')
    expect(cols.autoWatch.default).toBe(false)
    expect(cols.digestEnabled.default).toBe(true)
    expect(cols.pushEnabled.default).toBe(true)
    expect(cols.artistCount.default).toBe(0)
    expect(cols.lastSyncedAt.notNull).toBe(false)
    expect(cols.lastSyncError.notNull).toBe(false)
  })

  it('push_subscriptions has the spec §4 columns', () => {
    const cols = getTableColumns(pushSubscriptions)
    expect(Object.keys(cols).sort()).toEqual(
      [
        'id',
        'userId',
        'endpoint',
        'p256dh',
        'auth',
        'userAgent',
        'createdAt',
        'lastUsedAt',
        'disabledAt',
      ].sort(),
    )
    expect(cols.endpoint.notNull).toBe(true)
    expect(cols.disabledAt.notNull).toBe(false)
  })

  it('spotify_alert_log has the spec §4 columns', () => {
    const cols = getTableColumns(spotifyAlertLog)
    expect(Object.keys(cols).sort()).toEqual(
      ['id', 'userId', 'eventId', 'kind', 'createdAt'].sort(),
    )
    expect(cols.eventId.notNull).toBe(true)
  })
})
```

(Use the same column-introspection style the existing monetization block uses — check the file's current helpers; it may use `getTableColumns` from `drizzle-orm` or direct property access like `userBilling.userId.notNull`. Mirror whichever it uses.)

- [ ] **Step 2: Run to verify failure** — `pnpm --filter @concert-crawl/db test -- schema.test` → FAIL (imports unresolved).

- [ ] **Step 3: Implement `packages/db/src/schema/spotify.ts`:**

```ts
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { events } from './events.js'

export const spotifyConnectionStatusEnum = pgEnum('spotify_connection_status', [
  'connected',
  'error',
  'revoked',
])

// One row per user with a linked Spotify account. Disconnect (user-initiated)
// DELETEs the row; an externally revoked grant keeps the row with
// status='revoked' so the UI can prompt a reconnect (spec §4/§6).
export const userSpotifyConnections = pgTable(
  'user_spotify_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    spotifyUserId: text('spotify_user_id').notNull(),
    displayName: text('display_name'),
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
    userIdIdx: uniqueIndex('user_spotify_connections_user_id_idx').on(
      table.userId,
    ),
  }),
)

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
    // Soft-disable on 404/410 push-endpoint responses (spec §9) rather than
    // delete, so repeated failures don't thrash re-subscribes.
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (table) => ({
    endpointIdx: uniqueIndex('push_subscriptions_endpoint_idx').on(
      table.endpoint,
    ),
    userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  }),
)

// Idempotency ledger for fan-out (spec §10): a (user, event, kind) row is
// claimed before the side effect fires, so retries never double-send.
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
    userEventKindIdx: uniqueIndex('spotify_alert_log_user_event_kind_idx').on(
      table.userId,
      table.eventId,
      table.kind,
    ),
  }),
)

export type UserSpotifyConnection = typeof userSpotifyConnections.$inferSelect
export type NewUserSpotifyConnection =
  typeof userSpotifyConnections.$inferInsert
export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
export type SpotifyAlertLogRow = typeof spotifyAlertLog.$inferSelect
```

Then add to `packages/db/src/schema/index.ts` (after line 14):

```ts
export * from './spotify.js'
```

- [ ] **Step 4: Run tests** — `pnpm --filter @concert-crawl/db test -- schema.test` → PASS.
- [ ] **Step 5: Commit** — `git add packages/db/src/schema/spotify.ts packages/db/src/schema/index.ts packages/db/src/schema.test.ts && git commit -m "feat(db): add user_spotify_connections, push_subscriptions, spotify_alert_log tables (#763 PR 1)"`

---

### Task 2: Extend `user_artist_follows` (`social.ts`)

**Files:**

- Modify: `packages/db/src/schema/social.ts:56-64`
- Test: `packages/db/src/schema.test.ts`

**Interfaces:**

- Produces: `artistFollowSourceEnum` (`['manual','spotify_followed','spotify_top']`), columns `source`, `canonicalName`, `rank`, `lastSyncedAt` on `userArtistFollows` — consumed by PR 3's sync upserts and Task 6's purge fix.

- [ ] **Step 1: Failing tests** (same describe block):

```ts
it('artist_follow_source enum has exactly the spec values', () => {
  expect(artistFollowSourceEnum.enumValues).toEqual([
    'manual',
    'spotify_followed',
    'spotify_top',
  ])
})

it('user_artist_follows gains source/canonicalName/rank/lastSyncedAt', () => {
  const cols = getTableColumns(userArtistFollows)
  expect(cols.source.notNull).toBe(true)
  expect(cols.source.default).toBe('manual')
  expect(cols.canonicalName.notNull).toBe(true)
  expect(cols.canonicalName.default).toBe('')
  expect(cols.rank.notNull).toBe(false)
  expect(cols.lastSyncedAt.notNull).toBe(false)
})
```

- [ ] **Step 2: Verify FAIL.**
- [ ] **Step 3: Implement** — in `social.ts`, add `index`, `integer` to the drizzle-orm/pg-core import, add the enum above the table, and convert `userArtistFollows` to the two-arg form:

```ts
export const artistFollowSourceEnum = pgEnum('artist_follow_source', [
  'manual',
  'spotify_followed',
  'spotify_top',
])

export const userArtistFollows = pgTable(
  'user_artist_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    artistName: text('artist_name').notNull(),
    spotifyArtistId: text('spotify_artist_id'),
    source: artistFollowSourceEnum('source').notNull().default('manual'),
    // canonicalizeArtist(artistName) — written by app code on every insert;
    // parity rule: the transform lives ONLY in JS (see canonical-artist.ts),
    // backfilled by scripts/2026-07-18-follows-canonical-name-backfill.ts.
    canonicalName: text('canonical_name').notNull().default(''),
    // 1-based position for source='spotify_top'; NULL otherwise.
    rank: integer('rank'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Replace-set-per-source upsert target. NULL spotify_artist_id rows
    // (manual follows) are all distinct under Postgres NULL semantics —
    // intended: manual duplicates are guarded at the API layer, not here.
    userSourceArtistIdx: uniqueIndex(
      'user_artist_follows_user_source_artist_idx',
    ).on(table.userId, table.source, table.spotifyArtistId),
    canonicalNameIdx: index('user_artist_follows_canonical_name_idx').on(
      table.canonicalName,
    ),
  }),
)
```

(No standalone user_id index — the unique index's prefix covers user-scoped scans, per spec.)

- [ ] **Step 4: Verify PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(db): extend user_artist_follows with source/canonical_name/rank/last_synced_at (#763 PR 1)"`

---

### Task 3: `events.canonical_supporting` + GIN index

**Files:**

- Modify: `packages/db/src/schema/events.ts` (column after `canonicalTitle:113`, index in the table's index object)
- Test: `packages/db/src/schema.test.ts`

**Interfaces:**

- Produces: `events.canonicalSupporting: string[] | null` — matching column for the equality-join highlighting queries (PR 6/7) and crawler writes (Task 7).

- [ ] **Step 1: Failing test:**

```ts
it('events gains canonical_supporting text[]', () => {
  const cols = getTableColumns(events)
  expect(cols.canonicalSupporting).toBeDefined()
  expect(cols.canonicalSupporting.notNull).toBe(false)
})
```

- [ ] **Step 2: Verify FAIL.**
- [ ] **Step 3: Implement** — after `canonicalTitle` (events.ts:113):

```ts
    // canonicalizeArtist() applied element-wise to supportingArtists —
    // the equality-match surface for Spotify follow highlighting (#763).
    // Written by the crawler wherever supporting_artists is written;
    // backfilled by scripts/2026-07-18-events-canonical-supporting-backfill.ts.
    canonicalSupporting: text('canonical_supporting').array(),
```

and in the index object:

```ts
    canonicalSupportingIdx: index('events_canonical_supporting_idx').using(
      'gin',
      table.canonicalSupporting,
    ),
```

If the installed drizzle-orm version rejects `.using('gin', ...)` (typecheck failure), omit the Drizzle index definition and append the raw SQL to the generated migration in Task 5 instead: `CREATE INDEX "events_canonical_supporting_idx" ON "events" USING gin ("canonical_supporting");` — precedent: `search_vector`'s GIN index is raw-SQL-managed.

- [ ] **Step 4: Verify PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(db): add events.canonical_supporting with GIN index (#763 PR 1)"`

---

### Task 4: `user_profiles.spotify_nudge_seen_at`

**Files:**

- Modify: `packages/db/src/schema/user-profiles.ts:22-35`
- Test: `packages/db/src/schema.test.ts`

- [ ] **Step 1: Failing test:**

```ts
it('user_profiles gains spotifyNudgeSeenAt (nullable)', () => {
  const cols = getTableColumns(userProfiles)
  expect(cols.spotifyNudgeSeenAt).toBeDefined()
  expect(cols.spotifyNudgeSeenAt.notNull).toBe(false)
})
```

- [ ] **Step 2: Verify FAIL.**
- [ ] **Step 3: Implement** — after `theme`:

```ts
  // Set when the user dismisses the Spotify connect nudge (spec §8) so it
  // renders once. NULL = never shown/dismissed.
  spotifyNudgeSeenAt: timestamp('spotify_nudge_seen_at', {
    withTimezone: true,
  }),
```

- [ ] **Step 4: Verify PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(db): add user_profiles.spotify_nudge_seen_at (#763 PR 1)"`

---

### Task 5: Generate the migration

**Files:**

- Create: `packages/db/migrations/0051_*.sql` + `meta/0051_snapshot.json` + journal entry

- [ ] **Step 1:** `pnpm --filter @concert-crawl/db exec drizzle-kit generate` (check `packages/db/package.json` for the exact script name — likely `pnpm db:generate` at root).
- [ ] **Step 2: Inspect the SQL** — must contain ONLY: 2 `CREATE TYPE`, 3 `CREATE TABLE`, `ALTER TABLE` ADD COLUMN statements for events/user_artist_follows/user_profiles, and `CREATE [UNIQUE] INDEX` statements including `USING gin`. NO drops, NO alters of existing columns. If drizzle-kit didn't emit the GIN index (Task 3 fallback), append the raw `CREATE INDEX ... USING gin` line to the same migration file — do NOT hand-edit the journal.
- [ ] **Step 3: Verify journal** — `tail packages/db/migrations/meta/_journal.json`: new entry idx=51, `when` > 1784311501329.
- [ ] **Step 4: Apply locally** — `pnpm db:migrate` against local Docker Postgres; expect success. Then confirm: `docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db -c "\d user_artist_follows"` shows the new columns.
- [ ] **Step 5: Commit** — `git add packages/db/migrations && git commit -m "feat(db): migration 0051 — spotify sync schema expansion (#763 PR 1)"`

---

### Task 6: E9 purge scope fix (billing-daily)

**Files:**

- Modify: `apps/api/src/jobs/billing-daily.ts:683-696`
- Test: `apps/api/src/jobs/billing-daily.test.ts`

**Interfaces:**

- Consumes: `userArtistFollows.source` from Task 2.

- [ ] **Step 1: Failing regression test** — find the existing purge unit tests in `billing-daily.test.ts` (the file is unit-only; purge integration coverage is tracked in #914). Add a unit test asserting the delete condition includes the source scope. If the purge helper isn't unit-testable at that granularity, extract the where-clause builder into a pure helper and test that:

```ts
it('purge deletes only manual follow rows (E9 — spotify rows survive)', () => {
  // Assert the follows delete is scoped: userId match AND source = 'manual'.
  // Shape depends on existing test utilities in this file — mirror the
  // nearest sibling test's mocking approach.
})
```

- [ ] **Step 2: Verify FAIL.**
- [ ] **Step 3: Implement** — billing-daily.ts:684-687 becomes:

```ts
// Following — manual rows only (E9): Spotify-sourced rows live and
// die with the Spotify connection (PR 3 disconnect purge), not the
// billing clock.
const deletedFollows = await tx
  .delete(userArtistFollows)
  .where(
    and(
      eq(userArtistFollows.userId, row.userId),
      eq(userArtistFollows.source, 'manual'),
    ),
  )
  .returning({ id: userArtistFollows.id })
```

Leave `alertPrefs: null, spotifySyncState: null` in the audit counts unchanged (those become real in PR 3) but update the stale comment at line 689 to say the Spotify tables now exist and are intentionally excluded here.

- [ ] **Step 4: Verify PASS** — `pnpm --filter api test -- billing-daily`.
- [ ] **Step 5: Commit** — `git commit -m "fix(billing): scope 90-day follow purge to source='manual' (#763 E9)"`

---

### Task 7: Crawler writes `canonical_supporting`

**Files:**

- Modify: `packages/crawler-core/src/crawl.ts` (~line 524 compute; ~line 636 insert values; ~line 718 ON CONFLICT set)
- Test: `packages/crawler-core/src/crawl.test.ts`

**Interfaces:**

- Consumes: `canonicalizeArtist` (already imported in crawl.ts), `events.canonicalSupporting` from Task 3.
- Produces: every insert/update that writes `supporting_artists` also writes `canonical_supporting` (deduped, ''-filtered).

- [ ] **Step 1: Failing test** — in `crawl.test.ts`, find the existing upsert-values assertions (the tests that check `canonicalArtist`/`supportingArtists` in the insert payload) and extend/add:

```ts
it('writes canonical_supporting alongside supporting_artists', () => {
  // Given supportingArtists ['MIKE', 'Niontay & Friends', 'MIKE'],
  // expect canonicalSupporting ['mike', 'niontay'] — canonicalized,
  // deduped, empty strings dropped.
})
```

- [ ] **Step 2: Verify FAIL.**
- [ ] **Step 3: Implement** — at the ~line 524 enrichment map, alongside `canonicalArtist: canonicalizeArtist(event.artist)`:

```ts
          canonicalSupporting: canonicalizeSupporting(
            event.supportingArtists ?? [],
          ),
```

with a small exported helper next to the enrichment code (or in `canonical-artist.ts` if cleaner):

```ts
export function canonicalizeSupporting(artists: string[]): string[] {
  const seen = new Set<string>()
  for (const artist of artists) {
    const canonical = canonicalizeArtist(artist)
    if (canonical !== '') seen.add(canonical)
  }
  return [...seen]
}
```

Then in the insert values (~line 636): `canonicalSupporting: event.canonicalSupporting,` and in the ON CONFLICT set (~line 718, next to `supportingArtists: sql\`excluded.supporting_artists\``):

```ts
              canonicalSupporting: sql`excluded.canonical_supporting`,
```

Grep for any OTHER writer of `supportingArtists` (`grep -rn "supportingArtists" packages/crawler-core/src apps/api/src apps/web/src --include='*.ts' -l`) — admin manual-edit routes that write it must also write `canonicalSupporting` via the same helper. Add those call sites in this task if found.

- [ ] **Step 4: Verify PASS** — `pnpm --filter @concert-crawl/crawler-core test`.
- [ ] **Step 5: Commit** — `git commit -m "feat(crawler): write events.canonical_supporting on every supporting_artists write (#763 PR 1)"`

---

### Task 8: Backfill scripts

**Files:**

- Create: `scripts/2026-07-18-spotify-schema-backfill-helpers.ts`
- Create: `scripts/2026-07-18-spotify-schema-backfill.test.ts`
- Create: `scripts/2026-07-18-follows-canonical-name-backfill.ts`
- Create: `scripts/2026-07-18-events-canonical-supporting-backfill.ts`

**Interfaces:**

- Consumes: `canonicalizeArtist`/`canonicalizeSupporting` from `@concert-crawl/crawler-core`, `db`, `userArtistFollows`, `events` from `@concert-crawl/db`.
- Produces: idempotent CLI scripts, dry-run by default, `--commit` to write; batch updates keyed by primary key.

- [ ] **Step 1: Failing helper tests** — pure functions only (mirror `2026-06-19-non-concert-backfill-helpers.ts` split):

```ts
import { describe, expect, it } from 'vitest'
import {
  planFollowBackfill,
  planSupportingBackfill,
} from './2026-07-18-spotify-schema-backfill-helpers.js'

describe('planFollowBackfill', () => {
  it('maps artistName → canonicalName, skipping already-canonical rows', () => {
    const rows = [
      { id: 'a', artistName: 'Earl Sweatshirt & MIKE', canonicalName: '' },
      { id: 'b', artistName: 'MIKE', canonicalName: 'mike' },
    ]
    expect(planFollowBackfill(rows)).toEqual([
      { id: 'a', canonicalName: 'earl sweatshirt' },
    ])
  })
})

describe('planSupportingBackfill', () => {
  it('canonicalizes + dedupes supporting arrays, skipping null/backfilled rows', () => {
    const rows = [
      {
        id: 'e1',
        supportingArtists: ['MIKE', 'MIKE w/ band'],
        canonicalSupporting: null,
      },
      { id: 'e2', supportingArtists: null, canonicalSupporting: null },
      { id: 'e3', supportingArtists: ['X'], canonicalSupporting: ['x'] },
    ]
    expect(planSupportingBackfill(rows)).toEqual([
      { id: 'e1', canonicalSupporting: ['mike'] },
    ])
  })
})
```

- [ ] **Step 2: Verify FAIL** — `pnpm vitest run scripts/2026-07-18-spotify-schema-backfill.test.ts` (match how sibling script tests are invoked — check `scripts/package.json`).
- [ ] **Step 3: Implement helpers:**

```ts
import {
  canonicalizeArtist,
  canonicalizeSupporting,
} from '@concert-crawl/crawler-core'

export interface FollowRow {
  id: string
  artistName: string
  canonicalName: string
}

export interface FollowUpdate {
  id: string
  canonicalName: string
}

export function planFollowBackfill(rows: FollowRow[]): FollowUpdate[] {
  const updates: FollowUpdate[] = []
  for (const row of rows) {
    const canonical = canonicalizeArtist(row.artistName)
    if (canonical !== row.canonicalName) {
      updates.push({ id: row.id, canonicalName: canonical })
    }
  }
  return updates
}

export interface SupportingRow {
  id: string
  supportingArtists: string[] | null
  canonicalSupporting: string[] | null
}

export interface SupportingUpdate {
  id: string
  canonicalSupporting: string[]
}

export function planSupportingBackfill(
  rows: SupportingRow[],
): SupportingUpdate[] {
  const updates: SupportingUpdate[] = []
  for (const row of rows) {
    if (row.supportingArtists === null) continue
    if (row.canonicalSupporting !== null) continue
    updates.push({
      id: row.id,
      canonicalSupporting: canonicalizeSupporting(row.supportingArtists),
    })
  }
  return updates
}
```

(Requires `canonicalizeSupporting` exported from crawler-core's `index.ts` — add the export in Task 7.)

- [ ] **Step 4: Verify helper tests PASS.**
- [ ] **Step 5: Implement the two runner scripts** — mirror `2026-07-11-gifted-comps-backfill.ts` exactly: header comment (usage, idempotency, staging-then-prod note, HARD PAUSE for prod per CLAUDE.md), `runBackfill({ commit })` returning a summary `{ rowsScanned, updatesPlanned, rowsUpdated, committed }`, per-row dry-run logging, `pathToFileURL` CLI guard, `process.exit`. Select → plan via helper → in `--commit` mode loop `db.update(...).set(...).where(eq(table.id, upd.id))`. Follows script selects `{id, artistName, canonicalName}` where `canonicalName = ''`; events script selects `{id, supportingArtists, canonicalSupporting}` where `supportingArtists IS NOT NULL AND canonicalSupporting IS NULL`.
- [ ] **Step 6: Local end-to-end proof** — seed local DB (`pnpm db:seed`), then dry-run + `--commit` both scripts against `DATABASE_URL=postgres://postgres:postgres@localhost:5432/concert_crawl_db` (check the seed's actual local URL in `.env.example`); capture before/after counts. Re-run `--commit` → 0 updates (idempotency proof).
- [ ] **Step 7: Commit** — `git add scripts/2026-07-18-* && git commit -m "feat(scripts): canonical_name + canonical_supporting backfills (#763 PR 1)"`

---

### Task 9: Ship

- [ ] **Step 1:** Full local gate in the worktree: `pnpm typecheck && pnpm lint && pnpm test`.
- [ ] **Step 2:** Commit this plan doc (`docs/superpowers/plans/2026-07-18-763-pr1-schema-backfills.md`) if not already committed.
- [ ] **Step 3:** `git fetch origin && git rebase origin/main`, re-run tests if rebase pulled changes, push (plain unless rebase rewrote).
- [ ] **Step 4:** Open PR (template; `Closes` nothing — #763 closes at PR 11; reference `#763 PR 1/11`). Body notes: expand-only migration 0051, script-location deviation from spec (workspace-cycle rationale), staging backfill = notify-and-proceed, prod backfill + prod migration = Hugh approval. No new env vars. No releases.ts / progress.md row (customer-invisible groundwork).
- [ ] **Step 5:** `./scripts/request-copilot-review.sh <pr>` → full canonical review loop → merge at the bar → verify staging+prod deploy workflows ran → run staging migration/backfills (notify-and-proceed, capture counts) → HARD PAUSE before any prod backfill → `pnpm worktree:prune feat/763-spotify-schema` → update pickup memory.

---

## Self-Review (done at authoring)

- Spec §4 coverage: 3 new tables ✓, follows extension ✓, canonical_supporting + GIN ✓, spotify_nudge_seen_at ✓, E9 purge scope ✓, crawler write parity ✓, backfills same-PR ✓.
- Deviation logged: script location (repo-root `scripts/` vs spec's `packages/db/src/scripts/`) — workspace-cycle rationale, surfaced in PR body for review.
- Type consistency: `canonicalizeSupporting(artists: string[]): string[]` defined Task 7, consumed Task 8; `FollowRow`/`SupportingRow` shapes match the select projections in Task 8 Step 5.
