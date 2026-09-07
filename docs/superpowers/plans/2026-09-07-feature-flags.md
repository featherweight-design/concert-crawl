# Feature Flag System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin-toggled feature flag system that hides a feature's UI on every surface and returns 404 from its API routes when the flag is off.

**Architecture:** A hardcoded registry in `packages/entitlements` names every flaggable feature and its default. A `feature_flags` table stores only the rows an admin has changed; the registry default applies where no row exists. The API reads the merged map through a 30-second memoized loader and enforces it with a `requireFlag(key)` middleware mounted router-wide, ahead of `requireFeature`. The web app reads the same map from a public unauthenticated endpoint, feeds it into the existing `useEntitlement` seam so a flagged-off feature resolves to `hidden` for every plan, and calls `notFound()` from the server components of flagged routes.

**Tech Stack:** TypeScript (strict), Hono, Drizzle ORM + Postgres, Next.js App Router, React Query, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-feature-flags-design.md`

## Global Constraints

- **A flag can only restrict, never grant.** Flag-off forces `hidden`; flag-on changes nothing. The entitlements matrix stays the sole source of the positive answer.
- **404, never 403,** when an API route is flagged off. The feature must look like it was never built.
- **`requireFlag` mounts before `requireFeature`** on every router it guards, so a flagged-off premium route answers 404 rather than leaking a 403 upsell.
- **`FeatureFlagKey` is its own namespace,** not an alias of `PremiumFeature`. It must be able to name features that have no entitlement (`release-notes`) and features not yet built.
- **At most one flag may name a given `PremiumFeature`.** A registry unit test enforces this; the reverse lookup in `useEntitlement` is only well-defined because of it.
- **No unsafe `as` type casts.** Use Zod `safeParse` at boundaries, type guards for narrowing, declaration merging for library types. `as const` is a literal-type assertion, not a cast, and is used freely (the plan itself writes `['feature-flags'] as const`).
- **All customer-facing strings live in a `definitions/copy.ts`.** Admin copy goes in `apps/web/src/components/admin/definitions/copy.ts`. The registry's per-flag `label` and `description` are the one exception: they are part of the flag's definition, they are served by the API rather than rendered from a web constant, and a new flag must be describable in the single place it is declared. Page chrome around them (eyebrow, title, confirm text, toasts) still lives in `ADMIN_COPY`.
- **API integration tests are colocated, not foldered.** `apps/api/vitest.integration.ts` includes `**/*.integration.test.ts` and the unit config excludes that same glob, so an integration suite lives beside the code it exercises and carries the `.integration.test.ts` suffix. There is no `src/test/integration/` directory.
- **ESLint `id-length` requires 2+ character identifiers** (`err`, `ctx`, `row`), except `i`, `j`, `k`, `x`, `y`, `z`, `_`.
- **Migration journal `when` must exceed every prior entry.** The last migration is `0085_price_submission_last_seen.sql` at `when: 1787529600000`, index 85. The new one is index 86.
- **No `releases.ts` entry.** This ships features being hidden; a changelog entry announcing that contradicts it, and `release-notes` is itself one of the flags.
- **Add a `progress.md` row.** This is a phase-meaningful capability, not a chore.

---

## File Structure

**New files:**

| Path                                                                      | Responsibility                                                                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/entitlements/src/feature-flags.ts`                              | The registry: `FeatureFlagKey`, `FeatureFlagDefinition`, `FEATURE_FLAGS`, and the two view types.                                                                        |
| `packages/entitlements/src/feature-flags.test.ts`                         | Registry invariants: entitlement uniqueness, key/record-key agreement.                                                                                                   |
| `packages/db/src/schema/feature-flags.ts`                                 | The `featureFlags` Drizzle table.                                                                                                                                        |
| `packages/db/migrations/0086_feature_flags.sql`                           | `CREATE TABLE feature_flags` (empty; defaults come from the registry).                                                                                                   |
| `apps/api/src/lib/feature-flags.ts`                                       | `loadFeatureFlags()` with a 30s memo and `clearFeatureFlagCache()`.                                                                                                      |
| `apps/api/src/lib/feature-flags.test.ts`                                  | Merge-with-defaults and memo behaviour.                                                                                                                                  |
| `apps/api/src/middleware/feature-flag.ts`                                 | `requireFlag(key)` returning 404.                                                                                                                                        |
| `apps/api/src/middleware/feature-flag.test.ts`                            | Middleware unit tests.                                                                                                                                                   |
| `apps/api/src/routes/flags.ts`                                            | Public unauthenticated `GET /v1/flags`.                                                                                                                                  |
| `apps/api/src/routes/admin/feature-flags.ts`                              | Admin `GET /` and `PATCH /:key` with audit fields.                                                                                                                       |
| `apps/api/src/routes/feature-flags.integration.test.ts`                   | Route coverage, 404-before-403 ordering, admin round-trip.                                                                                                               |
| `apps/web/src/lib/feature-flags.ts`                                       | Server-side `getFeatureFlags()` over `publicApiClient`, failing open to registry defaults.                                                                               |
| `apps/web/src/lib/queries/use-feature-flags.ts`                           | `useFeatureFlags()` React Query hook + `useFeatureFlag(key)`.                                                                                                            |
| `apps/web/src/app/(protected)/admin/feature-flags/page.tsx`               | Admin page, mirroring `founder-window`.                                                                                                                                  |
| `apps/web/src/components/admin/feature-flags/FeatureFlagControl.tsx`      | The client control: one row per flag, plus a co-located confirmation modal. Mirrors `FounderWindowControl.tsx`, which keeps its `FounderLaunchConfirm` in the same file. |
| `apps/web/src/components/admin/feature-flags/FeatureFlagControl.test.tsx` | Toggle, confirm, cancel, and error rendering.                                                                                                                            |

**Modified files:**

| Path                                                | Change                                                         |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `packages/entitlements/src/index.ts`                | Re-export the registry module.                                 |
| `packages/db/src/schema/index.ts`                   | Append `export * from './feature-flags.js'`.                   |
| `packages/db/migrations/meta/_journal.json`         | Append the 0086 entry.                                         |
| `apps/api/src/routes/index.ts`                      | Mount `flagsRouter` at `/v1/flags`.                            |
| `apps/api/src/routes/admin/index.ts`                | Mount `featureFlagsAdminRouter`.                               |
| `apps/api/src/routes/crews.ts`                      | `router.use('*', requireFlag('crews'))` at the top.            |
| `apps/api/src/routes/crew-invites.ts`               | Same, `crews`.                                                 |
| `apps/api/src/routes/spotify.ts`                    | Same, `spotify-sync`.                                          |
| `apps/web/src/lib/queries/use-entitlement.ts`       | Flag reverse-lookup seam.                                      |
| Web route + element gates                           | See Tasks 9 and 10 for the exact list.                         |
| `apps/api/src/jobs/spotify-weekly.ts`               | Suppress the Spotify-shaped digest when `spotify-sync` is off. |
| `apps/web/src/components/admin/definitions/copy.ts` | `ADMIN_COPY.featureFlags`.                                     |
| `apps/web/src/components/admin/shell/nav.ts`        | Admin nav entry in the `account` section.                      |
| `docs/superpowers/progress.md`                      | One ✅ Complete row.                                           |

---

## Task 1: The flag registry

**Files:**

- Create: `packages/entitlements/src/feature-flags.ts`
- Create: `packages/entitlements/src/feature-flags.test.ts`
- Modify: `packages/entitlements/src/index.ts`

**Interfaces:**

- Consumes: `PremiumFeature` from `packages/entitlements/src/index.ts`.
- Produces: `FeatureFlagKey`, `FeatureFlagDefinition`, `FEATURE_FLAGS`, `FEATURE_FLAG_KEYS`, `featureFlagDefaults()`, `flagForEntitlement()`, `FeatureFlagView`, `AdminFeatureFlag`.

> **Why the view types live here, not in `packages/types`:** `packages/entitlements` depends on `@concert-crawl/types`, never the reverse. A `FeatureFlagKey`-typed shape declared in `types` would invert that dependency.

- [ ] **Step 1: Write the failing test**

Create `packages/entitlements/src/feature-flags.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  flagForEntitlement,
} from './feature-flags.js'

describe('feature flag registry', () => {
  it('keys every entry by its own key field', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(FEATURE_FLAGS[key].key).toBe(key)
    }
  })

  // Every other case iterates FEATURE_FLAG_KEYS, so a flag added to the record
  // and forgotten here would be silently untested and never rendered.
  it('lists exactly the keys the record holds', () => {
    expect([...FEATURE_FLAG_KEYS].sort()).toEqual(
      Object.keys(FEATURE_FLAGS).sort(),
    )
  })

  it('never maps two flags onto the same entitlement', () => {
    const seen = new Set<string>()
    for (const key of FEATURE_FLAG_KEYS) {
      const entitlement = FEATURE_FLAGS[key].entitlement
      if (entitlement === null) continue
      expect(seen.has(entitlement)).toBe(false)
      seen.add(entitlement)
    }
  })

  it('gives every entry a non-empty label and description', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(FEATURE_FLAGS[key].label.length).toBeGreaterThan(0)
      expect(FEATURE_FLAGS[key].description.length).toBeGreaterThan(0)
    }
  })

  it('defaults spotify-sync and crews off, release-notes on', () => {
    expect(featureFlagDefaults()).toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('reverse-looks-up a flag by the entitlement it restricts', () => {
    expect(flagForEntitlement('crews')).toBe('crews')
    expect(flagForEntitlement('spotify-sync')).toBe('spotify-sync')
    expect(flagForEntitlement('watching')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/entitlements test`
Expected: FAIL, cannot resolve `./feature-flags.js`.

- [ ] **Step 3: Write the registry**

Create `packages/entitlements/src/feature-flags.ts`:

```ts
import type { PremiumFeature } from './index.js'

// Its own namespace, deliberately not an alias of PremiumFeature: a flag must
// be able to name a feature with no entitlement (release-notes) and a feature
// that does not exist yet.
export type FeatureFlagKey = 'spotify-sync' | 'crews' | 'release-notes'

export interface FeatureFlagDefinition {
  key: FeatureFlagKey
  /** Admin UI row title. */
  label: string
  /** Admin UI: what disappears for customers when this is off. */
  description: string
  /** The entitlement this flag restricts, where one exists. */
  entitlement: PremiumFeature | null
  /** Value used when the table has no row for this key. */
  defaultEnabled: boolean
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  'spotify-sync': {
    key: 'spotify-sync',
    label: 'Spotify sync',
    description:
      'Connecting Spotify, taste picks, and the weekly digest email.',
    entitlement: 'spotify-sync',
    defaultEnabled: false,
  },
  crews: {
    key: 'crews',
    label: 'Crews',
    description:
      'The Crews tab, crew pages, invites, and the Browse crew lens.',
    entitlement: 'crews',
    defaultEnabled: false,
  },
  'release-notes': {
    key: 'release-notes',
    label: 'Release notes',
    description:
      'The changelog page, the version footer, and the feature-drop pill.',
    entitlement: null,
    defaultEnabled: true,
  },
}

