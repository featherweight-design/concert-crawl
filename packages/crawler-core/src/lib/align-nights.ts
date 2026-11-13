import { sameNight, showTimeKey, type NightRow } from '@concert-crawl/types';

// A venue's listings can carry one night twice (its own page and a ticketing
// page, an untimed copy of a timed show, "Rossi" and "Rossi."). The unique
// index keys on the exact (canonical_artist, date, show_time), so the second
// copy would insert a second row. This rewrites a listing that is the same
// night as a row we already hold, or as another listing in the same crawl, so
// it carries that row's key and the existing upsert updates it instead.
//
// Nothing here writes: the one thing the caller must do is stamp a time onto a
// stored untimed row that a timed listing has just supplied (`promotions`).

export interface ExistingNight extends NightRow {
  id: string;
}

export interface NightPromotion {
  id: string;
  /** `HH:MM:SS` the untimed stored row now gets. */
  showTime: string;
}

interface Slot extends NightRow {
  id: string | null;
}

const isTimed = (row: NightRow): boolean => showTimeKey(row.showTime) !== '';

export function alignToNights<T extends NightRow>(
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
    const matches = daySlots.filter((slot) => sameNight(slot, listing));
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
      });
      continue;
    }

    const target = matches.find(isTimed) ?? matches[0];
    if (!target) continue;
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
