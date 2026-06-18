'use client'

import { type ComponentProps } from 'react'
import { EventFlagsSection } from '../EventFlagsSection'

export type EventFlagsTabContentProps = ComponentProps<typeof EventFlagsSection>

export const EventFlagsTabContent = (props: EventFlagsTabContentProps) => (
  <EventFlagsSection {...props} />
)
