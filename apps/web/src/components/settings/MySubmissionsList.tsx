import { SubmissionItem } from './SubmissionItem'
import { SETTINGS_COPY } from './definitions/copy'
import { SUBMISSION_CAP_MOBILE } from './definitions/constants'
import type { UserSubmissionItem } from '@concert-crawl/types'

interface MySubmissionsListProps {
  submissions: UserSubmissionItem[]
  totalCount: number
  cap?: number
}

export function MySubmissionsList({
  submissions,
  totalCount,
  cap = SUBMISSION_CAP_MOBILE,
}: MySubmissionsListProps) {
  const visible = submissions.slice(0, cap)
  const hasMore = totalCount > cap

  if (visible.length === 0) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
            You haven&apos;t submitted any prices yet.
          </p>
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            The next show you go to, drop the price you saw. Two fans confirm
            and it goes live.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Card group with bordered items */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        {visible.map((sub, idx) => (
          <SubmissionItem
            key={sub.id}
            submission={sub}
            isLast={idx === visible.length - 1}
          />
        ))}
      </div>

      {/* "See all →" button */}
      {hasMore && (
        <button
          type="button"
          className="w-full py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.10em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--signal)' }}
        >
          {SETTINGS_COPY.seeAllSubmissions(totalCount)}
        </button>
      )}
    </div>
  )
}
