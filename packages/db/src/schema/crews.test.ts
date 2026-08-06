import { describe, it, expect } from 'vitest'
import { crews, crewMembers, crewInvites, crewMutes } from './crews.js'

describe('crews schema', () => {
  it('crews carries a keeper and a patch salt, and no member count', () => {
    const columns = Object.keys(crews)
    expect(columns).toContain('id')
    expect(columns).toContain('name')
    // Deliberately keeperId, not createdBy — the keeper moves on handoff.
    expect(columns).toContain('keeperId')
    expect(columns).not.toContain('createdBy')
    expect(columns).toContain('patchSalt')
    // memberCount is count(*) over crew_members, never a stored counter.
    expect(columns).not.toContain('memberCount')
  })

  it('crew_members links a crew to a Clerk user id', () => {
    const columns = Object.keys(crewMembers)
    expect(columns).toContain('crewId')
    expect(columns).toContain('userId')
    expect(columns).toContain('joinedAt')
  })

  it('crew_invites carries expiry and revocation', () => {
    const columns = Object.keys(crewInvites)
    expect(columns).toContain('token')
    // Immutable, unlike crews.keeperId.
    expect(columns).toContain('createdBy')
    expect(columns).toContain('expiresAt')
    expect(columns).toContain('revokedAt')
    expect(columns).toContain('revokedBy')
  })

  it('crew_mutes has no boolean — the row IS the muted state', () => {
    const columns = Object.keys(crewMutes)
    expect(columns).toContain('crewId')
    expect(columns).toContain('userId')
    expect(columns).toContain('mutedAt')
    expect(columns).not.toContain('muted')
  })
})
