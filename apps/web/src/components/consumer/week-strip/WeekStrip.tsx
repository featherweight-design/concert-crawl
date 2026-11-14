import Link from 'next/link';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { accessibleDayLabelFor } from '@/components/consumer/jump-picker/date-math';

export interface WeekStripDay {
  date: string;
  label: string;
  dayOfMonth: string;
  hasEvents: boolean;
}

/** The most genre dots a day tile draws (B+ `cal_m`). */
export const MAX_DAY_DOTS = 4;

interface WeekStripProps {
  days: WeekStripDay[];
  selectedDate: string;
  today: string;
  /**
   * The genre colors (CSS values) of each day's shows, keyed by ISO date, in
   * the order they should dot the tile. A day with shows but no entry falls
   * back to one signal dot, so "has shows" never depends on genre data.
   */
  dayGenres?: ReadonlyMap<string, readonly string[]>;
  /**
   * Called when the user selects a date. Providing this enables client-side
   * date switching without URL navigation — pass a setState setter so
   * re-selecting a previously visited date is instant with no network request.
   * When omitted, day buttons fall back to `buildHref` links (SSR nav).
   */
  onDateSelect?: (date: string) => void;
  /** Used as the day `href` when `onDateSelect` is not provided. */
  buildHref?: (date: string) => string;
}

const tileBase =
  'flex h-[60px] min-w-0 flex-col items-center justify-center rounded-xl lg:h-[66px]';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  lineHeight: 1,
};

const numberStyle: CSSProperties = {
  fontFamily: 'Inter, system-ui',
  fontSize: 19,
  fontWeight: 900,
  letterSpacing: '-0.02em',
  lineHeight: 1,
  marginTop: 5,
};

/** The colors one tile dots itself with: its genres, or one signal dot. */
export function dotsFor(
  day: WeekStripDay,
  dayGenres: ReadonlyMap<string, readonly string[]> | undefined,
): readonly string[] {
  if (!day.hasEvents) return [];
  const colors = dayGenres?.get(day.date) ?? [];
  return colors.length > 0 ? colors.slice(0, MAX_DAY_DOTS) : ['var(--signal)'];
}

export function WeekStrip({
  days,
  selectedDate,
  today,
  dayGenres,
  onDateSelect,
  buildHref,
}: WeekStripProps) {
  return (
    <div className="mb-5 grid min-w-0 grid-cols-7 gap-1 lg:gap-2">
      {days.map((day) => {
        const selected = day.date === selectedDate;
        const isPast = day.date < today;
        const isToday = day.date === today;
        const dots = isPast ? [] : dotsFor(day, dayGenres);

        const dayInner = (
          <>
            <span className="uppercase" style={labelStyle}>
              {day.label}
            </span>
            <span style={numberStyle}>{day.dayOfMonth}</span>
            <span
              aria-hidden
              data-testid="day-dots"
              className="flex items-center gap-[3px]"
              style={{ height: 5, marginTop: 6 }}
            >
              {dots.map((color, idx) => (
                <span
                  key={idx}
                  className="rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    // On the gradient tile the dots go dark, as on the board,
                    // so they still read against the fill.
                    background: selected ? 'var(--fg-on-accent)' : color,
                  }}
                />
              ))}
            </span>
          </>
        );

        if (isPast) {
          return (
            <div
              key={day.date}
              className={cn(tileBase, 'text-fg-muted')}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                opacity: 0.35,
              }}
              aria-disabled="true"
            >
              {dayInner}
            </div>
          );
        }

        const dayClassName = cn(
          tileBase,
          'transition-colors',
          selected ? 'text-fg-on-accent' : 'text-fg',
        );
        const dayStyle: CSSProperties = selected
          ? {
              background:
                'linear-gradient(160deg, var(--signal), var(--accent))',
              border: '1px solid transparent',
            }
          : {
              background: 'var(--surface-1)',
              // Today keeps a signal outline whether or not it's selected
              // elsewhere in the week, as on the board.
              border: isToday
                ? '1.5px solid var(--signal)'
                : '1px solid var(--border)',
            };

        // Derive the accessible name from the ISO date so it always names the
        // weekday + month ("Monday, Apr 27") instead of the ambiguous short
        // label. The dots are aria-hidden, so fold the shows-on-sale cue into
        // the name too.
        const dayName = accessibleDayLabelFor(day.date);
        const dayAriaLabel = day.hasEvents
          ? `${dayName}, ${CONSUMER_COPY.weekStripDayShows}`
          : dayName;

        if (onDateSelect) {
          return (
            <button
              key={day.date}
              type="button"
              className={cn(dayClassName, 'cursor-pointer')}
              style={dayStyle}
              onClick={() => onDateSelect(day.date)}
              aria-label={dayAriaLabel}
              aria-current={selected ? 'date' : undefined}
              data-today={isToday || undefined}
            >
              {dayInner}
            </button>
          );
        }

        return (
          <Link
            key={day.date}
            href={buildHref?.(day.date) ?? '#'}
            className={dayClassName}
            style={dayStyle}
            scroll={false}
            aria-label={dayAriaLabel}
            aria-current={selected ? 'date' : undefined}
            data-today={isToday || undefined}
          >
            {dayInner}
          </Link>
        );
      })}
    </div>
  );
}
