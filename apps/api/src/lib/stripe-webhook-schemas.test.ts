// Unit tests for the Stripe webhook payload schemas + helpers.

import { describe, it, expect } from 'vitest'
import {
  epochSecondsToDate,
  resolveInvoiceSubscriptionId,
  stripeInvoiceSchema,
  stripeSubscriptionSchema,
} from './stripe-webhook-schemas.js'

describe('stripeSubscriptionSchema', () => {
  it('normalizes an expanded customer object to its id', () => {
    const parsed = stripeSubscriptionSchema.safeParse({
      id: 'sub_1',
      status: 'active',
      customer: { id: 'cus_1' },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.customer).toBe('cus_1')
  })

  it('accepts a bare customer id string', () => {
    const parsed = stripeSubscriptionSchema.safeParse({
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.customer).toBe('cus_1')
  })

  it('rejects a payload missing the id', () => {
    const parsed = stripeSubscriptionSchema.safeParse({
      status: 'active',
      customer: 'cus_1',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('resolveInvoiceSubscriptionId', () => {
  const parseInvoice = (raw: unknown) => {
    const parsed = stripeInvoiceSchema.safeParse(raw)
    if (!parsed.success) throw new Error(parsed.error.message)
    return parsed.data
  }

  it('prefers the dahlia-era parent.subscription_details pointer', () => {
    const invoice = parseInvoice({
      id: 'in_1',
      subscription: 'sub_legacy',
      parent: { subscription_details: { subscription: 'sub_dahlia' } },
    })
    expect(resolveInvoiceSubscriptionId(invoice)).toBe('sub_dahlia')
  })

  it('falls back to the legacy top-level subscription field', () => {
    const invoice = parseInvoice({ id: 'in_1', subscription: 'sub_legacy' })
    expect(resolveInvoiceSubscriptionId(invoice)).toBe('sub_legacy')
  })

  it('normalizes an expanded subscription object to its id', () => {
    const invoice = parseInvoice({
      id: 'in_1',
      parent: { subscription_details: { subscription: { id: 'sub_obj' } } },
    })
    expect(resolveInvoiceSubscriptionId(invoice)).toBe('sub_obj')
  })

  it('returns null for a one-off invoice with no subscription', () => {
    const invoice = parseInvoice({ id: 'in_1' })
    expect(resolveInvoiceSubscriptionId(invoice)).toBeNull()
  })
})

describe('epochSecondsToDate', () => {
  it('converts epoch seconds to a Date', () => {
    expect(epochSecondsToDate(1_700_000_000)?.toISOString()).toBe(
      '2023-11-14T22:13:20.000Z',
    )
  })

  it('is null-safe', () => {
    expect(epochSecondsToDate(null)).toBeNull()
    expect(epochSecondsToDate(undefined)).toBeNull()
  })
})
