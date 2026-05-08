import Link from 'next/link'
import { StatusPill } from './StatusPill'
import type { UserSubmissionItem } from '@concert-crawl/types'

interface SubmissionItemProps {
  submission: UserSubmissionItem
}

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function formatDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SubmissionItem({ submission }: SubmissionItemProps) {
  const priceRange = submission.priceMax
    ? `${formatPrice(submission.priceMin)}–${formatPrice(submission.priceMax)}`
    : formatPrice(submission.priceMin)

  return (
    <Link
      href={`/events/${submission.eventId}`}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-fg">
          {submission.artist}
        </span>
        <span className="text-[12px] text-fg-muted">
          {submission.venue} · {formatDate(submission.date)}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="text-[13px] font-bold text-fg"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {priceRange}
        </span>
        <StatusPill status={submission.status} />
        {submission.status === 'confirmed' && (
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
          >
            +1 cred
          </span>
        )}
      </div>
    </Link>
  )
}
