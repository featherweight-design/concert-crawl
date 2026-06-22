import type { Vendor } from '@concert-crawl/types'

// Hosts → vendor enum value (the same Pascal-cased strings used in the
// submission_vendor pgEnum + the Vendor type in @concert-crawl/types).
// SeatGeek lives here as a primary vendor (per memory
// project_price_source_discoverability → 'SeatGeek stays in vendor enum and UI').
export const KNOWN_VENDOR_HOSTS: ReadonlyMap<string, Vendor> = new Map([
  ['ticketmaster.com', 'Ticketmaster'],
  ['livenation.com', 'Ticketmaster'],
  ['axs.com', 'AXS'],
  ['seatgeek.com', 'SeatGeek'],
  ['dice.fm', 'DICE'],
  ['eventbrite.com', 'Eventbrite'],
])

// Resale-marketplace hosts. Kept narrow — only the largest ones whose presence
// is unambiguous evidence of resale, not a price-comparison aggregator that
// also lists primary tickets. Extend conservatively.
export const KNOWN_RESALE_HOSTS: ReadonlySet<string> = new Set([
  'stubhub.com',
  'vividseats.com',
  'viagogo.com',
  'ticketnetwork.com',
])

export function vendorForHost(host: string | null): Vendor | null {
  if (host == null) return null
  return KNOWN_VENDOR_HOSTS.get(host) ?? null
}

export function isResaleHost(host: string | null): boolean {
  if (host == null) return false
  return KNOWN_RESALE_HOSTS.has(host)
}
