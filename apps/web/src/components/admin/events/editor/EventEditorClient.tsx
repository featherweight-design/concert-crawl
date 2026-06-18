'use client'

import { useEffect, useState } from 'react'
import { EditorHeader, type EditorHeaderEvent } from './EditorHeader'
import { type LifecycleStatus } from './LifecycleBadge'
import { IdentitySection } from './sections/IdentitySection'
import { PricingSection } from './sections/PricingSection'
import { ClassificationSection } from './sections/ClassificationSection'
import { StatusSection } from './sections/StatusSection'
import { ArtSection } from './sections/ArtSection'

export interface EditorEvent {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  verified: boolean
  status: LifecycleStatus
  extractionStrategy: string | null
  genre: string[] | null
  updatedAt: string | null
  venueId: string
  venueName: string | null
  isSoldOut: boolean
}

export interface EventEditorClientProps {
  event: EditorEvent
}

export const EventEditorClient = ({ event }: EventEditorClientProps) => {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const headerEvent: EditorHeaderEvent = {
    id: event.id,
    title: event.title,
    venueName: event.venueName,
    date: event.date,
    showTime: event.showTime,
    status: event.status,
    verified: event.verified,
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: isDesktop ? 920 : '100%',
      }}
    >
      <EditorHeader event={headerEvent} />
      <IdentitySection event={event} />
      <PricingSection event={event} />
      <ClassificationSection genre={event.genre} />
      <StatusSection event={event} />
      <ArtSection artist={event.artist} />
    </div>
  )
}
