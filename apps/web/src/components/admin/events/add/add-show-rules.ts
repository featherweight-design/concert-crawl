/**
 * Add a show's form rules (4b-3): the draft, the checks the API also makes
 * (`04/add-show-errors-d`), the bill's order and the body the API takes.
 */

/** The API's field codes (`ADD_SHOW_ERROR_CODES` in apps/api event-create). */
export const ADD_SHOW_ERROR_CODES = [
  'title_required',
  'title_too_long',
  'venue_required',
  'venue_not_found',
  'date_required',
  'date_past',
  'time_invalid',
  'show_before_doors',
  'ticket_url_invalid',
  'headliner_required',
  'lineup_name_required',
  'lineup_name_too_long',
  'lineup_name_invalid',
  'lineup_role_invalid',
  'lineup_too_long',
  'artist_not_found',
] as const;
export type AddShowErrorCode = (typeof ADD_SHOW_ERROR_CODES)[number];

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

const TITLE_MAX = 300;

/** A full http(s) link, as the API's `httpUrl` takes it. */
const isFullLink = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * The errors the form can tell before saving. `today` is `YYYY-MM-DD` in
 * Mountain Time, the day the API checks against.
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
  if (draft.date === '') errors.date = 'date_required';
  else if (draft.date < today) errors.date = 'date_past';
  // `04/add-show-errors-d` puts "Before doors." under Show.
  if (draft.doorsTime && draft.showTime && draft.showTime < draft.doorsTime)
    errors.showTime = 'show_before_doors';
  const link = draft.ticketUrl.trim();
  if (link !== '' && !isFullLink(link)) errors.ticketUrl = 'ticket_url_invalid';
  if (draft.lineup.length === 0) errors.lineup = 'headliner_required';
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

const sameName = (one: string, two: string): boolean =>
  one.trim().toLocaleLowerCase('en-US') ===
  two.trim().toLocaleLowerCase('en-US');

/** Adds an act at the end, unless it's blank or already on the bill. */
export const addAct = (lineup: readonly Act[], act: Act): Act[] => {
  const name = act.name.trim();
  if (name === '' || lineup.some((each) => sameName(each.name, name)))
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
  const next = [...lineup];
  const [moved] = next.splice(from, 1);
  if (moved === undefined || to < 0 || to > lineup.length - 1)
    return [...lineup];
  next.splice(to, 0, moved);
  return next;
};
