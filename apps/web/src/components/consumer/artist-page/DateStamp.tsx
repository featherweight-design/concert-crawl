import React from 'react'

interface DateStampProps {
  iso: string
  /** Cancelled and postponed nights render dimmed. */
  dim?: boolean
}

/** `YYYY-MM-DD` split into its display parts, read at 8pm local so a DST */
/** boundary can never roll the day backwards. */
export const fmtDate = (
  iso: string,
): { dow: string; mon: string; day: string } => {
  const date = new Date(`${iso}T20:00:00`)
  return {
    dow: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    mon: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  }
}

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
