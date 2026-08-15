/**
 * Rule 1 — context subtraction. The surface declares what it already carries;
 * the row drops it. Adding a surface is an entry in this file and nothing else.
 */

export type RowSurface =
  'browse' | 'venue' | 'watching' | 'related' | 'crew' | 'crewLens'

/** The units line 3 can render, in reading order. */
export const WHEN_WHERE_UNITS = ['date', 'time', 'venue'] as const
export type WhenWhereUnit = (typeof WHEN_WHERE_UNITS)[number]

/**
 * Only date and venue can be carried by a surface. Time is never stated by a
 * page header or a page title, so no surface can subtract it.
 */
export type CarriedContext = Extract<WhenWhereUnit, 'date' | 'venue'>

export type MetaChipKind =
  'crew' | 'following' | 'genre' | 'freshness' | 'provenance'

export interface SurfaceConfig {
  /** Context the surface states elsewhere, so the row must not repeat it. */
  carries: readonly CarriedContext[]
  /** Which chips compete for the meta budget, best claim first. */
  chipPriority: readonly MetaChipKind[]
  /** A trailing gutter is reserved only where the surface has a row action. */
  hasActionGutter: boolean
  /** Cards with their own edge, versus rows separated by a divider. */
  carded: boolean
  /** The saved-price delta is a Watching idea; a Browse price never goes green. */
  showsDelta: boolean
  /**
   * Whether the surface's payload carries a price at all. A surface that does
   * not must suppress the slot rather than pass `null` through: the row reads
   * `null` as "to be announced", which is a claim about the show rather than
   * about what we fetched.
   */
  showsPrice: boolean
  /**
   * Whether line 1 may carry a tour clause. A tour name helps someone deciding
   * between shows and is noise on a list of shows already decided on, so it is
   * a per-surface declaration exactly like the price slot rather than a
   * property of the data.
   */
  showsTour: boolean
}

export const SURFACES: Record<RowSurface, SurfaceConfig> = {
  // Date group headers run the list, so every row under one is that date.
  browse: {
    carries: ['date'],
    chipPriority: ['following', 'genre'],
    hasActionGutter: false,
    carded: false,
    showsDelta: false,
    showsPrice: true,
    showsTour: true,
  },
  // The venue is the page.
  venue: {
    carries: ['venue'],
    chipPriority: ['following', 'genre'],
    hasActionGutter: false,
    carded: false,
    showsDelta: false,
    showsPrice: true,
    showsTour: true,
  },
  // "More at this venue" / "More from this artist" on event detail. The list
  // has no headers at all, so the row states everything.
  related: {
    carries: [],
    chipPriority: ['following', 'genre'],
    hasActionGutter: false,
    carded: false,
    showsDelta: false,
    showsPrice: true,
    showsTour: true,
  },
  // Watching's group headers are loose windows ("This week"), not dates, so the
  // row is the only thing that can say when the show is.
  //
  // The only surface with no tour clause: Watching is a list of shows already
  // decided on, so a tour name buys nothing and the room goes to the units the
  // row alone can state.
  watching: {
    carries: [],
    chipPriority: ['freshness', 'provenance'],
    hasActionGutter: true,
    carded: true,
    showsDelta: true,
    showsPrice: true,
    showsTour: false,
  },
  // The crew home. Both crew surfaces are discovery — shows someone else is
  // going to, which you have not decided on — so they take the tour clause on
  // the same grounds as Browse. The handoff's surface table predates both and
  // names neither; defaulting them to Browse's behaviour is the ruling.
  //
  // Date headers run Coming up exactly as they run Browse, and
  // `CrewShow` carries no price, so the slot is suppressed rather than left to
  // announce a "TBA" the show never earned.
  crew: {
    carries: ['date'],
    chipPriority: ['crew', 'following', 'genre'],
    hasActionGutter: false,
    carded: false,
    showsDelta: false,
    showsPrice: false,
    showsTour: true,
  },
  // Browse under a crew lens. The list is Browse's own date-grouped list, so
  // the date is carried exactly as it is there; the price is suppressed for
  // the same reason as `crew`, because the lens feed is the crew shows query.
  //
  // The crew chip ranks first, which is the whole of decision 5: the budget is
  // two chips, so a row with crew presence pushes `genre`, last in the
  // priority, out by ordering alone. There is no removal rule to keep in
  // sync: a row with no crew chip gets `genre` back for free.
  crewLens: {
    carries: ['date'],
    chipPriority: ['crew', 'following', 'genre'],
    hasActionGutter: false,
    carded: false,
    showsDelta: false,
    showsPrice: false,
    showsTour: true,
  },
}

export function whenWhereUnits(surface: RowSurface): WhenWhereUnit[] {
  const { carries } = SURFACES[surface]
  return WHEN_WHERE_UNITS.filter(
    (unit) => !carries.some((carried) => carried === unit),
  )
}
