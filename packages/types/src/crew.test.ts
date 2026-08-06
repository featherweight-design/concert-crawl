import { describe, it, expect } from 'vitest'
import type { PublicCrewInvite } from './crew.js'

// Decision 4 / PR-3 Task 4: the invite landing shows crew identity and never
// attendance. The type is the first line of that guarantee — there is no event
// field to populate, so leaking one is a compile error rather than a review
// catch. The type-level half of that pin lives in crew.ts itself, because this
// file is excluded from typecheck; what this test adds is the concrete object
// an API handler actually builds.
describe('PublicCrewInvite', () => {
  it('carries crew identity and nothing about what the crew is going to', () => {
    const invite: PublicCrewInvite = {
      crewId: '2f8b0c4e-1a3d-4f5e-9b7c-0d1e2f3a4b5c',
      name: 'Basement Dwellers',
      patchSalt: 0,
      memberCount: 4,
      invitedByHandle: null,
      isFull: false,
    }

    expect(Object.keys(invite).sort()).toEqual([
      'crewId',
      'invitedByHandle',
      'isFull',
      'memberCount',
      'name',
      'patchSalt',
    ])
  })
})
