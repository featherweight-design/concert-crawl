import { describe, expect, it } from 'vitest'
import { runBackgroundTask, drainBackgroundTasks } from './background-tasks.js'

describe('background-tasks registry', () => {
  it('drainBackgroundTasks awaits an in-flight task to completion', async () => {
    let settled = false

    runBackgroundTask(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      settled = true
    })

    // Before draining, the task is still pending.
    expect(settled).toBe(false)

    await drainBackgroundTasks()

    // After draining, the task has finished — this is the #941 guarantee that no
    // background write leaks into a later test's setup window.
    expect(settled).toBe(true)
  })

  it('drain resolves even when a background task rejects', async () => {
    let ran = false

    runBackgroundTask(async () => {
      ran = true
      throw new Error('boom')
    })

    // runBackgroundTask's internal .catch handles the rejection, so the tracked
    // promise resolves before drain sees it — drain must not throw.
    await expect(drainBackgroundTasks()).resolves.toBeUndefined()
    expect(ran).toBe(true)
  })

  it('does not let a synchronous throw propagate to the caller', async () => {
    // A non-async task that throws synchronously must be converted to a rejected
    // promise, not thrown into the request handler that called runBackgroundTask.
    const throwsSynchronously = (): never => {
      throw new Error('sync boom')
    }

    expect(() => runBackgroundTask(throwsSynchronously)).not.toThrow()

    await expect(drainBackgroundTasks()).resolves.toBeUndefined()
  })

  it('accepts a synchronous (non-async) task and drains it', async () => {
    // The signature is `() => void | Promise<void>`, so a plain sync task is a
    // valid caller without an async wrapper. The drain must still await it.
    let ran = false

    runBackgroundTask(() => {
      ran = true
    })

    await drainBackgroundTasks()

    expect(ran).toBe(true)
  })

  it('drains multiple concurrent tasks', async () => {
    const order: number[] = []

    runBackgroundTask(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      order.push(1)
    })
    runBackgroundTask(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      order.push(2)
    })

    await drainBackgroundTasks()

    expect(order).toHaveLength(2)
    expect(order).toContain(1)
    expect(order).toContain(2)
  })

  it('awaits tasks scheduled by another task while draining', async () => {
    let outerDone = false
    let nestedDone = false

    runBackgroundTask(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      outerDone = true
      // Schedule further background work from inside a draining task.
      runBackgroundTask(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        nestedDone = true
      })
    })

    await drainBackgroundTasks()

    // Both the outer task and the task it scheduled must be awaited — otherwise
    // the nested write would leak past afterEach.
    expect(outerDone).toBe(true)
    expect(nestedDone).toBe(true)
  })

  it('is a no-op when no tasks are pending', async () => {
    await expect(drainBackgroundTasks()).resolves.toBeUndefined()
  })
})
