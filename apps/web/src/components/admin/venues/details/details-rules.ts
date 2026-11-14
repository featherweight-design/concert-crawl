import type { TicketVendor, Venue } from '@concert-crawl/types';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueDetails;

/**
 * The columns the Details tab reads and writes (3b part 5). Never a Source
 * column (`website_url` is shown here read-only, ruling b) and never a crawl
 * rule: the type refuses both at compile time.
 */
type NotDetails =
  | 'websiteUrl'
  | 'extractionStrategy'
  | 'platform'
  | 'platformVenueId'
  | 'apiProvider'
  | 'apiAccountId'
  | 'crawlMode'
  | 'crawlWaitUntil'
  | 'crawlWaitForSelector'
  | 'crawlDelayMs'
  | 'robotsTxtAllowed'
  | 'robotsTxtCheckedAt'
  | 'debugCaptureHtml'
  | 'active';
export const DETAILS_COLUMNS = [
  'name',
  'slug',
  'address',
  'neighborhood',
  'lat',
  'lng',
  'venueType',
  'capacity',
  'about',
  'ticketVendor',
  'priceUrl',
  'contactEmail',
  'city',
] as const satisfies ReadonlyArray<Exclude<keyof Venue, NotDetails>>;
export type DetailsColumn = (typeof DETAILS_COLUMNS)[number];
export type DetailsColumns = Pick<Venue, DetailsColumn>;

export const detailsColumnsOf = (venue: DetailsColumns): DetailsColumns => ({
  name: venue.name,
  slug: venue.slug,
  address: venue.address,
  neighborhood: venue.neighborhood,
  lat: venue.lat,
  lng: venue.lng,
  venueType: venue.venueType,
  capacity: venue.capacity,
  about: venue.about,
  ticketVendor: venue.ticketVendor,
  priceUrl: venue.priceUrl,
  contactEmail: venue.contactEmail,
  city: venue.city,
});

/** The ticket sellers the API takes, in the select's order. */
export const TICKET_SELLERS = [
  'ticketmaster',
  'axs',
  'seatgeek',
  'dice',
  'eventbrite',
  'venue_box_office',
  'unknown',
] as const satisfies readonly TicketVendor[];
const ticketSellerOf = (value: string): TicketVendor | null =>
  TICKET_SELLERS.find((seller) => seller === value) ?? null;

/** The six hero settings Capacity type picks from (A3 §3b row 17). */
export const CAPACITY_TYPES = [
  'street',
  'outdoor',
  'arena',
  'theater',
  'club',
  'gallery',
] as const;
export type CapacityType = (typeof CAPACITY_TYPES)[number];
export const capacityTypeLabel = (type: CapacityType): string =>
  COPY.capacityTypes[type];

/**
 * Words in a free-text `venue_type` that place it in one of the six (ruling
 * f). Order matters: an amphitheater is outdoor before it is a theater. Each
 * is a whole word, so a "Barn" is not a bar and "Sparks" not a park.
 */
const CAPACITY_TYPE_WORDS: ReadonlyArray<readonly [CapacityType, RegExp]> = [
  [
    'outdoor',
    /\b(?:outdoors?|amphithea\w*|pavilions?|parks?|gardens?|lawns?)\b/,
  ],
  ['arena', /\b(?:arenas?|stadiums?|coliseums?|fieldhouses?)\b/],
  ['gallery', /\b(?:galler(?:y|ies)|museums?)\b/],
  [
    'theater',
    /\b(?:theat\w*|auditoriums?|halls?|ballrooms?|operas?|playhouses?)\b/,
  ],
  ['club', /\b(?:(?:night)?clubs?|bars?|lounges?|taverns?|pubs?|saloons?)\b/],
  ['street', /\b(?:streets?)\b/],
];

/** The nearest of the six to a stored value, or null when none fits. */
export const nearestCapacityType = (
  raw: string | null,
): CapacityType | null => {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '') return null;
  const exact = CAPACITY_TYPES.find(
    (type) => capacityTypeLabel(type).toLowerCase() === value,
  );
  if (exact !== undefined) return exact;
  return (
    CAPACITY_TYPE_WORDS.find(([, words]) => words.test(value))?.[0] ?? null
  );
};

/** What the select shows: the nearest of the six, else the stored text. */
const venueTypeDraftOf = (raw: string | null): string => {
  const nearest = nearestCapacityType(raw);
  return nearest === null ? (raw ?? '').trim() : capacityTypeLabel(nearest);
};

