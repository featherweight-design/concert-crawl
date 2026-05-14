'use client'

import { usePathname } from 'next/navigation'
import { FeedbackEdgeTab } from './FeedbackEdgeTab'

export function FeedbackEdgeTabGate() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return <FeedbackEdgeTab />
}
