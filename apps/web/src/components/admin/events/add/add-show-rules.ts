/**
 * Add a show's form rules (4b-3): the draft, the checks the API also makes
 * (`04/add-show-errors-d`), the bill's order and the body the API takes.
 * The limits mirror `createEventSchema` in
 * apps/api/src/routes/admin/lib/event-create.ts exactly.
 */
import {
  canonicalizeArtist,
  type AddShowErrorCode,
} from '@concert-crawl/types';
import { localDateString } from '@/lib/time';

/** The form's fields, named as the API body names them. */
export const ADD_SHOW_FIELDS = [
  'title',
  'venueId',
  'date',
  'doorsTime',
  'showTime',
  'ticketUrl',
  'lineup',
] as const;
export type AddShowField = (typeof ADD_SHOW_FIELDS)[number];

export const isAddShowField = (value: string): value is AddShowField =>
  ADD_SHOW_FIELDS.some((field) => field === value);

export type FieldErrors = Partial<Record<AddShowField, AddShowErrorCode>>;

/** One act; `artistId` once picked from Artists, else the name as typed. */
export interface Act {
  name: string;
  artistId?: string;
}

export interface AddShowDraft {
  title: string;
  venueId: string;
  /** `YYYY-MM-DD`, or '' for none yet. */
  date: string;
  /** `HH:MM`, or null for none. */
  doorsTime: string | null;
  showTime: string | null;
  ticketUrl: string;
  /** The bill in order: the first is the headliner. */
  lineup: Act[];
}

export const EMPTY_DRAFT: AddShowDraft = {
  title: '',
  venueId: '',
  date: '',
  doorsTime: null,
  showTime: null,
  ticketUrl: '',
  lineup: [],
};

export interface AddShowBody {
  venueId: string;
  date: string;
  title: string;
  doorsTime: string | null;
  showTime: string | null;
  ticketUrl: string | null;
  lineup: {
    name: string;
    role: 'headliner' | 'support';
    artistId?: string;
  }[];
}

// The API's limits (event-create.ts TITLE_MAX, NAME_MAX, LINEUP_MAX,
// TICKET_URL_MAX). Change them there and here together.
const TITLE_MAX = 300;
const NAME_MAX = 200;
const LINEUP_MAX = 50;
const TICKET_URL_MAX = 2048;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today as `YYYY-MM-DD` in America/Denver, the day the API's `date_past`
 * check reads. Pass it to `validateDraft`: on a Denver evening UTC's date is
 * already tomorrow, so the browser's own UTC or local day would disagree.
 */
export const todayInDenver = (): string => localDateString('America/Denver');

/**
 * A real calendar day as YYYY-MM-DD: the API's `isCalendarDate`, so a shape
 * like 2026-02-30 is `date_required` here as it is there.
 */
const isCalendarDate = (value: string): boolean => {
  if (!DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

/** A full http(s) link within the API's length, as its `httpUrl` takes it. */
const isFullLink = (text: string): boolean => {
  // `URL.canParse` first, so a typo is a plain false and needs no catch.
  if (text.length > TICKET_URL_MAX || !URL.canParse(text)) return false;
  const { protocol } = new URL(text);
  return protocol === 'https:' || protocol === 'http:';
};

/** `HH:MM` and `HH:MM:SS` compare as the same time (the API's `timeKey`). */
const timeKey = (value: string): string => value.padEnd(8, ':00');

/** The API's per-act name check (`lineupEntrySchema`), or null when it passes. */
const actNameError = (name: string): AddShowErrorCode | null => {
  const trimmed = name.trim();
  if (trimmed === '') return 'lineup_name_required';
  if (trimmed.length > NAME_MAX) return 'lineup_name_too_long';
  if (canonicalizeArtist(trimmed) === '') return 'lineup_name_invalid';
  return null;
};

const lineupError = (lineup: readonly Act[]): AddShowErrorCode | null => {
  if (lineup.length === 0) return 'headliner_required';
  if (lineup.length > LINEUP_MAX) return 'lineup_too_long';
  for (const act of lineup) {
    const error = actNameError(act.name);
    if (error) return error;
  }
  return null;
};

/**
 * The errors the form can tell before saving. `today` is `YYYY-MM-DD` in
 * Mountain Time, the day the API checks against: pass `todayInDenver()`.
 */
export const validateDraft = (
  draft: AddShowDraft,
  today: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  const title = draft.title.trim();
  if (title === '') errors.title = 'title_required';
  else if (title.length > TITLE_MAX) errors.title = 'title_too_long';
  if (draft.venueId === '') errors.venueId = 'venue_required';
  if (!isCalendarDate(draft.date)) errors.date = 'date_required';
  else if (draft.date < today) errors.date = 'date_past';
  // `04/add-show-errors-d` puts "Before doors." under Show. Padded as the
  // API's `timeKey` pads, so 20:00 and 20:00:00 are the same time.
  if (
    draft.doorsTime &&
    draft.showTime &&
    timeKey(draft.showTime) < timeKey(draft.doorsTime)
  )
    errors.showTime = 'show_before_doors';
  const link = draft.ticketUrl.trim();
  if (link !== '' && !isFullLink(link)) errors.ticketUrl = 'ticket_url_invalid';
  const lineup = lineupError(draft.lineup);
  if (lineup) errors.lineup = lineup;
  return errors;
};

export const toBody = (draft: AddShowDraft): AddShowBody => ({
  venueId: draft.venueId,
  date: draft.date,
  title: draft.title.trim(),
  doorsTime: draft.doorsTime,
  showTime: draft.showTime,
  ticketUrl: draft.ticketUrl.trim() === '' ? null : draft.ticketUrl.trim(),
  lineup: draft.lineup.map((act, index) => ({
    name: act.name,
    role: index === 0 ? 'headliner' : 'support',
    ...(act.artistId !== undefined && { artistId: act.artistId }),
  })),
});

/**
 * Adds an act at the end, unless it's blank or already on the bill. "Already"
 * is the API's rule (`billFromLineup`): two names whose `canonicalizeArtist`
 * keys match are one act, and the API would drop the second, so the form
 * never shows it. A name with no canonical key isn't deduped here;
 * `validateDraft` refuses it as `lineup_name_invalid`.
 */
export const addAct = (lineup: readonly Act[], act: Act): Act[] => {
  const name = act.name.trim();
  if (name === '') return [...lineup];
  const key = canonicalizeArtist(name);
  if (
    key !== '' &&
    lineup.some((each) => canonicalizeArtist(each.name) === key)
  )
    return [...lineup];
  return [...lineup, { ...act, name }];
};

export const removeAct = (lineup: readonly Act[], index: number): Act[] =>
  lineup.filter((_, at) => at !== index);

/** Moves the act at `from` to `to`; position 0 is the headliner. */
export const moveAct = (
  lineup: readonly Act[],
  from: number,
  to: number,
): Act[] => {
  // A negative `from` would splice from the end, so both ends are guarded.
  if (from < 0 || from >= lineup.length || to < 0 || to >= lineup.length)
    return [...lineup];
  const next = [...lineup];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return [...lineup];
  next.splice(to, 0, moved);
  return next;
};
