import type { TierKey } from '@/components/consumer/tier-picker/definitions/types'

/** The manage sheet only exists for live paid subscriptions. */
export type PaidTier = Exclude<TierKey, 'free'>

/**
 * Which surface the manage controller is showing. 'manage' is the two-group
 * row sheet; the other three are single-screen confirmation flows.
 */
export type ManageSurface = 'manage' | 'cancel' | 'downgrade' | 'upgrade'