/** "39.7487, −105.0077", with the board's minus sign. */
export const formatPin = (lat: number | null, lng: number | null): string =>
  lat === null || lng === null ? '' : `${lat}, ${lng}`.replace(/-/g, '−');

/** One half of a pin: a plain decimal, no exponent, hex or blank. */
const DECIMAL = /^-?\d+(\.\d+)?$/;

/** The pin as typed: both null when empty, null when it doesn't parse. */
export const parsePin = (
  text: string,
): { lat: number | null; lng: number | null } | null => {
  const trimmed = text.trim();
  if (trimmed === '') return { lat: null, lng: null };
  const parts = trimmed.replace(/−/g, '-').split(/\s*,\s*|\s+/);
  if (parts.length !== 2) return null;
  // Each half a plain decimal: an empty half ("39.7487,") is not a zero.
  if (!parts.every((part) => DECIMAL.test(part))) return null;
  const [lat, lng] = parts.map(Number);
  if (lat === undefined || lng === undefined) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

/** Postgres `integer`'s ceiling, the capacity column's type. */
const INT4_MAX = 2147483647;

/** The capacity as typed ("19,500" included): null when empty, NaN when bad. */
const parseCapacity = (text: string): number | null => {
  const digits = text.replace(/[,\s]/g, '');
  if (digits === '') return null;
  // Digits only: `Number` would also take "1e3" and "0x10".
  if (!/^\d+$/.test(digits)) return Number.NaN;
  const num = Number(digits);
  return num > 0 && num <= INT4_MAX ? num : Number.NaN;
};

/** What the tab's inputs hold. Strings stay as typed until a save. */
export interface DetailsDraft {
  name: string;
  slug: string;
  address: string;
  neighborhood: string;
  mapPin: string;
  venueType: string;
  capacity: string;
  about: string;
  ticketVendor: string;
  priceUrl: string;
  contactEmail: string;
  city: string;
}
export type DetailsField = keyof DetailsDraft;
export const DRAFT_KEYS = [
  'name',
  'slug',
  'address',
  'neighborhood',
  'mapPin',
  'venueType',
  'capacity',
  'about',
  'ticketVendor',
  'priceUrl',
  'contactEmail',
  'city',
] as const satisfies ReadonlyArray<DetailsField>;

export const draftOf = (columns: DetailsColumns): DetailsDraft => ({
  name: columns.name,
  slug: columns.slug,
  address: columns.address ?? '',
  neighborhood: columns.neighborhood ?? '',
  mapPin: formatPin(columns.lat, columns.lng),
  venueType: venueTypeDraftOf(columns.venueType),
  capacity:
    columns.capacity === null ? '' : columns.capacity.toLocaleString('en-US'),
  about: columns.about ?? '',
  ticketVendor: columns.ticketVendor ?? '',
  priceUrl: columns.priceUrl ?? '',
  contactEmail: columns.contactEmail ?? '',
  city: columns.city,
});

/**
 * A field's value as it would save, so "19500" against "19,500", or a pin
 * typed with a hyphen against the board's minus, is not an edit.
 */
const normalized = (key: DetailsField, value: string): string => {
  if (key === 'capacity') return String(parseCapacity(value));
  if (key === 'mapPin') {
    const pin = parsePin(value);
    return pin === null ? value.trim() : formatPin(pin.lat, pin.lng);
  }
  return value.trim();
};

/** The fields a draft changes against the saved one, for "N unsaved changes". */
export const editedFields = (
  draft: DetailsDraft,
  saved: DetailsDraft,
): DetailsField[] =>
  DRAFT_KEYS.filter(
    (key) => normalized(key, draft[key]) !== normalized(key, saved[key]),
  );

/**
 * A dirty draft moved onto a newer server row: the fields edited against the
 * old row stay, every other field takes the new row's value.
 */
export const rebaseDraft = (
  draft: DetailsDraft,
  oldSaved: DetailsDraft,
  newSaved: DetailsDraft,
): DetailsDraft => {
  const next: DetailsDraft = { ...newSaved };
  for (const key of editedFields(draft, oldSaved)) next[key] = draft[key];
  return next;
};

/** What a valid draft writes. Empty is null; the city falls back to Denver. */
export const columnsOf = (draft: DetailsDraft): DetailsColumns => {
  const pin = parsePin(draft.mapPin) ?? { lat: null, lng: null };
  const capacity = parseCapacity(draft.capacity);
  const orNull = (value: string) => value.trim() || null;
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    address: orNull(draft.address),
    neighborhood: orNull(draft.neighborhood),
    lat: pin.lat,
    lng: pin.lng,
    venueType: orNull(draft.venueType),
    capacity: Number.isNaN(capacity) ? null : capacity,
    about: orNull(draft.about),
    ticketVendor: ticketSellerOf(draft.ticketVendor),
    priceUrl: orNull(draft.priceUrl),
    contactEmail: orNull(draft.contactEmail),
    city: draft.city.trim() || 'Denver',
  };
};

