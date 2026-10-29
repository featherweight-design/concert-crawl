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
      try {
        for (const statement of setup) await tx.execute(statement)
      } catch (err) {
        signalSetupFailed(err)
        throw err
      }
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
    .catch(() => undefined)

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

/** Resolve once some backend is waiting on a lock (or reject after `maxMs`). */
export async function waitForLockWaiter(maxMs = 60_000): Promise<void> {
  const start = Date.now()
  while ((await countLockWaiters()) === 0) {
    if (Date.now() - start > maxMs) {
      throw new Error('waitForLockWaiter: no backend ever waited on a lock')
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}
