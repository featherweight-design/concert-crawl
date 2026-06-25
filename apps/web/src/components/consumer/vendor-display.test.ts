import { describe, it, expect } from 'vitest'
import { displayVendor } from './vendor-display'

describe('displayVendor', () => {
  it("maps the 'VenueBoxOffice' enum value to 'Venue' (Round-3 #2 lock)", () => {
    expect(displayVendor('VenueBoxOffice')).toBe('Venue')
  })

  it.each(['AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite'])(
    'passes %s through unchanged',
    (vendor) => {
      expect(displayVendor(vendor)).toBe(vendor)
    },
  )

  it('passes unknown vendor strings through unchanged', () => {
    expect(displayVendor('Unknown Vendor')).toBe('Unknown Vendor')
  })
})
