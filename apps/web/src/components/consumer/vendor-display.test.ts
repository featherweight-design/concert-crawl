import { describe, it, expect } from 'vitest'
import { displayVendor, VENUE_BOX_OFFICE_LABEL } from './vendor-display'

describe('displayVendor', () => {
  it("maps the 'VenueBoxOffice' enum value to the box-office label", () => {
    expect(displayVendor('VenueBoxOffice')).toBe(VENUE_BOX_OFFICE_LABEL)
  })

  it('never renders the venue name in place of the vendor (Round-3 #2 lock)', () => {
    expect(VENUE_BOX_OFFICE_LABEL).toBe('Venue box office')
  })

  it.each(['AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite'])(
    'passes %s through unchanged',
    (vendor) => {
      expect(displayVendor(vendor)).toBe(vendor)
    },
  )

  it.each([
    ['VividSeats', 'Vivid Seats'],
    ['Viagogo', 'viagogo'],
  ])(
    'renders %s with the picker spelling, not the enum value',
    (stored, shown) => {
      expect(displayVendor(stored)).toBe(shown)
    },
  )

  // "seen on Somewhere else" reads as a mistake — the catch-all needs its own
  // wording in the display direction.
  it('renders the catch-all as a generic seller, not the picker string', () => {
    expect(displayVendor('Other')).toBe('another seller')
  })

  // A prototype key must not be mistaken for a vendor — `in` would say yes and
  // hand back a function where the UI expects a name.
  it.each(['toString', 'hasOwnProperty', 'constructor'])(
    'passes the Object.prototype key %s through unchanged',
    (key) => {
      expect(displayVendor(key)).toBe(key)
    },
  )

  it('passes unknown vendor strings through unchanged', () => {
    expect(displayVendor('Unknown Vendor')).toBe('Unknown Vendor')
  })
})
