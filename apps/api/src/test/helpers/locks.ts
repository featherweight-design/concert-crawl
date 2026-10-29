import { sql, type SQL } from 'drizzle-orm'
import { testDb } from './db.js'

// Deterministic lock-interaction helpers for the price writers (#1107).
// A "holder" transaction runs on its own pool connection and keeps its locks
// until released, so a test can observe whether a request blocks on them
// without relying on timing: it polls pg_stat_activity for a backend waiting
// on a lock instead of racing a timeout.

type HolderTx = Parameters<Parameters<typeof testDb.transaction>[0]>[0]

export interface LockHolder {
  /** Run another statement inside the holder's open transaction. */
  run: (statement: SQL) => Promise<void>
  /** Roll the holder back and wait for its connection to be released. */
  release: () => Promise<void>
}

class HolderRollback extends Error {}

export async function openLockHolder(setup: SQL[]): Promise<LockHolder> {
  let signalReady!: () => void
  let signalSetupFailed!: (err: unknown) => void
  const ready = new Promise<void>((resolve, reject) => {
    signalReady = resolve
    signalSetupFailed = reject
  })
  const queue: {
    statement: SQL
    done: (err?: unknown) => void
  }[] = []
  let wake: (() => void) | undefined
  let releasing = false

  const finished = testDb
    .transaction(async (tx: HolderTx) => {
      for (const statement of setup) await tx.execute(statement)
      signalReady()
      for (;;) {
        const next = queue.shift()
        if (next) {
          try {
            await tx.execute(next.statement)
            next.done()
          } catch (err) {
            next.done(err)
            throw err
          }
          continue
        }
        if (releasing) throw new HolderRollback()
        await new Promise<void>((resolve) => {
          wake = resolve
        })
      }
    })
    // Any rejection lands here: a setup statement failing, a connection or
    // BEGIN failure before the callback ever runs, or the deliberate
    // rollback on release. Forward it to `ready` so a holder that never
    // opened rejects instead of hanging; once `ready` has resolved the
    // reject is a no-op.
    .catch((err: unknown) => {
      signalSetupFailed(err)
    })

  await ready

  return {
    run: (statement) =>
      new Promise<void>((resolve, reject) => {
        queue.push({
          statement,
          done: (err) => (err === undefined ? resolve() : reject(err)),
        })
        wake?.()
      }),
    release: async () => {
      releasing = true
      wake?.()
      await finished
    },
  }
}

export async function countLockWaiters(): Promise<number> {
  const rows = await testDb.execute(
    sql`SELECT count(*)::int AS waiters FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'`,
  )
  return Number(rows[0]?.['waiters'] ?? 0)
}

/**
 * Start `action` and report whether any backend ends up waiting on a lock
 * before it settles. Returns as soon as either happens; the caller still owns
 * the returned promise and must await it after releasing any holder.
 */
export async function observeBlocking<T>(
  action: () => Promise<T>,
): Promise<{ blocked: boolean; result: Promise<T> }> {
  let settled = false
  const result = action()
  const tracked = result.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    },
  )
  void tracked
  while (!settled) {
    if ((await countLockWaiters()) > 0) return { blocked: true, result }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return { blocked: false, result }
}

/**
 * Open a holder, run `body` with it, and ALWAYS roll the holder back after,
 * even when `body` throws, so an open holder transaction can never outlive a
 * failed test and block the next clearTables() TRUNCATE. `body` must not
 * await work that needs the holder released; return its promise inside an
 * object instead and await it after this resolves.
 */
export async function withLockHolder<T>(
  setup: SQL[],
  body: (holder: LockHolder) => Promise<T>,
): Promise<T> {
  const holder = await openLockHolder(setup)
  try {
    return await body(holder)
  } finally {
    await holder.release()
  }
}

/**
 * Resolve true once some backend is waiting on a lock, or false if `pending`
 * settles first (it never needed to wait) or `maxMs` passes. Never throws, so
 * a caller's cleanup always runs; assert on the result instead.
 */
export async function waitForLockWaiter(
  pending: Promise<unknown>,
  maxMs = 60_000,
): Promise<boolean> {
  let settled = false
  void pending.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    },
  )
  const start = Date.now()
  while (!settled && Date.now() - start <= maxMs) {
    if ((await countLockWaiters()) > 0) return true
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return false
}
