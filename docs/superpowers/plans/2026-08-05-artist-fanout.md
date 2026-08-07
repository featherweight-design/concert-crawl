# Artist Fan-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new-show notifications fire for every artist a user follows, not just Spotify-sourced follows, so the already-shipped manual follow button stops being inert.

**Architecture:** The existing Spotify fan-out is generalized in place rather than forked. Its candidate query drops the follow-source filter and converts its inner join on `user_spotify_connections` to a LEFT JOIN, so a user with no Spotify connection still produces candidates. The module, its notification category, and its entitlement key are renamed off "Spotify" to match. No new tables and no new preference columns.

**Tech Stack:** TypeScript (strict), Hono, Drizzle ORM, Postgres, Vitest, Next.js App Router, pnpm + Turborepo.

**Source spec:** `docs/superpowers/specs/2026-08-05-artist-fanout-design.md` (merged in https://github.com/HartiganHM/concert-crawl/pull/1484).

## Global Constraints

- **Worktree only.** All file changes happen in a `.worktrees/<branch>` directory. `/Users/huey/Projects/concert-crawl` must stay clean.
- **No unsafe `as` casts.** Use Zod `safeParse`, type guards, or declaration merging. `as const` is not a cast in this sense and stays permitted.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- **Every `catch` logs.** Fire-and-forget is a `void` async IIFE.
- **Customer-facing strings live in a `definitions/copy.ts`**, never inline in a `.tsx`. No em-dashes in copy files.
- **Locked vocabulary:** Watching is the show-tracking concept and its icon is an **eye**, never a heart. "Price check", never dispute/contest/challenge. Following is a *separate* concept from Watching and must never be used as a synonym for it.
- **Migration timestamps:** the `when` value in `packages/db/migrations/meta/_journal.json` must exceed every prior entry. The last shipped migration is `0075_latin_extended_canonical` at `when: 1786665600000`.
- **Expand/contract migrations only.** Never destructive in a single deploy.
- **`SPOTIFY_SYNC_DRY_RUN` stays at `1`.** Nothing in this plan changes it.
- **Test commands:** `pnpm typecheck`, `pnpm lint`, `pnpm test`. Integration tests need `docker compose up -d` and run against a per-worktree DB created automatically on first run.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `apps/api/src/routes/artist-follows.ts` | Follow/unfollow route. Gains the `following` entitlement gate on POST only. | 1 |
| `apps/api/src/routes/artist-follows.integration.test.ts` | Route tests, extended for the gate. | 1 |
| `packages/crawler-core/src/lib/spotify-fanout/index.ts` | Candidate query + delivery loop. Generalized, then renamed. | 2, 3 |
| `packages/crawler-core/src/lib/artist-fanout/**` | Renamed module (directory, symbols, logger name, copy module). | 3 |
| `packages/crawler-core/src/index.ts` | Package barrel export. | 3 |
| `apps/crawler/src/run.ts` | Two call sites of the fan-out entry point. | 3 |
| `packages/push/src/notification-categories.ts` | The closed Zod category union and push-eligible set. | 4 |
| `apps/web/src/lib/notifications.ts` | The client's duplicated category list. | 4 |
| `apps/web/src/components/consumer/notifications/definitions/categories.ts` | Category label, ink, glyph, verb. | 4 |
| `apps/web/src/components/consumer/notifications/glyphs/index.tsx` | Glyph key rename. | 4 |
| `packages/db/migrations/0076_artist_new_show_category.sql` | Backfills existing rows to the new category. | 4 |
| `apps/web/src/components/settings/connections/ConnectionsPanel.tsx` | Hides the Connect entry point when the flag is off. | 5 |
| `apps/web/src/lib/definitions/releases.ts` | Release note for the user-facing change. | 6 |

**Task order is load-bearing.** Behavior changes (1, 2) land before renames (3, 4) so that a rename diff is never mixed with a logic diff — that combination is what makes a reviewer miss the logic.

---

### Task 1: Gate the follow route on the `following` entitlement

The entitlements matrix at `packages/entitlements/src/index.ts` already declares `following` as `paywall-on-tap` for free and supporter and `visible-active` for premium/founder/gifted. The route contradicts it with a header comment citing design brief #1115 §3.6. **Hugh confirmed on 2026-08-04 that the brief is out of date.** The matrix wins.

DELETE stays ungated: a user who downgrades must always be able to unfollow.

**Files:**
- Modify: `apps/api/src/routes/artist-follows.ts` (the file header comment and the POST route registration; line numbers are omitted deliberately, they drift)
- Test: `apps/api/src/routes/artist-follows.integration.test.ts`
- Modify: `apps/api/src/test/helpers/seed.ts` — `clearTables()` must truncate `subscriptions`, or the premium row leaks into later tests.

**Interfaces:**
- Consumes: `requireFeature(feature: PremiumFeature): MiddlewareHandler<{ Variables: EntitlementVariables }>` from `apps/api/src/middleware/entitlement.ts`. It returns `401` when unauthenticated and `403` with `{ success: false, error, code: 'entitlement_required', feature }` when the plan lacks the feature. It must be mounted **after** `clerkMiddleware()`.
- Produces: nothing new. `POST /v1/artists/:slug/follow` now returns `403` for free and supporter plans.

- [ ] **Step 1: Add the premium-subscription seed the file lacks**

The existing test file has **no plan seeding at all**. It models a free user as
the absence of a `subscriptions` row, which is why every current test passes
against an ungated route. Three things follow, and all three are easy to miss:

1. There is no `seedPremiumPlan` helper anywhere in the codebase. You are adding
   one, locally in this file.
2. `seedArtist` does **not** accept a `slug` override — it derives the slug from
   the canonical name. Pass `name` and let it derive.
3. Auth is the `authState.current` stub, not a header. The file's `follow(slug)`
   and `unfollow(slug)` helpers send no headers at all.

Copy the seeding shape from `apps/api/src/middleware/entitlement.integration.test.ts:48-60`,
which is the reference implementation:

```ts
import { subscriptions } from '@concert-crawl/db'

const seedPremiumPlan = async (userId = USER_ID): Promise<void> => {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  })
}
```

Add `subscriptions` to the `clearTables()` truncation, or the premium row leaks
into every test that runs after it and the 403 test passes or fails depending on
file order.

- [ ] **Step 2: Re-seed the existing POST tests as premium**

Every current test that calls `follow()` and expects success now expects `403`
unless the user has a plan. Add `await seedPremiumPlan()` to each of those, and
do not delete any of them — a premium user must still be able to follow, and the
"never constructs a Spotify client" invariant rides on those same tests.

- [ ] **Step 3: Write the failing tests**

```ts
describe('POST /v1/artists/:slug/follow — entitlement gate', () => {
  it('returns 403 with entitlement_required for a free plan', async () => {
    const artist = await seedArtist({ name: 'Big Head Todd' })
    authState.current = { userId: USER_ID }
    const res = await follow(artist.slug)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('entitlement_required')
    expect(body.feature).toBe('following')
    expect(await followRows()).toHaveLength(0)
  })

  it('lets a premium plan follow', async () => {
    const artist = await seedArtist({ name: 'Big Head Todd' })
    await seedPremiumPlan()
    authState.current = { userId: USER_ID }
    const res = await follow(artist.slug)
    expect(res.status).toBe(200)
    expect(await followRows()).toHaveLength(1)
  })

  it('lets a free plan unfollow — DELETE is never gated', async () => {
    const artist = await seedArtist({ name: 'Big Head Todd' })
    await seedPremiumPlan()
    authState.current = { userId: USER_ID }
    await follow(artist.slug)
    await testDb.delete(subscriptions)

    const res = await unfollow(artist.slug)
    expect(res.status).toBe(200)
    expect(await followRows()).toHaveLength(0)
  })
})
```

The third test deletes the subscription after following, which is the real
downgrade path — a user who followed while premium and then lapsed. Seeding a
free user with no follow to remove would pass trivially and prove nothing.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm --filter @concert-crawl/api test artist-follows`
Expected: the 403 test FAILS (receives `200`); the premium and DELETE tests pass.

A `401` here means `getAuth()` returned no `userId` — you forgot to set
`authState.current`, nothing more. `requireFeature` reads no other auth field, so
a missing `sessionClaims` still yields the `403` these tests want.

- [ ] **Step 5: Rewrite the route header comment**

Replace the file's header comment block with:

```ts
/**
 * Follow / unfollow an artist (#1115, PR-D).
 *
 * Following is a PREMIUM feature. The entitlements matrix has always said so
 * (`following` is paywall-on-tap for free/supporter); this router shipped
 * ungated on the strength of design brief #1115 §3.6, which Hugh retired on
 * 2026-08-04. POST carries requireFeature('following'); free and supporter get
 * a 403 the client turns into the paywall.
 *
 * DELETE is deliberately NOT gated. A user who downgrades must still be able
 * to unfollow, or they are stranded with rows they cannot remove.
 *
 * This router writes `user_artist_follows` and NOTHING else. It must never
 * call the Spotify API: the button does not follow the artist on the user's
 * Spotify account (brief §3.5). A regression test asserts zero Spotify calls.
 */
```

- [ ] **Step 6: Mount the gate on POST only**

Add the import at the top of `apps/api/src/routes/artist-follows.ts`:

```ts
import { requireFeature } from '../middleware/entitlement.js'
```

Change the POST registration from:

```ts
artistFollowsRouter.post('/:slug/follow', slugValidator, async (ctx) => {
```

to:

```ts
artistFollowsRouter.post(
  '/:slug/follow',
  slugValidator,
  requireFeature('following'),
  async (ctx) => {
```

and close the extra paren at the end of that handler (`})` becomes `},\n)`). Leave the DELETE registration untouched.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/api test artist-follows`
Expected: PASS, including the pre-existing zero-Spotify-calls regression test.

- [ ] **Step 8: Typecheck and commit**

```bash
pnpm typecheck
git add apps/api/src/routes/artist-follows.ts apps/api/src/routes/artist-follows.integration.test.ts
git commit -m "feat(api): gate artist follow on the following entitlement"
```

---

### Task 2: Generalize the fan-out candidate query

Two independent things block manual follows today, and both are in one query:

1. `inArray(userArtistFollows.source, [...SPOTIFY_FOLLOW_SOURCES])` — drop it entirely.
2. `.innerJoin(userSpotifyConnections, ...)` — a user with no connection row produces no candidates at all. This is the blocker that matters more, because it is also where the preferences live.

`ne(status, 'revoked')` moves **inside** the join condition. Left in the `where` clause with a LEFT JOIN it would filter the null rows straight back out, undoing the join.

The selected `userId` must come from `user_artist_follows`, the preserved side. Today's inner join makes the two sides interchangeable, so carrying the old select over unchanged silently drops every manual-only user.

Preference defaults for users with no connection row are asymmetric and deliberate: `pushEnabled` true because following *is* the opt-in, `autoWatch` false because following must never silently mutate the Watching list. Apply both as SQL `COALESCE` so no downstream consumer can forget them.

The push gate key also changes from `'spotify-sync'` to `'following'`, so a Premium user with no Spotify connection is no longer excluded from their own notifications.

**Files:**
- Modify: `packages/crawler-core/src/lib/spotify-fanout/index.ts:50-52, 221-239, 300`
- Test: `packages/crawler-core/src/lib/spotify-fanout/spotify-fanout.integration.test.ts`

**Interfaces:**
- Consumes: `MatchedConnection { userId: string; canonicalName: string; autoWatch: boolean; pushEnabled: boolean }` — unchanged shape, new population rules.
- Produces: `runSpotifyFanout` / `runSpotifyFanoutSafely` keep their signatures. Task 3 renames them.

- [ ] **Step 1: Write the failing tests**

First read the helpers that actually exist in
`packages/crawler-core/src/lib/spotify-fanout/spotify-fanout.integration.test.ts`.
They are `seedVenue(name)`, `seedEvent(input)`, `seedFollower(input)`,
`seedPremiumSubscription(userId)`, `noRole`, and `makeSendPush()`. The module
constants are `FREE_USER` and `PREMIUM_USER`.

**`seedFollower` cannot express the case under test.** It inserts a
`user_spotify_connections` row *and* a `source: 'spotify_followed'` follow, as a
pair. The whole point of Task 2 is the user who has the second without the first,
so add a helper alongside it that writes only the follow:

```ts
// A follow with NO connection row — the manual-only user, which seedFollower
// cannot represent because it always pairs a follow with a connection.
async function seedManualFollow(input: {
  userId: string
  canonicalName: string
}): Promise<void> {
  await db.insert(userArtistFollows).values({
    userId: input.userId,
    artistName: input.canonicalName,
    spotifyArtistId: null,
    source: 'manual',
    canonicalName: input.canonicalName,
  })
}
```

`clearFanoutState()` already truncates `user_artist_follows`,
`user_spotify_connections`, and `subscriptions`, so no teardown change is needed.

Then add the tests. Note the call shape the file uses: `runSpotifyFanout([eventId], { sendPush, getRole: noRole })`.

```ts
const seedShow = async (): Promise<string> => {
  const venueId = await seedVenue('Fillmore')
  return seedEvent({
    venueId,
    artist: 'Big Head Todd',
    canonicalArtist: 'big head todd',
  })
}

it('notifies a user whose ONLY follow is manual and who has no Spotify connection', async () => {
  const eventId = await seedShow()
  await seedManualFollow({
    userId: PREMIUM_USER,
    canonicalName: 'big head todd',
  })
  await seedPremiumSubscription(PREMIUM_USER)

  const sendPush = makeSendPush()
  const summary = await runSpotifyFanout([eventId], {
    sendPush,
    getRole: noRole,
  })

  expect(summary.pushesClaimed).toBe(1)
  expect(sendPush).toHaveBeenCalledTimes(1)
})

it('does not auto-watch a manual follower — autoWatch defaults false', async () => {
  const eventId = await seedShow()
  await seedManualFollow({
    userId: PREMIUM_USER,
    canonicalName: 'big head todd',
  })
  await seedPremiumSubscription(PREMIUM_USER)

  const summary = await runSpotifyFanout([eventId], {
    sendPush: makeSendPush(),
    getRole: noRole,
  })

  expect(summary.autoWatched).toBe(0)
  const watching = await db
    .select()
    .from(userEvents)
    .where(eq(userEvents.userId, PREMIUM_USER))
  expect(watching).toHaveLength(0)
})

it('still notifies when the Spotify connection is revoked', async () => {
  const eventId = await seedShow()
  await seedFollower({
    userId: PREMIUM_USER,
    canonicalName: 'big head todd',
    status: 'revoked',
    pushEnabled: true,
  })
  await seedPremiumSubscription(PREMIUM_USER)

  const summary = await runSpotifyFanout([eventId], {
    sendPush: makeSendPush(),
    getRole: noRole,
  })

  expect(summary.pushesClaimed).toBe(1)
})

it('sends exactly one push when the same artist is followed manually AND via Spotify', async () => {
  const eventId = await seedShow()
  // seedFollower supplies the connection + the spotify_followed row.
  await seedFollower({
    userId: PREMIUM_USER,
    canonicalName: 'big head todd',
    pushEnabled: true,
  })
  await seedManualFollow({
    userId: PREMIUM_USER,
    canonicalName: 'big head todd',
  })
  await seedPremiumSubscription(PREMIUM_USER)

  const sendPush = makeSendPush()
  const summary = await runSpotifyFanout([eventId], {
    sendPush,
    getRole: noRole,
  })

  expect(summary.pushesClaimed).toBe(1)
  expect(sendPush).toHaveBeenCalledTimes(1)
})

it('does not push to a free plan — the gate key is now following', async () => {
  const eventId = await seedShow()
  await seedManualFollow({ userId: FREE_USER, canonicalName: 'big head todd' })

  const sendPush = makeSendPush()
  const summary = await runSpotifyFanout([eventId], {
    sendPush,
    getRole: noRole,
  })

  expect(summary.pushesClaimed).toBe(0)
  expect(sendPush).not.toHaveBeenCalled()
})
```

The last test is what pins Step 5. Swapping the gate key from `spotify-sync` to
`following` is a one-word diff with no other test covering it, and both keys
happen to be premium-only — so a wrong swap passes every other test in the file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @concert-crawl/crawler-core test spotify-fanout`
Expected: the first three FAIL with `pushesClaimed` of `0` (no candidate rows).

The fourth and fifth may already pass, and for opposite reasons. The fourth
(dedupe) genuinely passes via `claimAlert` — keep it; it is the regression guard
against a future contributor reintroducing a parallel native path. The fifth
(free plan) passes *vacuously*: pre-change there are no candidate rows either
way, so `0` is the right answer for the wrong reason. It only becomes meaningful
after Step 4, which is exactly when Step 5 could break it.

- [ ] **Step 3: Delete the source constant**

Remove lines 50–52 of `packages/crawler-core/src/lib/spotify-fanout/index.ts`:

```ts
// Spotify-sourced follows only — manual follows are out of scope for the
// fan-out, matching the weekly digest's SPOTIFY_FOLLOW_SOURCES.
const SPOTIFY_FOLLOW_SOURCES = ['spotify_followed', 'spotify_top'] as const
```

- [ ] **Step 4: Rewrite the candidate query**

Replace the `const candidates` block (lines 221–239) with:

```ts
  // Every follow source fans out, and the connection is OPTIONAL. The join
  // was an inner join while this was Spotify-only; a LEFT JOIN is what lets a
  // user with no connection row (the manual-only case) produce candidates at
  // all.
  //
  // userId comes from userArtistFollows — the preserved side. Taking it from
  // userSpotifyConnections yields null for every manual-only user, which is
  // the exact bug this change exists to fix.
  //
  // status lives in the JOIN condition, not the WHERE clause: in the WHERE it
  // would filter the null-connection rows straight back out. Here, a revoked
  // connection simply yields nulls and the user degrades to manual-only
  // notifications rather than losing them.
  //
  // The COALESCE defaults are asymmetric on purpose. pushEnabled defaults ON
  // because following IS the opt-in — a follow that notifies nothing is the
  // bug we are fixing. autoWatch defaults OFF because following an artist
  // must never silently add shows to someone's Watching list. "Both default
  // true" is the natural wrong guess.
  const candidates: MatchedConnection[] = await db
    .selectDistinct({
      userId: userArtistFollows.userId,
      canonicalName: userArtistFollows.canonicalName,
      autoWatch: sql<boolean>`coalesce(${userSpotifyConnections.autoWatch}, false)`,
      pushEnabled: sql<boolean>`coalesce(${userSpotifyConnections.pushEnabled}, true)`,
    })
    .from(userArtistFollows)
    .leftJoin(
      userSpotifyConnections,
      and(
        eq(userSpotifyConnections.userId, userArtistFollows.userId),
        ne(userSpotifyConnections.status, 'revoked'),
      ),
    )
    .where(inArray(userArtistFollows.canonicalName, allCanonicalNames))
```

Add `sql` to the `drizzle-orm` import on line 24:

```ts
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
```

- [ ] **Step 5: Change the push entitlement key**

On line 300, change:

```ts
          if (canUseFeature(planState, 'spotify-sync')) {
```

to:

```ts
          // 'following', not 'spotify-sync': a Premium user with no Spotify
          // connection is entitled to notifications for the artists they
          // follow.
          if (canUseFeature(planState, 'following')) {
```

- [ ] **Step 6: Update the stale comment on the batched-query block**

On line 210, the comment reads `Connection gate matches the weekly job: any non-revoked row participates.` That is no longer true — there may be no connection at all. Replace that sentence with:

```ts
  // ...then pure in-memory per-event overlap — no per-event queries. Every
  // follow participates; a Spotify connection is optional and only supplies
  // preferences.
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/crawler-core test spotify-fanout`
Expected: PASS, all five new tests plus every pre-existing one. If a pre-existing test that asserted a manual follow is *ignored* now fails, that test encoded the old behavior — update it to the new expectation and say so in the commit body.

- [ ] **Step 8: Typecheck and commit**

```bash
pnpm typecheck
git add packages/crawler-core/src/lib/spotify-fanout/
git commit -m "feat(crawler): fan out new-show alerts for every follow source"
```

---

### Task 3: Rename the module off "Spotify"

Pure rename, no behavior change. Kept separate from Task 2 so a reviewer reads the logic diff without a rename diff on top of it.

**Files:**
- Rename: `packages/crawler-core/src/lib/spotify-fanout/` → `packages/crawler-core/src/lib/artist-fanout/`
- Rename: `.../spotify-fanout.integration.test.ts` → `.../artist-fanout.integration.test.ts`
- Modify: `packages/crawler-core/src/index.ts:43-48`
- Modify: `apps/crawler/src/run.ts:9, 243, 379`
- Modify: `apps/crawler/src/run.test.ts:97, 104, 364`
- Modify: `packages/push/src/watch-fanout.ts:106` (comment path reference)
- Modify: `apps/api/src/routes/notifications.integration.test.ts:43` (comment path reference)

**Interfaces:**
- Produces: `runArtistFanout(insertedEventIds: string[], deps?: ArtistFanoutDeps): Promise<ArtistFanoutSummary>` and `runArtistFanoutSafely(insertedEventIds: string[], deps?: ArtistFanoutDeps): Promise<ArtistFanoutSummary | null>`. Types `ArtistFanoutDeps` and `ArtistFanoutSummary` keep their existing fields verbatim.
- Consumes: nothing new.

- [ ] **Step 1: Move the directory with git**

```bash
git mv packages/crawler-core/src/lib/spotify-fanout packages/crawler-core/src/lib/artist-fanout
git mv packages/crawler-core/src/lib/artist-fanout/spotify-fanout.integration.test.ts \
       packages/crawler-core/src/lib/artist-fanout/artist-fanout.integration.test.ts
```

- [ ] **Step 2: Rename the symbols**

In `packages/crawler-core/src/lib/artist-fanout/index.ts`:

| From | To |
|---|---|
| `runSpotifyFanout` | `runArtistFanout` |
| `runSpotifyFanoutSafely` | `runArtistFanoutSafely` |
| `SpotifyFanoutDeps` | `ArtistFanoutDeps` |
| `SpotifyFanoutSummary` | `ArtistFanoutSummary` |
| `createLogger('spotify-fanout')` | `createLogger('artist-fanout')` |
| log message prefix `spotify-fanout:` | `artist-fanout:` |
| `spotifyNewShowCopy` | `newShowCopy` |

In `packages/crawler-core/src/lib/artist-fanout/definitions/copy.ts`, rename the export `spotifyNewShowCopy` → `newShowCopy`. **Do not change any string values** — they are lifted verbatim from a locked design mock and none of them says "Spotify".

Also rewrite the module header of `index.ts` lines 1–4, which currently opens `// Spotify new-show fan-out (#763 eng spec §10.1)`:

```ts
// New-show fan-out. After a venue crawl persists its events, the crawler
// calls runArtistFanoutSafely with the venue's *inserted* (brand-new) event
// ids. For every user who follows a matching artist — by any source, Spotify
// or manual (§9.1 canonical rule):
```

- [ ] **Step 3: Update every import site**

```bash
grep -rEn "spotify-fanout|SpotifyFanout|runSpotifyFanout" apps packages --include='*.ts' --include='*.tsx'
```

Update each hit. `packages/crawler-core/src/index.ts` re-exports from `'./lib/spotify-fanout/index.js'` — that path becomes `'./lib/artist-fanout/index.js'`. `apps/crawler/src/run.test.ts` mocks the module by name; the mock key must move too or the crawler tests will silently exercise the real fan-out.

- [ ] **Step 4: Verify nothing references the old name**

Run: `grep -rEn "spotify-fanout|SpotifyFanout|runSpotifyFanout" apps packages --include='*.ts' --include='*.tsx'`
Expected: no output. Hits under `docs/` and `design/` are historical records and stay as they are.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS. A rename that typechecks but breaks a `vi.mock` path fails loudly here and nowhere else.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add -A packages/crawler-core apps/crawler packages/push apps/api
git commit -m "refactor(crawler): rename spotify-fanout to artist-fanout"
```

---

### Task 4: Rename the notification category and backfill

`spotify.new_show` → `artist.new_show`. A manual follower receiving a notification labelled "Spotify" is plainly wrong.

Existing rows do **not** disappear after the rename: the API passes unknown categories through deliberately and `categoryFor()` renders them via `CATEGORY_FALLBACK`. What they lose is their label and glyph — real news demoted to a neutral, unrecognised presentation. The backfill exists for that fidelity, not to prevent data loss.

**Files:**
- Modify: `packages/push/src/notification-categories.ts:24, 38, 46-50`
- Modify: `packages/crawler-core/src/lib/artist-fanout/index.ts` (`NEW_SHOW_CATEGORY`, push `tag`)
- Modify: `apps/web/src/lib/notifications.ts:33`
- Modify: `apps/web/src/components/consumer/notifications/definitions/categories.ts:12, 90-95`
- Modify: `apps/web/src/components/consumer/notifications/glyphs/index.tsx:19, 130`
- Modify: `packages/push/src/watch-fanout.ts:107, 127-129`, `packages/push/src/send-push.ts:68`
- Create: `packages/db/migrations/0076_artist_new_show_category.sql`
- Modify: `packages/db/migrations/meta/_journal.json`
- Test: `packages/push/src/send-push.test.ts:129,148`, `packages/push/src/watch-fanout.test.ts:259`, `apps/api/src/routes/notifications.integration.test.ts:55,195`, `apps/api/src/lib/prune-notifications.integration.test.ts:36`, `packages/crawler-core/src/lib/artist-fanout/artist-fanout.integration.test.ts:173,177,186`

**Interfaces:**
- Produces: `UserNotificationCategory` union member `'artist.new_show'` replacing `'spotify.new_show'`. Push tag format becomes `artist-new-show-${eventId}`.

- [ ] **Step 1: Write the failing test**

Add to `packages/crawler-core/src/lib/artist-fanout/artist-fanout.integration.test.ts`:

```ts
it('writes the artist.new_show category and a matching push tag', async () => {
  const userId = await seedPremiumUser()
  await seedFollow({ userId, canonicalName: 'big head todd', source: 'manual' })
  const eventId = await seedNewEvent({ canonicalArtist: 'big head todd' })

  const sendPush = vi.fn()
  await runArtistFanout([eventId], { sendPush, getRole })

  expect(sendPush).toHaveBeenCalledWith(
    expect.objectContaining({
      category: 'artist.new_show',
      tag: `artist-new-show-${eventId}`,
    }),
  )
  const [row] = await db
    .select({ category: notifications.category })
    .from(notifications)
    .where(eq(notifications.userId, userId))
  expect(row?.category).toBe('artist.new_show')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test artist-fanout`
Expected: FAIL — received `spotify.new_show`.

- [ ] **Step 3: Rename in the push package**

In `packages/push/src/notification-categories.ts`, change `'spotify.new_show'` to `'artist.new_show'` in both `UserNotificationCategorySchema` (line 24) and `PUSH_ELIGIBLE_CATEGORIES` (line 38). Rewrite the comment at lines 46–50:

```ts
// `artist.new_show` is deliberately in NEITHER sub-toggle set: within
// send-push only `masterEnabled` gates it. Its own opt-outs — the follow
// itself, the per-connection `userSpotifyConnections.pushEnabled` toggle
// where a connection exists, and the premium `following` entitlement — are
// enforced at the fan-out call site before send-push is ever invoked.
```

The file header at lines 8–15 also still describes this set as shared with "the
crawler's Spotify fan-out". Update those two sentences to say the fan-out covers
every follow source. A header that still says Spotify is how the next reader
concludes the rename was partial.

**Preserve the "neither sub-toggle set" behavior exactly.** It is load-bearing; the rename must not quietly enrol the category in a toggle group. Update the same string in `send-push.ts:68` and `watch-fanout.ts:107,127-129`.

- [ ] **Step 4: Rename in the fan-out**

In `packages/crawler-core/src/lib/artist-fanout/index.ts`:

```ts
const NEW_SHOW_CATEGORY = 'artist.new_show'
```

and the push tag:

```ts
                tag: `artist-new-show-${event.id}`,
```

- [ ] **Step 5: Rename in the web client**

In `apps/web/src/lib/notifications.ts:33`, change the array member to `'artist.new_show'`.

In `apps/web/src/components/consumer/notifications/definitions/categories.ts`, replace the entry at lines 90–95:

```ts
    'artist.new_show': {
      label: 'Artists',
      ink: 'var(--accent)',
      glyph: 'newshow',
      verb: 'New Denver date',
    },
```

Also update the comment on line 12 (`--accent  discovery, not your shows  spotify.new_show`) to name the new key.

> **Copy gate:** `label` is a customer-facing string. `'Artists'` is a proposal, not a lock — run the `copy-review` skill (`~/.claude/skills/copy-review/SKILL.md`) on this change before opening the PR, and never use "Following" here, since that reads as a Watching synonym. The `verb` and `ink` are unchanged and stay unchanged.

- [ ] **Step 6: Rename the glyph key**

In `apps/web/src/components/consumer/notifications/glyphs/index.tsx`, rename the union member on line 19 and the map key on line 130 from `spotify` to `newshow`. **Do not touch the SVG paths.** The mark is a signal-arc glyph, never the Spotify logo (design lock CAT-06) — it was only ever named after the category.

- [ ] **Step 7: Update every test fixture**

Change `'spotify.new_show'` to `'artist.new_show'` in each test file listed under **Files** above. These are fixtures, not assertions about legacy data.

- [ ] **Step 8: Write the backfill migration**

Create `packages/db/migrations/0076_artist_new_show_category.sql`:

```sql
-- Rename the new-show notification category now that fan-out covers manual
-- follows, not just Spotify-sourced ones. `category` is a text column, so
-- this is a data-only update with no type change.
--
-- Without it, historical rows keep the old value and render via
-- CATEGORY_FALLBACK: a neutral bell instead of their label and glyph. They
-- do not disappear — the client passes unknown categories through by design.
UPDATE notifications
SET category = 'artist.new_show'
WHERE category = 'spotify.new_show';
```

Append to `packages/db/migrations/meta/_journal.json`, after the `0075` entry (note the trailing comma added to `0075`'s closing brace):

```json
    {
      "idx": 76,
      "version": "7",
      "when": 1786752000000,
      "tag": "0076_artist_new_show_category",
      "breakpoints": true
    }
```

`1786752000000` exceeds `0075`'s `1786665600000` by one day, satisfying the timestamp-ordering rule.

> If another branch merged a `0076` before you got here, take the next free
> number and a `when` above whatever the new tail entry carries. Do not reuse
> the literals above; Drizzle orders by `when`, so a duplicate or lower value
> replays migrations out of sequence.

- [ ] **Step 9: Run the migration and the full suite**

```bash
pnpm db:migrate
pnpm test
```

Expected: migration applies cleanly; all tests PASS.

- [ ] **Step 10: Verify no stale references in shipped code**

Run: `grep -rEn "spotify\\.new_show" apps packages --include='*.ts' --include='*.tsx'`
Expected: no output. Hits under `docs/` and `design/` are historical records; the `design/design_handoff_*/notifications-data.jsx` files are frozen design artifacts and are never rewritten.

- [ ] **Step 11: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add -A
git commit -m "feat(notifications): rename spotify.new_show to artist.new_show"
```

---

### Task 5: Hide the Spotify Connect entry point behind a flag

The Spotify app is in Development Mode, capped at **5 authenticated users**, currently at 3. Users 6 and beyond hit the worst possible failure: OAuth *succeeds*, the account links, and then every API call returns `403`. It looks like a working connection that does nothing.

A plain env var is enough here because this is a global on/off. The per-user override — so Hugh keeps the Spotify experience while everyone else gets native — needs the flag system in Project 2 and is explicitly out of scope.

**Files:**
- Modify: `apps/web/src/components/settings/connections/ConnectionsPanel.tsx`
- Modify: `apps/web/.env.example`
- Test: `apps/web/src/components/settings/connections/ConnectionsPanel.test.tsx`

**Interfaces:**
- Consumes: `process.env['NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED']`. `'1'` shows the entry point; anything else (including unset) hides it.
- Produces: nothing importable.

- [ ] **Step 1: Write the failing tests**

Add to `apps/web/src/components/settings/connections/ConnectionsPanel.test.tsx`.

Note the file's idiom, which these follow: `renderPanel()` takes **no arguments**
— you drive state by assigning the module-level `connectionQuery` stub before
calling it. Assertions use the `SPOTIFY_COPY` constants with `toBeTruthy()`, not
regex name matching. `beforeEach` already resets `connectionQuery`.

```tsx
it('hides the connect entry card when the flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
  connectionQuery = { data: { status: 'disconnected' }, isPending: false }
  renderPanel()
  expect(screen.queryByText(SPOTIFY_COPY.connectEntry.pitch)).toBeNull()
})

it('shows the connect entry card when the flag is on', () => {
  vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '1')
  connectionQuery = { data: { status: 'disconnected' }, isPending: false }
  renderPanel()
  expect(screen.getByText(SPOTIFY_COPY.connectEntry.pitch)).toBeTruthy()
})

it('still renders the connected card when the flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
  connectionQuery = {
    data: {
      status: 'connected',
      displayName: 'maya.k',
      artistCount: 34,
      lastSyncedAt: new Date().toISOString(),
      autoWatch: false,
      digestEnabled: true,
      pushEnabled: false,
      denverArtistCount: 9,
      denverShowCount: 12,
      matchedArtists: [],
    },
    isPending: false,
  }
  renderPanel()
  expect(screen.getByText(SPOTIFY_COPY.connectedCard.linkedPill)).toBeTruthy()
})
```

The pre-existing `renders the disconnected entry card` test asserts the same
pitch copy and does **not** stub the env var, so it will start failing once the
default is off. Add `vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '1')` as
its first line rather than deleting it — it still covers the handoff sheet.

`vi.stubEnv` persists across tests in a file unless it is cleared, so add
`vi.unstubAllEnvs()` to the existing `beforeEach`. Without it the first test to
set `'0'` silently sets it for every test after it.

The third and fourth tests are the important ones. The flag closes the *door*, it does not evict the people already inside — an existing connection stays fully manageable, including disconnect.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @concert-crawl/web test ConnectionsPanel`
Expected: the "hides" test FAILS (the card renders).

- [ ] **Step 3: Gate the disconnected branch**

In `ConnectionsPanel.tsx`, add near the top of the module:

```ts
// Spotify is in Development Mode: 5 authenticated users, hard cap, and
// Extended Quota needs 250k MAU. Past the cap OAuth still SUCCEEDS and every
// subsequent API call 403s, which reads to the user as a working connection
// that does nothing. Hiding the door is the only honest option.
//
// Deliberately global. A per-user override belongs to the flag system, not an
// env var. This never hides an EXISTING connection — those stay manageable,
// disconnect included.
const connectEnabled = (): boolean =>
  process.env['NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED'] === '1'
```

Then change the entry-card branch. Today it reads:

```tsx
  if (!data || data.status === 'disconnected') {
    return <ConnectEntryCard onConnect={openHandoff} />
  }
```

`!data` and `disconnected` are **not** interchangeable here, and the flag has to
tell them apart. `!data` means the query errored, so the status is unknown — the
user may well be connected. Returning `null` for the merged condition blanks the
whole panel for a connected user on a transient fetch failure, hiding their
disconnect control behind a network blip.

Split it:

```tsx
  if (data?.status === 'disconnected') {
    return connectEnabled() ? <ConnectEntryCard onConnect={openHandoff} /> : null
  }
  if (!data) {
    // Query errored: status unknown. Connecting is idempotent (the POST returns
    // the existing connection), so the entry card stays safe HERE — but only
    // while the flag is on. With the flag off we must not offer a door we
    // cannot honour, and we must not blank the panel either.
    return connectEnabled() ? (
      <ConnectEntryCard onConnect={openHandoff} />
    ) : (
      <SpotifyStatusBanner />
    )
  }
```

`SpotifyStatusBanner` is already imported in this file and already used as the
collapsed fallback for the broken states, so this adds no new copy and no new
import. Leave the `connected`, `error`, and `revoked` branches untouched.

Add a fourth test covering exactly this:

```tsx
it('does not blank the panel when the query errors and the flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
  connectionQuery = { data: undefined, isPending: false }
  const { container } = renderPanel()
  expect(container.textContent).not.toBe('')
})
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @concert-crawl/web test ConnectionsPanel`
Expected: PASS.

- [ ] **Step 5: Document the variable**

Add to `apps/web/.env.example`:

```
# Shows the Spotify Connect entry point in Settings > Connections. Set to 1
# only while the Spotify app has authenticated-user slots free (Development
# Mode caps at 5). Unset or any other value hides it; existing connections
# stay manageable either way.
NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED=0
```

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add apps/web/src/components/settings/connections/ConnectionsPanel.tsx apps/web/src/components/settings/connections/ConnectionsPanel.test.tsx apps/web/.env.example
git commit -m "feat(web): gate the Spotify connect entry point behind an env flag"
```

---

### Task 6: Release note and progress row

This is a meaningful user-facing change — following an artist now actually notifies you — so both artifacts are required by CLAUDE.md.

**Files:**
- Modify: `apps/web/src/lib/definitions/releases.ts`
- Modify: `docs/superpowers/progress.md`

**Interfaces:**
- Consumes: the existing release entry shape. Read the most recent entry in the file and mirror it exactly rather than inventing fields.

- [ ] **Step 1: Read the newest release entry**

Run: `sed -n '1,60p' apps/web/src/lib/definitions/releases.ts`

Copy the field names, version-numbering convention, and voice of the entry at the top. Already-merged entries are a frozen historical record and are never rewritten for style.

- [ ] **Step 2: Add the entry**

Add a new entry at the top with the version the release tooling assigns, describing the user-visible change: following an artist now sends a notification when they announce a Denver show, whatever way you followed them. Keep Hugh's voice — casual, at most one all-caps callout, roughly 30% shorter than the first draft. No em-dashes.

> **Copy gate:** run the `copy-review` skill on this entry before the PR opens.

- [ ] **Step 3: Add the progress row**

Add a ✅ Complete row to `docs/superpowers/progress.md` describing the artist fan-out generalization. Date it the day the PR actually merges, not the day this plan was written. One row, not one per task.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/definitions/releases.ts docs/superpowers/progress.md
git commit -m "docs: release note and progress row for artist fan-out"
```

---

## Verification before the PR

- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green from the worktree root.
- [ ] `grep -rEn "spotify-fanout|spotify\\.new_show" apps packages --include='*.ts' --include='*.tsx'` returns nothing.
- [ ] `pnpm db:migrate` applies `0076` cleanly against a fresh local DB.
- [ ] The `copy-review` skill has been run over the `categories.ts` label and the `releases.ts` entry.
- [ ] `git -C /Users/huey/Projects/concert-crawl status` is clean.
- [ ] The PR body documents the new env var per the repo convention: `NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED` — gates the Settings ▸ Connections entry card; defaults to off when unset; set it to `true` in the Vercel web project (all environments) to re-expose Connect.
- [ ] The PR body notes the entitlement change is **user-visible on merge**: following is free in prod today and becomes Premium. Existing follow rows are untouched and DELETE stays ungated, so nobody is stranded.

## Known gaps this plan does not close

Named here so a reviewer does not mistake them for oversights.

- **Native users have no way to find artists to follow.** There is no artist search, browse, or bulk-add. Spotify was the entire onboarding funnel, so a native user starts at zero follows and stays there. Project 3, Design owns it.
- **`autoWatch`, `pushEnabled`, and `digestEnabled` have no native home.** They remain columns on `user_spotify_connections` and are only reachable by connected users. Task 2 gives non-connected users sane defaults; it does not give them controls.
- **The Premium tier still advertises "Spotify sync"** as a benefit most buyers cannot have. Copy and merchandising question, not a code one.
- **Prod has zero manual follows**, so this ships with no organic traffic to validate against. Verification is a deliberate manual follow plus the next crawl discovery.
