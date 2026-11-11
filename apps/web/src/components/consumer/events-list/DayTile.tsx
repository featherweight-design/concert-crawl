import {
  formatEventDate,
  isToday,
} from '@/components/consumer/definitions/lib';

interface DayTileProps {
  /** The group's `YYYY-MM-DD`, as Browse keys its date groups. */
  date: string;
}

/**
 * The date tile that leads a Browse day header (B+ `bp-browse`): the weekday
 * over the day number. Today's tile takes the brand gradient, every other day
 * a quiet neutral, so tonight is findable at a glance down a long list.
 * Decorative: the header's own label names the day for screen readers.
 */
export const DayTile = ({ date }: DayTileProps) => {
  const today = isToday(date);
  return (
    <span
      aria-hidden
      data-testid="day-tile"
      data-today={today || undefined}
      className="inline-flex shrink-0 flex-col items-center justify-center"
      style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        background: today
          ? 'linear-gradient(135deg, var(--signal), var(--accent))'
          : 'var(--fg-muted)',
        color: today ? 'var(--fg-on-accent)' : 'var(--bg)',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {formatEventDate(date, undefined, { weekday: 'short' })}
      </span>
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 20,
          fontWeight: 900,
          marginTop: 3,
        }}
      >
        {formatEventDate(date, undefined, { day: 'numeric' })}
      </span>
    </span>
  );
};
