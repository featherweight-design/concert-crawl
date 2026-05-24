'use client'

import { Panel, AdminButton, RelTime } from '@/components/admin/primitives'
import { Check, X } from 'lucide-react'

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
  // Optional enriched fields — populated once API JOIN is added
  eventTitle?: string | null
  venueName?: string | null
  eventDate?: string | null
  userHandle?: string | null
}

interface PendingSubmissionsPanelProps {
  submissions: PriceSubmission[]
  onApprove: (id: string) => void
  onDeny: (id: string) => void
}

function formatPrice(min: string | null, max: string | null): string {
  if (!min) return '—'
  const fmtNum = (val: string) => {
    const num = parseFloat(val)
    return Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`
  }
  return max ? `${fmtNum(min)}–${fmtNum(max)}` : fmtNum(min)
}

export const PendingSubmissionsPanel = ({
  submissions,
  onApprove,
  onDeny,
}: PendingSubmissionsPanelProps) => {
  const pendingBadge =
    submissions.length > 0 ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 9px',
          borderRadius: 20,
          border: '1.5px solid var(--warning)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--warning)',
          letterSpacing: 0,
          lineHeight: 1.4,
        }}
      >
        {submissions.length} pending
      </span>
    ) : null

  const panelTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      Community price submissions
      {pendingBadge}
    </span>
  )

  return (
    <Panel title={panelTitle} padding={0}>
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
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {submissions.map((sub) => {
            const priceDisplay = formatPrice(sub.priceMin, sub.priceMax)
            const eventLine = sub.eventTitle
              ? [sub.eventTitle, sub.venueName, sub.eventDate]
                  .filter(Boolean)
                  .join(' · ')
              : `${sub.eventId.slice(0, 8)}…`
            const handle = sub.userHandle
              ? `@${sub.userHandle}`
              : `@${sub.userId.slice(0, 10)}`

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
                {/* Col 1: event info + user + note */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {eventLine}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 3,
                      fontSize: 12,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        color: 'var(--accent)',
                        flexShrink: 0,
                      }}
                    >
                      {handle}
                    </span>
                    {sub.note && (
                      <>
                        <span style={{ color: 'var(--fg-subtle)' }}>·</span>
                        <span
                          style={{
                            color: 'var(--fg-muted)',
                            fontStyle: 'italic',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          &ldquo;{sub.note}&rdquo;
                        </span>
                      </>
                    )}
                  </div>
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
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--fg-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <RelTime iso={sub.createdAt} />
                </div>

                {/* Col 4: actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => onDeny(sub.id)}
                  >
                    Deny
                  </AdminButton>
                  <AdminButton
                    variant="success"
                    size="sm"
                    icon={Check}
                    onClick={() => onApprove(sub.id)}
                  >
                    Approve · award cred
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
