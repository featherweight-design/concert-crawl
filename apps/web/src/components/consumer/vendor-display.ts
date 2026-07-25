// Locked per memory:project_price_source_discoverability — Round-3 #2:
// the vendor never renders as the venue's own name, anywhere it's a vendor
// value. The shipped API stores the box-office vendor as the enum value
// 'VenueBoxOffice'; everywhere the consumer-side UI renders that as a display
// label, it resolves to VENUE_BOX_OFFICE_LABEL.

import type { Vendor } from '@concert-crawl/types'
import {
  CONSUMER_COPY,
  VENDOR_PICKER_COPY,
} from '@/components/consumer/definitions/copy'

export const VENUE_BOX_OFFICE_LABEL = CONSUMER_COPY.vendors.venueBoxOffice

// Own-property only: `in` would also match Object.prototype keys, so
// displayVendor('toString') would hand the UI a function.
const isKnownVendor = (vendor: string): vendor is Vendor =>
  Object.hasOwn(VENDOR_PICKER_COPY.vendors, vendor)

/**
 * Map a stored Vendor enum value to its consumer-facing display label.
 *
 * Use this anywhere a vendor name surfaces in user-visible copy
 * (e.g. "seen on {vendor}" templates, vendor chips on cards). Submit-form
 * chip groups have their own copy keys for the picker labels — use this
 * only for the inverse direction (rendering a stored value back).
 *
 * Several enum values are not their own display string: 'VividSeats' is
 * "Vivid Seats", 'Viagogo' is lowercase, and the catch-all reads as a noun
 * rather than the picker's "Somewhere else". Passing the raw value through
 * would spell the seller wrong on the card.
 */
export function displayVendor(vendor: Vendor | string): string {
  if (vendor === 'VenueBoxOffice') return VENUE_BOX_OFFICE_LABEL
  if (vendor === 'Other') return CONSUMER_COPY.vendors.otherVendor
  if (isKnownVendor(vendor)) return VENDOR_PICKER_COPY.vendors[vendor]
  return vendor
}
