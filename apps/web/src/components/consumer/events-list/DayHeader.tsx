import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { DayTile } from './DayTile';

interface DayHeaderProps {
  /** The group's `YYYY-MM-DD`. */
  date: string;
  /** The visible label (`dateGroupLabel`), which also names the section. */
  label: string;
  count: number;
  today: boolean;
}

/**
 * A Browse day header (B+ `bp-browse`, `cal_m`): the date tile, the day's
 * label and its show count. Shared by the list and the calendar so the two
 * renderings of Browse head their days the same way.
 */
export const DayHeader = ({ date, label, count, today }: DayHeaderProps) => (
  <div className="mb-3 flex items-center gap-3">
    <DayTile date={date} today={today} />
    <h2
      className="shrink-0 leading-none"
      style={{
        fontFamily: 'Inter, system-ui',
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: '-0.02em',
        color: 'var(--fg)',
      }}
    >
      {label}
    </h2>
    <span
      className="shrink-0 uppercase text-fg-subtle"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        letterSpacing: '0.12em',
      }}
    >
      {CONSUMER_COPY.showCount(count)}
    </span>
  </div>
);
