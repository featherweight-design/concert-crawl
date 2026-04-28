import { createHash } from 'crypto'

export function hashPage(html: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  return createHash('sha256').update(stripped).digest('hex')
}

export function hashEvent(fields: {
  title: string
  artist: string
  date: string
  doorsTime?: string | null
  showTime?: string | null
}): string {
  const str = [
    fields.title,
    fields.artist,
    fields.date,
    fields.doorsTime ?? '',
    fields.showTime ?? '',
  ].join('|')
  return createHash('sha256').update(str).digest('hex')
}
