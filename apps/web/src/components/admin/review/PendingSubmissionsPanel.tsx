'use client'

import {
  Panel,
  StatusBadge,
  AdminButton,
  RelTime,
} from '@/components/admin/primitives'

interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  source: string | null
  note: string | null
  status: string
  createdAt: string
}

interface PendingSubmissionsPanelProps {
  submissions: PriceSubmission[]
  onApprove: (id: string) => void
  onDeny: (id: string) => void
}

export const PendingSubmissionsPanel = ({
  submissions,
  onApprove,
  onDeny,
}: PendingSubmissionsPanelProps) => {
  const countBadge = (
    <StatusBadge kind="signal">{submissions.length}</StatusBadge>
  )

  return (
    <Panel title="Community price submissions" action={countBadge} padding={0}>
      {submissions.length === 0 ? (
        <div
          style={{
            padding: 16,
            color: 'var(--fg-muted)',
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          No pending submissions
        </div>
      ) : (
        <div>
          {submissions.map((sub) => {
            const priceDisplay = sub.priceMin
              ? `$${sub.priceMin}${sub.priceMax ? `–$${sub.priceMax}` : ''}`
              : '—'

            return (
              <div
                key={sub.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: 14,
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                {/* Col 1: event ID + note */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sub.eventId}
                  </div>
                  {sub.note && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        fontStyle: 'italic',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sub.note}
                    </div>
                  )}
                </div>

                {/* Col 2: price range */}
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--fg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {priceDisplay}
                </div>

                {/* Col 3: relative time */}
                <div style={{ fontSize: 12 }}>
                  <RelTime iso={sub.createdAt} />
                </div>

                {/* Col 4: actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeny(sub.id)}
                  >
                    Deny
                  </AdminButton>
                  <AdminButton
                    variant="success"
                    size="sm"
                    onClick={() => onApprove(sub.id)}
                  >
                    Approve
                  </AdminButton>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
