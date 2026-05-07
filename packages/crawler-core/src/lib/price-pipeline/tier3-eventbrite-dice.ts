import type { PipelineContext, PriceTierResult } from './types.js'

async function fetchEventbrite(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const token = process.env['EVENTBRITE_API_TOKEN']
  if (!token) return null

  const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
  url.searchParams.set('q', ctx.artist)
  url.searchParams.set('location.address', 'Denver, CO')
  url.searchParams.set('start_date.range_start', `${ctx.date}T00:00:00Z`)
  url.searchParams.set('start_date.range_end', `${ctx.date}T23:59:59Z`)
  url.searchParams.set('expand', 'ticket_classes')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    events?: Array<{
      ticket_classes?: Array<{ cost?: { major_value: string } }>
    }>
  }

  for (const event of data.events ?? []) {
    const prices = (event.ticket_classes ?? [])
      .map((tc) => parseFloat(tc.cost?.major_value ?? ''))
      .filter((p) => !isNaN(p) && p > 0)
    if (prices.length === 0) continue
    prices.sort((a, b) => a - b)
    return {
      priceMin: prices[0]!,
      priceMax: prices.length > 1 ? prices[prices.length - 1]! : null,
      source: 'eventbrite',
    }
  }

  return null
}

async function fetchDice(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const apiKey = process.env['DICE_API_KEY']
  if (!apiKey) return null

  const url = new URL('https://api.dice.fm/v1/events')
  url.searchParams.set('query', ctx.artist)
  url.searchParams.set('country_code', 'US')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    data?: Array<{
      date: string
      venue?: { city?: string }
      price?: { face_value: number; max_price?: number }
    }>
  }

  const match = data.data?.find(
    (e) =>
      e.date?.startsWith(ctx.date) &&
      (e.venue?.city?.toLowerCase() ?? '').includes('denver') &&
      e.price?.face_value,
  )
  if (!match?.price) return null

  return {
    priceMin: match.price.face_value / 100,
    priceMax: match.price.max_price ? match.price.max_price / 100 : null,
    source: 'dice',
  }
}

export async function tier3EventbriteDice(ctx: PipelineContext): Promise<{
  eventbrite: PriceTierResult | null
  dice: PriceTierResult | null
}> {
  const [eventbrite, dice] = await Promise.allSettled([
    fetchEventbrite(ctx),
    fetchDice(ctx),
  ])
  return {
    eventbrite: eventbrite.status === 'fulfilled' ? eventbrite.value : null,
    dice: dice.status === 'fulfilled' ? dice.value : null,
  }
}
