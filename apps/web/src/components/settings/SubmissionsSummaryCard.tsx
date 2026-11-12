import Link from 'next/link';
import { ChevronRight, Tag } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { formatAgo, latestSubmission, priceLabelOf } from './submission-format';
import type { UserSubmissionItem } from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface SubmissionsSummaryCardProps {
  submissions: UserSubmissionItem[];
  totalCount: number;
  cred: number;
}

/**
 * Mobile Settings' one line on submitted prices: the counts and the newest
 * row, opening the full list on its own page.
 */
export const SubmissionsSummaryCard = ({
  submissions,
  totalCount,
  cred,
}: SubmissionsSummaryCardProps) => {
  const latest = latestSubmission(submissions);
  const confirmedCount = submissions.filter(
    (sub) => sub.status === 'confirmed',
  ).length;

  if (latest === undefined) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-4">
        <p className="text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
          {SETTINGS_COPY.emptySubmissionsTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">
          {SETTINGS_COPY.emptySubmissionsBody}
        </p>
      </div>
    );
  }

  return (
    <Link
      href="/me/submissions"
      className="block overflow-hidden rounded-2xl border border-border bg-surface-1 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <div className="flex items-center gap-3.5 px-4 py-4">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: 'var(--success)',
            background: 'color-mix(in oklch, var(--success) 12%, transparent)',
            border:
              '1px solid color-mix(in oklch, var(--success) 40%, transparent)',
          }}
        >
          <Tag size={18} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[17px] font-extrabold leading-tight tracking-[-0.01em] text-fg">
            {SETTINGS_COPY.submissionsSection}
          </span>
          <span
            className="text-[10.5px] uppercase tracking-[0.1em] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SETTINGS_COPY.submissionsTotal(totalCount)}
            {confirmedCount > 0 &&
              SETTINGS_COPY.submissionsConfirmedSuffix(confirmedCount)}
            {cred > 0 && SETTINGS_COPY.submissionsCredSuffix(cred)}
          </span>
        </div>
        <ChevronRight
          size={16}
          aria-hidden
          className="shrink-0 text-fg-subtle"
        />
      </div>
      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <span
          className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.submissionsLatestLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] text-fg-muted">
          <strong className="font-extrabold text-fg">{latest.artist}</strong>{' '}
          {priceLabelOf(latest)} ·{' '}
          {SETTINGS_COPY.submissionAge(formatAgo(latest.submittedAt))}
        </span>
        <StatusPill status={latest.status} />
      </div>
    </Link>
  );
};
