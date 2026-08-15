import { identityFor } from '../../identity-art/IdentityArt'
import type { SlotSource } from '../definitions/types'
import { slotSources } from './slot-metrics'

/**
 * The ink the band's type sits on. Generated art hands us its own palette, so
 * the field can be drawn from the same colour as the panel beside it. A
 * photograph cannot be sampled client-side — there is no proxy and no CDN —
 * so it falls back to tokens and lets the panel carry the colour on its own.
 *
 * This is the single non-token colour in the imagery handoff (#1525 §2.4).
 */
export const bandField = (name: string, source: SlotSource): string => {
  const { primary, secondary } = slotSources(source)
  const generated = !primary && !secondary
  if (!generated) {
    return 'linear-gradient(120deg, color-mix(in oklch, var(--surface-2) 92%, transparent) 0%, var(--bg) 66%)'
  }
  const { palette } = identityFor(name, 'artist', { scale: 'hero' })
  return `linear-gradient(120deg, color-mix(in srgb, ${palette.primary} 26%, var(--bg)) 0%, var(--bg) 62%)`
}
