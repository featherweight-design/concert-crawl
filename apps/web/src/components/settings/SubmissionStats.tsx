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
  <div className="min-w-0 rounded-2xl border border-border bg-surface-1 px-3 py-3.5 min-[400px]:px-4">
    <div
      className="text-[22px] font-black leading-none tracking-[-0.03em]"
      style={{ color }}
    >
      {value.toLocaleString()}
    </div>
    {/* A label steps down to a second line rather than clipping ("CRED EARN…"). */}
    <div
      className="mt-2.5 text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-fg-subtle min-[400px]:tracking-[0.14em]"
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
