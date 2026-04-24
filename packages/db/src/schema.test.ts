import { describe, it, expect } from 'vitest'
import {
  venues,
  events,
  userRoles,
  inviteCodes,
  auditLog,
  notifications,
  feedback,
  crawlRuns,
} from './index.js'

describe('database schema exports', () => {
  it('exports venues table', () => {
    expect(venues).toBeDefined()
  })

  it('venues table has required columns', () => {
    const columns = Object.keys(venues)
    expect(columns).toContain('id')
    expect(columns).toContain('name')
    expect(columns).toContain('slug')
    expect(columns).toContain('websiteUrl')
    expect(columns).toContain('active')
    expect(columns).toContain('verified')
  })

  it('exports events table', () => {
    expect(events).toBeDefined()
  })

  it('exports userRoles table', () => {
    expect(userRoles).toBeDefined()
  })

  it('exports inviteCodes table', () => {
    expect(inviteCodes).toBeDefined()
  })

  it('exports auditLog table', () => {
    expect(auditLog).toBeDefined()
  })

  it('exports notifications table', () => {
    expect(notifications).toBeDefined()
  })

  it('exports feedback table', () => {
    expect(feedback).toBeDefined()
  })

  it('exports crawlRuns table', () => {
    expect(crawlRuns).toBeDefined()
  })
})
