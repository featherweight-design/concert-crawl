import {
  canonicalizeSupporting,
  isTwelveHourMisread,
  nightArtistKey,
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

/** Who is on a row's bill, as the events columns of the same names hold it. */
export interface BillNames {
  headliners?: readonly string[] | null | undefined;
  supportingArtists?: readonly string[] | null | undefined;
  canonicalHeadliners?: readonly string[] | null | undefined;
  canonicalSupporting?: readonly string[] | null | undefined;
}

/** A night with the show's own page URL, when the listing carries one. */
export interface UrlNightRow extends NightRow, BillNames {
  eventUrl?: string | null | undefined;
}

export interface ExistingNight extends UrlNightRow {
  id: string;
  /** A show an admin added by hand (`events.manual`). */
  manual?: boolean | undefined;
}

export interface NightPromotion {
  id: string;
  /** `HH:MM:SS` the stored row now gets (a time it lacked, or the evening time). */
  showTime: string;
}

interface Slot extends UrlNightRow {
  id: string | null;
  manual?: boolean | undefined;
  /** The index of the listing of this crawl that created the slot, if any. */
  owner?: number;
}

const isTimed = (row: NightRow): boolean => showTimeKey(row.showTime) !== '';

/**
 * Every canonical name on a row's bill: its artist key, headliners and
 * supporting acts, each through the crawl's own canonicalizer (the stored
 * canonical column when there is one) with edge punctuation trimmed as
 * `sameNight` does. No name-shape rules (#1343): names are compared whole.
 */
const billNames = (row: NightRow & BillNames): Set<string> => {
  const canonical = (
    stored: readonly string[] | null | undefined,
    raw: readonly string[] | null | undefined,
  ): readonly string[] => stored ?? canonicalizeSupporting([...(raw ?? [])]);
  const names = [
    row.canonicalArtist,
    ...canonical(row.canonicalHeadliners, row.headliners),
    ...canonical(row.canonicalSupporting, row.supportingArtists),
  ].map(nightArtistKey);
  return new Set(names.filter((name) => name !== ''));
};

const sharesAnAct = (
  left: NightRow & BillNames,
  right: NightRow & BillNames,
): boolean => {
  const leftNames = billNames(left);
  return [...billNames(right)].some((name) => leftNames.has(name));
};

/**
 * The show added by hand that a listing with no same-night row lands on, or
 * null to insert it as usual.
 *
 * A manual row keys on its first headliner, while a listing keys on the
 * ladder's display string, which can be a title ("Jazz Series presents" over
 * ["Kokoroko"]). So the artist test of `sameNight` misses it and the crawl
 * would list the show twice. Instead: EXACTLY ONE manual row on the listing's
 * date, at least one act on both bills (so another room's act that night is
 * never folded under the admin's bill), and a show time that does not
 * disagree when both sides have one, so an early and a late show never fold
 * together. Zero or several manual rows, no shared act, or an untimed manual
 * row while this crawl lists the date at more than one time (which of them it
 * is cannot be told), insert as before and leave the duplicate-night cleanup
 * to judge.
 */
export function manualLandingTarget<
  S extends NightRow & BillNames & { manual?: boolean | undefined },
>(
  daySlots: readonly S[],
  listing: NightRow & BillNames,
  listingTimesOnDate: ReadonlySet<string>,
): S | null {
  const manual = daySlots.filter(
    (slot) => slot.manual === true && slot.date === listing.date,
  );
  const [only] = manual;
  if (manual.length !== 1 || only === undefined) return null;
  if (!sharesAnAct(only, listing)) return null;
  const slotTime = showTimeKey(only.showTime);
  const listingTime = showTimeKey(listing.showTime);
  if (slotTime !== '' && listingTime !== '') {
    return slotTime === listingTime ? only : null;
  }
  if (slotTime === '' && listingTimesOnDate.size > 1) return null;
  return only;
}

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
  // The times this crawl lists each date at, so an untimed manual row is not
  // guessed onto one of an early and a late show.
  const listingTimesByDate = new Map<string, Set<string>>();
  for (const row of incoming) {
    if (!isTimed(row)) continue;
    const times = listingTimesByDate.get(row.date) ?? new Set<string>();
    times.add(showTimeKey(row.showTime));
    listingTimesByDate.set(row.date, times);
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
    const landing =
      matches.length === 0
        ? manualLandingTarget(
            daySlots,
            listing,
            listingTimesByDate.get(listing.date) ?? new Set(),
          )
        : null;
    if (landing) matches.push(landing);
    if (matches.length === 0 || (!isTimed(listing) && timedTimes.size > 1)) {
      daySlots.push({
        id: null,
        canonicalArtist: listing.canonicalArtist,
        date: listing.date,
        showTime: listing.showTime,
        eventUrl: listing.eventUrl,
        owner: index,
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
      showTimeKey(target.showTime) !== showTimeKey(listing.showTime) &&
      isTwelveHourMisread(target, listing)
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
      // A listing of this same crawl that created the slot is rewritten too,
      // or the two would still upsert under different times.
      if (target.owner !== undefined) {
        const earlier = aligned[target.owner] as T;
        aligned[target.owner] = { ...earlier, showTime: evening };
      }
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
