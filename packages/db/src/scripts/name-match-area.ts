import { sql, type SQL } from 'drizzle-orm';

/**
 * The MusicBrainz areas a name-only artist link may come from (Hugh's rule A,
 * 2026-11-23). A name alone does not say which act is meant, and on staging
 * about 10 of the 97 name matches were different acts abroad, so a sole name
 * hit is accepted only when MusicBrainz places the act in the US, in Colorado,
 * or nowhere at all. A hit with any other area stays unlinked.
 *
 * `mb_artists.area` is a name: a country, or a city where MusicBrainz is that
 * precise, so a US city that is not Colorado does not pass. That is deliberate:
 * the rule is the area test, not a guess at which city is in which state. A
 * Spotify match never reaches this rule; its own relation already identifies
 * the act.
 */
export const NAME_MATCH_AREAS = ['United States', 'Colorado'] as const;

/** The same rule in TypeScript, so the tests can pin the list it shares with the SQL. */
export const nameMatchAreaAccepts = (area: string | null): boolean =>
  area === null ||
  area.trim() === '' ||
  (NAME_MATCH_AREAS as readonly string[]).includes(area);

/** The fixed column references the rule is applied to; never input. */
export type NameMatchAreaColumn = 'mb_names.area';

/** The rule as a SQL boolean over `column`. Blank is NULL or whitespace only. */
export const nameMatchAreaSql = (column: NameMatchAreaColumn): SQL => {
  const col = sql.raw(column);
  const areas = sql.join(
    NAME_MATCH_AREAS.map((area) => sql`${area}`),
    sql`, `,
  );
  return sql`(${col} IS NULL OR btrim(${col}) = '' OR ${col} IN (${areas}))`;
};
