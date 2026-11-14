/**
 * Calendar arithmetic shared by the admin's one-month popovers: the event
 * editor's DateField (`04/date-picker-d`) and the Activity log's day picker
 * (`37/log-day-picker-d`). Dates are `YYYY-MM-DD` calendar days, months are
 * 0-based as in `Date.UTC`, and everything runs in UTC so a viewer's own
 * zone never shifts a day.
 */

export const pad = (value: number) => String(value).padStart(2, '0');

export const isoOf = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/** The month a `YYYY-MM-DD` falls in. */
export interface MonthView {
  year: number;
  month: number;
}

export const monthOf = (iso: string): MonthView => ({
  year: Number(iso.slice(0, 4)),
  month: Number(iso.slice(5, 7)) - 1,
});

/** `YYYY-MM`, as the API's month params take it. */
export const monthKey = ({ year, month }: MonthView) =>
  `${year}-${pad(month + 1)}`;

export const shiftMonth = (
  { year, month }: MonthView,
  step: number,
): MonthView => {
  const next = month + step;
  return { year: year + Math.floor(next / 12), month: (next + 12) % 12 };
};

/** The calendar day `step` days from `iso`. */
export const shiftDay = (iso: string, step: number): string => {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + step);
  return isoOf(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
};

/** The month grid's cells: blanks before the 1st, then each day. */
export const monthCells = (year: number, month: number): (number | null)[] => {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
};

/** "November 2026". */
export const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month, 1)));
