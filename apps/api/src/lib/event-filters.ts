// The four Browse filters (When, Where, Price, Vibe) as one query-schema shape
// and one predicate builder, shared by GET /v1/events and the crew lens feed.
// A crew lens is a filter over the same shows, so the two must not disagree on
// what "Under $25" or "Electronic" means.

import { z } from 'zod';
import { events, venues, db } from '@concert-crawl/db';
import {
  type SQL,
  and,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  sql,
} from 'drizzle-orm';
import {
  expandBucket,
  parseListParam,
  type ParseListParamOptions,
} from '@concert-crawl/types';

// Where and Vibe are multi-select (Design addendum 2, item 6): a show matches
// if it is at ANY chosen venue and has ANY chosen vibe, and different filters
// still AND together.
//
// A list arrives as a repeated key (`venueSlug=a&venueSlug=b`), which Hono
// hands the validator as an array, or as one value: the legacy shape every
// bookmarked URL carries. `parseListParam` trims, drops blanks, dedupes and
// truncates to MAX_LIST_PARAM_VALUES, the same rule the web mapper applies.
// Venue slugs never contain a comma, so `venueSlug=a,b` is split too; a vibe
// is never split, because an unknown vibe falls back to an exact raw-genre
// match and a raw genre can contain a comma. Each item is then validated as
// the single value always was. An empty list means no filter.
export const listParam = (
  item: z.ZodString,
  options: ParseListParamOptions = {},
) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((raw) => parseListParam(raw, options))
    .pipe(z.array(item));

/** The filter keys of the query, as a Zod shape to spread into a route schema. */
export const eventFilterShape = {
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  venueSlug: listParam(z.string(), { splitCommas: true }),
  filterPrice: z.enum(['under-25', '25-50', '50-plus', 'tbd']).optional(),
  filterVibe: listParam(z.string().max(100)),
};

export interface EventFilters {
  /** Inclusive upper bound. The lower bound is the caller's (today or `from`). */
  to?: string | undefined;
  venueSlug: string[];
  filterPrice?: 'under-25' | '25-50' | '50-plus' | 'tbd' | undefined;
  filterVibe: string[];
}

/** The predicates for `to`, Where, Price and Vibe. Empty when nothing is set. */
export const eventFilterConditions = ({
  to,
  venueSlug,
  filterPrice,
  filterVibe,
}: EventFilters): SQL[] => {
  const conditions: SQL[] = [];

  if (to) conditions.push(lte(events.date, to));

  if (venueSlug.length > 0) {
    // OR within the filter: a show at any chosen venue matches. The slugs
    // are already trimmed (parseListParam), so a slug is unknown only if no
    // venue carries it once trimmed. An unknown slug is ignored while
    // another slug in the list resolves; when none resolve, the subquery is
    // empty and so is the list, as a single unknown slug always was.
    conditions.push(
      inArray(
        events.venueId,
        db
          .select({ id: venues.id })
          .from(venues)
          .where(inArray(venues.slug, venueSlug)),
      ),
    );
  }

  const priceCondition =
    filterPrice === 'under-25'
      ? and(isNotNull(events.ticketPriceMin), lt(events.ticketPriceMin, '25'))
      : filterPrice === '25-50'
        ? and(
            isNotNull(events.ticketPriceMin),
            gte(events.ticketPriceMin, '25'),
            lt(events.ticketPriceMin, '50'),
          )
        : filterPrice === '50-plus'
          ? and(
              isNotNull(events.ticketPriceMin),
              gte(events.ticketPriceMin, '50'),
            )
          : filterPrice === 'tbd'
            ? and(isNull(events.ticketPriceMin), isNull(events.ticketPriceMax))
            : undefined;
  if (priceCondition) conditions.push(priceCondition);

  if (filterVibe.length > 0) {
    // Bucket taxonomy (#1101): a filterVibe value like 'electronic' expands
    // to every sub-genre in the bucket so picking one label surfaces the
    // whole family (house / dubstep / bass / ...). Unknown values fall
    // through as a single-element array so bookmarked ?filterVibe=dubstep
    // URLs from before this shipped still match exactly. Several vibes are
    // OR'd: their expansions are unioned into one overlap, so a show in any
    // chosen bucket matches.
    const genreValues = [
      ...new Set(filterVibe.flatMap((vibe) => expandBucket(vibe))),
    ];
    const genrePlaceholders = sql.join(
      genreValues.map((genre) => sql`${genre}`),
      sql`, `,
    );
    conditions.push(
      sql`${events.genre} && ARRAY[${genrePlaceholders}]::text[]`,
    );
  }

  return conditions;
};
