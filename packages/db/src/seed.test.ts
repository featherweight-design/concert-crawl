import { describe, it, expect } from 'vitest'
import {
  SEED_VENUES,
  FAKE_USER_PROFILES,
  FAKE_USER_ROLES,
  SEED_INVITE_CODES,
  SEED_FEEDBACK,
  SEED_NOTIFICATIONS,
} from '../seed.js'

describe('seed data', () => {
  it('contains at least 5 Denver venues', () => {
    expect(SEED_VENUES.length).toBeGreaterThanOrEqual(5)
  })

  it('every venue has a name, slug, websiteUrl, and city', () => {
    for (const venue of SEED_VENUES) {
      expect(venue.name).toBeTruthy()
      expect(venue.slug).toBeTruthy()
      expect(venue.websiteUrl).toBeTruthy()
      expect(venue.city).toBe('Denver')
    }
  })

  it('slugs are unique', () => {
    const slugs = SEED_VENUES.map((venue) => venue.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  describe('FAKE_USER_PROFILES', () => {
    it('contains exactly 9 profiles', () => {
      expect(FAKE_USER_PROFILES.length).toBe(9)
    })

    it('hugh profile has handle and electric theme', () => {
      const hugh = FAKE_USER_PROFILES.find(
        (profile) => profile.handle === 'hugh',
      )
      expect(hugh).toBeDefined()
      expect(hugh?.theme).toBe('electric')
    })

    it('ghost profile has no handle', () => {
      const ghost = FAKE_USER_PROFILES.find(
        (profile) => profile.userId === 'user_fake_ghost_0004',
      )
      expect(ghost).toBeDefined()
      expect(ghost?.handle).toBeNull()
    })

    it('all userIds are unique', () => {
      const ids = FAKE_USER_PROFILES.map((profile) => profile.userId)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('FAKE_USER_ROLES', () => {
    it('contains exactly 9 roles', () => {
      expect(FAKE_USER_ROLES.length).toBe(9)
    })

    it('hugh is admin with priceCredScore 150', () => {
      const hugh = FAKE_USER_ROLES.find(
        (role) => role.userId === 'user_3CoSI01LtxRAvremTpL0yDfuEJ6',
      )
      expect(hugh).toBeDefined()
      expect(hugh?.role).toBe('admin')
      expect(hugh?.priceCredScore).toBe(150)
    })

    it('amy_k is sub_admin', () => {
      const amy = FAKE_USER_ROLES.find(
        (role) => role.userId === 'user_fake_amy_0003',
      )
      expect(amy).toBeDefined()
      expect(amy?.role).toBe('sub_admin')
    })

    it('all userIds are unique', () => {
      const ids = FAKE_USER_ROLES.map((role) => role.userId)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('SEED_INVITE_CODES', () => {
    it('contains exactly 12 codes', () => {
      expect(SEED_INVITE_CODES.length).toBe(12)
    })

    it('7 codes are unused (no usedAt)', () => {
      const unused = SEED_INVITE_CODES.filter((code) => !code.usedAt)
      expect(unused.length).toBe(7)
    })

    it('5 codes are used (have usedAt)', () => {
      const used = SEED_INVITE_CODES.filter((code) => code.usedAt)
      expect(used.length).toBe(5)
    })

    it('all codes are unique strings', () => {
      const codes = SEED_INVITE_CODES.map((inviteCode) => inviteCode.code)
      expect(new Set(codes).size).toBe(codes.length)
    })
  })

  describe('SEED_FEEDBACK', () => {
    it('contains exactly 14 entries', () => {
      expect(SEED_FEEDBACK.length).toBe(14)
    })

    it('has 7 bug, 4 idea, 2 praise, and 1 other entries', () => {
      const bugs = SEED_FEEDBACK.filter((fb) => fb.category === 'bug')
      const ideas = SEED_FEEDBACK.filter((fb) => fb.category === 'idea')
      const praise = SEED_FEEDBACK.filter((fb) => fb.category === 'praise')
      const other = SEED_FEEDBACK.filter((fb) => fb.category === 'other')
      expect(bugs.length).toBe(7)
      expect(ideas.length).toBe(4)
      expect(praise.length).toBe(2)
      expect(other.length).toBe(1)
    })

    it('every entry has a userId, pageUrl, category, and message', () => {
      for (const fb of SEED_FEEDBACK) {
        expect(fb.userId).toBeTruthy()
        expect(fb.pageUrl).toBeTruthy()
        expect(fb.category).toBeTruthy()
        expect(fb.message).toBeTruthy()
      }
    })
  })

  describe('SEED_NOTIFICATIONS', () => {
    it('contains exactly 8 notifications', () => {
      expect(SEED_NOTIFICATIONS.length).toBe(8)
    })

    it('all notifications are admin_alert type', () => {
      for (const notif of SEED_NOTIFICATIONS) {
        expect(notif.type).toBe('admin_alert')
      }
    })

    it('every notification has a title, body, and category', () => {
      for (const notif of SEED_NOTIFICATIONS) {
        expect(notif.title).toBeTruthy()
        expect(notif.body).toBeTruthy()
        expect(notif.category).toBeTruthy()
      }
    })
  })
})
