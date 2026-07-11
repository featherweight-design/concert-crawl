'use client'

// Payment-flow suppression signal (#775, PR 4.3). A tiny module-level
// external store: the tier picker marks the embedded checkout as an
// active payment flow, and the past-due banner suppresses itself while
// one is active (don't double-stack a "fix your card" alert on top of a
// card-entry form). Counter-based so nested/overlapping flows only clear
// when every one has released.

import { useSyncExternalStore } from 'react'

let activeCount = 0
const listeners = new Set<() => void>()

const notify = (): void => {
  for (const listener of listeners) listener()
}

export const isPaymentFlowActive = (): boolean => activeCount > 0

// Increments the active-flow counter and returns a release function.
// Release is idempotent — calling it more than once decrements only once.
export const beginPaymentFlow = (): (() => void) => {
  activeCount += 1
  notify()
  let released = false
  return () => {
    if (released) return
    released = true
    activeCount -= 1
    notify()
  }
}

export const subscribePaymentFlow = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const usePaymentFlowActive = (): boolean =>
  useSyncExternalStore(
    subscribePaymentFlow,
    isPaymentFlowActive,
    // Server snapshot — no payment flow can be active during SSR.
    () => false,
  )
