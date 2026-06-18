'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { AdminButton, MonoLabel } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { LifecycleBadge, type LifecycleStatus } from './LifecycleBadge'
import { VerifyMark } from './VerifyMark'

export interface EditorHeaderEvent {
  id: string
  title: string
  venueName: string | null
  date: string
  showTime: string | null
  status: LifecycleStatus
  verified: boolean
}

export interface EditorHeaderProps {
  event: EditorHeaderEvent
  viewDetailHref?: string
}

const formatDate = (yyyyMmDd: string): string => {
  const parsed = new Date(yyyyMmDd + 'T12:00:00Z')
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
  })
}

const formatTime = (showTime: string | null): string => {
  if (!showTime) return ''
  const [hh, mm] = showTime.split(':')
  const hours = parseInt(hh ?? '0', 10)
  const minutes = mm ?? '00'
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return `${display}:${minutes} ${meridiem}`
}

export const EditorHeader = ({ event, viewDetailHref }: EditorHeaderProps) => {
  const subline = [
    event.venueName ?? '—',
    formatDate(event.date),
    formatTime(event.showTime),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            marginBottom: 7,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <MonoLabel>
            {ADMIN_COPY.editor.monoLabelPrefix} {event.id}
          </MonoLabel>
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--fg)',
            lineHeight: 1.1,
          }}
        >
          {event.title}
        </h1>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: 'var(--fg-muted)',
            }}
          >
            {subline}
          </span>
          <LifecycleBadge status={event.status} />
          <VerifyMark verified={event.verified} />
        </div>
      </div>
      {viewDetailHref && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={viewDetailHref} style={{ textDecoration: 'none' }}>
            <AdminButton variant="outline" size="sm" icon={ExternalLink}>
              {ADMIN_COPY.editor.viewDetailButton}
            </AdminButton>
          </Link>
        </div>
      )}
    </div>
  )
}
