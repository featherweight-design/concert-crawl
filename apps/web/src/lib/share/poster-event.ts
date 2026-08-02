import type { EventDetailResponse } from '@concert-crawl/types'
import {
  formatEventDate,
  formatShowTime,
} from '@/components/consumer/definitions/lib'
import { DEFAULT_POSTER_STATE, type PosterState } from '@/lib/share/taglines'

/**
 * Everything the poster draws, and nothing else.
 *
 * Deliberately NOT `EventDetailResponse`. The renderer runs inside an edge
 * route and inside `ImageResponse`, where a wide object of nullable API fields
 * is a liability: every optional field is a branch that only shows up as a
 * blank patch on a PNG. Mapping once, here, means the card component is total
 * over its own input and every fixture in the tests is a real card.
 */
export interface PosterEvent {
  id: string
  artist: string
  venue: string
  city: string
  /** Uppercase short date, e.g. `FRI, MAR 14`. */
  dateShort: string
  /** Localised show time, or `null` when the venue never published one. */
  showTime: string | null
  state: PosterState
  /** `↓ $12` for a price drop; `null` for every other state. */
  dropLabel: string | null
}

const parseAmount = (raw: string | null | undefined): number | null => {
  if (raw === null || raw === undefined) return null
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * Which of the three tagline states this event is in.
 *
 * Sold out wins over a price drop: a share of a gone show that reads "price
 * dropped" is actively misleading. Everything else is `going`, which is also
 * the tagline bank's fallback.
 */
export const posterStateFor = (event: {
  priceStatus?: 'live' | 'soldout' | null
  ticketPriceMin?: string | null
  ticketPriceOpenedAt?: number | null
}): PosterState => {
  if (event.priceStatus === 'soldout') return 'soldout'
  const current = parseAmount(event.ticketPriceMin)
  const opened = event.ticketPriceOpenedAt ?? null
  if (current !== null && opened !== null && current < opened) return 'drop'
  return DEFAULT_POSTER_STATE
}

/**
 * The `↓ $XX` the state pill carries in the drop state (handoff README §1).
 * Null for every other state, so the pill renders label-only.
 */
export const posterDropLabel = (event: {
  ticketPriceMin?: string | null
  ticketPriceOpenedAt?: number | null
}): string | null => {
  const current = parseAmount(event.ticketPriceMin)
  const opened = event.ticketPriceOpenedAt ?? null
  if (current === null || opened === null || current >= opened) return null
  return `↓ $${Math.round(opened - current)}`
}

/** Uppercase because the poster's mono date stamp is set in caps. */
const shortDate = (date: string, timezone: string): string =>
  formatEventDate(date, timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase()

/**
 * The minimum an event has to be for a poster to be drawn from it.
 *
 * Structural rather than `EventDetailResponse` so a caller — or a test — is
 * not obliged to supply forty fields the poster never reads. Any real
 * `EventDetailResponse` satisfies it, which the assertion below enforces at
 * compile time, so the two cannot drift apart unnoticed.
 */
export interface PosterSource {
  id: string
  artist: string
  date: string
  showTime: string | null
  venue: { name: string; city: string; timezone: string }
  priceStatus?: 'live' | 'soldout' | null
  ticketPriceMin?: string | null
  ticketPriceOpenedAt?: number | null
}

// Compile-time proof that the API's event still fits the poster's input. If a
// field is renamed upstream this line fails, rather than a region of the PNG
// silently going blank.
const _assertApiEventIsPosterSource: (
  event: EventDetailResponse,
) => PosterSource = (event) => event

void _assertApiEventIsPosterSource

/**
 * Map one event onto the poster's own model — the single place the two shapes
 * meet.
 */
export const toPosterEvent = (event: PosterSource): PosterEvent => ({
  id: event.id,
  artist: event.artist,
  venue: event.venue.name,
  city: event.venue.city,
  dateShort: shortDate(event.date, event.venue.timezone),
  showTime: formatShowTime(event.showTime),
  state: posterStateFor(event),
  dropLabel: posterDropLabel(event),
})
