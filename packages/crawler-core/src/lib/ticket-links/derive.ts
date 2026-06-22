import type { TicketLink, TicketVendor, Vendor } from '@concert-crawl/types'
import { isResaleHost, vendorForHost } from './host-rules.js'
import { parseHost } from './parse-host.js'

export interface TicketLinkVenueContext {
  websiteUrl: string
  ticketVendor: TicketVendor | null
}

// Map the lower-cased TicketVendor enum (DB shape) to the camel/Pascal-cased
// Vendor enum used everywhere else (submission_vendor + TS Vendor union). The
// 'unknown' entry collapses to null so callers don't carry meaningless data.
const VENDOR_FROM_TICKET_VENDOR: Record<TicketVendor, Vendor | null> = {
  axs: 'AXS',
  ticketmaster: 'Ticketmaster',
  seatgeek: 'SeatGeek',
  dice: 'DICE',
  eventbrite: 'Eventbrite',
  venue_box_office: 'VenueBoxOffice',
  unknown: null,
}

function vendorFromVenue(vendor: TicketVendor | null): Vendor | null {
  if (vendor == null) return null
  return VENDOR_FROM_TICKET_VENDOR[vendor]
}

function isSameOrSubdomain(linkHost: string, venueHost: string): boolean {
  if (linkHost === venueHost) return true
  return linkHost.endsWith(`.${venueHost}`)
}

export function deriveTicketLinks(
  ticketUrl: string | null | undefined,
  venue: TicketLinkVenueContext,
): TicketLink[] | null {
  if (ticketUrl == null || ticketUrl === '') return null

  const linkHost = parseHost(ticketUrl)
  const venueHost = parseHost(venue.websiteUrl)

  // kind resolution — first match wins.
  let kind: TicketLink['kind'] = 'primary'
  if (
    linkHost != null &&
    venueHost != null &&
    isSameOrSubdomain(linkHost, venueHost)
  ) {
    kind = 'boxoffice'
  } else if (venue.ticketVendor === 'venue_box_office') {
    kind = 'boxoffice'
  } else if (isResaleHost(linkHost)) {
    kind = 'resale'
  }

  // vendor resolution — URL-derived first, then venue fallback.
  const vendor: Vendor | null =
    vendorForHost(linkHost) ?? vendorFromVenue(venue.ticketVendor)

  return [{ kind, vendor, url: ticketUrl }]
}
