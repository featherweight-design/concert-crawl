'use client';

import { useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ARROW: CSSProperties = {
  display: 'flex',
  padding: 6,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

const monthTitle = (year: number, month: number): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month, 1)));

const isoDay = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

/**
 * `01-snooze/snooze-until-a-date-d` and `-m`: a month grid, Sunday first, with
 * the chosen day ringed. Days before `min` are off, and so is the arrow back
 * past `min`'s month. Days are `YYYY-MM-DD` strings, never instants, so the
 * zone the viewer sits in cannot shift one. The log search's day picker reuses
 * it (addendum-3 row 26).
 */
export const MonthGrid = ({
  value,
  min,
  onChange,
}: {
  /** The chosen day, or '' for none. */
  value: string;
  /** The first day that can be chosen (`YYYY-MM-DD`). */
  min: string;
  onChange: (day: string) => void;
}) => {
  const start = value || min;
  const [view, setView] = useState({
    year: Number(start.slice(0, 4)),
    month: Number(start.slice(5, 7)) - 1,
  });

  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const daysIn = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const atMinMonth =
    view.year === Number(min.slice(0, 4)) &&
    view.month === Number(min.slice(5, 7)) - 1;
  const step = (by: number) =>
    setView(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + by, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });

  return (
    <div data-testid="month-grid">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <button
          type="button"
          aria-label={ADMIN_COPY.needsYou.snooze.previousMonth}
          disabled={atMinMonth}
          onClick={() => step(-1)}
          style={{ ...ARROW, opacity: atMinMonth ? 0.35 : 1 }}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <span
          aria-live="polite"
          style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}
        >
          {monthTitle(view.year, view.month)}
        </span>
        <button
          type="button"
          aria-label={ADMIN_COPY.needsYou.snooze.nextMonth}
          onClick={() => step(1)}
          style={ARROW}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      <div
        role="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          textAlign: 'center',
        }}
      >
        {WEEKDAYS.map((letter, index) => (
          <span
            key={index}
            aria-hidden
            style={{
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 11,
              color: 'var(--fg-subtle)',
              padding: '4px 0',
            }}
          >
            {letter}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`gap-${index}`} />
        ))}
        {Array.from({ length: daysIn }, (_, index) => {
          const day = isoDay(view.year, view.month, index + 1);
          const off = day < min;
          const chosen = day === value;
          return (
            <button
              key={day}
              type="button"
              disabled={off}
              aria-pressed={chosen}
              aria-label={new Intl.DateTimeFormat('en-US', {
                timeZone: 'UTC',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }).format(new Date(`${day}T00:00:00Z`))}
              onClick={() => onChange(day)}
              style={{
                height: 36,
                border: chosen
                  ? '1.5px solid var(--signal)'
                  : '1.5px solid transparent',
                borderRadius: 10,
                background: chosen
                  ? 'color-mix(in srgb, var(--signal) 14%, transparent)'
                  : 'transparent',
                color: off ? 'var(--fg-subtle)' : 'var(--fg)',
                fontSize: 14,
                fontWeight: chosen ? 800 : 500,
                cursor: off ? 'default' : 'pointer',
                opacity: off ? 0.4 : 1,
              }}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
