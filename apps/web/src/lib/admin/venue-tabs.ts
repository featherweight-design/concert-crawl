import { z } from 'zod';

/** The venue page's tabs, in strip order (3b). */
export const VENUE_TABS = [
  'overview',
  'runs',
  'source',
  'details',
  'guide',
] as const;

export const venueTabSchema = z.enum(VENUE_TABS);

export type VenueTab = z.infer<typeof venueTabSchema>;

/**
 * `?tab=` as the page reads it. No tab, an unknown one, or a repeated param
 * opens Overview rather than throwing.
 */
export const parseVenueTab = (raw: unknown): VenueTab => {
  const parsed = venueTabSchema.safeParse(raw);
  return parsed.success ? parsed.data : 'overview';
};

/** The URL a tab switch replaces the current one with. */
export const venueTabHref = (venueId: string, tab: VenueTab): string =>
  `/admin/venues/${venueId}?tab=${tab}`;
