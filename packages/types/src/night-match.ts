// One night at one venue is one show, however many listings carried it. The
// stored dedup key (canonical_artist, date, show_time) is exact, so two
// listings of the same night slip past it when one has no time ("untimed"), or
// when the artist differs only by trailing punctuation ("Rossi" / "Rossi.").
// This is the looser comparison used at match time, by the crawler (to fold a
// second listing into the row that exists) and by the duplicate cleanup.
//
// It never changes a stored value: `canonicalizeArtist` keeps its punctuation
// ("m.i.a." stays) because it IS the unique index's key. And it uses no
// name-shape rules (#1343): the artist test is equality of the canonical key
// with edge punctuation trimmed, nothing cleverer.

/**
 * Postgres `time` text form (`HH:MM:SS`) from `HH:MM` or `HH:MM:SS`; '' for
 * null, empty or unparseable, which is how an untimed row reads.
 */
export function showTimeKey(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  if (!match) return '';
  const hours = match[1] ?? '';
  const minutes = match[2] ?? '00';
  const seconds = match[3] ?? '00';
  return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
}

/** A canonical artist with punctuation and spacing trimmed off both ends. */
export function nightArtistKey(canonicalArtist: string): string {
  return canonicalArtist.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** Seconds past midnight, or null for an untimed row. */
export function secondsOf(showTime: string | null | undefined): number | null {
  const key = showTimeKey(showTime);
  if (key === '') return null;
  const [hours, minutes, seconds] = key.split(':');
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

const HOUR = 3600;

export interface NightRow {
  canonicalArtist: string;
  /** The event-local date, `YYYY-MM-DD`. */
  date: string;
  showTime?: string | null | undefined;
}

/**
 * True when two rows of ONE venue are the same night: the same date and the
 * same artist key, and times that do not disagree. Equal times match, and an
 * untimed row matches a timed one (the listing just did not say when). Two
 * different times never match, so an early and a late show stay two nights.
 */
export function sameNight(left: NightRow, right: NightRow): boolean {
  if (left.date !== right.date) return false;
  const leftKey = nightArtistKey(left.canonicalArtist);
  if (leftKey === '' || leftKey !== nightArtistKey(right.canonicalArtist)) {
    return false;
  }
  const leftTime = showTimeKey(left.showTime);
  const rightTime = showTimeKey(right.showTime);
  return leftTime === '' || rightTime === '' || leftTime === rightTime;
}

/**
 * One show stored with a morning-or-evening misread of its time (19:30 and
 * 07:30): one artist, one date, both timed, exactly twelve hours apart to the
 * second, the earlier from 01:00 to before 10:00. Venues do not run a 7:30
 * morning concert, so the pair is one show; 00:00 is excluded because it is the
 * usual "no time given" placeholder. NOT part of `sameNight`: two different
 * times stay two nights there, and the callers that join a misread (the cleanup,
 * and the crawl on one event page URL) say so themselves.
 */
export function isTwelveHourMisread(left: NightRow, right: NightRow): boolean {
  const first = secondsOf(left.showTime);
  const second = secondsOf(right.showTime);
  if (first === null || second === null) return false;
  const key = nightArtistKey(left.canonicalArtist);
  const earlier = Math.min(first, second);
  return (
    left.date === right.date &&
    key !== '' &&
    key === nightArtistKey(right.canonicalArtist) &&
    Math.abs(first - second) === 12 * HOUR &&
    earlier >= HOUR &&
    earlier < 10 * HOUR
  );
}
