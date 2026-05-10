'use client'

import { useRouter } from 'next/navigation'

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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(184,56,26,0.08)',
        border: '1px solid rgba(184,56,26,0.25)',
      }}
    >
      <span
        style={{ color: 'var(--danger)', fontSize: 14, flexShrink: 0 }}
        aria-hidden
      >
        ⚠
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
          {headline}
        </span>
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: '4px 10px',
          }}
        >
          {blockedVenues.map((venue) => (
            <span
              key={venue.venueId}
              style={{ fontSize: 12, color: 'var(--fg-muted)' }}
            >
              {venue.venueName}
              {venue.consecutiveFailures > 0 && (
                <span style={{ color: 'var(--fg-subtle)' }}>
                  {' '}
                  ({venue.consecutiveFailures}×)
                </span>
              )}
              {venue.status === 'blocked' && venue.blockedAt && (
                <span style={{ color: 'var(--fg-subtle)' }}>
                  {' '}
                  · HTTP blocked
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={jumpToIssues}
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--danger)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          whiteSpace: 'nowrap' as const,
        }}
      >
        Jump to issues ›
      </button>
    </div>
  )
}
