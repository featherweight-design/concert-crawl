import { TIER_ORDER } from '../definitions/constants'
import type { TierKey } from '../definitions/types'

/**
 * The tier a visitor chose before they had an account, read back off the URL on
 * the other side of sign-up (#1284).
 *
 * It arrives from a querystring the visitor can edit, so an unrecognised value
 * decodes to `null` rather than to a default — preselecting a tier nobody chose
 * is worse than preselecting none. Mirrors `decodeIntent`'s contract.
 */
export const decodePendingTier = (
  raw: string | null | undefined,
): TierKey | null => TIER_ORDER.find((key) => key === raw) ?? null
