'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EditField } from '../EditField'
import { EditLabel } from '../EditLabel'
import { EditSection } from '../EditSection'

export interface IdentitySectionEvent {
  title: string
  artist: string | null
  venueName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  tourName: string | null
}

export interface IdentitySectionProps {
  event: IdentitySectionEvent
  /** Draft value for the tour-name input. Omit to render read-only. */
  editedTourName?: string
  onTourNameChange?: (next: string) => void
}

const formatDate = (yyyyMmDd: string): string => {
  const parsed = new Date(yyyyMmDd + 'T12:00:00Z')
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
  })
}

const formatTime = (time: string | null): string => {
  if (!time) return ''
  const [hh, mm] = time.split(':')
  const hours = parseInt(hh ?? '0', 10)
  const minutes = mm ?? '00'
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return `${display}:${minutes} ${meridiem}`
}

export const IdentitySection = ({
  event,
  editedTourName,
  onTourNameChange,
}: IdentitySectionProps) => {
  const { sections, fields } = ADMIN_COPY.editor
  const tourNameValue = editedTourName ?? event.tourName ?? ''
  // Trims both sides so the changed dot matches the PATCH diff's own
  // normalization rather than firing on stray stored whitespace.
  const tourNameChanged =
    tourNameValue.trim() !== (event.tourName?.trim() ?? '')
  return (
    <EditSection
      number={sections.identityNumber}
      title={sections.identityTitle}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <EditField
          label={fields.title}
          value={event.title}
          placeholder={fields.titlePlaceholder}
          full
        />
        <EditField
          label={fields.artist}
          value={event.artist ?? ''}
          placeholder={fields.artistPlaceholder}
        />
        {onTourNameChange ? (
          <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <EditLabel changed={tourNameChanged}>{fields.tourName}</EditLabel>
            <input
              type="text"
              value={tourNameValue}
              maxLength={200}
              onChange={(evt) => onTourNameChange(evt.target.value)}
              placeholder={fields.tourNamePlaceholder}
              aria-label={fields.tourName}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--bg-elevated)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 9,
                padding: '10px 12px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13.5,
                fontWeight: 500,
                color: 'var(--fg)',
              }}
            />
            <div
              style={{
                marginTop: 6,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11.5,
                color: 'var(--fg-subtle)',
                lineHeight: 1.5,
              }}
            >
              {fields.tourNameHelp}
            </div>
          </div>
        ) : (
          <EditField
            label={fields.tourName}
            value={event.tourName ?? ''}
            placeholder={fields.tourNamePlaceholder}
            full
          />
        )}
        <EditField
          label={fields.venue}
          type="select"
          value={event.venueName ?? ''}
        />
        <EditField
          label={fields.date}
          type="text"
          value={formatDate(event.date)}
        />
        <EditField
          label={fields.doors}
          type="time"
          value={formatTime(event.doorsTime)}
        />
        <EditField
          label={fields.show}
          type="time"
          value={formatTime(event.showTime)}
        />
      </div>
    </EditSection>
  )
}
