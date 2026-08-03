import type { HistoryShow } from '@concert-crawl/types'
import type { AttendedShow } from '@/lib/passport/stats'

/**
 * Concert History rows → the shape the Passport draws.
 *
 * `GET /v1/history` already selects on `attending_at IS NOT NULL`, so
 * attendance is established before a row reaches here — Watching is never a
 * proxy for it. This is only a projection: the Passport needs six of the
 * fifteen fields a history row carries, and narrowing them here is what keeps
 * the card from quietly depending on presentation fields like `dateLabel`.
 */
export const toAttendedShows = (rows: HistoryShow[]): AttendedShow[] =>
  rows.map((row) => ({
    id: row.eventId,
    artist: row.artist,
    venue: row.venueName,
    genre: row.genre,
    date: row.date,
    priceFinal: row.priceFinal,
  }))
