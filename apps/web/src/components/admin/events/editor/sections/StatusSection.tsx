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

export type SoldOutMethod =
  'saw_listing' | 'venue_site' | 'bought_myself' | 'other'

export interface SoldOutProvenance {
  method: SoldOutMethod
  url: string
  note: string
}

export interface StatusSectionProps {
  event: StatusSectionEvent
  editedStatus?: LifecycleStatus
  editedVerified?: boolean
  editedDate?: string
  editedIsSoldOut?: boolean
  editedProvenance?: SoldOutProvenance
  onStatusChange?: (next: LifecycleStatus) => void
  onVerifiedChange?: (next: boolean) => void
  onDateChange?: (next: string) => void
  onSoldOutChange?: (next: boolean) => void
  onProvenanceChange?: (next: SoldOutProvenance) => void
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

const SOLD_OUT_OPTIONS: ReadonlyArray<{ key: boolean; label: string }> = [
  { key: false, label: ADMIN_COPY.editor.statusControls.available },
  { key: true, label: ADMIN_COPY.editor.statusControls.soldOut },
]

const AvailabilitySegmented = ({
  value,
  onChange,
}: {
  value: boolean
  onChange: (next: boolean) => void
}) => (
  <div
    role="group"
    aria-label={ADMIN_COPY.editor.statusControls.availabilityLabel}
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
    {SOLD_OUT_OPTIONS.map(({ key, label }) => {
      const active = value === key
      return (
        <button
          key={String(key)}
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
  editedIsSoldOut,
  editedProvenance,
  onStatusChange,
  onVerifiedChange,
  onDateChange,
  onSoldOutChange,
  onProvenanceChange,
}: StatusSectionProps) => {
  const { sections, fields, status, upcomingHint, statusControls } =
    ADMIN_COPY.editor
  const editable = Boolean(onStatusChange && onVerifiedChange && onDateChange)
  const currentStatus = editedStatus ?? event.status
  const currentVerified = editedVerified ?? event.verified
  const currentDate = editedDate ?? event.date
  const currentIsSoldOut = editedIsSoldOut ?? event.isSoldOut
  const provenanceEditable = Boolean(onSoldOutChange && onProvenanceChange)
  const showProvenanceFields =
    provenanceEditable &&
    currentIsSoldOut &&
    !event.isSoldOut &&
    editedProvenance !== undefined
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
            {provenanceEditable && onSoldOutChange ? (
              <AvailabilitySegmented
                value={currentIsSoldOut}
                onChange={onSoldOutChange}
              />
            ) : (
              <StatusBadge
                kind={currentIsSoldOut ? 'accent' : 'neutral'}
                variant="outline"
                mono
              >
                {currentIsSoldOut ? status.soldOut : status.available}
              </StatusBadge>
            )}
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
        {showProvenanceFields && editedProvenance && onProvenanceChange && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 14,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
            }}
          >
            <EditLabel>{statusControls.provenance.title}</EditLabel>
            <div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                }}
              >
                {statusControls.provenance.methodLabel}
              </span>
              <select
                value={editedProvenance.method}
                onChange={(evt) =>
                  onProvenanceChange({
                    ...editedProvenance,
                    method: evt.target.value as SoldOutMethod,
                  })
                }
                aria-label={statusControls.provenance.methodLabel}
                style={{
                  marginTop: 4,
                  display: 'block',
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 8,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elevated)',
                  fontSize: 13,
                  color: 'var(--fg)',
                }}
              >
                {(
                  Object.entries(
                    statusControls.provenance.methodOptions,
                  ) as ReadonlyArray<[SoldOutMethod, string]>
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                }}
              >
                {statusControls.provenance.urlLabel}
              </span>
              <input
                type="url"
                value={editedProvenance.url}
                onChange={(evt) =>
                  onProvenanceChange({
                    ...editedProvenance,
                    url: evt.target.value,
                  })
                }
                placeholder={statusControls.provenance.urlPlaceholder}
                aria-label={statusControls.provenance.urlLabel}
                style={{
                  marginTop: 4,
                  display: 'block',
                  width: '100%',
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 8,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elevated)',
                  fontSize: 13,
                  color: 'var(--fg)',
                }}
              />
            </div>
            <div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                }}
              >
                {statusControls.provenance.noteLabel}
              </span>
              <textarea
                value={editedProvenance.note}
                onChange={(evt) =>
                  onProvenanceChange({
                    ...editedProvenance,
                    note: evt.target.value,
                  })
                }
                placeholder={statusControls.provenance.notePlaceholder}
                aria-label={statusControls.provenance.noteLabel}
                maxLength={280}
                rows={3}
                style={{
                  marginTop: 4,
                  display: 'block',
                  width: '100%',
                  padding: 8,
                  borderRadius: 8,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elevated)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: 'var(--fg)',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}
        {isUpcoming && !currentIsSoldOut && (
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
