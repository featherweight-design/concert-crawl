import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

/**
 * The Passport booklet's layout, kept out of the components so the paging
 * rules are a table of cases rather than something read off a render.
 *
 * The booklet fills in the order the nights happened, like a real passport:
 * page 1 holds the first four nights, and the slot after the latest stamp is
 * where the next one lands. That slot always exists, so a full page always has
 * a page waiting after it.
 */

export const STAMPS_PER_PAGE = 4;

export type BookletSlot =
  | { kind: 'stamp'; show: HistoryShow }
  /** The upcoming show whose stamp lands in this slot. */
  | { kind: 'next'; show: HistoryShow }
  | { kind: 'empty' };

export interface BookletPage {
  /** 1-based, as printed on the page. */
  number: number;
  slots: BookletSlot[];
}

/** A leaf of the booklet: the identity page or a stamp page. */
export type BookletLeaf = { kind: 'id' } | { kind: 'page'; page: BookletPage };

/**
 * `spread` lays two leaves side by side (desktop); `stack` shows the identity
 * page over page 1 and every later page on its own (mobile).
 */
export type BookletLayout = 'spread' | 'stack';

/** Oldest first; a shared date resolves on when attendance was marked. */
export const chronological = (rows: readonly HistoryShow[]): HistoryShow[] =>
  [...rows].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return left.attendingAt.localeCompare(right.attendingAt);
  });

export const bookletPages = (
  past: readonly HistoryShow[],
  next: HistoryShow | null,
): BookletPage[] => {
  const stamps = chronological(past);
  const pageCount = Math.floor(stamps.length / STAMPS_PER_PAGE) + 1;
  return Array.from({ length: pageCount }, (_, pageIndex) => ({
    number: pageIndex + 1,
    slots: Array.from({ length: STAMPS_PER_PAGE }, (__, slotIndex) => {
      const index = pageIndex * STAMPS_PER_PAGE + slotIndex;
      const show = stamps[index];
      if (show !== undefined) return { kind: 'stamp', show };
      if (index === stamps.length && next !== null)
        return { kind: 'next', show: next };
      return { kind: 'empty' };
    }),
  }));
};

export const bookletSpreads = (
  pages: readonly BookletPage[],
  layout: BookletLayout,
): BookletLeaf[][] => {
  const leaves: BookletLeaf[] = pages.map((page) => ({ kind: 'page', page }));
  const [first, ...rest] = leaves;
  const spreads: BookletLeaf[][] = [
    first === undefined ? [{ kind: 'id' }] : [{ kind: 'id' }, first],
  ];
  const step = layout === 'spread' ? 2 : 1;
  for (let i = 0; i < rest.length; i += step) {
    spreads.push(rest.slice(i, i + step));
  }
  return spreads;
};

export const spreadHasStamps = (spread: readonly BookletLeaf[]): boolean =>
  spread.some(
    (leaf) =>
      leaf.kind === 'page' &&
      leaf.page.slots.some((slot) => slot.kind === 'stamp'),
  );

/** The pages a spread holds, as the Jump to button names them: `ID · 1`. */
export const spreadName = (spread: readonly BookletLeaf[]): string =>
  spread
    .map((leaf) =>
      leaf.kind === 'id'
        ? CONSUMER_COPY.passport.idPageShort
        : String(leaf.page.number),
    )
    .join(' · ');

const dayNumber = (date: string): number => {
  const at = Date.parse(`${date}T12:00:00Z`);
  return Number.isNaN(at) ? Number.NaN : Math.round(at / 86_400_000);
};

/** Whole days from `today` to `date`, both local `YYYY-MM-DD`. */
export const daysUntil = (date: string, today: string): number =>
  dayNumber(date) - dayNumber(today);

/** The shows still ahead, soonest first. */
export const upcomingQueue = (
  upcoming: readonly HistoryShow[],
  today: string,
): HistoryShow[] =>
  chronological(upcoming).filter((show) => show.date >= today);

const codeSegment = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .replace(/^@/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '<')
    .replace(/^<+|<+$/g, '');

/**
 * The machine-readable line along the identity page, in the shape of a real
 * passport's: `P<CCRAWL<<HUGH<<<<DENVER<<2026<<<4N4V`.
 */
export const passportCodeLine = (params: {
  handle: string | null;
  city: string | null;
  year: number;
  nights: number;
  venues: number;
}): string =>
  [
    CONSUMER_COPY.passport.codePrefix,
    '<<',
    codeSegment(params.handle),
    '<<<<',
    codeSegment(params.city),
    '<<',
    String(params.year),
    '<<<',
    `${params.nights}N${params.venues}V`,
  ].join('');

export interface CollectedVenue {
  slug: string;
  name: string;
  collected: boolean;
}

/**
 * Every active venue, the ones with a stamp first, each group keeping the
 * order it came in. A stamp from a venue that is no longer active has no tile
 * to light, so it is not counted against the active total.
 */
export const collectedVenues = (
  active: readonly { slug: string; name: string }[],
  past: readonly HistoryShow[],
): { venues: CollectedVenue[]; collected: number; total: number } => {
  const stamped = new Set(past.map((show) => show.venueSlug));
  const tiles = active.map((venue) => ({
    slug: venue.slug,
    name: venue.name,
    collected: stamped.has(venue.slug),
  }));
  const venues = [
    ...tiles.filter((tile) => tile.collected),
    ...tiles.filter((tile) => !tile.collected),
  ];
  return {
    venues,
    collected: venues.filter((tile) => tile.collected).length,
    total: venues.length,
  };
};
