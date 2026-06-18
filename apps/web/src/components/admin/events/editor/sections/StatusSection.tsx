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
  date: string
}

export interface StatusSectionProps {
  event: StatusSectionEvent
  editedStatus?: LifecycleStatus
  editedVerified?: boolean
  editedDate?: string
  onStatusChange?: (next: LifecycleStatus) => void
  onVerifiedChange?: (next: boolean) => void
  onDateChange?: (next: string) => void
}

const LIFECYCLE_OPTIONS: ReadonlyArray<{
  key: LifecycleStatus
  label: string
}> = [
  { key: 'upcoming', label: ADMIN_COPY.editor.status.upcoming },
  { key: 'postponed', label: ADMIN_COPY.editor.status.postponed },
  { key: 'cancelled', label: ADMIN_COPY.editor.status.cancelled },
]

const LifecycleSegmented = ({
  value,
  onChange,
}: {
  value: LifecycleStatus
  onChange: (next: LifecycleStatus) => void
}) => (
  <div
    role="group"
    aria-label={ADMIN_COPY.editor.fields.lifecycleLabel}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: 3,
      gap: 2,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 9,
      height: 32,
    }}
  >
    {LIFECYCLE_OPTIONS.map(({ key, label }) => {
      const active = value === key
      return (
        <button
          key={key}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(key)}
          style={{
            border: 'none',
            cursor: 'pointer',
            padding: '0 12px',
            borderRadius: 6,
            height: 24,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            fontWeight: active ? 700 : 500,
            color: active ? 'var(--fg)' : 'var(--fg-muted)',
            background: active ? 'var(--bg-elevated)' : 'transparent',
            boxShadow: active
              ? '0 1px 2px rgba(0,0,0,0.10), 0 0 0 1px var(--border)'
              : 'none',
          }}
        >
          {label}
        </button>
      )
    })}
  </div>
)

export const StatusSection = ({
  event,
  editedStatus,
  editedVerified,
  editedDate,
  onStatusChange,
  onVerifiedChange,
  onDateChange,
}: StatusSectionProps) => {
  const { sections, fields, status, upcomingHint, statusControls } =
    ADMIN_COPY.editor
  const editable = Boolean(onStatusChange && onVerifiedChange && onDateChange)
  const currentStatus = editedStatus ?? event.status
  const currentVerified = editedVerified ?? event.verified
  const currentDate = editedDate ?? event.date
  const isUpcoming = currentStatus === 'upcoming'
  const isPostponed = currentStatus === 'postponed'
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
            {editable && onStatusChange ? (
              <LifecycleSegmented
                value={currentStatus}
                onChange={onStatusChange}
              />
            ) : (
              <LifecycleBadge status={currentStatus} />
            )}
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
        {editable && isPostponed && onDateChange && (
          <div>
            <EditLabel>{statusControls.newDateLabel}</EditLabel>
            <input
              type="date"
              value={currentDate}
              onChange={(evt) => onDateChange(evt.target.value)}
              aria-label={statusControls.newDateLabel}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-1)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'var(--fg)',
              }}
            />
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: 'var(--fg-subtle)',
              }}
            >
              {statusControls.newDateHint}
            </div>
          </div>
        )}
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
            {editable && onVerifiedChange ? (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={currentVerified}
                  onChange={(evt) => onVerifiedChange(evt.target.checked)}
                />
                {statusControls.verifyToggleLabel}
              </label>
            ) : (
              <VerifyMark verified={currentVerified} />
            )}
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
