import { and, desc, eq } from 'drizzle-orm'
import { db, priceSubmissions } from '@concert-crawl/db'
import type { PipelineContext, PriceTierResult } from './types.js'

export async function tier6Community(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const rows = await db
    .select({
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, ctx.eventId),
        eq(priceSubmissions.status, 'corroborated'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(20)

  if (rows.length === 0) return null

  const mins = rows.map((r) => parseFloat(r.priceMin)).filter((n) => !isNaN(n))
  const maxes = rows
    .map((r) => (r.priceMax ? parseFloat(r.priceMax) : null))
    .filter((n): n is number => n !== null && !isNaN(n))

  const median = (arr: number[]): number => {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!
  }

  if (mins.length === 0) return null

  return {
    priceMin: Math.round(median(mins) * 100) / 100,
    priceMax: maxes.length > 0 ? Math.round(median(maxes) * 100) / 100 : null,
    source: 'community',
  }
}
