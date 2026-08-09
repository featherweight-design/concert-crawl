import { headers } from 'next/headers'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { publicApiClient } from '@/lib/api'
import { isScaRegion } from '@/lib/sca-region'
import {
  decodeIntent,
  encodeIntent,
  PENDING_TIER_PARAM,
  sanitizeDestinationLabel,
} from '@/lib/auth/intent'
import { decodePendingTier } from '@/components/consumer/tier-picker/lib/pending-tier'

export const metadata = { title: 'Concert Crawl — Welcome' }

interface OnboardingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const firstValue = (raw: string | string[] | undefined): string | null => {
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw ?? null
}

/**
 * Bucket labels for the genres step. Public on purpose: the tour runs before a
 * token is guaranteed, and an empty list is survivable — the step says so and
 * the artists step then suggests across everything.
 */
async function fetchGenreBuckets(): Promise<string[]> {
  try {
    return await publicApiClient.get<string[]>('/v1/events/genres')
  } catch (err) {
    console.error('[onboarding] genre buckets load failed', err)
    return []
  }
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams
  const requestHeaders = await headers()
  // The tour can open TierPickerSheet on the artists step, so this has to be
  // threaded here too — a missing value is invisible until a European card
  // reaches 3D Secure.
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))
  const genres = await fetchGenreBuckets()
  // Round-tripped rather than forwarded: a malformed intent must not reach the
  // destination URL, where it would only be rejected after the redirect.
  const intent = decodeIntent(firstValue(params.intent))

  return (
    <OnboardingShell
      intent={intent ? encodeIntent(intent) : null}
      returnPath={firstValue(params.return)}
      destinationLabel={sanitizeDestinationLabel(firstValue(params.label))}
      entry={firstValue(params.entry) === 'menu' ? 'menu' : 'default'}
      pendingTier={decodePendingTier(firstValue(params[PENDING_TIER_PARAM]))}
      genres={genres}
      scaRegion={scaRegion}
    />
  )
}
