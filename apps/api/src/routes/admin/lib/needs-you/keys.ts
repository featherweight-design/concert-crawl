import type { NeedsYouKind } from '@concert-crawl/types';

// Every kind, as a runtime list. The Record forces a compile error here when a
// kind is added to the type and not to this file.
const KIND_PRESENT: Record<NeedsYouKind, true> = {
  'show-dropped': true,
  'show-moved': true,
  'venue-failing': true,
  'venue-blocked': true,
  artist: true,
  'event-low-confidence': true,
  'price-check': true,
  'price-batch': true,
  bug: true,
};

export const NEEDS_YOU_KINDS = Object.keys(KIND_PRESENT).filter(isKind);

export function isKind(value: string): value is NeedsYouKind {
  return Object.hasOwn(KIND_PRESENT, value);
}

/** The kind a `<kind>:<id>[:<evidenceKey>]` key names, or null when unknown. */
export const parseItemKey = (
  key: string,
): { kind: NeedsYouKind; rest: string } | null => {
  const sep = key.indexOf(':');
  if (sep <= 0) return null;
  const kind = key.slice(0, sep);
  const rest = key.slice(sep + 1);
  if (!isKind(kind) || rest.length === 0) return null;
  return { kind, rest };
};

/** YYYY-MM-DD for the Denver calendar day containing `now`. */
export const denverDate = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `date` (YYYY-MM-DD) plus `days` calendar days, as YYYY-MM-DD. Throws on a
 * string that is not a calendar date rather than returning a plausible wrong
 * one.
 */
export const addDays = (date: string, days: number): string => {
  const match = ISO_DAY.exec(date);
  if (!match || !Number.isInteger(days)) {
    throw new RangeError(`addDays needs a YYYY-MM-DD date, got "${date}"`);
  }
  const [, year, month, day] = match.map(Number);
  const ms = Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days);
  return new Date(ms).toISOString().slice(0, 10);
};
