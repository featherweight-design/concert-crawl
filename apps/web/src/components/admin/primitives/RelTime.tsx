'use client'

import { useEffect, useState } from 'react'

interface RelTimeProps {
  iso: string
}

const toRel = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const RelTime = ({ iso }: RelTimeProps) => {
  const [label, setLabel] = useState(toRel(iso))

  useEffect(() => {
    const interval = setInterval(() => setLabel(toRel(iso)), 30_000)
    return () => clearInterval(interval)
  }, [iso])

  return (
    <time
      dateTime={iso}
      title={new Date(iso).toLocaleString()}
      style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-muted)' }}
    >
      {label}
    </time>
  )
}
