import type { PipelineContext, PriceTierResult } from './types.js'

async function fetchSongkick(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const apiKey = process.env['SONGKICK_API_KEY']
  if (!apiKey) return null
  // Songkick's public API has been restricted since 2022; new key requests are paused.
  // This tier is a stub for when API access resumes.
  void ctx
  return null
}

async function fetchBandsintown(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const appId = process.env['BANDSINTOWN_APP_ID']
  if (!appId) return null
  // Bandsintown links to ticketing but does not expose raw price data.
  void ctx
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
