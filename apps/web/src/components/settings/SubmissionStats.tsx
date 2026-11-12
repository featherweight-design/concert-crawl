import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const STATS_COPY = CONSUMER_COPY.settings.submissionStats;

interface SubmissionStatsProps {
  submitted: number;
  confirmed: number;
  cred: number;
}

const Tile = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-border bg-surface-1 px-4 py-3.5">
    <div
      className="text-[28px] font-black leading-none tracking-[-0.03em]"
      style={{ color }}
    >
      {value.toLocaleString()}
    </div>
    <div
      className="mt-2.5 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {label}
    </div>
  </div>
);

/** Three tiles over the submitted-prices list: how many, how many held, cred. */
export const SubmissionStats = ({
  submitted,
  confirmed,
  cred,
}: SubmissionStatsProps) => (
  <div className="grid grid-cols-3 gap-2.5">
    <Tile value={submitted} label={STATS_COPY.submitted} color="var(--fg)" />
    <Tile
      value={confirmed}
      label={STATS_COPY.confirmed}
      color="var(--success)"
    />
    <Tile value={cred} label={STATS_COPY.cred} color="var(--accent)" />
  </div>
);
