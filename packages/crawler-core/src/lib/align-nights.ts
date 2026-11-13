import {
  isTwelveHourMisread,
  sameNight,
  showTimeKey,
  type NightRow,
} from '@concert-crawl/types';

// A venue's listings can carry one night twice (its own page and a ticketing
// page, an untimed copy of a timed show, "Rossi" and "Rossi."). The unique
// index keys on the exact (canonical_artist, date, show_time), so the second
// copy would insert a second row. This rewrites a listing that is the same
// night as a row we already hold, or as another listing in the same crawl, so
// it carries that row's key and the existing upsert updates it instead.
//
// Nothing here writes: the one thing the caller must do is stamp a time onto a
// stored untimed row that a timed listing has just supplied (`promotions`).

/** A night with the show's own page URL, when the listing carries one. */
export interface UrlNightRow extends NightRow {
  eventUrl?: string | null | undefined;
}

export interface ExistingNight extends UrlNightRow {
  id: string;
}

export interface NightPromotion {
  id: string;
  /** `HH:MM:SS` the stored row now gets (a time it lacked, or the evening time). */
  showTime: string;
}

interface Slot extends UrlNightRow {
  id: string | null;
}

const isTimed = (row: NightRow): boolean => showTimeKey(row.showTime) !== '';

/**
 * A listing whose time is the morning-or-evening misread of a stored row's
 * (07:30 against 19:30) on the SAME show page: one show, corrected in place
 * rather than inserted as a twin. The page URL is the evidence that it is one
 * show, so a missing URL never matches.
 */
const misreadOnSamePage = (
  slot: UrlNightRow,
  listing: UrlNightRow,
): boolean => {
  const slotUrl = slot.eventUrl?.trim();
  const listingUrl = listing.eventUrl?.trim();
  return (
    slotUrl !== undefined &&
    slotUrl !== '' &&
    slotUrl === listingUrl &&
    isTwelveHourMisread(slot, listing)
  );
};

export function alignToNights<T extends UrlNightRow>(
  incoming: readonly T[],
  existing: readonly ExistingNight[],
): { aligned: T[]; promotions: NightPromotion[] } {
  // Timed listings claim their night first, so an untimed copy folds into the
  // timed one whatever order the page listed them in.
  const order = incoming
    .map((_, index) => index)
    .sort(
      (left, right) =>
        Number(isTimed(incoming[right] as T)) -
          Number(isTimed(incoming[left] as T)) || left - right,
    );

  // By date, so a listing only compares against its own day. Stored rows go in
  // by id, so which of several fitting rows wins never depends on read order.
  const byDate = new Map<string, Slot[]>();
  const slotsOn = (date: string): Slot[] => {
    const found = byDate.get(date);
    if (found) return found;
    const fresh: Slot[] = [];
    byDate.set(date, fresh);
    return fresh;
  };
  for (const row of [...existing].sort((a, b) => a.id.localeCompare(b.id))) {
    slotsOn(row.date).push({ ...row });
  }
  const promotions = new Map<string, NightPromotion>();
  const aligned = incoming.slice();

  for (const index of order) {
    const listing = incoming[index] as T;
    const daySlots = slotsOn(listing.date);
    const matches = daySlots.filter(
      (slot) => sameNight(slot, listing) || misreadOnSamePage(slot, listing),
    );
    const exact = matches.some(
      (slot) =>
        slot.canonicalArtist === listing.canonicalArtist &&
        showTimeKey(slot.showTime) === showTimeKey(listing.showTime),
    );
    if (exact) continue;

    // An untimed listing that two timed shows both fit (an early and a late)
    // cannot be told apart, so it is left alone rather than guessed.
    const timedTimes = new Set(
      matches.filter(isTimed).map((slot) => showTimeKey(slot.showTime)),
    );
    if (matches.length === 0 || (!isTimed(listing) && timedTimes.size > 1)) {
      daySlots.push({
        id: null,
        canonicalArtist: listing.canonicalArtist,
        date: listing.date,
        showTime: listing.showTime,
        eventUrl: listing.eventUrl,
      });
      continue;
    }

    const target = matches.find(isTimed) ?? matches[0];
    if (!target) continue;
    // The same show page at a time twelve hours off: the evening time is the
    // true one, whichever side holds it. A stored morning row is corrected in
    // place (a promotion); a stored evening row simply keeps its time.
    if (
      isTimed(target) &&
      isTimed(listing) &&
      showTimeKey(target.showTime) !== showTimeKey(listing.showTime)
    ) {
      const evening = [
        showTimeKey(target.showTime),
        showTimeKey(listing.showTime),
      ]
        .sort()
        .at(-1) as string;
      if (target.id !== null && showTimeKey(target.showTime) !== evening) {
        promotions.set(target.id, { id: target.id, showTime: evening });
      }
      target.showTime = evening;
      aligned[index] = {
        ...listing,
        canonicalArtist: target.canonicalArtist,
        showTime: evening,
      };
      continue;
    }
    if (!isTimed(target) && isTimed(listing) && target.id !== null) {
      target.showTime = showTimeKey(listing.showTime);
      promotions.set(target.id, {
        id: target.id,
        showTime: target.showTime,
      });
    }
    aligned[index] = {
      ...listing,
      canonicalArtist: target.canonicalArtist,
      showTime: isTimed(target) ? target.showTime : listing.showTime,
    };
  }

  return { aligned, promotions: [...promotions.values()] };
}
