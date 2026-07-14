/**
 * Concert Crawl — read-only prod DB client wrapper for the staging seeder.
 *
 * `openProdReadonly` opens a Postgres connection to production (URL passed by
 * caller — never read from the environment here) and returns a structurally
 * read-only wrapper. The returned `ProdReadonlyClient` exposes only `select`
 * and `close`. The Drizzle client passed into the `select` callback is a
 * proxied minimal wrapper that exposes ONLY `.select` and `.query` — every
 * other property access (including Drizzle's internal `.session`, `.dialect`,
 * write methods, etc.) throws at runtime. The wrapper's `.select` is
 * `.bind(db)`-preserved so Drizzle's query builder chain still works
 * correctly. Downstream sync tasks cannot write to prod even if they
 * escape the type system via casts to any.
 *
 * Usage:
 *   const prod = openProdReadonly(process.env['NEON_PROD_DIRECT'] ?? '')
 *   try {
 *     const rows = await prod.select(db => db.select().from(venues))
 *   } finally {
 *     await prod.close()
 *   }
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../packages/db/src/schema/index.js'

// The full drizzle client type (with schema) used internally.
type FullDb = ReturnType<typeof drizzle<typeof schema>>

/**
 * A Drizzle client narrowed to read-only operations. Downstream callers
 * receive this type and cannot call `.insert`, `.update`, or `.delete`.
 *
 * Structural Pick — only the `select` and `query` members survive. TypeScript
 * will reject any attempt to call write methods on a value of this type.
 */
export type DrizzleReadDb = Pick<FullDb, 'select' | 'query'>

/**
 * The surface returned by `openProdReadonly`. The only methods present are
 * `select` (runs a read callback) and `close` (terminates the connection).
 * No write surface exists on this type or at runtime.
 */
export type ProdReadonlyClient = {
  select: <T>(fn: (db: DrizzleReadDb) => Promise<T>) => Promise<T>
  close: () => Promise<void>
}

/**
 * Opens a read-only Drizzle client to the given Postgres URL.
 *
 * @param url - Full Postgres connection string (e.g. the value of
 *   `NEON_PROD_DIRECT`). Throws immediately if empty.
 */
export function openProdReadonly(url: string): ProdReadonlyClient {
  if (!url) {
    throw new Error(
      'openProdReadonly: url must not be empty. Pass the value of NEON_PROD_DIRECT.',
    )
  }

  // max: 2 — this is a one-shot script; we don't need a large pool.
  // prepare: false — required for compatibility with Neon's connection pooler.
  const sql = postgres(url, { max: 2, prepare: false, ssl: 'require' })
  const db = drizzle(sql, { schema })

  // Runtime read-only enforcement: expose a MINIMAL wrapper object with only
  // `select` and `query` bound to the real db, then proxy that wrapper. Any
  // other property access on the wrapper throws — Drizzle's internal handles
  // (`session`, `dialect`, `_`, etc.) are unreachable from the callback, so
  // even a cast-to-any escape can't drill through to raw SQL execution.
  //
  // `.bind(db)` preserves `this` so Drizzle's method chain (`db.select().from(…)`)
  // continues to work when it internally reads its own state during query build.
  //
  // Types stay narrowed to `Pick<db, 'select' | 'query'>` via `DrizzleReadDb`,
  // so accidental use at call sites also fails at compile time.
  const readOnlyWrapper = {
    select: db.select.bind(db),
    query: db.query,
  }

  const readOnlyProxy = new Proxy(readOnlyWrapper, {
    get(target, prop, receiver) {
      if (prop === 'select' || prop === 'query') {
        return Reflect.get(target, prop, receiver)
      }
      // Allow symbols (Symbol.iterator, Symbol.for('nodejs.util.inspect.custom'))
      // for logging / debugging tools.
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver)
      }
      throw new Error(
        `ProdReadonlyClient: attempted to access '${String(prop)}' on the read-only prod client. Only 'select' and 'query' are exposed. Do NOT write to prod.`,
      )
    },
  })

  // Cast to DrizzleReadDb so the type checker enforces read-only access at call sites.
  const readDb: DrizzleReadDb = readOnlyProxy as unknown as DrizzleReadDb

  return {
    select: <T>(fn: (db: DrizzleReadDb) => Promise<T>): Promise<T> =>
      fn(readDb),
    close: (): Promise<void> => sql.end(),
  }
}
