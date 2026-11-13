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
