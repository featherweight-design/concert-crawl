/**
 * Admin Add a show's field codes. Every field refusal from
 * `POST /v1/admin/events` is a 400 whose issue `message` is one of these, and
 * the web form maps each to its line of copy (B+ addendum 5
 * `04/add-show-errors-d`). One list, read by the API's schema and the web's
 * client and form rules, so the two can never drift.
 */
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
