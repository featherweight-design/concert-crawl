'use client'

// A sized image slot: one box, one radius, one hairline, one source chain.
// Every small artwork in the product goes through here so a 56px tile looks the
// same whether a row or a card happens to be drawing it (#1525).

import { EventImage } from '../event-image'
import { SLOT_HAIRLINE } from './definitions/constants'
import type { SlotSource } from './definitions/types'
import { slotRadiusFor, slotScaleFor, slotSources } from './lib/slot-metrics'

export type PanelProps = {
  /** The name the generated mark is keyed on when no photograph resolves. */
  name: string
  /**
   * Decorative by default: these slots sit beside the same name as text, so
   * announcing it twice is noise. Pass a string only where the slot is the
   * sole carrier of the information.
   */
  alt?: string
  /** CSS px, or `'100%'` to fill the parent's width and take `ratio`. */
  size?: number | '100%'
  ratio?: string
  radius?: number
  className?: string
} & SlotSource

export const Panel = (props: PanelProps) => {
  const {
    name,
    alt = '',
    size = 56,
    ratio = '1 / 1',
    radius,
    className,
  } = props
  const { primary, secondary } = slotSources(props)

  return (
    <span
      className={className}
      {...(alt === '' && { 'aria-hidden': true })}
      style={{
        position: 'relative',
        display: 'block',
        width: size,
        height: size === '100%' ? undefined : size,
        aspectRatio: size === '100%' ? ratio : undefined,
        flexShrink: 0,
        borderRadius: radius ?? slotRadiusFor(size),
        overflow: 'hidden',
        boxShadow: SLOT_HAIRLINE,
      }}
    >
      <EventImage
        src={primary}
        artistPhotoUrl={secondary}
        alt={alt}
        artist={name}
        identityScale={slotScaleFor(size)}
        className="h-full w-full"
      />
    </span>
  )
}
