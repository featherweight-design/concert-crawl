import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SEPARATORS } from '@/components/consumer/event-title-block/lib/supportingLine'

/**
 * Every customer-facing string the row renders. Provenance labels match the
 * ones admin already uses, so a price is described the same way wherever it
 * is read.
 */
export const EVENT_ROW_COPY = {
  // Rendered glyphs, kept here rather than inline in JSX. Each is decorative:
  // every one of them sits behind aria-hidden with an sr-only sentence beside
  // it, so a screen reader hears the meaning rather than the symbol.
  glyphs: {
    separator: SEPARATORS.middot,
    pair: SEPARATORS.slash,
  },
  price: {
    fromPrefix: 'from',
    tba: 'tba',
    soldOut: 'Sold out',
    // A move of a dollar or two is noise, not news. Saying so beats rendering
    // an arrow that implies the price moved somewhere worth reading.
    flat: 'flat',
    // The same word event detail uses for this state. A row calling it
    // "unconfirmed" while the page it links to calls it "Pending" would read
    // as two different things.
    pending: 'pending',
  },
  // Borrowed from the shared consumer copy rather than restated, so the row and
  // the `StatusPill` on event detail can never end up calling the same state
  // two different things.
  status: {
    cancelled: CONSUMER_COPY.cancelledLabel,
    postponed: CONSUMER_COPY.postponedLabel,
  },
  provenance: {
    boxoffice: 'Box office',
    standard: 'Community',
    resale: 'Resale',
  },
  freshness: {
    stalePrefix: 'Stale',
  },
  meta: {
    following: 'Following',
    // The visible chip is a count only. Naming people on a list row is event
    // detail's job, so the names ride along in the sr-only label instead.
    crewGoing: (count: number) => `${count} going`,
  },
  a11y: {
    watchingTick: (artist: string) => `You are watching ${artist}`,
    // Replaces the chip's visible label rather than adding to it, so it has to
    // carry the word itself. The Spotify mark beside it is aria-hidden, so the
    // source is named here rather than left to the glyph.
    following: 'Following this artist on Spotify',
    // Replaces the "N going" chip, so it has to restate the count as well as
    // name who. Members without a handle are counted and never named, so the
    // remainder is reported as "and N more" rather than silently dropped.
    crewGoing: (names: string[], count: number) => {
      if (names.length === 0) return `${count} from your crews going`
      const others = Math.max(count - names.length, 0)
      // The remainder is a list item like any other, so it takes the "and"
      // slot and the names before it are plain commas.
      const items = others > 0 ? [...names, `${others} more`] : names
      const named =
        items.length === 1
          ? items[0]
          : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
      return `From your crews: ${named} going`
    },
    // Both replace the chip's visible label rather than adding to it, so each
    // one has to carry the status word itself.
    cancelled: 'This show has been cancelled',
    postponed: 'Postponed, new date not announced yet',
    // Appended to the genre chip rather than replacing it, for the one case
    // where a unit degrades instead of dropping: the second genre stops being
    // drawn under width pressure, and this is where it survives.
    droppedGenre: (genre: string) => ` and ${genre}`,
    priceProvenance: (label: string) => `Price source: ${label}`,
    stalePrice: (relTime: string) => `Stale price, last checked ${relTime}`,
    // Replaces the visible "pending" marker, so it has to say what pending
    // means rather than repeat the word.
    pendingPrice: 'Submitted price, not confirmed yet',
    savedDelta: (amount: string) => `Down ${amount} since you started watching`,
    savedDeltaUp: (amount: string) => `Up ${amount} since you started watching`,
    savedDeltaFlat: 'Unchanged since you started watching',
  },
} as const
