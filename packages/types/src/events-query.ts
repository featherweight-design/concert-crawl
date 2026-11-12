// The GET /v1/events query contract, shared by the API that validates it and
// the web mapper that builds it (apps/web/src/lib/events-api-params.ts).
//
// #1698: the two sides once disagreed on a param name, and a schema that
// ignores unknown keys turned that into a silently dropped filter. The schema
// stays lenient on purpose, since a 400 would break old PWA bundles and cached
// URLs, so the guard lives here instead: the API builds its schema keys from
// this list and logs any key outside it, and a web test asserts the mapper
// never emits one.

/** Every query key GET /v1/events understands. */
export const EVENTS_QUERY_KEYS = [
  'from',
  'to',
  'venueSlug',
  'search',
  'filterPrice',
  'filterVibe',
  'limit',
  'offset',
  'taste',
  'following',
] as const;

export type EventsQueryKey = (typeof EVENTS_QUERY_KEYS)[number];

const EVENTS_QUERY_KEY_SET: ReadonlySet<string> = new Set(EVENTS_QUERY_KEYS);

export const isEventsQueryKey = (key: string): key is EventsQueryKey =>
  EVENTS_QUERY_KEY_SET.has(key);

/**
 * The most values a multi-select filter (Where, Vibe) carries. It bounds the
 * venue IN list and the genre ARRAY[] overlap a hand-rolled URL could
 * otherwise grow without limit.
 */
export const MAX_LIST_PARAM_VALUES = 25;

export interface ParseListParamOptions {
  /**
   * Also split each value on commas. Only for values that can never contain a
   * comma (venue slugs). A vibe must not split: an unknown vibe falls back to
   * an exact raw-genre match, and a raw genre can contain a comma.
   */
  splitCommas?: boolean;
}

/**
 * Normalise a multi-select query param to a list, with one rule everywhere:
 * trim each item, drop blanks, dedupe (first occurrence wins), then keep at
 * most MAX_LIST_PARAM_VALUES. Over the cap is truncated, never an error.
 *
 * Takes a single value (the legacy shape every bookmarked URL carries), the
 * values of a repeated key, or nothing. An empty result means no filter.
 */
export function parseListParam(
  raw: string | readonly string[] | null | undefined,
  { splitCommas = false }: ParseListParamOptions = {},
): string[] {
  if (raw === null || raw === undefined) return [];
  const values: readonly string[] = typeof raw === 'string' ? [raw] : raw;
  const items = (
    splitCommas ? values.flatMap((value) => value.split(',')) : values
  )
    .map((value) => value.trim())
    .filter((value) => value !== '');
  return [...new Set(items)].slice(0, MAX_LIST_PARAM_VALUES);
}
