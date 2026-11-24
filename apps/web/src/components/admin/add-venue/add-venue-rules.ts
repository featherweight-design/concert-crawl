import type { Venue } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  capacityTypeLabel,
  nearestCapacityType,
  parseCapacity,
} from '@/components/admin/venues/details/details-rules';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

const COPY = ADMIN_COPY.addVenue;

/** The five steps, in the rail's order (`05/basics-desktop`). */
export const ADD_VENUE_STEPS = [
  'basics',
  'source',
  'icon',
  'guide',
  'review',
] as const;
export type AddVenueStep = (typeof ADD_VENUE_STEPS)[number];

/** The steps the rail marks Optional. */
export const OPTIONAL_STEPS: ReadonlySet<AddVenueStep> = new Set([
  'icon',
  'guide',
]);

/**
 * The steps that open in this build. 3e-1 ships Basics only; the rest draw
 * as the rail's not-yet steps until their PRs land (plan decision 12).
 */
export const OPEN_STEPS: ReadonlySet<AddVenueStep> = new Set(['basics']);

/** "Step 1 of 5": a step's place in the flow, counted from one. */
export const stepNumber = (step: AddVenueStep): number =>
  ADD_VENUE_STEPS.indexOf(step) + 1;

/** What Basics' inputs hold. Strings stay as typed until a save. */
export interface BasicsDraft {
  name: string;
  slug: string;
  address: string;
  /** One of the six capacity types, or '' for Not set. */
  capacityType: string;
  capacity: string;
  website: string;
}
export type BasicsField = keyof BasicsDraft;
export type BasicsErrors = Partial<Record<BasicsField, string>>;

/** A Basics input's DOM id, shared by the form and the focus-on-error move. */
export const basicsFieldId = (field: BasicsField) => `add-venue-${field}`;

export const EMPTY_BASICS: BasicsDraft = {
  name: '',
  slug: '',
  address: '',
  capacityType: '',
  capacity: '',
  website: '',
};

/** The board's website is a bare host (`dazzledenver.com`), so the field shows one. */
const bareWebsite = (url: string): string =>
  url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

/** A saved draft venue as Basics' inputs show it. */
export const basicsOf = (
  venue: Pick<
    Venue,
    'name' | 'slug' | 'address' | 'venueType' | 'capacity' | 'websiteUrl'
  >,
): BasicsDraft => {
  const type = nearestCapacityType(venue.venueType);
  return {
    name: venue.name,
    slug: venue.slug,
    address: venue.address ?? '',
    capacityType: type ?? '',
    capacity: venue.capacity === null ? '' : String(venue.capacity),
    website: bareWebsite(venue.websiteUrl),
  };
};

/**
 * The API's slug rule (`venueSlug`, apps/api/src/lib/venue-slug-schema.ts):
 * 2 to 60 of a-z, 0-9 and hyphens, starting and ending with a letter or digit.
 * The web app can't import the API's copy, so this one mirrors it.
 */
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SLUG_MIN = 2;
const SLUG_MAX = 60;

const isSlug = (slug: string) =>
  slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG.test(slug);

/**
 * The website as the API stores it. Text with no `scheme://` is a bare host
 * (`venue.com`, `venue.com:8080/events`) and gets `https://`. The result must
 * be an http(s) link with a dotted host and no user or password in it; null
 * when it isn't.
 */
export const normalizeWebsite = (text: string): string | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  if (!isSafeHttpUrl(withScheme)) return null;
  const url = new URL(withScheme);
  if (url.username !== '' || url.password !== '') return null;
  return url.hostname.includes('.') ? withScheme : null;
};

/** Checked before any request; the API's own refusals land after. */
export const validateBasics = (draft: BasicsDraft): BasicsErrors => {
  const errors: BasicsErrors = {};
  if (draft.name.trim() === '') errors.name = COPY.errors.nameRequired;
  const slug = draft.slug.trim();
  if (slug === '') errors.slug = COPY.errors.linkRequired;
  else if (!isSlug(slug)) errors.slug = COPY.errors.linkInvalid;
  if (Number.isNaN(parseCapacity(draft.capacity))) {
    errors.capacity = ADMIN_COPY.venueDetails.fields.capacity.invalid;
  }
  if (draft.website.trim() === '') {
    errors.website = COPY.errors.websiteRequired;
  } else if (normalizeWebsite(draft.website) === null) {
    errors.website = COPY.errors.websiteInvalid;
  }
  return errors;
};

