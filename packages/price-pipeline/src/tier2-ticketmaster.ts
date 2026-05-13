import type { PipelineContext, PriceTierResult } from './types.js'

const TM_EVENT_ID_RE = /ticketmaster\.com\/.*\/event\/([A-Z0-9]+)/i

function extractTmEventId(ticketUrl: string | null | undefined): string | null {
  if (!ticketUrl) return null
  const match = TM_EVENT_ID_RE.exec(ticketUrl)
  return match?.[1] ?? null
}

function buildMtDateWindow(date: string): {
  startDateTime: string
  endDateTime: string
} {
  // Uses a fixed MST offset (UTC-7). During MDT (UTC-6, ~Mar–Nov) the window
  // starts at 1 AM local instead of midnight, missing the 12–1 AM hour. In
  // practice Denver venues don't have shows in that window, so the approximation
  // is acceptable without adding a DST-aware timezone library.
  const parts = date.split('-').map(Number)
  const year = parts[0]!
  const month = parts[1]!
  const day = parts[2]!
  const start = new Date(Date.UTC(year, month - 1, day, 7, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day + 1, 6, 59, 59))
  return {
    startDateTime: start.toISOString().replace('.000Z', 'Z'),
    endDateTime: end.toISOString().replace('.000Z', 'Z'),
  }
}

async function lookupById(
  eventId: string,
  apiKey: string,
): Promise<PriceTierResult | null> {
  const url = new URL(
    `https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(eventId)}`,
  )
  url.searchParams.set('apikey', apiKey)
  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }
  if (!res.ok) return null

  const data = (await res.json()) as {
    priceRanges?: Array<{ min: number; max?: number }>
  }
  const range = data.priceRanges?.find((pr) => pr.min != null)
  if (!range) return null

  return {
    priceMin: range.min,
    priceMax: range.max ?? null,
    source: 'ticketmaster',
  }
}

async function lookupByKeyword(
  ctx: PipelineContext,
  apiKey: string,
): Promise<PriceTierResult | null> {
  const { startDateTime, endDateTime } = buildMtDateWindow(ctx.date)
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
  url.searchParams.set('keyword', ctx.artist)
  url.searchParams.set('city', 'Denver')
  url.searchParams.set('startDateTime', startDateTime)
  url.searchParams.set('endDateTime', endDateTime)
  url.searchParams.set('apikey', apiKey)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }
  if (!res.ok) return null

  const data = (await res.json()) as {
    _embedded?: {
      events?: Array<{ priceRanges?: Array<{ min: number; max?: number }> }>
    }
  }

  const tmEvent = data._embedded?.events?.find(
    (ev) => ev.priceRanges && ev.priceRanges.length > 0,
  )
  if (!tmEvent) return null

  const range = tmEvent.priceRanges![0]!
  return {
    priceMin: range.min,
    priceMax: range.max ?? null,
    source: 'ticketmaster',
  }
}

export async function tier2Ticketmaster(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const apiKey = process.env['TICKETMASTER_API_KEY']
  if (!apiKey) return null

  const tmEventId = extractTmEventId(ctx.ticketUrl)
  if (tmEventId) {
    return lookupById(tmEventId, apiKey)
  }

  return lookupByKeyword(ctx, apiKey)
}
