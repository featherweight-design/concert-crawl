'use client'

import { usePathname } from 'next/navigation'
import { FeedbackPill } from './FeedbackPill'

export function FeedbackPillGate() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return <FeedbackPill />
}