/** The columns Basics writes, by the names `POST`/`PATCH /v1/admin/venues` take. */
export interface BasicsColumns {
  name: string;
  slug: string;
  address: string | null;
  venueType: string | null;
  capacity: number | null;
  websiteUrl: string;
}
export type BasicsColumn = keyof BasicsColumns;
const BASICS_COLUMNS: readonly BasicsColumn[] = [
  'name',
  'slug',
  'address',
  'venueType',
  'capacity',
  'websiteUrl',
];

/** A valid draft's columns (call after `validateBasics` comes back empty). */
export const basicsColumnsOf = (draft: BasicsDraft): BasicsColumns => {
  const capacity = parseCapacity(draft.capacity);
  const type = nearestCapacityType(draft.capacityType);
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    address: draft.address.trim() || null,
    // The six are stored by their label, as the Details tab writes them.
    venueType: type === null ? null : capacityTypeLabel(type),
    capacity: Number.isNaN(capacity) ? null : capacity,
    websiteUrl: normalizeWebsite(draft.website) ?? '',
  };
};

/** The columns that differ from the saved row: all of them before the first save. */
export const changedBasics = (
  next: BasicsColumns,
  saved: BasicsColumns | null,
): BasicsColumn[] =>
  saved === null
    ? [...BASICS_COLUMNS]
    : BASICS_COLUMNS.filter((key) => next[key] !== saved[key]);

/** The form body for `createDraftVenue` / `updateVenue`; an empty value clears. */
export const basicsFormData = (
  next: BasicsColumns,
  keys: readonly BasicsColumn[],
): FormData => {
  const formData = new FormData();
  for (const key of keys) formData.set(key, String(next[key] ?? ''));
  return formData;
};

/** The flow's address once the draft exists, so a reload resumes it. */
export const addVenueHref = (id: string, step: AddVenueStep): string =>
  `/admin/venues/new?${new URLSearchParams({ id, step }).toString()}`;

/** The Basics input each API field name lands on, with its message. */
const API_FIELD_ERRORS: Partial<Record<string, BasicsErrors>> = {
  name: { name: COPY.errors.nameRequired },
  slug: { slug: COPY.errors.linkInvalid },
  capacity: { capacity: ADMIN_COPY.venueDetails.fields.capacity.invalid },
  websiteUrl: { website: COPY.errors.websiteInvalid },
};

/**
 * A refused save's error on the field it names: a taken link (409) or an
 * input the API rejected (400). Null when no Basics field owns the refusal,
 * so the form-level message shows instead.
 */
export const saveErrorOf = (outcome: {
  field?: string;
  conflict?: boolean;
}): BasicsErrors | null => {
  if (outcome.conflict === true) return { slug: COPY.errors.linkTaken };
  if (outcome.field === undefined) return null;
  return API_FIELD_ERRORS[outcome.field] ?? null;
};

/** The fields in the order Basics draws them, for focusing the first error. */
export const BASICS_FIELD_ORDER: readonly BasicsField[] = [
  'name',
  'address',
  'slug',
  'capacityType',
  'capacity',
  'website',
];

/**
 * The stage a test crawl's shows came from, by name: the one whose count is
 * above zero (the others are 0).
 */
export const viaOf = (counts: {
  html: number;
  jsonLd: number;
  haiku: number;
}): 'html' | 'jsonLd' | 'haiku' => {
  if (counts.jsonLd > 0) return 'jsonLd';
  if (counts.haiku > 0) return 'haiku';
  return 'html';
};

/** A sample show's date as the board draws it ("Fri Nov 13"). Dates are calendar dates. */
export const sampleDateLabel = (date: string): string => {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
    .format(parsed)
    .replace(',', '');
};

/** The host and path of the page being tested, for the robots.txt card. */
export const hostAndPath = (url: string): { host: string; path: string } => {
  try {
    const parsed = new URL(url);
    return { host: parsed.host, path: parsed.pathname || '/' };
  } catch {
    return { host: url, path: '/' };
  }
};
