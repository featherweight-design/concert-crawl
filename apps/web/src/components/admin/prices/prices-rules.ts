import type { Vendor } from '@concert-crawl/types';

/** Mountain Time weekday (THU) and day number (12) of a `YYYY-MM-DD` show date. */
export const dateTile = (
  date: string,
): { weekday: string; day: string } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  // Noon UTC of that calendar day, so the weekday cannot slip across a zone.
  const at = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
  );
  return {
    weekday: at
      .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
      .toUpperCase(),
    day: String(Number(day)),
  };
};

/** "Thu Nov 12" for a `YYYY-MM-DD` show date. */
export const shortDate = (date: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .replace(',', '');
};

// Host fragment to the ticket vendors the price form already knows (#1193).
const VENDOR_HOSTS: readonly (readonly [string, Vendor])[] = [
  ['axs.com', 'AXS'],
  ['ticketmaster.', 'Ticketmaster'],
  ['seatgeek.', 'SeatGeek'],
  ['dice.fm', 'DICE'],
  ['eventbrite.', 'Eventbrite'],
  ['etix.com', 'Etix'],
  ['stubhub.', 'StubHub'],
  ['vividseats.', 'VividSeats'],
  ['viagogo.', 'Viagogo'],
  ['ticketnetwork.', 'TicketNetwork'],
];

/** A web address typed without its scheme still counts as an address. */
export const asHttpUrl = (text: string): string | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
};

/** The vendor a "Where you saw it" address belongs to; Other when unknown. */
export const vendorOfUrl = (text: string): Vendor => {
  const url = asHttpUrl(text);
  if (url === null) return 'Other';
  const host = new URL(url).hostname.toLowerCase();
  const found = VENDOR_HOSTS.find(([fragment]) => host.includes(fragment));
  return found ? found[1] : 'Other';
};

/** A dollar amount the way an admin types it: `$50`, `50`, `50.5`. */
export const parseDollars = (text: string): string | null => {
  const cleaned = text.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
};
