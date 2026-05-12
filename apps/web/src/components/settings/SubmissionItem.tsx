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

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export function SubmissionItem({
  submission,
  isLast = false,
}: SubmissionItemProps) {
  const priceLabel = submission.priceMax
    ? `${formatPrice(submission.priceMin)}–${formatPrice(submission.priceMax)}`
    : formatPrice(submission.priceMin)
  const ago = formatAgo(submission.submittedAt)
  const confirms = submission.corroborationCount

  return (
    <Link
      href={`/events/${submission.eventId}`}
      className="flex flex-col gap-1.5 px-3.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={isLast ? undefined : { borderBottom: '1px solid var(--border)' }}
    >
      {/* Row 1: status pill + ago */}
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={submission.status} />
        <span
          className="text-[10px] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {ago} ago
        </span>
      </div>

      {/* Row 2: artist name */}
      <span className="truncate text-[14px] font-extrabold leading-snug tracking-[-0.01em] text-fg">
        {submission.artist}
      </span>

      {/* Row 3: price + tier left, venue · date right */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="text-[16px] font-black leading-none tracking-[-0.02em] text-fg">
            {priceLabel}
          </span>
          <span
            className="text-[10px] font-bold text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            {submission.tier}
          </span>
        </span>
        <span
          className="min-w-0 truncate text-right text-[10px] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          {submission.venue}
          {submission.date && ` · ${formatDate(submission.date)}`}
        </span>
      </div>

      {/* Row 4: confirms count */}
      {confirms > 0 && (
        <span className="text-[11px] text-fg-subtle">
          {confirms} other {confirms === 1 ? 'fan' : 'fans'} confirmed.
        </span>
      )}

      {/* Row 5: cred / disputed */}
      {submission.status === 'confirmed' && (
        <span
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
        >
          +1 cred
        </span>
      )}
      {submission.status === 'disputed' && (
        <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
          Someone disputed this. Tap to see what they saw.
        </span>
      )}
    </Link>
  )
}
