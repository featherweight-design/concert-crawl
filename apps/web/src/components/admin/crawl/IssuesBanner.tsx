'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ChevronRight } from 'lucide-react'

interface IssueVenue {
  venueId: string
  venueName: string
  status: string
  consecutiveFailures: number
  blockedAt: string | null
}

interface Props {
  blockedVenues: IssueVenue[]
}

export function IssuesBanner({ blockedVenues }: Props) {
  const router = useRouter()

  if (blockedVenues.length === 0) return null

  const blocked = blockedVenues.filter((row) => row.status === 'blocked')
  const failed = blockedVenues.filter((row) => row.status === 'failed')
  const paused = blockedVenues.filter((row) => row.status === 'paused')

  const parts: string[] = []
  if (blocked.length > 0)
    parts.push(
      `${blocked.length} venue${blocked.length > 1 ? 's' : ''} blocked`,
    )
  if (failed.length > 0)
    parts.push(`${failed.length} venue${failed.length > 1 ? 's' : ''} failed`)
  if (paused.length > 0)
    parts.push(`${paused.length} venue${paused.length > 1 ? 's' : ''} paused`)

  const headline = parts.join(' · ')

  function jumpToIssues() {
    const firstVenue = blockedVenues[0]
    if (!firstVenue) return
    router.push(`?venueId=${firstVenue.venueId}`)
  }

  const venueDescriptions = blockedVenues.map((venue) => {
    const detail =
      venue.status === 'blocked'
        ? `${venue.consecutiveFailures}× consecutive ${venue.blockedAt ? '403' : 'failure'}`
        : venue.status === 'paused'
          ? 'disallowed'
          : venue.consecutiveFailures > 0
            ? `${venue.consecutiveFailures}×`
            : null
    return detail ? `${venue.venueName} (${detail})` : venue.venueName
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'color-mix(in oklab, var(--warning) 12%, var(--bg-elevated))',
          border:
            '1px solid color-mix(in oklab, var(--warning) 28%, transparent)',
        }}
        aria-hidden
      >
        <AlertCircle size={15} color="var(--warning)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--fg)',
          }}
        >
          {headline}
        </div>
        <div
          style={{
            marginTop: 2,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: 'var(--fg-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {venueDescriptions.join(' · ')}
        </div>
      </div>

      <button
        onClick={jumpToIssues}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--fg-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          whiteSpace: 'nowrap',
        }}
      >
        Jump to issues
        <ChevronRight size={13} />
      </button>
    </div>
  )
}
