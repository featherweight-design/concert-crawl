interface Props {
  blockedVenues: Array<{ venueId: string; venueName: string; status: string }>
}

export function IssuesBanner({ blockedVenues }: Props) {
  if (blockedVenues.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(184,56,26,0.08)',
        border: '1px solid rgba(184,56,26,0.25)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
        {blockedVenues.length} venue
        {blockedVenues.length > 1 ? 's' : ''} blocked or failed
      </span>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {blockedVenues.map((venue) => venue.venueName).join(' · ')}
      </span>
    </div>
  )
}
