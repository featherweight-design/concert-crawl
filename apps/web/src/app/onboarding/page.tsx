import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
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

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams
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
    />
  )
}
