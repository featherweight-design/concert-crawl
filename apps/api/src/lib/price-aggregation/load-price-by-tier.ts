import { db, priceSubmissions } from '@concert-crawl/db'
import { and, eq, inArray } from 'drizzle-orm'
import type { TierPriceBlock } from '@concert-crawl/types'
import { buildPriceByTierMap } from './build-price-by-tier.js'

/**
 * The single query behind every list surface that shows a price.
 *
 * Every caller that needs "the price for these events" goes through here so
 * the selection rule lives in exactly one place. See #1365 for what happened
 * when it didn't.
 */
export async function loadPriceByTierByEventId(
  eventIds: string[],
): Promise<Map<string, TierPriceBlock[]>> {
  if (eventIds.length === 0) return new Map()

  const rows = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      tier: priceSubmissions.tier,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      vendor: priceSubmissions.vendor,
      sourceCategory: priceSubmissions.sourceCategory,
      howFound: priceSubmissions.howFound,
      userId: priceSubmissions.userId,
      createdAt: priceSubmissions.createdAt,
      updatedAt: priceSubmissions.updatedAt,
      lastSeenAt: priceSubmissions.lastSeenAt,
      corroborationCount: priceSubmissions.corroborationCount,
    })
    .from(priceSubmissions)
    .where(
      and(
        inArray(priceSubmissions.eventId, eventIds),
        eq(priceSubmissions.status, 'corroborated'),
      ),
    )

  return buildPriceByTierMap(rows)
}
