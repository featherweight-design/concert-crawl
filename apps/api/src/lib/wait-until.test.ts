import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockWaitUntil } = vi.hoisted(() => ({ mockWaitUntil: vi.fn() }))
vi.mock('@vercel/functions', () => ({ waitUntil: mockWaitUntil }))

import { isVercelRuntime, keepAliveUntil } from './wait-until.js'
import { drainBackgroundTasks, runBackgroundTask } from './background-tasks.js'

describe('keepAliveUntil', () => {
  const original = process.env['VERCEL']

  beforeEach(() => {
    mockWaitUntil.mockClear()
  })

  afterEach(() => {
    if (original === undefined) delete process.env['VERCEL']
    else process.env['VERCEL'] = original
  })

  it('hands the promise to waitUntil on Vercel', () => {
    process.env['VERCEL'] = '1'
    const promise = Promise.resolve()
    keepAliveUntil(promise)
    expect(isVercelRuntime()).toBe(true)
    expect(mockWaitUntil).toHaveBeenCalledWith(promise)
  })

  it('is a no-op on the Node server', () => {
    delete process.env['VERCEL']
    keepAliveUntil(Promise.resolve())
    expect(isVercelRuntime()).toBe(false)
    expect(mockWaitUntil).not.toHaveBeenCalled()
  })

  it('runBackgroundTask registers its task with waitUntil on Vercel', async () => {
    process.env['VERCEL'] = '1'
    let ran = false
    runBackgroundTask(async () => {
      ran = true
    })
    expect(mockWaitUntil).toHaveBeenCalledTimes(1)
    // The registered promise is the tracked task: awaiting it means the task ran.
    const [registered] = mockWaitUntil.mock.calls[0] ?? []
    await registered
    expect(ran).toBe(true)
    await drainBackgroundTasks()
  })

  it('runBackgroundTask leaves waitUntil alone on the Node server', async () => {
    delete process.env['VERCEL']
    let ran = false
    runBackgroundTask(async () => {
      ran = true
    })
    expect(mockWaitUntil).not.toHaveBeenCalled()
    await drainBackgroundTasks()
    expect(ran).toBe(true)
  })
})
