import { describe, expect, it } from 'vitest'

import { formatEventDate } from '../definitions/lib'

import { fmtDate } from './DateStamp'

describe('fmtDate', () => {
  it('splits an ISO date into its display parts', () => {
    expect(fmtDate('2026-08-05')).toEqual({
      dow: 'WED',
      mon: 'AUG',
      day: '5',
    })
  })

  // The date belongs to the venue, not the viewer. This pins the delegation
  // rather than catching a regression: the bespoke parse it replaced happened to
  // be self-consistent, so only a shared helper keeps this stamp aligned with
  // every other date on the site the next time that helper changes.
  it.each(['2026-01-01', '2026-03-08', '2026-08-05', '2026-11-01'])(
    'reads %s the same way the shared date formatter does',
    (iso) => {
      expect(fmtDate(iso)).toEqual({
        dow: formatEventDate(iso, undefined, {
          weekday: 'short',
        }).toUpperCase(),
        mon: formatEventDate(iso, undefined, { month: 'short' }).toUpperCase(),
        day: formatEventDate(iso, undefined, { day: 'numeric' }),
      })
    },
  )
})