export const FEATURE_FLAG_KEYS: readonly FeatureFlagKey[] = [
  'spotify-sync',
  'crews',
  'release-notes',
]

export const isFeatureFlagKey = (value: string): value is FeatureFlagKey =>
  Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, value)

/** The map every reader starts from before merging stored rows over it. */
export const featureFlagDefaults = (): Record<FeatureFlagKey, boolean> => ({
  'spotify-sync': FEATURE_FLAGS['spotify-sync'].defaultEnabled,
  crews: FEATURE_FLAGS.crews.defaultEnabled,
  'release-notes': FEATURE_FLAGS['release-notes'].defaultEnabled,
})

// Well-defined only because the registry test forbids two flags naming the
// same entitlement. useEntitlement depends on that invariant.
export const flagForEntitlement = (
  feature: PremiumFeature,
): FeatureFlagKey | null => {
  for (const key of FEATURE_FLAG_KEYS) {
    if (FEATURE_FLAGS[key].entitlement === feature) return key
  }
  return null
}

/** What the public endpoint returns. Labels and descriptions are withheld. */
export type FeatureFlagView = Record<FeatureFlagKey, boolean>

/** What the admin endpoint returns: the registry prose plus current state. */
export interface AdminFeatureFlag {
  key: FeatureFlagKey
  label: string
  description: string
  enabled: boolean
  updatedAt: string | null
  updatedBy: string | null
}
```

- [ ] **Step 4: Re-export from the package entry point**

Append to `packages/entitlements/src/index.ts`, directly under the existing `export { derivePlanState, ... } from './plan-state.js'` block:

```ts
export {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  flagForEntitlement,
  isFeatureFlagKey,
  type AdminFeatureFlag,
  type FeatureFlagDefinition,
  type FeatureFlagKey,
  type FeatureFlagView,
} from './feature-flags.js'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/entitlements test`
Expected: PASS, 6 tests.

- [ ] **Step 6: Build the package so downstream typechecks see it**

Run: `pnpm --filter @concert-crawl/entitlements build && pnpm --filter @concert-crawl/entitlements typecheck`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/entitlements/src/feature-flags.ts packages/entitlements/src/feature-flags.test.ts packages/entitlements/src/index.ts
git commit -m "feat(entitlements): add feature flag registry"
```

---

## Task 2: The storage table

**Files:**

- Create: `packages/db/src/schema/feature-flags.ts`
- Create: `packages/db/migrations/0086_feature_flags.sql`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/migrations/meta/_journal.json`

**Interfaces:**

- Produces: `featureFlags` Drizzle table with columns `key`, `enabled`, `updatedAt`, `updatedBy`.

> **The table is created empty.** `spotify-sync` and `crews` reach their off state through `defaultEnabled: false` in the registry, not through seeded rows. A row appears only when an admin toggles something.

- [ ] **Step 1: Write the schema**

Create `packages/db/src/schema/feature-flags.ts`:

```ts
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text('updated_by').notNull(),
})
```

- [ ] **Step 2: Export it from the schema barrel**

Append to `packages/db/src/schema/index.ts`, after the existing `export * from './crews.js'` line:

```ts
export * from './feature-flags.js'
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `packages/db/migrations/0086_*.sql` plus a `_journal.json` entry.

Rename the generated file to `packages/db/migrations/0086_feature_flags.sql` and make its journal `tag` match. Verify its contents are:

```sql
CREATE TABLE IF NOT EXISTS "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
```

Confirm the journal entry's `when` exceeds `1787529600000` (the 0085 entry) and its `idx` is `86`.

- [ ] **Step 4: Apply it locally and verify**

Run: `pnpm db:migrate`
Then: `psql "$DATABASE_URL" -c '\d feature_flags'`
Expected: four columns, `key` as the primary key.

- [ ] **Step 5: Build the package**

Run: `pnpm --filter @concert-crawl/db build`
Expected: exit 0.

> **⚠️ `apps/api` integration tests import `packages/db`'s built `dist`.** A schema change is invisible to the suite until this build runs. CI builds first; locally you must not skip it.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/feature-flags.ts packages/db/src/schema/index.ts packages/db/migrations/
git commit -m "feat(db): add feature_flags table"
```

---

## Task 3: The API loader

**Files:**

- Create: `apps/api/src/lib/feature-flags.ts`
- Create: `apps/api/src/lib/feature-flags.test.ts`

**Interfaces:**

- Consumes: `featureFlagDefaults`, `isFeatureFlagKey`, `FeatureFlagKey`, `FeatureFlagView` from `@concert-crawl/entitlements`; `db` and `featureFlags` from `@concert-crawl/db`.
- Produces: `loadFeatureFlags(): Promise<FeatureFlagView>`, `isFeatureEnabled(key): Promise<boolean>`, `clearFeatureFlagCache(): void`, `FEATURE_FLAG_CACHE_TTL_MS`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/lib/feature-flags.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectRows = vi.fn()

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: () => ({ from: () => selectRows() }),
  },
  featureFlags: {},
}))

const { clearFeatureFlagCache, isFeatureEnabled, loadFeatureFlags } =
  await import('./feature-flags.js')

describe('loadFeatureFlags', () => {
  beforeEach(() => {
    clearFeatureFlagCache()
    selectRows.mockReset()
  })

  it('falls back to registry defaults when the table is empty', async () => {
    selectRows.mockResolvedValue([])
    await expect(loadFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('lets a stored row override its registry default', async () => {
    selectRows.mockResolvedValue([{ key: 'crews', enabled: true }])
    const flags = await loadFeatureFlags()
    expect(flags.crews).toBe(true)
    expect(flags['spotify-sync']).toBe(false)
  })

  it('ignores a stored row whose key left the registry', async () => {
    selectRows.mockResolvedValue([{ key: 'retired-thing', enabled: true }])
    const flags = await loadFeatureFlags()
    expect(Object.keys(flags).sort()).toEqual([
      'crews',
      'release-notes',
      'spotify-sync',
    ])
  })

  it('serves the memo rather than re-querying', async () => {
    selectRows.mockResolvedValue([])
    await loadFeatureFlags()
    await loadFeatureFlags()
    expect(selectRows).toHaveBeenCalledTimes(1)
  })

  it('re-queries after the cache is cleared', async () => {
    selectRows.mockResolvedValue([])
    await loadFeatureFlags()
    clearFeatureFlagCache()
    await loadFeatureFlags()
    expect(selectRows).toHaveBeenCalledTimes(2)
  })

  it('falls back to defaults when the query throws', async () => {
    selectRows.mockRejectedValue(new Error('connection refused'))
    await expect(loadFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  // A failed read is cached like any other answer, so a database outage costs
  // one query and one log line per TTL window rather than one per request.
  it('memoizes the defaults it fell back to', async () => {
    selectRows.mockRejectedValue(new Error('connection refused'))
    await loadFeatureFlags()
    await loadFeatureFlags()
    expect(selectRows).toHaveBeenCalledTimes(1)
  })

  it('answers a single key', async () => {
    selectRows.mockResolvedValue([{ key: 'crews', enabled: true }])
    await expect(isFeatureEnabled('crews')).resolves.toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test src/lib/feature-flags.test.ts`
