// The one way admin writes a ticket price. Every admin surface (Needs you,
// Prices, Events, People, the Activity log) reads these helpers, so a price
// reads the same wherever an admin meets it.
//
// A missing top means two different things, so there are two range helpers:
// - an event's price (crawled or set by an admin) stores a single price with no
//   top, so it reads "$15";
// - a fan's submitted price leaves the top empty for "from this price up", so
//   it reads "$45+" (the Prices and Needs you boards).

type Amount = string | number | null | undefined;

/**
 * "$44", "$44.50", "$1,250": one price, whole dollars without cents. The API
 * sends numeric strings ("44.00") and the audit log numbers; both read here.
 * Null for no price, an empty string, or anything that is not a finite number.
 */
export const adminDollars = (value: Amount): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const whole = Number.isInteger(amount);
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const range = (low: string, high: string): string =>
  high === low ? low : `${low}–${high}`;

/**
 * An event's price: "$65–$495", or "$15" for a single price (no top, or a top
 * equal to the bottom). A top below the bottom is written as stored
 * ("$60–$40") so bad data stays visible to an admin. Null without a readable
 * bottom price.
 */
export const adminPriceRange = (min: Amount, max: Amount): string | null => {
  const low = adminDollars(min);
  if (low === null) return null;
  const high = adminDollars(max);
  return high === null ? low : range(low, high);
};

/**
 * A fan's submitted price: as adminPriceRange, except that no top reads
 * "$45+", and a free price with no top stays "$0".
 */
export const adminSubmittedRange = (
  min: Amount,
  max: Amount,
): string | null => {
  const low = adminDollars(min);
  if (low === null) return null;
  const high = adminDollars(max);
  if (high === null) return Number(min) === 0 ? low : `${low}+`;
  return range(low, high);
};
