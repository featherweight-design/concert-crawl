import type { ArtistShow } from '@concert-crawl/types'

/**
 * One rendered row in the upcoming list. `groupShows` collapses a residency
 * into a single `run` item, so the item count and the show count differ — the
 * section-head label and the show-all control both count SHOWS.
 */
export type ShowItem =
  | ({ kind: 'one' } & ArtistShow)
  | {
      kind: 'run'
      venue: string
      venueSlug: string
      city: string | null
      shows: ArtistShow[]
    }

/** How many shows an item stands for. A run stands for all of its nights. */
export const showsInItem = (item: ShowItem): number =>
  item.kind === 'run' ? item.shows.length : 1

/** The first date an item occupies, used for chronological ordering. */
export const firstIso = (item: ShowItem): string =>
  item.kind === 'run' ? item.shows[0].iso : item.iso