Expected: FAIL, cannot resolve `./feature-flags.js`.

- [ ] **Step 3: Write the loader**

Create `apps/api/src/lib/feature-flags.ts`:

```ts
import { db, featureFlags } from '@concert-crawl/db'
import {
  featureFlagDefaults,
  isFeatureFlagKey,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'

import { apiLogger } from './logger.js'

export const FEATURE_FLAG_CACHE_TTL_MS = 30_000

let cached: FeatureFlagView | null = null
let cachedAt = 0

/** Called after an admin write so the next read reflects it in-process. */
export const clearFeatureFlagCache = (): void => {
  cached = null
  cachedAt = 0
}

export const loadFeatureFlags = async (): Promise<FeatureFlagView> => {
  if (cached && Date.now() - cachedAt < FEATURE_FLAG_CACHE_TTL_MS) {
    return cached
  }

  const flags = featureFlagDefaults()

  try {
    const rows = await db.select().from(featureFlags)
    for (const row of rows) {
      // A key that has left the registry is ignored rather than surfaced, so
      // deleting a flag from the code is safe without a data migration.
      if (isFeatureFlagKey(row.key)) flags[row.key] = row.enabled
    }
  } catch (err) {
    // Fail closed for the flags that default off, which is the safe direction:
    // an unreachable table must never reveal an unreleased feature. `flags` is
    // already the defaults, and the failure is cached like any other answer, so
    // an outage costs one query and one log line per TTL window rather than one
    // per request. Recovery lands on the next expiry, or immediately on the
    // `clearFeatureFlagCache()` that follows an admin write.
    apiLogger.error({ err }, 'feature flag read failed, using defaults')
  }

  cached = flags
  cachedAt = Date.now()
  return flags
}

export const isFeatureEnabled = async (
  key: FeatureFlagKey,
): Promise<boolean> => {
  const flags = await loadFeatureFlags()
  return flags[key]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test src/lib/feature-flags.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/feature-flags.ts apps/api/src/lib/feature-flags.test.ts
git commit -m "feat(api): add memoized feature flag loader"
```

---

## Task 4: The `requireFlag` middleware

**Files:**

- Create: `apps/api/src/middleware/feature-flag.ts`
- Create: `apps/api/src/middleware/feature-flag.test.ts`

**Interfaces:**

- Consumes: `isFeatureEnabled` from `../lib/feature-flags.js`; `FeatureFlagKey` from `@concert-crawl/entitlements`.
- Produces: `requireFlag(key: FeatureFlagKey): MiddlewareHandler`.

> **404, not 403.** A flagged-off feature must be indistinguishable from one that was never built. The body is the same shape every other 404 in this API uses, and carries no flag key.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/middleware/feature-flag.test.ts`:

```ts
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const isFeatureEnabled = vi.fn()
vi.mock('../lib/feature-flags.js', () => ({ isFeatureEnabled }))

const { requireFlag } = await import('./feature-flag.js')

const buildApp = () => {
  const app = new Hono()
  app.use('*', requireFlag('crews'))
  app.get('/thing', (ctx) => ctx.json({ success: true }))
  return app
}

