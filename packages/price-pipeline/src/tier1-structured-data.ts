import { jitter } from '@concert-crawl/crawler-core/jitter'
import {
  checkRobots,
  getCrawlDelayMs,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots'
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'

import { PriceFetchDeferredError } from './types.js'
import type { PipelineContext, PriceTierResult } from './types.js'

// Our own floor between requests, the same 3 seconds `fetchPage` uses.
const PRICE_FETCH_DELAY_MS = 3000

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

  // The same robots.txt gate and pacing as every crawler request: the price
  // URL is a venue page, and the pipeline asks for it once per unpriced event.
  const robots = await checkRobots(ctx.priceUrl, CRAWLER_USER_AGENT)
  if (robots.status === 'unreachable') {
    // Not a verdict on this event: try again next run instead of giving up.
    throw new PriceFetchDeferredError(
      `robots.txt unreachable for ${ctx.priceUrl} (${robots.reason})`,
    )
  }
  if (robots.status !== 'allowed') return null
  const delayMs = resolveCrawlDelayMs(
    PRICE_FETCH_DELAY_MS,
    await getCrawlDelayMs(ctx.priceUrl, CRAWLER_USER_AGENT),
    { venueId: ctx.venueId, url: ctx.priceUrl },
  )
  if (delayMs === null) return null
  await new Promise((resolve) => setTimeout(resolve, jitter(delayMs)))

  let res: Response
  try {
    res = await fetch(ctx.priceUrl, {
      headers: { 'User-Agent': CRAWLER_USER_AGENT },
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
