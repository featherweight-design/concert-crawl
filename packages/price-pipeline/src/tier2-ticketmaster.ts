import type { PipelineContext, PriceTierResult } from './types.js'

export async function tier2Ticketmaster(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const apiKey = process.env['TICKETMASTER_API_KEY']
  if (!apiKey) return null

  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
  url.searchParams.set('keyword', ctx.artist)
  url.searchParams.set('city', 'Denver')
  url.searchParams.set('startDateTime', `${ctx.date}T00:00:00Z`)
  url.searchParams.set('endDateTime', `${ctx.date}T23:59:59Z`)
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
    (e) => e.priceRanges && e.priceRanges.length > 0,
  )
  if (!tmEvent) return null

  const range = tmEvent.priceRanges![0]!
  return {
    priceMin: range.min,
    priceMax: range.max ?? null,
    source: 'ticketmaster',
  }
}
