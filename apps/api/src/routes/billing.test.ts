import { describe, it, expect } from 'vitest'
import { evaluateFounderGates, resolveClientSecret } from './billing.js'

const NOW = new Date('2026-07-11T12:00:00Z')

const openWindow = {
  opensAt: new Date('2026-07-01T00:00:00Z'),
  closesAt: new Date('2026-07-31T00:00:00Z'),
  seatsRemaining: 42,
}

describe('evaluateFounderGates', () => {
  it('passes when the window is open with seats remaining', () => {
    expect(evaluateFounderGates(openWindow, NOW)).toEqual({ ok: true })
  })

  it('returns 403 founder_window_not_open when opensAt is NULL (pre-launch)', () => {
    expect(
      evaluateFounderGates(
        { ...openWindow, opensAt: null, closesAt: null },
        NOW,
      ),
    ).toEqual({ ok: false, status: 403, code: 'founder_window_not_open' })
  })

  it('returns 403 founder_window_not_open when opensAt is in the future', () => {
    expect(
      evaluateFounderGates(
        {
          ...openWindow,
          opensAt: new Date('2026-08-01T00:00:00Z'),
          closesAt: new Date('2026-08-31T00:00:00Z'),
        },
        NOW,
      ),
    ).toEqual({ ok: false, status: 403, code: 'founder_window_not_open' })
  })

  it('returns 410 founder_window_closed when closesAt has passed', () => {
    expect(
      evaluateFounderGates(
        {
          ...openWindow,
          opensAt: new Date('2026-05-01T00:00:00Z'),
          closesAt: new Date('2026-05-31T00:00:00Z'),
        },
        NOW,
      ),
    ).toEqual({ ok: false, status: 410, code: 'founder_window_closed' })
  })

  it('returns 410 founder_window_closed when closesAt is exactly now (boundary)', () => {
    expect(evaluateFounderGates({ ...openWindow, closesAt: NOW }, NOW)).toEqual(
      { ok: false, status: 410, code: 'founder_window_closed' },
    )
  })

  it('returns 410 founder_seats_exhausted when no seats remain', () => {
    expect(
      evaluateFounderGates({ ...openWindow, seatsRemaining: 0 }, NOW),
    ).toEqual({ ok: false, status: 410, code: 'founder_seats_exhausted' })
  })

  it('checks window state before seat count (closed + exhausted → closed)', () => {
    expect(
      evaluateFounderGates(
        {
          opensAt: new Date('2026-05-01T00:00:00Z'),
          closesAt: new Date('2026-05-31T00:00:00Z'),
          seatsRemaining: 0,
        },
        NOW,
      ),
    ).toEqual({ ok: false, status: 410, code: 'founder_window_closed' })
  })
})

describe('resolveClientSecret', () => {
  it('extracts the client secret from an expanded confirmation_secret', () => {
    expect(
      resolveClientSecret({
        id: 'sub_1',
        latest_invoice: {
          confirmation_secret: { client_secret: 'pi_secret_abc' },
        },
      }),
    ).toBe('pi_secret_abc')
  })

  it('returns null when latest_invoice is an unexpanded ID string', () => {
    expect(
      resolveClientSecret({ id: 'sub_1', latest_invoice: 'in_123' }),
    ).toBeNull()
  })

  it('returns null when latest_invoice is null or absent', () => {
    expect(
      resolveClientSecret({ id: 'sub_1', latest_invoice: null }),
    ).toBeNull()
    expect(resolveClientSecret({ id: 'sub_1' })).toBeNull()
  })

  it('returns null when client_secret is not a string (unexpected shape)', () => {
    expect(
      resolveClientSecret({
        id: 'sub_1',
        latest_invoice: { confirmation_secret: { client_secret: null } },
      }),
    ).toBeNull()
  })

  it('returns null when confirmation_secret is missing or null', () => {
    expect(resolveClientSecret({ id: 'sub_1', latest_invoice: {} })).toBeNull()
    expect(
      resolveClientSecret({
        id: 'sub_1',
        latest_invoice: { confirmation_secret: null },
      }),
    ).toBeNull()
  })
})
