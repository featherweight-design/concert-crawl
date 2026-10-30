// Registry for fire-and-forget work that route handlers kick off after sending
// their response (vendor detection, price pipelines, transactional email). In
// production these run detached so the request isn't blocked. In tests they
// must not outlive the test that triggered them — an un-awaited DB write that
// commits during a later test's setup window is the cross-file pollution class
// tracked in #941. `drainBackgroundTasks()` lets the integration test harness
// await every in-flight task in afterEach so nothing leaks across boundaries.

import { apiLogger } from './logger.js'
import { keepAliveUntil } from './wait-until.js'

const pending = new Set<Promise<unknown>>()

/**
 * Run a detached background task. The task owns its own error handling (it
 * should never reject); this wrapper only tracks the promise so tests can drain
 * it. Behaves like the previous `void (async () => {…})()` in production.
 *
 * Accepts sync or async tasks: `Promise.resolve().then(task)` normalises both,
 * turning a synchronous throw into a rejected promise the drain still awaits.
 */
export function runBackgroundTask(task: () => void | Promise<void>): void {
  // `Promise.resolve().then(task)` converts a synchronous throw into a rejected
  // promise so it can never propagate into the caller's response path. The
  // `.catch` is a safety net: tasks own their own error handling, but in
  // production `drainBackgroundTasks` is never called, so an escaped rejection
  // would otherwise surface as an unhandled rejection. Log it so the failure
  // stays discoverable. `allSettled` in the drain still awaits either way.
  const promise = Promise.resolve()
    .then(task)
    .catch((err) => {
      apiLogger.error({ err }, 'Unhandled error in background task')
    })
  pending.add(promise)
  // On Vercel the instance can be frozen once the response is sent, so the
  // platform must be told to wait for this task. No-op on the Node server,
  // where the process outlives the request and today's behavior is unchanged.
  keepAliveUntil(promise)
  // Attach cleanup after registration so `promise` is fully assigned first. This
  // handler is registered before the drain attaches its own reaction, so it runs
  // first when `promise` settles — the registry is emptied before drain's await
  // resolves.
  void promise.finally(() => {
    pending.delete(promise)
  })
}

/**
 * Await every in-flight background task. Used by the integration test harness.
 * Loops until the registry is empty so that a task which schedules further
 * background work while draining is also awaited — otherwise the newly-added
 * promise would leak past afterEach and defeat the guarantee.
 */
export async function drainBackgroundTasks(): Promise<void> {
  while (pending.size > 0) {
    await Promise.allSettled([...pending])
  }
}
