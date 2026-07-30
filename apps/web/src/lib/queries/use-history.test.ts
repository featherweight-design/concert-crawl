import { describe, it, expect } from 'vitest'
import { historyQueryKey } from './use-history'

// The app-level QueryClient outlives sign-in sessions, so an unscoped key would
// let one account's attended shows be served to the next after a switch.
describe('historyQueryKey', () => {
  it('scopes the cache entry by user', () => {
    expect(historyQueryKey('user_a')).not.toEqual(historyQueryKey('user_b'))
  })

  it('collapses a missing user to a single signed-out entry', () => {
    expect(historyQueryKey(undefined)).toEqual(historyQueryKey(null))
  })
})