describe('requireFlag', () => {
  beforeEach(() => isFeatureEnabled.mockReset())

  it('passes the request through when the flag is on', async () => {
    isFeatureEnabled.mockResolvedValue(true)
    const res = await buildApp().request('/thing')
    expect(res.status).toBe(200)
  })

  it('answers 404 when the flag is off', async () => {
    isFeatureEnabled.mockResolvedValue(false)
    const res = await buildApp().request('/thing')
    expect(res.status).toBe(404)
  })

  it('never names the flag in the response body', async () => {
    isFeatureEnabled.mockResolvedValue(false)
    const res = await buildApp().request('/thing')
    expect(JSON.stringify(await res.json())).not.toContain('crews')
  })

  it('answers 404 when the flag lookup throws', async () => {
    isFeatureEnabled.mockRejectedValue(new Error('boom'))
    const res = await buildApp().request('/thing')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test src/middleware/feature-flag.test.ts`
Expected: FAIL, cannot resolve `./feature-flag.js`.

- [ ] **Step 3: Write the middleware**

Create `apps/api/src/middleware/feature-flag.ts`:

```ts
import type { FeatureFlagKey } from '@concert-crawl/entitlements'
import type { MiddlewareHandler } from 'hono'

import { isFeatureEnabled } from '../lib/feature-flags.js'
import { apiLogger } from '../lib/logger.js'

/**
 * Gates a router on a release flag. Mount this with `router.use('*', ...)` at
 * the top of the router file so it runs ahead of any per-route
 * `requireFeature`: a flagged-off premium route must answer 404, not leak a
 * 403 upsell for something customers cannot buy yet.
 */
export const requireFlag = (key: FeatureFlagKey): MiddlewareHandler => {
  return async (ctx, next) => {
    let enabled = false
    try {
      enabled = await isFeatureEnabled(key)
    } catch (err) {
      apiLogger.error({ err, key }, 'feature flag gate lookup failed')
    }

    if (!enabled) {
      // Deliberately indistinguishable from an unrouted path. No flag key.
      return ctx.json({ success: false, error: 'Not found' }, 404)
    }

    await next()
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test src/middleware/feature-flag.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middleware/feature-flag.ts apps/api/src/middleware/feature-flag.test.ts
git commit -m "feat(api): add requireFlag middleware"
```

---

## Task 5: Mount the gate on the flagged routers

**Files:**

- Modify: `apps/api/src/routes/crews.ts`
- Modify: `apps/api/src/routes/crew-invites.ts`
- Modify: `apps/api/src/routes/spotify.ts`
- Create: `apps/api/src/routes/feature-flags.integration.test.ts`

**Interfaces:**

- Consumes: `requireFlag` from `../middleware/feature-flag.js`.
- Produces: nothing importable. The deliverable is that `/v1/crews/*`, `/v1/crew-invites/*` and `/v1/spotify/*` answer 404 when their flag is off.

> **Why the mount lives in each router file, not in `routes/index.ts`.** `app.use('/v1/crews/*', ...)` does not match the bare `/v1/crews` path, so a router-index mount would leave the collection endpoints ungated. A `router.use('*', ...)` inside the router file matches every path the router owns, and Hono runs router-level middleware ahead of per-route middleware, which is exactly the 404-before-403 ordering the spec requires.

- [ ] **Step 1: Write the failing integration test**

Create `apps/api/src/routes/feature-flags.integration.test.ts`:

```ts
import { db, featureFlags } from '@concert-crawl/db'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { clearFeatureFlagCache } from '../../lib/feature-flags.js'

const setFlag = async (key: string, enabled: boolean) => {
  await db
    .insert(featureFlags)
    .values({ key, enabled, updatedBy: 'test', updatedAt: new Date() })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: new Date(), updatedBy: 'test' },
    })
  clearFeatureFlagCache()
}

describe('feature flag route gating', () => {
  beforeEach(async () => {
    await db.delete(featureFlags)
    clearFeatureFlagCache()
  })

  // Asserted per route, not per router: a router-level mount that silently
  // stopped matching one path is exactly the regression this catches.
  const crewRoutes = [
    { method: 'GET', path: '/v1/crews' },
    { method: 'POST', path: '/v1/crews' },
    { method: 'GET', path: '/v1/crews/00000000-0000-0000-0000-000000000000' },
  ]

  for (const route of crewRoutes) {
    it(`answers 404 for ${route.method} ${route.path} when crews is off`, async () => {
      const res = await app.request(route.path, { method: route.method })
      expect(res.status).toBe(404)
    })
  }

  it('answers 404 for the crew-invites router when crews is off', async () => {
    const res = await app.request('/v1/crew-invites/sometoken')
    expect(res.status).toBe(404)
  })

  it('answers 404 for the spotify router when spotify-sync is off', async () => {
    const res = await app.request('/v1/spotify/taste-picks')
    expect(res.status).toBe(404)
  })

  // The ordering guarantee: requireFlag runs before requireFeature, so an
  // unauthenticated request to a flagged-off premium route gets 404 rather
  // than the 401/403 that would confirm the feature exists.
  it('answers 404 rather than 401 or 403 while the flag is off', async () => {
    const res = await app.request('/v1/crews', { method: 'POST' })
    expect(res.status).toBe(404)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('stops answering 404 once the flag is turned on', async () => {
    await setFlag('crews', true)
    const res = await app.request('/v1/crews')
    // Now reaches auth, which rejects the unauthenticated request. The point
    // is only that the flag gate no longer swallows it.
    expect(res.status).not.toBe(404)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/feature-flags.integration.test.ts`
Expected: FAIL. The crew routes answer 401, not 404.

- [ ] **Step 3: Mount the gate on `crews.ts`**

In `apps/api/src/routes/crews.ts`, add the import alongside the existing middleware imports:

```ts
import { requireFlag } from '../middleware/feature-flag.js'
```

Then, immediately after the `export const crewsRouter = new Hono<...>()` line and **before every other `use` or route registration**, add:

```ts
// Release gate. Mounted first so a flagged-off crews API answers 404 and never
// the 403 that requireFeature('crews') would give, which would advertise a
// feature customers cannot reach.
crewsRouter.use('*', requireFlag('crews'))
```

- [ ] **Step 4: Mount the gate on `crew-invites.ts`**

Same import, and immediately after the router construction:

```ts
crewInvitesRouter.use('*', requireFlag('crews'))
```

- [ ] **Step 5: Mount the gate on `spotify.ts`**

Same import, and immediately after the router construction:

```ts
spotifyRouter.use('*', requireFlag('spotify-sync'))
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/feature-flags.integration.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the pre-existing suites for those routers**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/crews.integration.test.ts src/routes/crew-invites.integration.test.ts src/routes/spotify.integration.test.ts src/routes/spotify-taste-picks.integration.test.ts`
Expected: failures, because those suites exercise routes that are now flagged off by default.

Fix them by enabling the flag in each suite's `beforeEach`, using the same `setFlag` helper shape as above. Do **not** fix them by changing `defaultEnabled` in the registry, which is the shipped product decision.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routes/
git commit -m "feat(api): gate crews and spotify routers on release flags"
```

---

## Task 6: The public flags endpoint

**Files:**

- Create: `apps/api/src/routes/flags.ts`
- Modify: `apps/api/src/routes/index.ts`
- Modify: `apps/api/src/routes/feature-flags.integration.test.ts`

**Interfaces:**

- Consumes: `loadFeatureFlags` from `../lib/feature-flags.js`.
- Produces: `flagsRouter`, mounted at `/v1/flags`. Response body: `{ success: true, data: { "spotify-sync": false, crews: false, "release-notes": true } }`.

> **Labels and descriptions are withheld.** The keys ship in the client bundle anyway, but the registry prose is where the roadmap intent lives, and an unauthenticated endpoint should not publish it.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/src/routes/feature-flags.integration.test.ts`, inside a new `describe`:

```ts
describe('GET /v1/flags', () => {
  beforeEach(async () => {
    await db.delete(featureFlags)
    clearFeatureFlagCache()
  })

  it('returns the merged flag map without authentication', async () => {
    const res = await app.request('/v1/flags')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('withholds the registry labels and descriptions', async () => {
    const res = await app.request('/v1/flags')
    const text = await res.text()
    expect(text).not.toContain('Spotify sync')
    expect(text).not.toContain('Browse crew lens')
  })

  it('sets a cache header matching the loader TTL', async () => {
    const res = await app.request('/v1/flags')
    expect(res.headers.get('cache-control')).toBe('public, max-age=30')
  })

  it('reflects a stored override', async () => {
    await setFlag('crews', true)
    const res = await app.request('/v1/flags')
    const body = await res.json()
    expect(body.data.crews).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/feature-flags.integration.test.ts`
Expected: FAIL with 404, the route does not exist.

- [ ] **Step 3: Write the router**

Create `apps/api/src/routes/flags.ts`:

```ts
import { Hono } from 'hono'

import {
  FEATURE_FLAG_CACHE_TTL_MS,
  loadFeatureFlags,
} from '../lib/feature-flags.js'

export const flagsRouter = new Hono()

// Unauthenticated on purpose: logged-out surfaces need the same answer, and
// the keys are in the client bundle regardless. Only key and enabled ship.
flagsRouter.get('/', async (ctx) => {
  const flags = await loadFeatureFlags()
  ctx.header(
    'Cache-Control',
    `public, max-age=${FEATURE_FLAG_CACHE_TTL_MS / 1000}`,
  )
  return ctx.json({ success: true, data: flags })
})
```

- [ ] **Step 4: Mount it**

In `apps/api/src/routes/index.ts`, add the import beside the other public route imports:

```ts
import { flagsRouter } from './flags.js'
```

and inside `registerRoutes`, beside the other public mounts (order relative to them does not matter, the path is unique):

```ts
app.route('/v1/flags', flagsRouter)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/feature-flags.integration.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/flags.ts apps/api/src/routes/index.ts apps/api/src/routes/feature-flags.integration.test.ts
git commit -m "feat(api): add public GET /v1/flags"
```

---

## Task 7: The admin endpoints

**Files:**

- Create: `apps/api/src/routes/admin/feature-flags.ts`
- Modify: `apps/api/src/routes/admin/index.ts`
- Modify: `apps/api/src/routes/feature-flags.integration.test.ts`

**Interfaces:**

- Consumes: `AdminVariables` from `./index.js`; `FEATURE_FLAGS`, `FEATURE_FLAG_KEYS`, `isFeatureFlagKey`, `AdminFeatureFlag` from `@concert-crawl/entitlements`; `loadFeatureFlags`, `clearFeatureFlagCache` from `../../lib/feature-flags.js`.
- Produces: `featureFlagsAdminRouter`. `GET /v1/admin/feature-flags` returns `{ success: true, data: AdminFeatureFlag[] }`. `PATCH /v1/admin/feature-flags/:key` takes `{ enabled: boolean }` and returns the updated `AdminFeatureFlag`.

> **`updated_at` is set explicitly in both branches of the upsert.** `DEFAULT now()` fires on insert only, so an `onConflictDoUpdate` that omitted it would leave the timestamp frozen at the first toggle and the admin UI would report a stale time forever.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/src/routes/feature-flags.integration.test.ts`. Follow the existing admin integration suites for the auth header helper; they mock `sessionClaims.metadata.role`, not `publicMetadata`.

```ts
describe('admin feature flags', () => {
  beforeEach(async () => {
    await db.delete(featureFlags)
    await db.delete(auditLog)
    clearFeatureFlagCache()
  })

  it('lists every registry entry with its current state', async () => {
    const res = await app.request('/v1/admin/feature-flags', {
      headers: adminHeaders(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(3)
    const crews = body.data.find((row) => row.key === 'crews')
    expect(crews).toMatchObject({
      key: 'crews',
      label: 'Crews',
      enabled: false,
      updatedAt: null,
      updatedBy: null,
    })
  })

  it('toggles a flag and returns the new state', async () => {
    const res = await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.enabled).toBe(true)
    expect(body.data.updatedAt).not.toBeNull()
  })

  it('moves updatedAt forward on a second toggle', async () => {
    const patch = (enabled: boolean) =>
      app.request('/v1/admin/feature-flags/crews', {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
    const first = await (await patch(true)).json()
    await new Promise((resolve) => setTimeout(resolve, 10))
    const second = await (await patch(false)).json()
    expect(new Date(second.data.updatedAt).getTime()).toBeGreaterThan(
      new Date(first.data.updatedAt).getTime(),
    )
  })

  it('writes an audit row naming the flag and the new value', async () => {
    await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    const rows = await db.select().from(auditLog)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      action: 'feature_flag.toggle',
      targetId: 'feature_flag:crews',
    })
    expect(rows[0].metadata).toMatchObject({ enabled: true })
  })

  it('404s on a key that is not in the registry', async () => {
    const res = await app.request('/v1/admin/feature-flags/not-a-flag', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(404)
  })

  it('400s on a non-boolean body', async () => {
    const res = await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: 'yes' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a non-admin caller', async () => {
    const res = await app.request('/v1/admin/feature-flags')
    expect([401, 403]).toContain(res.status)
  })

  it('makes the change visible to the public endpoint immediately', async () => {
    await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    const res = await app.request('/v1/flags')
    const body = await res.json()
    expect(body.data.crews).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/feature-flags.integration.test.ts`
Expected: FAIL with 404 on every admin request.

- [ ] **Step 3: Write the router**

Create `apps/api/src/routes/admin/feature-flags.ts`:

```ts
import { db, featureFlags } from '@concert-crawl/db'
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  isFeatureFlagKey,
  type AdminFeatureFlag,
} from '@concert-crawl/entitlements'
import { getAuth } from '@hono/clerk-auth'
import { Hono } from 'hono'
import { z } from 'zod'

import {
  clearFeatureFlagCache,
  loadFeatureFlags,
} from '../../lib/feature-flags.js'
import type { AdminVariables } from './index.js'

export const featureFlagsAdminRouter = new Hono<AdminVariables>()

const patchSchema = z.object({ enabled: z.boolean() })

featureFlagsAdminRouter.get('/', async (ctx) => {
  const [flags, rows] = await Promise.all([
    loadFeatureFlags(),
    db.select().from(featureFlags),
  ])
  const stored = new Map(rows.map((row) => [row.key, row]))

  const data: AdminFeatureFlag[] = FEATURE_FLAG_KEYS.map((key) => {
    const row = stored.get(key)
    return {
      key,
      label: FEATURE_FLAGS[key].label,
      description: FEATURE_FLAGS[key].description,
      enabled: flags[key],
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: row?.updatedBy ?? null,
    }
  })

  return ctx.json({ success: true, data })
})

featureFlagsAdminRouter.patch('/:key', async (ctx) => {
  const key = ctx.req.param('key')
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404)
  }

  const parsed = patchSchema.safeParse(await ctx.req.json().catch(() => null))
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'enabled must be a boolean' }, 400)
  }

  const auth = getAuth(ctx)
  const actorId = auth?.userId ?? 'unknown'
  const { enabled } = parsed.data
  // Set explicitly in both branches: DEFAULT now() fires on insert only, so an
  // update that omitted it would freeze the timestamp at the first toggle.
  const updatedAt = new Date()

  const [row] = await db
    .insert(featureFlags)
    .values({ key, enabled, updatedAt, updatedBy: actorId })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt, updatedBy: actorId },
    })
    .returning()

  if (!row) {
    return ctx.json({ success: false, error: 'Failed to save flag' }, 500)
  }

  // In-process only. Other instances converge within the loader's TTL, which
  // is the tolerance the 30s memo already accepts.
  clearFeatureFlagCache()

  ctx.set('auditAction', 'feature_flag.toggle')
  ctx.set('auditTargetId', `feature_flag:${key}`)
  ctx.set('auditActorId', actorId)
  ctx.set('auditMeta', { enabled })

  const data: AdminFeatureFlag = {
    key,
    label: FEATURE_FLAGS[key].label,
    description: FEATURE_FLAGS[key].description,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  }

  return ctx.json({ success: true, data })
})
```

- [ ] **Step 4: Mount it**

In `apps/api/src/routes/admin/index.ts`, add the import beside the other admin router imports:

```ts
import { featureFlagsAdminRouter } from './feature-flags.js'
```

and beside the other `adminRouter.route(...)` calls:

```ts
adminRouter.route('/feature-flags', featureFlagsAdminRouter)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test:integration src/routes/feature-flags.integration.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin/feature-flags.ts apps/api/src/routes/admin/index.ts apps/api/src/routes/feature-flags.integration.test.ts
git commit -m "feat(api): add admin feature flag endpoints"
```

---

## Task 8: The web entitlement seam

**Files:**

- Create: `apps/web/src/lib/queries/use-feature-flags.ts`
- Create: `apps/web/src/lib/queries/use-feature-flags.test.tsx`
- Modify: `apps/web/src/lib/queries/use-entitlement.ts`
- Modify: `apps/web/src/lib/queries/use-entitlement.test.tsx`

**Interfaces:**

- Consumes: `publicApiClient` from `@/lib/api`; `featureFlagDefaults`, `flagForEntitlement`, `FeatureFlagKey`, `FeatureFlagView` from `@concert-crawl/entitlements`.
- Produces: `featureFlagsQueryKey`, `useFeatureFlags()` returning `UseQueryResult<FeatureFlagView>`, `useFeatureFlag(key): { isLoading: boolean; enabled: boolean }`.

> **This cannot ride `usePlanState`.** That query carries `enabled: !!isSignedIn` (`use-plan-state.ts:34`), so it never runs logged out, and flags must gate logged-out surfaces too.

> **The reverse lookup is only well-defined because of the registry uniqueness test in Task 1.** If two flags ever named the same entitlement, `flagForEntitlement` would silently pick the first.

- [ ] **Step 1: Write the failing hook test**

Create `apps/web/src/lib/queries/use-feature-flags.test.tsx`. Mirror the provider wrapper used by the sibling `use-availability.test.tsx` (`usePlanState` has no test file of its own; its coverage rides in `use-entitlement.test.tsx`):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ publicApiClient: { get } }))

const { useFeatureFlag, useFeatureFlags } = await import('./use-feature-flags')

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useFeatureFlags', () => {
  it('returns the flag map from the public endpoint', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    })
    const { result } = renderHook(() => useFeatureFlags(), { wrapper })
    await waitFor(() => expect(result.current.data?.crews).toBe(true))
    expect(get).toHaveBeenCalledWith('/v1/flags')
  })

  it('serves the registry default while the fetch is in flight', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeatureFlag('crews'), { wrapper })
    expect(result.current).toEqual({ isLoading: true, enabled: false })
  })

  // Same in-flight state, opposite default: a released feature must not blink
  // out between first paint and the flag map landing.
  it('keeps a default-on flag on while the fetch is in flight', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeatureFlag('release-notes'), {
      wrapper,
    })
    expect(result.current).toEqual({ isLoading: true, enabled: true })
  })

  it('falls back to registry defaults when the fetch fails', async () => {
    get.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useFeatureFlag('release-notes'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.enabled).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/web test src/lib/queries/use-feature-flags.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the hook**

Create `apps/web/src/lib/queries/use-feature-flags.ts`:

```ts
'use client'

import {
  featureFlagDefaults,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'
import { useQuery } from '@tanstack/react-query'

import { publicApiClient } from '@/lib/api'

export const featureFlagsQueryKey = ['feature-flags'] as const

// Deliberately not gated on isSignedIn, unlike usePlanState: flags gate
// logged-out surfaces too, so the query must run for everyone.
export function useFeatureFlags() {
  return useQuery<FeatureFlagView>({
    queryKey: featureFlagsQueryKey,
    queryFn: () => publicApiClient.get<FeatureFlagView>('/v1/flags'),
    staleTime: 30 * 1000,
  })
}

// Element-level gate. `enabled` reads the registry default until the fetch
// lands and whenever it fails, so a released feature never blinks out on load
// and an unreleased one is never briefly shown. Callers that would rather hold
// their render than show the default can read `isLoading`.
export function useFeatureFlag(key: FeatureFlagKey): {
  isLoading: boolean
  enabled: boolean
} {
  const { data, isPending } = useFeatureFlags()
  return {
    isLoading: isPending,
    enabled: (data ?? featureFlagDefaults())[key],
  }
}
```

- [ ] **Step 4: Run the hook test to verify it passes**

Run: `pnpm --filter @concert-crawl/web test src/lib/queries/use-feature-flags.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing seam test**

Append to `apps/web/src/lib/queries/use-entitlement.test.tsx`, following that file's existing mocking of `useAuth` and `usePlanState`:

```tsx
describe('useEntitlement flag seam', () => {
  it('forces hidden for a founder when the flag is off', () => {
    mockSignedIn({ plan: 'founder', roleComped: false })
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('crews'), { wrapper })
    expect(result.current).toEqual({
      isLoading: false,
      active: false,
      surface: 'hidden',
    })
  })

  it('forces hidden for a comped user when the flag is off', () => {
    mockSignedIn({ plan: 'free', roleComped: true })
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('crews'), { wrapper })
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBe('hidden')
  })

  it('forces hidden for a logged-out visitor when the flag is off', () => {
    mockSignedOut()
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('crews'), { wrapper })
    expect(result.current.surface).toBe('hidden')
  })

  it('leaves the matrix answer alone when the flag is on', () => {
    mockSignedIn({ plan: 'free', roleComped: false })
    mockFlags({ crews: true })
    const { result } = renderHook(() => useEntitlement('crews'), { wrapper })
    expect(result.current.surface).toBe('paywall-on-tap')
  })

  it('never grants a feature the matrix denies, flag on', () => {
    mockSignedIn({ plan: 'free', roleComped: false })
    mockFlags({ crews: true })
    const { result } = renderHook(() => useEntitlement('alerts'), { wrapper })
    expect(result.current.active).toBe(false)
  })

  it('holds rendering while the flag map is still loading', () => {
    mockSignedIn({ plan: 'premium', roleComped: false })
    mockFlagsLoading()
    const { result } = renderHook(() => useEntitlement('crews'), { wrapper })
    expect(result.current).toEqual({
      isLoading: true,
      active: false,
      surface: null,
    })
  })

  it('is unaffected for a feature no flag names', () => {
    mockSignedIn({ plan: 'premium', roleComped: false })
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('watching'), { wrapper })
    expect(result.current.active).toBe(true)
  })

  // The registry default for `crews` is false, so an outage must not reveal it.
  it('falls back to the registry default when the flag fetch errors', () => {
    mockSignedIn({ plan: 'premium', roleComped: false })
    mockFlagsError()
    const { result } = renderHook(() => useEntitlement('crews'), { wrapper })
    expect(result.current.surface).toBe('hidden')
  })
})
```

`mockFlagsError` puts `useFeatureFlags` in the settled-but-dataless state: `{ data: undefined, isPending: false }`. Mirror however the file already mocks a failed query; if it has no such helper, mock the module's return value directly.

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/web test src/lib/queries/use-entitlement.test.tsx`
Expected: FAIL. A founder still resolves to `visible-active` for `crews`.

- [ ] **Step 7: Add the seam**

Edit `apps/web/src/lib/queries/use-entitlement.ts`. Add to the imports:

```ts
import {
  featureFlagDefaults,
  flagForEntitlement,
} from '@concert-crawl/entitlements'
import { useFeatureFlags } from './use-feature-flags'
```

Then, inside `useEntitlement`, directly after the `const { data: planState, isPending } = usePlanState()` line:

```ts
const flagKey = flagForEntitlement(feature)
const { data: flags, isPending: flagsPending } = useFeatureFlags()

// A flag can only restrict, never grant, so this short-circuits the false
// case and leaves every true case to the matrix below. Hold rendering while
// the map loads rather than flashing the unflagged treatment.
if (flagKey !== null) {
  if (flagsPending) return { isLoading: true, active: false, surface: null }
  if (!(flags ?? featureFlagDefaults())[flagKey]) {
    return { isLoading: false, active: false, surface: 'hidden' }
  }
}
```

Place it **before** the existing `if (isSignedIn === undefined)` guard so the logged-out case is covered too. Hooks must stay unconditional, so both `usePlanState()` and `useFeatureFlags()` are called before any early return.

> When the fetch fails outright, `flags` is `undefined` and the registry defaults stand in. That keeps a released feature visible through a transient network failure while keeping an unreleased one hidden, and it matches what both server-side readers do on the same failure. Reading `flags` directly and falling through would invert the unreleased case, which is the one that must never leak.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/web test src/lib/queries/`
Expected: PASS, including the pre-existing `use-entitlement` cases.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/queries/use-feature-flags.ts apps/web/src/lib/queries/use-feature-flags.test.tsx apps/web/src/lib/queries/use-entitlement.ts apps/web/src/lib/queries/use-entitlement.test.tsx
git commit -m "feat(web): resolve flagged-off features to hidden in useEntitlement"
```

---

## Task 9: Server-side route gating

**Files:**

- Create: `apps/web/src/lib/feature-flags.ts`
- Create: `apps/web/src/lib/feature-flags.test.ts`
- Modify: `apps/web/src/app/(protected)/(main)/crews/page.tsx`
- Modify: `apps/web/src/app/(protected)/(main)/crews/[crewId]/page.tsx`
- Modify: `apps/web/src/app/crew/join/[token]/page.tsx`
- Modify: `apps/web/src/app/(protected)/(main)/changelog/page.tsx`

**Interfaces:**

- Consumes: `publicApiClient` from `@/lib/api`; `featureFlagDefaults` from `@concert-crawl/entitlements`.
- Produces: `getFeatureFlags(): Promise<FeatureFlagView>`, `isFeatureEnabled(key): Promise<boolean>` — both server-only.

> **This read fails open to registry defaults, which for `crews` and `spotify-sync` means off.** An unreachable API therefore hides an unreleased feature rather than revealing it. `release-notes` defaults on, so a failed read leaves the changelog reachable, which is the harmless direction for a page that has always been public.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/feature-flags.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ publicApiClient: { get } }))

const { getFeatureFlags, isFeatureEnabled } = await import('./feature-flags')

describe('server-side getFeatureFlags', () => {
  beforeEach(() => get.mockReset())

  it('returns the map the API gave it', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    })
    await expect(isFeatureEnabled('crews')).resolves.toBe(true)
  })

  it('falls back to registry defaults when the fetch throws', async () => {
    get.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(getFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('falls back when the API returns a malformed body', async () => {
    get.mockResolvedValue({ crews: 'yes' })
    await expect(isFeatureEnabled('crews')).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/web test src/lib/feature-flags.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the reader**

Create `apps/web/src/lib/feature-flags.ts`:

```ts
import 'server-only'

import {
  featureFlagDefaults,
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'
import { z } from 'zod'

import { publicApiClient } from '@/lib/api'

const flagsSchema = z.object({
  'spotify-sync': z.boolean(),
  crews: z.boolean(),
  'release-notes': z.boolean(),
})

export const getFeatureFlags = async (): Promise<FeatureFlagView> => {
  try {
    const raw = await publicApiClient.get<unknown>('/v1/flags')
    const parsed = flagsSchema.safeParse(raw)
    if (!parsed.success) {
      console.error('feature flags: unexpected payload', parsed.error.issues)
      return featureFlagDefaults()
    }
    return parsed.data
  } catch (err) {
    // Fail open to the registry, which defaults the unreleased features off.
    // An unreachable API must never reveal something we have not shipped.
    console.error('feature flags: fetch failed, using defaults', err)
    return featureFlagDefaults()
  }
}

export const isFeatureEnabled = async (
  key: FeatureFlagKey,
): Promise<boolean> => {
  const flags = await getFeatureFlags()
  return flags[key]
}

export { FEATURE_FLAG_KEYS }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/web test src/lib/feature-flags.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Gate the four routes**

In each of the four page files, add the imports:

```ts
import { notFound } from 'next/navigation'

import { isFeatureEnabled } from '@/lib/feature-flags'
```

and make the **first statement** of the exported default async component:

```ts
if (!(await isFeatureEnabled('crews'))) notFound()
```

using `'crews'` for `crews/page.tsx`, `crews/[crewId]/page.tsx` and `crew/join/[token]/page.tsx`, and `'release-notes'` for `changelog/page.tsx`.

It must come before any data fetching or auth call, so a flagged-off route does no work and leaks nothing through a timing or error difference.

If a page is not currently `async`, make it `async`. If any of the four is a client component, convert only the flag check into a server wrapper rather than making the page a server component wholesale.

- [ ] **Step 6: Verify by hand**

Run: `pnpm dev`, then with the flags at their defaults visit `http://localhost:3000/crews` and `http://localhost:3000/changelog`.
Expected: `/crews` renders the 404 page; `/changelog` renders normally.

- [ ] **Step 7: Run the web suite**

Run: `pnpm --filter @concert-crawl/web test`
Expected: PASS. Any pre-existing test that renders a gated page needs `isFeatureEnabled` mocked to `true`; fix those in this commit.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/feature-flags.ts apps/web/src/lib/feature-flags.test.ts apps/web/src/app/
git commit -m "feat(web): 404 flagged-off routes from their server components"
```

---

## Task 10: Element-level gating

**Files:**

- Modify: `apps/web/src/components/settings/connections/ConnectionsPanel.tsx`
- Modify: `apps/web/src/components/consumer/spotify/OAuthHandoffSheet.tsx`
- Modify: `apps/web/src/components/consumer/crews/CrewGoingLine.tsx`
- Modify: `apps/web/src/components/consumer/crews/CrewLensList.tsx`
- Modify: `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`
- Modify: `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`
- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`
- Modify: `apps/web/src/components/consumer/release-notes/FeatureDropPillGate.tsx`
- Modify: `apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.tsx`
- Test: the co-located `.test.tsx` beside each of the above.

**Interfaces:**

- Consumes: `useFeatureFlag` from `@/lib/queries/use-feature-flags`; `useEntitlement` from `@/lib/queries/use-entitlement`.
- Produces: nothing importable.

> **Two mechanisms, and the choice between them is not stylistic.** Anything already reading `useEntitlement('crews')` or `useEntitlement('spotify-sync')` needs **no change at all** — Task 8 already forces those to `hidden`. Only the surfaces with no entitlement call need an explicit `useFeatureFlag` gate. Adding a redundant second gate to an entitlement-driven surface is the failure mode here; find the existing call first.

- [ ] **Step 1: Establish which surfaces already resolve through `useEntitlement`**

Run: `rg -n "useEntitlement\('(crews|spotify-sync)'\)" apps/web/src`

Record the result. Every file it names is already covered by Task 8. Do not touch those files in this task, and note them in the commit message so a reviewer can see the gate exists.

- [ ] **Step 2: Write the failing test for the crews nav entry**

The `crews` entry must disappear from both navs when the flag is off. Note the two nav shapes differ: `bottomNav.nav.tabs` entries carry a `key` (`'crews'`), but `appHeader.nav.tabs` entries carry **no `key` field**, so the header must filter on `href === '/crews'`.

Add to `apps/web/src/components/consumer/bottom-nav/BottomNav.test.tsx`:

```tsx
it('drops the crews tab when the flag is off', () => {
  mockFeatureFlag('crews', false)
  render(<BottomNav />)
  expect(screen.queryByRole('link', { name: /crews/i })).toBeNull()
})

it('renders the crews tab when the flag is on', () => {
  mockFeatureFlag('crews', true)
  render(<BottomNav />)
  expect(screen.getByRole('link', { name: /crews/i })).toBeVisible()
})

it('keeps the other three tabs when crews is off', () => {
  mockFeatureFlag('crews', false)
  render(<BottomNav />)
  expect(screen.getAllByRole('link')).toHaveLength(3)
})
```

Add to `apps/web/src/components/consumer/app-header/AppHeader.test.tsx`:

```tsx
it('drops the crews link when the flag is off', () => {
  mockFeatureFlag('crews', false)
  render(<AppHeader />)
  expect(screen.queryByRole('link', { name: 'Crews' })).toBeNull()
})

it('renders the crews link when the flag is on', () => {
  mockFeatureFlag('crews', true)
  render(<AppHeader />)
  expect(screen.getByRole('link', { name: 'Crews' })).toBeVisible()
})
```

Define `mockFeatureFlag` in each file with the same shape the sibling tests use for their hook mocks:

```tsx
const useFeatureFlag = vi.fn()
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

const mockFeatureFlag = (key: string, enabled: boolean) =>
  useFeatureFlag.mockImplementation((requested: string) => ({
    isLoading: false,
    enabled: requested === key ? enabled : true,
  }))
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @concert-crawl/web test src/components/consumer/bottom-nav/ src/components/consumer/app-header/`
Expected: FAIL, the crews tab renders regardless.

- [ ] **Step 4: Gate `BottomNav.tsx`**

Add the import:

```tsx
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'
```

Inside the component, before the tab map:

```tsx
const { enabled: crewsEnabled } = useFeatureFlag('crews')
const tabs = STATIC_TABS.filter((tab) => crewsEnabled || tab.key !== 'crews')
```

Then map over `tabs` at the existing `:256` render site instead of `STATIC_TABS`.

- [ ] **Step 5: Gate `AppHeader.tsx`**

Same import. Inside the component, before the `copy.nav.tabs.map(...)` at `:80`:

```tsx
const { enabled: crewsEnabled } = useFeatureFlag('crews')
const tabs = copy.nav.tabs.filter(
  // These entries carry no `key` field, unlike the bottom nav's, so the
  // href is the only stable discriminator.
  (tab) => crewsEnabled || tab.href !== '/crews',
)
```

Then map over `tabs`.

- [ ] **Step 6: Gate the Browse crew lens**

In `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`, the render is already guarded by `{crews.length > 0 && (` at `:257`. Add the flag to that condition rather than a second wrapper:

```tsx
const { enabled: crewsEnabled } = useFeatureFlag('crews')
```

and change the guard to `{crewsEnabled && crews.length > 0 && (`.

Do the same for the `CrewLensRail` render at `:331`.

In `apps/web/src/components/consumer/crews/CrewLensList.tsx`, return `null` at the top when the flag is off:

```tsx
const { enabled: crewsEnabled } = useFeatureFlag('crews')
if (!crewsEnabled) return null
```

- [ ] **Step 7: Gate the event-detail crew presence line**

In `apps/web/src/components/consumer/crews/CrewGoingLine.tsx`, add the same two lines at the top of the component body. This is the component the spec calls `CrewGoingZone`; that name does not exist in the codebase. It is rendered from `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` and `apps/web/src/app/(protected)/(main)/artists/[slug]/page.tsx`, and gating the component covers both.

- [ ] **Step 8: Gate the Spotify surfaces**

In `apps/web/src/components/settings/connections/ConnectionsPanel.tsx` and `apps/web/src/components/consumer/spotify/OAuthHandoffSheet.tsx`, first check whether either already calls `useEntitlement('spotify-sync')`. If it does, leave it alone. If it does not, add:

```tsx
const { enabled: spotifyEnabled } = useFeatureFlag('spotify-sync')
if (!spotifyEnabled) return null
```

For `ConnectionsPanel`, gate only the Spotify block, not the whole panel — the panel may hold other connections, and hiding all of them would remove behaviour the flag does not cover.

- [ ] **Step 9: Gate the release-notes surfaces**

In `apps/web/src/components/consumer/release-notes/FeatureDropPillGate.tsx` and `UserMenuVersionFooter.tsx`, add at the top of each component body:

```tsx
const { enabled: releaseNotesEnabled } = useFeatureFlag('release-notes')
if (!releaseNotesEnabled) return null
```

- [ ] **Step 10: Write the remaining tests**

For each of `CrewGoingLine`, `CrewLensList`, `FeatureDropPillGate` and `UserMenuVersionFooter`, add two cases to its co-located test file: renders nothing when its flag is off, renders as before when on. Use the same `mockFeatureFlag` helper shape as Step 2.

- [ ] **Step 11: Run the web suite**

Run: `pnpm --filter @concert-crawl/web test`
Expected: PASS. Under an unmocked React Query the hook falls back to the registry default, so a default-on flag such as `release-notes` keeps rendering and its existing tests stay green. Tests that render a component behind a default-off flag (`crews`, `spotify-sync`) will fail, because the component no longer renders. Fix each by mocking the flag to `true`, which preserves the behaviour the test was written to assert.

- [ ] **Step 12: Run lint and typecheck**

Run: `pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web typecheck`
Expected: exit 0. Watch for `react/jsx-no-literals` if any string was moved.

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(web): hide crews, spotify and release-notes surfaces behind flags"
```

---

## Task 11: Suppress the Spotify-shaped weekly digest

**Files:**

- Modify: `apps/api/src/jobs/spotify-weekly.ts`
- Modify: `apps/api/src/jobs/spotify-weekly.integration.test.ts`

**Interfaces:**

- Consumes: `isFeatureEnabled` from `../lib/feature-flags.js`.
- Produces: nothing importable. The job's `runSpotifyWeekly` gains a `digestSkippedFlag` field on its summary.

> **⚠️ The spec is imprecise here and this task corrects it.** The job has two shapes. When `NATIVE_DIGEST_ENABLED=1` it reads **every** follow source and gates on the `following` entitlement (`spotify-weekly.ts:315`, `:330`); otherwise it reads only `spotify_followed` / `spotify_top` rows and gates on `spotify-sync`. Hugh's locked decision is that native following must not be coupled to Spotify, so **the flag must suppress only the Spotify-shaped run.** A native digest keeps sending with `spotify-sync` off. Phase 2 observability still runs either way, so the summary is logged.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/jobs/spotify-weekly.integration.test.ts`:

```ts
describe('spotify-sync flag', () => {
  beforeEach(async () => {
    await db.delete(featureFlags)
    clearFeatureFlagCache()
    delete process.env['NATIVE_DIGEST_ENABLED']
  })

  it('sends no Spotify digest when the flag is off', async () => {
    await seedSpotifyDigestRecipient()
    await runSpotifyWeekly(new Date('2026-09-07T12:00:00Z'))
    expect(sentEmails).toHaveLength(0)
  })

  it('sends the Spotify digest once the flag is on', async () => {
    await setFlag('spotify-sync', true)
    await seedSpotifyDigestRecipient()
    await runSpotifyWeekly(new Date('2026-09-07T12:00:00Z'))
    expect(sentEmails.length).toBeGreaterThan(0)
  })

  // The locked decision: native following is not coupled to Spotify.
  it('still sends the native digest when spotify-sync is off', async () => {
    process.env['NATIVE_DIGEST_ENABLED'] = '1'
    await seedNativeDigestRecipient()
    await runSpotifyWeekly(new Date('2026-09-07T12:00:00Z'))
    expect(sentEmails.length).toBeGreaterThan(0)
  })
})
```

Reuse the suite's existing seed helpers; if it has no `seedNativeDigestRecipient`, write one that inserts a `userArtistFollows` row with `source: 'manual'` plus a matching event in the window, mirroring the existing Spotify seed helper.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/api test:integration src/jobs/spotify-weekly.integration.test.ts`
Expected: FAIL. The first case sends an email.

- [ ] **Step 3: Add the gate**

In `apps/api/src/jobs/spotify-weekly.ts`, add the import:

```ts
import { isFeatureEnabled } from '../lib/feature-flags.js'
```

Add `digestSkippedFlag: boolean` to the `WeeklySummary` interface, and `digestSkippedFlag: false` to the summary literal in `runSpotifyWeekly`.

The gate goes **outside** the Phase 1 `try`, not inside it. That block's `catch` calls `Sentry.captureException`, and a deliberate skip must not page anyone; hoisting the condition also means a flagged-off run does no Clerk work at all.

Find the Phase 1 comment and `try` at `apps/api/src/jobs/spotify-weekly.ts:412-414`:

```ts
  // Phase 1 — digests. Clerk is loaded lazily so a missing @clerk/backend
  // never breaks module evaluation for the rest of the run.
  try {
```

Replace those three lines with:

```ts
  // The native shape rides the `following` entitlement and reads every follow
  // source, so it is deliberately outside this flag: hiding Spotify must not
  // take native following down with it.
  const digestEnabled =
    summary.nativeDigest || (await isFeatureEnabled('spotify-sync'))
  if (!digestEnabled) {
    summary.digestSkippedFlag = true
    apiLogger.info(
      { isoWeek: summary.isoWeek },
      'spotify-weekly: spotify-sync flag off, skipping digest phase',
    )
  }

  // Phase 1 — digests. Clerk is loaded lazily so a missing @clerk/backend
  // never breaks module evaluation for the rest of the run.
  if (digestEnabled) {
    try {
```

Then indent the remainder of that `try`/`catch` by one level and add the matching closing `}` after the `catch` block's closing brace, immediately before the Phase 2 `try` at what is currently line 476. Phase 2 is untouched — a flagged-off digest phase must not stop the rest of the run.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test:integration src/jobs/spotify-weekly.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/jobs/
git commit -m "feat(api): skip the Spotify weekly digest when spotify-sync is off"
```

---

## Task 12: The admin UI

**Files:**

- Create: `apps/web/src/app/(protected)/admin/feature-flags/page.tsx`
- Create: `apps/web/src/components/admin/feature-flags/FeatureFlagControl.tsx`
- Create: `apps/web/src/components/admin/feature-flags/FeatureFlagControl.test.tsx`
- Modify: `apps/web/src/components/admin/definitions/copy.ts`
- Modify: `apps/web/src/components/admin/shell/nav.ts`

**Interfaces:**

- Consumes: `AdminFeatureFlag` from `@concert-crawl/entitlements`; `apiClient`, `ApiError` from `@/lib/api`; `Panel`, `AdminButton`, `RelTime`, `StatusKind` from `@/components/admin/primitives`; `SectionHead` from `@/components/admin/primitives`.
- Produces: `FeatureFlagControl`, the `/admin/feature-flags` route.

> **Admin copy is exempt from the `copy-review` skill and from the `jsx-no-literals` lint,** but it still lives in `ADMIN_COPY` because every other admin surface does. No design round: the entitlements matrix already ships and renders `hidden`, and this page mirrors `founder-window`.

- [ ] **Step 1: Add the copy**

In `apps/web/src/components/admin/definitions/copy.ts`, add a `featureFlags` block beside `founderWindow`:

```ts
  featureFlags: {
    sectionEyebrow: 'RELEASE',
    sectionTitle: 'Feature flags',
    sectionSubtitle:
      'Turn a feature off and it disappears from every surface, and its API routes answer 404. A flag can only hide a feature, never grant one past its plan.',
    stateOn: 'On',
    stateOff: 'Off',
    neverToggled: 'Never changed',
    toggleOn: 'Turn on',
    toggleOff: 'Turn off',
    confirmTitleOn: 'Turn this on?',
    confirmTitleOff: 'Turn this off?',
    confirmBodyOn:
      'Customers will see this feature everywhere it appears, subject to their plan.',
    confirmBodyOff:
      'Customers will stop seeing this feature everywhere, and its API routes will answer 404. Existing data is left alone.',
    confirmCancel: 'Cancel',
    confirmAccept: 'Save',
    loadError: 'Could not save the flag. Try again.',
  },
```

- [ ] **Step 2: Add the nav entry**

In `apps/web/src/components/admin/shell/nav.ts`, add to `NAV_V2` in the `account` section, directly after the `founder-window` entry:

```ts
  {
    key: 'feature-flags',
    label: 'Feature flags',
    href: '/admin/feature-flags',
    iconName: 'ToggleLeft',
    section: 'account',
  },
```

`iconName` is resolved by name against `lucide-react` in `AdminShellClient.tsx`, so any exported icon works; `ToggleLeft` exists.

The existing `nav.test.ts` asserts that every `operations` item precedes every `account` item. Placing this entry inside the `account` run keeps that true.

- [ ] **Step 3: Write the failing control test**

Create `apps/web/src/components/admin/feature-flags/FeatureFlagControl.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const patch = vi.fn()
vi.mock('@/lib/api', () => ({
  apiClient: { patch },
  ApiError: class ApiError extends Error {},
}))
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}))

import { FeatureFlagControl } from './FeatureFlagControl'

const flags = [
  {
    key: 'crews' as const,
    label: 'Crews',
    description: 'The Crews tab and crew pages.',
    enabled: false,
    updatedAt: null,
    updatedBy: null,
  },
]

describe('FeatureFlagControl', () => {
  it('renders a row per flag with its current state', () => {
    render(<FeatureFlagControl initial={flags} />)
    expect(screen.getByText('Crews')).toBeVisible()
    expect(screen.getByText('Off')).toBeVisible()
  })

  it('asks for confirmation before saving', async () => {
    render(<FeatureFlagControl initial={flags} />)
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    expect(screen.getByText('Turn this on?')).toBeVisible()
    expect(patch).not.toHaveBeenCalled()
  })

  it('saves and reflects the new state on confirm', async () => {
    patch.mockResolvedValue({
      ...flags[0],
      enabled: true,
      updatedAt: '2026-09-07T00:00:00.000Z',
      updatedBy: 'admin',
    })
    render(<FeatureFlagControl initial={flags} />)
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('On')).toBeVisible())
    expect(patch).toHaveBeenCalledWith('/v1/admin/feature-flags/crews', 'tok', {
      enabled: true,
    })
  })

  it('saves nothing on cancel', async () => {
    render(<FeatureFlagControl initial={flags} />)
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(patch).not.toHaveBeenCalled()
    expect(screen.getByText('Off')).toBeVisible()
  })

  it('surfaces an error and leaves the state unchanged when the save fails', async () => {
    patch.mockRejectedValue(new Error('boom'))
    render(<FeatureFlagControl initial={flags} />)
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(screen.getByText(/Could not save the flag/)).toBeVisible(),
    )
    expect(screen.getByText('Off')).toBeVisible()
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm --filter @concert-crawl/web test src/components/admin/feature-flags/`
Expected: FAIL, module not found.

- [ ] **Step 5: Write the control**

Create `apps/web/src/components/admin/feature-flags/FeatureFlagControl.tsx`, following `FounderWindowControl.tsx` closely: `'use client'`, `useAuth()` for the token, local `useState` seeded from an `initial` prop, an async action that sets a pending key and clears it in a `finally`, and a co-located confirm component in the same file.

Two deliberate differences from `FounderWindowControl`:

- The confirm button uses `variant="primary"`, **not** `variant="danger"`. Opening the founder window is one-way; a flag toggle is reversible, and a danger treatment would misrepresent it.
- There is no create control and no free-text key input. The rows come from the API's projection of the code registry, so an admin cannot invent a key that nothing reads.

Render, per row: the label, the description, a `RelTime` for `updatedAt` (or the `neverToggled` string when it is `null`), the state string, and one button whose label is `toggleOn` or `toggleOff`.

- [ ] **Step 6: Write the page**

Create `apps/web/src/app/(protected)/admin/feature-flags/page.tsx`:

```tsx
import type { AdminFeatureFlag } from '@concert-crawl/entitlements'

import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives'
import { FeatureFlagControl } from '@/components/admin/feature-flags/FeatureFlagControl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.featureFlags

export default async function AdminFeatureFlagsPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const flags = await apiClient.get<AdminFeatureFlag[]>(
    '/v1/admin/feature-flags',
    token,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow={COPY.sectionEyebrow}
        title={COPY.sectionTitle}
        subtitle={COPY.sectionSubtitle}
      />
      <FeatureFlagControl initial={flags} />
    </div>
  )
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/web test src/components/admin/`
Expected: PASS, including the pre-existing `nav.test.ts`.

- [ ] **Step 8: Verify by hand**

Run `pnpm dev`, sign in as an admin, and visit `http://localhost:3000/admin/feature-flags`.
Expected: three rows, `Crews` and `Spotify sync` off, `Release notes` on. Toggle `Crews` on, confirm, then load `http://localhost:3000/crews` in another tab and confirm it renders instead of 404ing. Toggle it back off.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/\(protected\)/admin/feature-flags apps/web/src/components/admin/
git commit -m "feat(web): add the admin feature flag page"
```

---

## Task 13: Ship the record

**Files:**

- Modify: `docs/superpowers/progress.md`

**Interfaces:** none.

> **No `releases.ts` entry.** The PR ships features being hidden; a changelog entry announcing that contradicts the point, and `release-notes` is itself one of the three flags. A `progress.md` row **is** warranted: a release-gating capability is exactly what a session-start "where is the project" read needs.

- [ ] **Step 1: Add the row**

Add a ✅ Complete row to `docs/superpowers/progress.md`, matching the surrounding rows' column shape, dated the merge date. Summarise it as: admin-toggled feature flags; `spotify-sync` and `crews` ship off, `release-notes` on; flagged-off API routes answer 404.

- [ ] **Step 2: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: exit 0 across all packages.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/progress.md
git commit -m "docs(progress): record the feature flag system"
```

---

## Deployment note

The migration ships with the deploy; no hand-run SQL is needed. Because the table is created **empty** and the registry defaults `spotify-sync` and `crews` to `false`, **both features go dark the moment this merges** — that is the intended effect, not a regression to investigate. `release-notes` defaults on, so the changelog is unaffected.

The 30-second memo is per-process. With more than one API instance, a toggle converges everywhere within 30 seconds rather than instantly. That is the accepted tolerance; do not add cross-instance invalidation for it.

---

## Self-Review

**Spec coverage.**

| Spec section                    | Task                                                                |
| ------------------------------- | ------------------------------------------------------------------- |
| §4 registry                     | 1                                                                   |
| §5 storage + loader             | 2, 3                                                                |
| §6.1 web entitlement seam       | 8                                                                   |
| §6.2 API `requireFlag`          | 4, 5                                                                |
| §6.3 web route + element gating | 9, 10                                                               |
| §6.4 digest suppression         | 11                                                                  |
| §7 admin UI + endpoints         | 7, 12                                                               |
| §8 testing                      | folded into every task                                              |
| §9 surface inventory            | 9, 10                                                               |
| §10 issue #346 rewrite          | out of scope for this plan; it is a tracker edit, not a code change |

**Corrections this plan makes to the spec.** Two, both verified against the code:

1. The spec names `CrewGoingZone`; the component is `apps/web/src/components/consumer/crews/CrewGoingLine.tsx` (Task 10, Step 7).
2. The spec says the weekly digest exits early when `spotify-sync` is off. The job has a native shape gated on `following` that reads every follow source, and Hugh's locked decision forbids coupling native following to Spotify. Only the Spotify-shaped run is suppressed (Task 11).

**Type consistency.** `FeatureFlagKey`, `FeatureFlagView`, `AdminFeatureFlag`, `featureFlagDefaults`, `flagForEntitlement`, `isFeatureFlagKey`, `loadFeatureFlags`, `clearFeatureFlagCache`, `isFeatureEnabled`, `requireFlag`, `useFeatureFlags`, `useFeatureFlag`, `getFeatureFlags` are each defined once and referenced under the same name everywhere after. Note that `isFeatureEnabled` exists twice by design — once server-side in `apps/api/src/lib/feature-flags.ts`, once in `apps/web/src/lib/feature-flags.ts` — because the two read through different transports and never import each other.
