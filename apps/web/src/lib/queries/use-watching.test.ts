import { describe, it, expect } from 'vitest'
import { watchingQueryKey } from './use-watching'

// The app-level QueryClient outlives sign-in sessions, so an unscoped key would
// let one account's watched shows be served to the next after a switch.
describe('watchingQueryKey', () => {
  it('scopes the cache entry by user', () => {
    expect(watchingQueryKey('user_a')).not.toEqual(watchingQueryKey('user_b'))
  })

  it('collapses a missing user to a single signed-out entry', () => {
    expect(watchingQueryKey(undefined)).toEqual(watchingQueryKey(null))
  })
})
