import { describe, it, expect } from 'vitest'
import { EMAIL_TEMPLATE_KEYS } from '@concert-crawl/db'
import {
  TEST_EMAIL_KEYS,
  TEST_EMAIL_OPTIONS,
  buildTestEmail,
} from './test-fixtures.js'

describe('test-fixtures', () => {
  it('lists every transactional template key in the picker', () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      expect(TEST_EMAIL_KEYS, `missing picker entry for ${key}`).toContain(key)
    }
  })

  it('builds a non-empty, deliverable sample for every key', () => {
    for (const key of TEST_EMAIL_KEYS) {
      const built = buildTestEmail(key)
      expect(built.subject.trim(), `subject for ${key}`).not.toBe('')
      // Resend needs at least one body — html OR text. Operational invite has
      // html:'' by design, so assert the union is non-empty rather than html.
      const hasBody = built.html.trim() !== '' || built.text.trim() !== ''
      expect(hasBody, `body for ${key}`).toBe(true)
      expect(
        ['transactional', 'alert', 'invite'],
        `fromCategory for ${key}`,
      ).toContain(built.fromCategory)
    }
  })

  it('lists exactly one option per sendable key', () => {
    const optionKeys = TEST_EMAIL_OPTIONS.map((opt) => opt.key).sort()
    const sendableKeys = [...TEST_EMAIL_KEYS].sort()
    expect(optionKeys).toEqual(sendableKeys)
  })

  it('groups every option as Customer or Operational', () => {
    for (const opt of TEST_EMAIL_OPTIONS) {
      expect(['Customer', 'Operational']).toContain(opt.group)
      expect(opt.label.trim()).not.toBe('')
    }
  })
})
