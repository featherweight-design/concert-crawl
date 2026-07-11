import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  beginPaymentFlow,
  isPaymentFlowActive,
  subscribePaymentFlow,
} from './payment-flow-signal'

// The store is module-level; each test must release everything it began.
const releases: Array<() => void> = []
const begin = () => {
  const release = beginPaymentFlow()
  releases.push(release)
  return release
}

afterEach(() => {
  while (releases.length > 0) releases.pop()?.()
})

describe('payment-flow-signal', () => {
  it('begin activates and release deactivates', () => {
    expect(isPaymentFlowActive()).toBe(false)
    const release = begin()
    expect(isPaymentFlowActive()).toBe(true)
    release()
    expect(isPaymentFlowActive()).toBe(false)
  })

  it('nested begins stay active until every release fires', () => {
    const releaseFirst = begin()
    const releaseSecond = begin()
    expect(isPaymentFlowActive()).toBe(true)
    releaseFirst()
    expect(isPaymentFlowActive()).toBe(true)
    releaseSecond()
    expect(isPaymentFlowActive()).toBe(false)
  })

  it('release is idempotent — double release never underflows', () => {
    const releaseFirst = begin()
    const releaseSecond = begin()
    releaseFirst()
    releaseFirst()
    expect(isPaymentFlowActive()).toBe(true)
    releaseSecond()
    expect(isPaymentFlowActive()).toBe(false)
  })

  it('notifies subscribed listeners on begin and release', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePaymentFlow(listener)
    const release = begin()
    expect(listener).toHaveBeenCalledTimes(1)
    release()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    begin()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
