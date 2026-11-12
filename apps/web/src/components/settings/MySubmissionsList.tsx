import { SubmissionItem } from './SubmissionItem';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { UserSubmissionItem } from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface MySubmissionsListProps {
  submissions: UserSubmissionItem[];
}

export function MySubmissionsList({ submissions }: MySubmissionsListProps) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
            {SETTINGS_COPY.emptySubmissionsTitle}
          </p>
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            {SETTINGS_COPY.emptySubmissionsBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
      {submissions.map((sub, idx) => (
        <SubmissionItem
          key={sub.id}
          submission={sub}
          isLast={idx === submissions.length - 1}
        />
      ))}
    </div>
  );
}
