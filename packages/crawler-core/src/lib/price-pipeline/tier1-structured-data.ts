import type { PipelineContext, PriceTierResult } from './types.js'

const CRAWLER_UA = 'ConcertCrawl/1.0 (+https://concertcrawl.com/bot)'
const JSON_LD_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

function extractOfferPrice(
  data: unknown,
): { min: number; max: number | null } | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  const offers = obj['offers'] as Record<string, unknown> | undefined
  if (offers) {
    const min = parseFloat(String(offers['lowPrice'] ?? offers['price'] ?? ''))
    if (!isNaN(min)) {
      const rawMax = offers['highPrice']
      const max = rawMax ? parseFloat(String(rawMax)) : null
      return { min, max: max && !isNaN(max) ? max : null }
    }
  }

  const graph = obj['@graph']
  if (Array.isArray(graph)) {
    for (const node of graph) {
      const result = extractOfferPrice(node)
      if (result) return result
    }
  }

  return null
}

export async function tier1StructuredData(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  if (!ctx.priceUrl) return null

  let res: Response
  try {
    res = await fetch(ctx.priceUrl, {
      headers: { 'User-Agent': CRAWLER_UA },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null
  const html = await res.text()

  for (const match of html.matchAll(JSON_LD_RE)) {
    try {
      const data: unknown = JSON.parse(match[1] ?? '')
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        const price = extractOfferPrice(item)
        if (price) {
          return {
            priceMin: price.min,
            priceMax: price.max,
            source: 'structured_data',
          }
        }
      }
    } catch {
      continue
    }
  }

  return null
}
