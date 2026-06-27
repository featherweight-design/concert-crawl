import { createHash } from 'crypto'

export function hashPage(html: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  return createHash('sha256').update(stripped).digest('hex')
}

export function hashEvent(fields: {
  title: string
  date: string
  doorsTime?: string | null
  showTime?: string | null
}): string {
  // Note: `artist` is intentionally excluded. The LLM picks artist
  // substrings differently across crawls even when the underlying listing
  // hasn't changed; including it produces false `crawl.verified_event_changed`
  // notifications (#825). The hash now covers (title, date, doorsTime,
  // showTime) — the user-visible fields that define a listing.
  const str = [
    fields.title,
    fields.date,
    fields.doorsTime ?? '',
    fields.showTime ?? '',
  ].join('|')
  return createHash('sha256').update(str).digest('hex')
}
