'use client';

import { useState } from 'react';
import { SubmissionItem } from './SubmissionItem';
import {
  SUBMISSION_FILTERS,
  countsByFilter,
  groupByMonth,
  matchesFilter,
  type SubmissionFilter,
} from './submission-format';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { UserSubmissionItem } from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface MySubmissionsListProps {
  submissions: UserSubmissionItem[];
}

export function MySubmissionsList({ submissions }: MySubmissionsListProps) {
  const [filter, setFilter] = useState<SubmissionFilter>('all');

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

  const counts = countsByFilter(submissions);
  const months = groupByMonth(
    submissions.filter((sub) => matchesFilter(sub, filter)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={SETTINGS_COPY.submissionsFilterAria}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {SUBMISSION_FILTERS.map((key) => {
          const active = key === filter;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className="shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--surface-2)' : 'transparent',
                color: active ? 'var(--fg)' : 'var(--fg-muted)',
              }}
            >
              {SETTINGS_COPY.submissionFilterLabel(
                SETTINGS_COPY.submissionFilters[key],
                counts[key],
              )}
            </button>
          );
        })}
      </div>

      {months.length === 0 && (
        <p className="text-[12.5px] text-fg-muted">
          {SETTINGS_COPY.submissionsFilterEmpty}
        </p>
      )}

      {months.map((month) => (
        <section key={month.key} className="flex flex-col gap-2.5">
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SETTINGS_COPY.submissionsMonthHeading(
              month.label,
              month.items.length,
            )}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
            {month.items.map((sub, idx) => (
              <SubmissionItem
                key={sub.id}
                submission={sub}
                isLast={idx === month.items.length - 1}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