/**
 * The columns a save sends, against the pristine baseline (the saved row as
 * an untouched draft writes it), so a stored "Music Hall" shown as Theater is
 * never sent unless the admin picks another type. The pin's two halves always
 * travel together: the API refuses one without the other.
 */
export const changedColumns = (
  draft: DetailsDraft,
  saved: DetailsColumns,
): DetailsColumn[] => {
  const next = columnsOf(draft);
  const pristine = columnsOf(draftOf(saved));
  const changed = new Set(
    DETAILS_COLUMNS.filter((key) => next[key] !== pristine[key]),
  );
  if (changed.has('lat') || changed.has('lng')) {
    changed.add('lat');
    changed.add('lng');
  }
  return DETAILS_COLUMNS.filter((key) => changed.has(key));
};

/**
 * The row once a save lands: the saved columns with only the sent ones
 * replaced, so an unsent stored "Music Hall" stays as it is.
 */
export const applyColumns = (
  saved: DetailsColumns,
  draft: DetailsDraft,
  keys: readonly DetailsColumn[],
): DetailsColumns => {
  const next = columnsOf(draft);
  const out: DetailsColumns = { ...saved };
  const take = <K extends DetailsColumn>(key: K) => {
    out[key] = next[key];
  };
  for (const key of keys) take(key);
  return out;
};

/** The update action's FormData for those columns; empty means null. */
export const detailsFormData = (
  next: DetailsColumns,
  keys: readonly DetailsColumn[],
): FormData => {
  const formData = new FormData();
  for (const key of keys) formData.set(key, String(next[key] ?? ''));
  return formData;
};

export type DetailsErrors = Partial<Record<DetailsField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The longest About the API takes. */
export const ABOUT_MAX = 280;

/**
 * Checked before any request; the API's own refusals land through
 * `detailsFieldOf`. Only the fields edited against `saved` are checked, so an
 * older stored value the rules now refuse never blocks saving another field.
 */
export const validateDetails = (
  draft: DetailsDraft,
  saved: DetailsDraft,
): DetailsErrors => {
  const edited = new Set(editedFields(draft, saved));
  const errors: DetailsErrors = {};
  if (edited.has('name') && draft.name.trim() === '') {
    errors.name = COPY.errors.nameRequired;
  }
  if (edited.has('slug') && draft.slug.trim() === '') {
    errors.slug = COPY.errors.linkRequired;
  }
  if (edited.has('mapPin') && parsePin(draft.mapPin) === null) {
    errors.mapPin = COPY.fields.mapPin.invalid;
  }
  if (edited.has('capacity') && Number.isNaN(parseCapacity(draft.capacity))) {
    errors.capacity = COPY.fields.capacity.invalid;
  }
  // The API takes 280 at most (`z.string().max(280)`) and this tab sends it
  // trimmed: a longer About is refused here, never cut.
  if (edited.has('about') && draft.about.trim().length > ABOUT_MAX) {
    errors.about = COPY.errors.aboutTooLong;
  }
  const priceUrl = draft.priceUrl.trim();
  if (edited.has('priceUrl') && priceUrl !== '' && !isSafeHttpUrl(priceUrl)) {
    errors.priceUrl = COPY.fields.pricePage.invalid;
  }
  const email = draft.contactEmail.trim();
  if (edited.has('contactEmail') && email !== '' && !EMAIL.test(email)) {
    errors.contactEmail = COPY.fields.contactEmail.invalid;
  }
  return errors;
};

/** Where the API's `field` lands in this tab, if it is one of ours. */
export const detailsFieldOf = (
  field: string | undefined,
): DetailsField | null => {
  if (field === 'lat' || field === 'lng') return 'mapPin';
  return DRAFT_KEYS.find((key) => key === field) ?? null;
};

/** "ballarena.com": the site's host, for the read-only Website. */
export const websiteHost = (websiteUrl: string): string =>
  URL.canParse(websiteUrl)
    ? new URL(websiteUrl).host.replace(/^www\./, '')
    : websiteUrl;

/** The link made from the name, as the old slug button made it. */
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
