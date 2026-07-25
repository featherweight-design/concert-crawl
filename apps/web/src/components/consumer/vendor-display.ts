// Locked per memory:project_price_source_discoverability — Round-3 #2:
// the vendor never renders as the venue's own name, anywhere it's a vendor
// value. The shipped API stores the box-office vendor as the enum value
// 'VenueBoxOffice'; everywhere the consumer-side UI renders that as a display
// label, it resolves to VENUE_BOX_OFFICE_LABEL. Other vendors pass through
// unchanged.

import type { Vendor } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

export const VENUE_BOX_OFFICE_LABEL = CONSUMER_COPY.vendors.venueBoxOffice

/**
 * Map a stored Vendor enum value to its consumer-facing display label.
 *
 * Use this anywhere a vendor name surfaces in user-visible copy
 * (e.g. "seen on {vendor}" templates, vendor chips on cards). Submit-form
 * chip groups have their own copy keys for the picker labels — use this
 * only for the inverse direction (rendering a stored value back).
 */
export function displayVendor(vendor: Vendor | string): string {
  if (vendor === 'VenueBoxOffice') return VENUE_BOX_OFFICE_LABEL
  return vendor
}
