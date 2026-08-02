import React from 'react'

import { formatEventDate } from '../definitions/lib'

interface DateStampProps {
  iso: string
  /** Cancelled and postponed nights render dimmed. */
  dim?: boolean
}

/**
 * `YYYY-MM-DD` split into its display parts. Routed through `formatEventDate`
 * so the date a viewer sees is anchored to the venue's zone rather than their
 * own — a bespoke local parse here would drift for anyone outside Mountain.
 */
export const fmtDate = (
  iso: string,
): { dow: string; mon: string; day: string } => ({
  dow: formatEventDate(iso, undefined, { weekday: 'short' }).toUpperCase(),
  mon: formatEventDate(iso, undefined, { month: 'short' }).toUpperCase(),
  day: formatEventDate(iso, undefined, { day: 'numeric' }),
})

export const DateStamp = ({ iso, dim = false }: DateStampProps) => {
  const { dow, mon, day } = fmtDate(iso)
  const label = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--fg-subtle)',
  }
  return (
    <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
      <div style={label}>{dow}</div>
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 19,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: dim ? 'var(--fg-muted)' : 'var(--fg)',
        }}
      >
        {day}
      </div>
      <div style={label}>{mon}</div>
    </div>
  )
}
