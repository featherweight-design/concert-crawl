import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel } from '@/components/admin/primitives';
import { formatMonth, formatUsd } from './health-model';

const copy = ADMIN_COPY.health.cost;

const WIDTH = 520;
const HEIGHT = 124;
const GAP = 2;
/** The bars' baseline: the board leaves 4 units under it. */
const BASE = 120;
/** Headroom so the tallest bar never touches the top edge. */
const TOP = 4;
/** Days to come draw at a fixed 40% of the plot (48 of 120 on the board). */
const FUTURE_HEIGHT = BASE * 0.4;

const axisLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: '0.14em',
  fontWeight: 500,
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
} satisfies React.CSSProperties;

/**
 * The month as bars (`03/health-desktop`): spend so far, days to come dashed,
 * and the daily budget (budget over days in the month) as a line. No budget
 * set, no line (gap G5).
 */
export const CostByDay = ({
  series,
  month,
  budgetUsd,
}: {
  series: Array<{ date: string; costUsd: number | null }>;
  month: number;
  budgetUsd: number | null;
}) => {
  const spent = series.flatMap((day) =>
    day.costUsd === null ? [] : [day.costUsd],
  );
  const total = spent.reduce((sum, cost) => sum + cost, 0);
  const mean = spent.length > 0 ? total / spent.length : 0;
  const daily = budgetUsd === null ? null : budgetUsd / series.length;
  const scale = Math.max(...spent, daily ?? 0, 0.01);
  const toHeight = (cost: number) => (cost / scale) * (BASE - TOP);
  const barWidth = (WIDTH - GAP * (series.length - 1)) / series.length;
  const budgetY = daily === null ? null : BASE - toHeight(daily);
  const name = formatMonth(month);

  return (
    <Panel
      title={copy.title}
      phoneCompact
      action={
        // The phone board has no "$x a day" or footnote (gap G12).
        <span
          className="health-desk"
          style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--fg-muted)' }}
        >
          {copy.perDay(formatUsd(mean))}
        </span>
      }
    >
      <div data-testid="cost-by-day" style={{ position: 'relative' }}>
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={copy.chartLabel(name, formatUsd(total))}
          style={{ display: 'block' }}
        >
          {series.map((day, i) => {
            const x = i * (barWidth + GAP);
            if (day.costUsd === null) {
              return (
                <rect
                  key={day.date}
                  x={x}
                  y={BASE - FUTURE_HEIGHT}
                  width={barWidth}
                  height={FUTURE_HEIGHT}
                  rx={2}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              );
            }
            const height = Math.max(toHeight(day.costUsd), 1);
            return (
              <rect
                key={day.date}
                x={x}
                y={BASE - height}
                width={barWidth}
                height={height}
                rx={2}
                fill="var(--signal)"
                opacity={0.85}
              >
                <title>{copy.day(day.date, formatUsd(day.costUsd))}</title>
              </rect>
            );
          })}
          {budgetY !== null && (
            <line
              x1={0}
              x2={WIDTH}
              y1={budgetY}
              y2={budgetY}
              stroke="var(--warning)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {budgetY !== null && daily !== null && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: Math.max(budgetY - 18, 0),
              fontSize: 11,
              color: 'var(--fg-muted)',
            }}
          >
            {copy.dailyBudget(formatUsd(daily))}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        <span style={axisLabel}>{`${name} 1`}</span>
        <span style={axisLabel}>{`${name} ${series.length}`}</span>
      </div>
      <p
        className="health-desk"
        style={{ margin: '14px 0 0', fontSize: 12.5, color: 'var(--fg-muted)' }}
      >
        {/* GAP G10: no per-day top-venue source, so the board's second
            sentence ("Nov 7 was …") is left out. */}
        {copy.footnote}
      </p>
    </Panel>
  );
};
