'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { StatusBadge } from '@/components/admin/primitives'
import { EditLabel } from '../EditLabel'
import { EditSection } from '../EditSection'
import { LifecycleBadge, type LifecycleStatus } from '../LifecycleBadge'
import { SrcTag } from '../SrcTag'
import { VerifyMark } from '../VerifyMark'

export interface StatusSectionEvent {
  status: LifecycleStatus
  isSoldOut: boolean
  verified: boolean
  confidenceScore: number | null
  extractionStrategy: string | null
}

export interface StatusSectionProps {
  event: StatusSectionEvent
}

export const StatusSection = ({ event }: StatusSectionProps) => {
  const { sections, fields, status, upcomingHint } = ADMIN_COPY.editor
  const isUpcoming = event.status === 'upcoming'
  return (
    <EditSection number={sections.statusNumber} title={sections.statusTitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            gap: 28,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <EditLabel>{fields.lifecycleLabel}</EditLabel>
            <LifecycleBadge status={event.status} />
          </div>
          <div>
            <EditLabel>{fields.availabilityLabel}</EditLabel>
            <StatusBadge
              kind={event.isSoldOut ? 'accent' : 'neutral'}
              variant="outline"
              mono
            >
              {event.isSoldOut ? status.soldOut : status.available}
            </StatusBadge>
          </div>
        </div>
        {isUpcoming && !event.isSoldOut && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-subtle)',
              lineHeight: 1.5,
            }}
          >
            {upcomingHint}
          </div>
        )}
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div>
          <EditLabel>{fields.verificationLabel}</EditLabel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <VerifyMark verified={event.verified} />
            <div
              style={{
                display: 'flex',
                gap: 18,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              <span>
                {fields.confidenceLabel}{' '}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    color: 'var(--fg)',
                  }}
                >
                  {event.confidenceScore !== null
                    ? event.confidenceScore.toFixed(2)
                    : '—'}
                </span>
              </span>
              <span
                style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
              >
                {fields.sourceLabel}{' '}
                <SrcTag source={event.extractionStrategy} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </EditSection>
  )
}
