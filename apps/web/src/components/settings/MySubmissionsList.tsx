'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { StateCard } from '@/components/consumer/empty-state/StateCard';
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
      {/* `submitted-prices-m`: one line that runs off the right edge (the row
          bleeds to the screen edge and scrolls sideways), not a wrapping
          pair of lines. From `lg` the sort note sits at the far end. */}
      <div className="-mx-4 flex items-center justify-between gap-3 sm:mx-0">
        <div
          role="group"
          aria-label={SETTINGS_COPY.submissionsFilterAria}
          className="-my-1 flex flex-1 gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] min-[400px]:gap-2 sm:px-0 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {SUBMISSION_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                data-ring={active ? 'gradient' : undefined}
                onClick={() => setFilter(key)}
                className="shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-[13px] font-semibold min-[400px]:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                style={
                  active
                    ? {
                        // The gradient ring (signal, accent, border) on surface-2.
                        border: '1px solid transparent',
                        background:
                          'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
                        color: 'var(--fg)',
                      }
                    : {
                        borderColor: 'var(--border)',
                        background: 'transparent',
                        color: 'var(--fg-muted)',
                      }
                }
              >
                {SETTINGS_COPY.submissionFilterLabel(
                  SETTINGS_COPY.submissionFilters[key],
                  counts[key],
                )}
              </button>
            );
          })}
        </div>
        <span
          className="hidden shrink-0 text-[10px] uppercase tracking-[0.14em] text-fg-subtle lg:block"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.submissionsNewestFirst}
        </span>
      </div>

      {months.length === 0 && (
        // A filter with no rows: the one empty pattern, not a blank page
        // (`bp-s-empty_search_m`).
        <StateCard
          role="status"
          icon={<SlidersHorizontal size={26} strokeWidth={1.75} />}
          eyebrow={SETTINGS_COPY.submissionsFilterEmpty.eyebrow}
          title={SETTINGS_COPY.submissionsFilterEmpty.title(
            SETTINGS_COPY.submissionFilters[filter],
          )}
          action={{
            label: SETTINGS_COPY.submissionsFilterEmpty.action,
            onClick: () => setFilter('all'),
          }}
        />
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
