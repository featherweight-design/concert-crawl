import type { NormalizedEvent } from '../../types.js'

const EVENT_TYPES = new Set(['Event', 'MusicEvent'])

function isEvent(obj: Record<string, unknown>): boolean {
  const type = obj['@type']
  if (typeof type === 'string') return EVENT_TYPES.has(type)
  if (Array.isArray(type))
    return type.some((t) => typeof t === 'string' && EVENT_TYPES.has(t))
  return false
}

function extractDateOnly(dateStr: string): string {
  // ISO datetime → date-only (YYYY-MM-DD)
  return dateStr.split('T')[0] ?? dateStr
}

function extractTimeOnly(dateStr: string): string | undefined {
  const parts = dateStr.split('T')
  if (parts.length < 2) return undefined
  return parts[1]?.split(/[+Z]/)[0]
}

function getArtistName(performer: unknown): string {
  if (typeof performer === 'string') return performer
  if (Array.isArray(performer) && performer.length > 0) {
    const first = performer[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && 'name' in first) {
      return String((first as Record<string, unknown>)['name'])
    }
  }
  if (performer && typeof performer === 'object' && 'name' in performer) {
    return String((performer as Record<string, unknown>)['name'])
  }
  return ''
}

function mapToNormalizedEvent(
  obj: Record<string, unknown>,
  sourceUrl: string,
): NormalizedEvent | null {
  const name = obj['name']
  const startDate = obj['startDate']

  if (typeof name !== 'string' || typeof startDate !== 'string') return null

  const artist = getArtistName(obj['performer'])
  const date = extractDateOnly(startDate)
  const showTime = extractTimeOnly(startDate)
  const doorsTime =
    typeof obj['doorTime'] === 'string'
      ? extractTimeOnly(obj['doorTime'])
      : undefined
  const ticketUrl = typeof obj['url'] === 'string' ? obj['url'] : undefined
  const description =
    typeof obj['description'] === 'string' ? obj['description'] : undefined

  const event: NormalizedEvent = {
    title: name,
    artist: artist || name,
    date,
    sourceUrl,
    confidence: 1.0,
  }
  if (doorsTime !== undefined) event.doorsTime = doorsTime
  if (showTime !== undefined) event.showTime = showTime
  if (ticketUrl !== undefined) event.ticketUrl = ticketUrl
  if (description !== undefined) event.description = description
  return event
}

function extractEventsFromParsed(
  parsed: unknown,
  sourceUrl: string,
): NormalizedEvent[] {
  const events: NormalizedEvent[] = []

  if (!parsed || typeof parsed !== 'object') return events

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      events.push(...extractEventsFromParsed(item, sourceUrl))
    }
    return events
  }

  const obj = parsed as Record<string, unknown>

  // Handle @graph
  if ('@graph' in obj && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      events.push(...extractEventsFromParsed(item, sourceUrl))
    }
    return events
  }

  if (isEvent(obj)) {
    const event = mapToNormalizedEvent(obj, sourceUrl)
    if (event) events.push(event)
  }

  return events
}

export function extractJsonLd(
  html: string,
  sourceUrl: string,
): NormalizedEvent[] {
  const events: NormalizedEvent[] = []
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]
    if (!content) continue

    try {
      const parsed: unknown = JSON.parse(content)
      events.push(...extractEventsFromParsed(parsed, sourceUrl))
    } catch {
      console.log(JSON.stringify({ event: 'json-ld.parse_error', sourceUrl }))
    }
  }

  console.log(
    JSON.stringify({
      event: 'json-ld.extracted',
      sourceUrl,
      count: events.length,
    }),
  )
  return events
}
