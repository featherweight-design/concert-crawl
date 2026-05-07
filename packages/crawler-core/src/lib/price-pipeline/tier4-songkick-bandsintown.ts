import type { PipelineContext, PriceTierResult } from './types.js'

const DENVER_SK_LOCATION_ID = '37551'

async function fetchSongkick(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const apiKey = process.env['SONGKICK_API_KEY']
  if (!apiKey) return null

  const url = new URL('https://api.songkick.com/api/3.0/events.json')
  url.searchParams.set('artists', ctx.artist)
  url.searchParams.set('location', `sk:${DENVER_SK_LOCATION_ID}`)
  url.searchParams.set('min_date', ctx.date)
  url.searchParams.set('max_date', ctx.date)
  url.searchParams.set('apikey', apiKey)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    resultsPage?: {
      results?: {
        event?: Array<{
          performance?: unknown[]
          start?: { date: string }
        }>
      }
    }
  }

  const skEvent = data.resultsPage?.results?.event?.[0]
  if (!skEvent) return null

  return null
}

async function fetchBandsintown(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const appId = process.env['BANDSINTOWN_APP_ID']
  if (!appId) return null

  const artist = encodeURIComponent(ctx.artist)
  const url = `https://rest.bandsintown.com/artists/${artist}/events?app_id=${appId}&date=${ctx.date}`

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const events = (await res.json()) as Array<{
    datetime?: string
    offers?: Array<{ type?: string; url?: string; status?: string }>
  }>

  const match = events.find((e) => e.datetime?.startsWith(ctx.date))
  if (!match) return null

  return null
}

export async function tier4SongkickBandsintown(ctx: PipelineContext): Promise<{
  songkick: PriceTierResult | null
  bandsintown: PriceTierResult | null
}> {
  const [sk, bat] = await Promise.allSettled([
    fetchSongkick(ctx),
    fetchBandsintown(ctx),
  ])
  return {
    songkick: sk.status === 'fulfilled' ? sk.value : null,
    bandsintown: bat.status === 'fulfilled' ? bat.value : null,
  }
}
