'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EditField } from '../EditField'
import { EditSection } from '../EditSection'

export interface IdentitySectionEvent {
  title: string
  artist: string | null
  venueName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
}

export interface IdentitySectionProps {
  event: IdentitySectionEvent
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

export const IdentitySection = ({ event }: IdentitySectionProps) => {
  const { sections, fields } = ADMIN_COPY.editor
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
