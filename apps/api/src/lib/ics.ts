// RFC 5545 calendar export for Concert History (#70).
//
// Point-in-time download, deliberately not a subscribable feed: a subscribe URL
// needs an unguessable long-lived token that calendar clients log and sync
// unauthenticated, which is a whole new auth surface for a keepsake feature.

import type { HistoryShow } from '@concert-crawl/types'

const MT_TIME_ZONE = 'America/Denver'
const CRLF = '\r\n'

/**
 * Escape a TEXT value per RFC 5545 §3.3.11. Backslash goes first, otherwise it
 * would double-escape the backslashes introduced by the later replacements.
 */
export const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')

/**
 * Fold a content line to 75 octets per RFC 5545 §3.1, continuing with a single
 * leading space. Folding counts UTF-8 octets, not characters, and a multi-byte
 * character must never be split across the fold.
 */
export const foldIcsLine = (line: string): string => {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const chunks: string[] = []
  let current = ''
  let currentBytes = 0
  // First line gets 75 octets; continuations get 74, since the leading space
  // they are prefixed with counts toward the limit.
  let limit = 75

  for (const char of line) {
    const charBytes = encoder.encode(char).length
    if (currentBytes + charBytes > limit) {
      chunks.push(current)
      current = ''
      currentBytes = 0
      limit = 74
    }
    current += char
    currentBytes += charBytes
  }
  if (current) chunks.push(current)

  return chunks.join(`${CRLF} `)
}

const icsDate = (date: string): string => date.replace(/-/g, '')

/**
 * DTSTART for a timed show. HistoryShow.showTime is already formatted for
 * display ("8:00 PM"), so it is parsed back to a 24-hour local wall time and
 * emitted with TZID rather than as a UTC instant.
 */
const localDateTime = (date: string, showTime: string): string | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(showTime.trim())
  if (!match) return null

  const meridiem = match[3]?.toUpperCase()
  let hour = Number(match[1])
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0

  return `${icsDate(date)}T${String(hour).padStart(2, '0')}${match[2]}00`
}

const describe = (show: HistoryShow): string | null => {
  const parts: string[] = []
  if (show.neighborhood) parts.push(show.neighborhood)
  if (show.priceFinal !== null) parts.push(`$${show.priceFinal}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** RFC 5545 UTC date-time (`YYYYMMDDTHHMMSSZ`) for DTSTAMP. */
const icsTimestamp = (at: Date): string =>
  `${at.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`

export const buildHistoryIcs = (
  shows: HistoryShow[],
  now: Date = new Date(),
): string => {
  // DTSTAMP is when this VEVENT was generated, not when the show happened —
  // deriving it from the show date makes clients treat entries as stale and
  // skip updates on re-import.
  const dtstamp = icsTimestamp(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Concert Crawl//Concert History//EN',
    'CALSCALE:GREGORIAN',
  ]

  for (const show of shows) {
    const timed = show.showTime ? localDateTime(show.date, show.showTime) : null

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${show.eventId}@concertcrawl.app`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(
      timed
        ? `DTSTART;TZID=${MT_TIME_ZONE}:${timed}`
        : `DTSTART;VALUE=DATE:${icsDate(show.date)}`,
    )
    lines.push(`SUMMARY:${escapeIcsText(show.artist)}`)
    lines.push(`LOCATION:${escapeIcsText(show.venueName)}`)
    const description = describe(show)
    if (description) {
      lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return `${lines.map(foldIcsLine).join(CRLF)}${CRLF}`
}
