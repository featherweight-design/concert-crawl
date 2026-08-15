import { SLOT_RADIUS } from '../definitions/constants'
import type { SlotScale, SlotSource } from '../definitions/types'

/**
 * `scale` is IdentityArt's detail-density knob, not a size label, so it is
 * derived from the rendered size rather than from the component drawing it.
 * A slot that fills its parent cannot know its size, so it takes the middle.
 */
export const slotScaleFor = (size: number | '100%'): SlotScale => {
  if (size === '100%') return 'tile'
  if (size >= 112) return 'hero'
  if (size >= 64) return 'tile'
  return 'micro'
}

export const slotRadiusFor = (size: number | '100%'): number =>
  size !== '100%' && size <= 64 ? SLOT_RADIUS.row : SLOT_RADIUS.panel

/**
 * The chain flattened into `EventImage`'s two slots. Event surfaces resolve
 * artwork then portrait; artist surfaces have only the portrait to offer.
 */
export const slotSources = (
  source: SlotSource,
): { primary: string | null; secondary: string | null } =>
  source.surface === 'event'
    ? { primary: source.artworkUrl, secondary: source.photoUrl }
    : { primary: source.photoUrl, secondary: null }
