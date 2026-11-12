import Link from 'next/link';
import { StatusPill } from './StatusPill';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { formatAgo, formatDate, priceLabelOf } from './submission-format';
import type { UserSubmissionItem } from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface SubmissionItemProps {
  submission: UserSubmissionItem;
  isLast?: boolean;
}

export function SubmissionItem({
  submission,
  isLast = false,
}: SubmissionItemProps) {
  const ago = formatAgo(submission.submittedAt);
  const confirms = submission.corroborationCount;

  return (
    <Link
      href={`/events/${submission.eventId}`}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal"
      style={isLast ? undefined : { borderBottom: '1px solid var(--border)' }}
    >
      {/* Left: who, where, and how the price is doing */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-[16px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
          {submission.artist}
        </span>
        <span
          className="truncate text-[11px] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          {submission.venue}
          {submission.date && ` · ${formatDate(submission.date)}`}
        </span>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <StatusPill status={submission.status} />
          {confirms > 0 && (
            <span className="text-[12px] text-fg-muted">
              {SETTINGS_COPY.submissionConfirms(confirms)}
            </span>
          )}
          {submission.status === 'confirmed' && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
            >
              {SETTINGS_COPY.submissionCredEarned}
            </span>
          )}
          {submission.status === 'disputed' && (
            <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
              {SETTINGS_COPY.submissionDisputed}
            </span>
          )}
        </div>
      </div>

      {/* Right: the price, its tier, and when */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[18px] font-black leading-none tracking-[-0.02em] text-fg">
          {priceLabelOf(submission)}
        </span>
        <span
          className="text-[10px] font-bold uppercase text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          {submission.tier}
        </span>
        <span
          className="text-[10px] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.submissionAge(ago)}
        </span>
      </div>
    </Link>
  );
}
