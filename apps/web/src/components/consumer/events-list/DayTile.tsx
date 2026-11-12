import { formatEventDate } from '@/components/consumer/definitions/lib';

interface DayTileProps {
  /** The group's `YYYY-MM-DD`, as Browse keys its date groups. */
  date: string;
  /** Passed in, so the tile and the header's "Tonight" read one clock. */
  today: boolean;
  /**
   * The artist page's tile (B+ `09-artist`) adds the month under the day and
   * grows to hold it. Browse leaves it off: its day headers name the month.
   */
  month?: boolean;
  /**
   * A gradient start color, for a tile that leads a show rather than a day.
   * It always takes the gradient, from this color into --accent, so the tile
   * carries the show's genre the way the row's edge does.
   */
  tint?: string;
}

/**
 * The date tile that leads a Browse day header (B+ `bp-browse`): the weekday
 * over the day number. Today's tile takes the brand gradient and every other
 * day the board's light neutral, so tonight is findable down a long list.
 * Decorative: the header's own label names the day for screen readers.
 */
export const DayTile = ({ date, today, month = false, tint }: DayTileProps) => {
  const filled = today || tint !== undefined;
  return (
    <span
      aria-hidden
      data-testid="day-tile"
      data-today={today || undefined}
      className="inline-flex shrink-0 flex-col items-center justify-center"
      style={{
        width: month ? 56 : 48,
        height: month ? 62 : 48,
        borderRadius: month ? 12 : 10,
        background: filled
          ? `linear-gradient(${tint !== undefined ? '160deg' : '135deg'}, ${tint ?? 'var(--signal)'}, var(--accent))`
          : 'var(--fg-muted)',
        color: filled ? 'var(--fg-on-accent)' : 'var(--bg)',
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
      {month && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          {formatEventDate(date, undefined, { month: 'short' })}
        </span>
      )}
    </span>
  );
};
