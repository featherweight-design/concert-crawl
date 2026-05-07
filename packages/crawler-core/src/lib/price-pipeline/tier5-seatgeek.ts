import type { PipelineContext, PriceTierResult } from './types.js'

export async function tier5SeatGeek(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const clientId = process.env['SEATGEEK_CLIENT_ID']
  const clientSecret = process.env['SEATGEEK_CLIENT_SECRET']
  if (!clientId || !clientSecret) return null

  const url = new URL('https://api.seatgeek.com/2/events')
  url.searchParams.set('q', ctx.artist)
  url.searchParams.set('venue.city', 'Denver')
  url.searchParams.set('datetime_local.gte', `${ctx.date}T00:00:00`)
  url.searchParams.set('datetime_local.lte', `${ctx.date}T23:59:59`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    events?: Array<{
      stats?: { lowest_price: number | null; highest_price: number | null }
    }>
  }

  const sgEvent = data.events?.find((e) => e.stats?.lowest_price != null)
  if (!sgEvent?.stats?.lowest_price) return null

  return {
    priceMin: sgEvent.stats.lowest_price,
    priceMax: sgEvent.stats.highest_price ?? null,
    source: 'seatgeek',
  }
}
