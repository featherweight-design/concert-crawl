import { describe, expect, it } from 'vitest'
import {
  narrowLastAdminAction,
  narrowLastAdminActionKind,
} from './last-admin-action.js'

describe('narrowLastAdminActionKind', () => {
  it('passes through "defer"', () => {
    expect(narrowLastAdminActionKind('defer')).toBe('defer')
  })

  it('narrows null to null', () => {
    expect(narrowLastAdminActionKind(null)).toBeNull()
  })

  it('narrows unknown kinds to null', () => {
    expect(narrowLastAdminActionKind('escalate')).toBeNull()
    expect(narrowLastAdminActionKind('')).toBeNull()
    expect(narrowLastAdminActionKind('DEFER')).toBeNull()
  })
})

describe('narrowLastAdminAction', () => {
  it('returns both null when both inputs are null (steady-state)', () => {
    const result = narrowLastAdminAction(null, null)
    expect(result.kind).toBeNull()
    expect(result.at).toBeNull()
  })

  it('returns kind="defer" with ISO timestamp when both inputs are valid', () => {
    const at = new Date('2026-06-15T12:00:00Z')
    const result = narrowLastAdminAction('defer', at)
    expect(result.kind).toBe('defer')
    expect(result.at).toBe(at.toISOString())
  })

  it('accepts a pre-stringified ISO timestamp and returns it as-is', () => {
    const result = narrowLastAdminAction('defer', '2026-06-15T12:00:00.000Z')
    expect(result.kind).toBe('defer')
    expect(result.at).toBe('2026-06-15T12:00:00.000Z')
  })

  it('forces both fields to null when kind is unknown but at is set (R16 defensive narrow)', () => {
    // Future kind landing in the DB column before the union is widened must
    // not leak its existence via a real timestamp paired with kind=null.
    const result = narrowLastAdminAction(
      'some_future_kind',
      new Date('2026-06-15T12:00:00Z'),
    )
    expect(result.kind).toBeNull()
    expect(result.at).toBeNull()
  })

  it('forces both fields to null when kind is defer but at is null (R19 defensive half-write protection)', () => {
    // Half-populated state — partial write, manual UPDATE, or bad backfill —
    // must not surface kind="defer" without a real timestamp. The contract is
    // "both null unless a real defer event occurred."
    const result = narrowLastAdminAction('defer', null)
    expect(result.kind).toBeNull()
    expect(result.at).toBeNull()
  })

  it('forces both fields to null when both kind and at are missing/invalid', () => {
    const result = narrowLastAdminAction('escalate', null)
    expect(result.kind).toBeNull()
    expect(result.at).toBeNull()
  })
})
