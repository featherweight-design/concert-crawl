import Link from 'next/link'
import { StatusPill } from './StatusPill'
import type { UserSubmissionItem } from '@concert-crawl/types'

interface SubmissionItemProps {
  submission: UserSubmissionItem
  isLast?: boolean
}

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SubmissionItem({
  submission,
  isLast = false,
}: SubmissionItemProps) {
  const priceLabel = submission.priceMax
    ? `${formatPrice(submission.priceMin)}–${formatPrice(submission.priceMax)}`
    : formatPrice(submission.priceMin)

  return (
    <Link
      href={`/events/${submission.eventId}`}
      className="flex flex-col gap-1.5 px-3.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={isLast ? undefined : { borderBottom: '1px solid var(--border)' }}
    >
      {/* Row 1: status pill */}
      <div className="flex items-center gap-2">
        <StatusPill status={submission.status} />
      </div>

      {/* Row 2: artist name */}
      <span className="truncate text-[14px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
        {submission.artist}
      </span>

      {/* Row 3: price left, venue · date right */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[16px] font-black leading-none tracking-[-0.02em] text-fg">
          {priceLabel}
        </span>
        <span
          className="min-w-0 truncate text-right text-[10px] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          {submission.venue}
          {submission.date && ` · ${formatDate(submission.date)}`}
        </span>
      </div>

      {/* Row 4: cred / disputed */}
      {submission.status === 'confirmed' && (
        <span
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
        >
          +1 cred
        </span>
      )}
      {submission.status === 'disputed' && (
        <span
          className="text-[12px] text-fg-muted"
          style={{ color: 'var(--danger)' }}
        >
          Someone disputed this. Tap to see what they saw.
        </span>
      )}
    </Link>
  )
}
