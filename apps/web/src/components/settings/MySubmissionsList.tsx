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

  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[13px] font-semibold text-fg">
        {SETTINGS_COPY.submissionsSection}
      </span>
      {visible.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-fg-muted">
          No submissions yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {visible.map((sub) => (
            <SubmissionItem key={sub.id} submission={sub} />
          ))}
          {hasMore && (
            <span className="px-4 py-3 text-[13px] text-fg-subtle">
              {SETTINGS_COPY.seeAllSubmissions(totalCount)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
