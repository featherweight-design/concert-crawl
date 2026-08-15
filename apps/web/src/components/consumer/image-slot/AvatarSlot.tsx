'use client'

// The one circular slot in the product: a search result's artist portrait.
// `ratio`, `radius` and `surface` are all deliberately absent. A circle is the
// whole point, and a round frame reads as a person — so an event graphic in
// one is always wrong. The slot pins its own branch rather than asking every
// caller to say the same word.

import { Panel } from './Panel'
import { SLOT_RADIUS } from './definitions/constants'

export interface AvatarSlotProps {
  name: string
  photoUrl: string | null
  alt?: string
  size?: number
  className?: string
}

export const AvatarSlot = ({ size = 40, ...rest }: AvatarSlotProps) => (
  <Panel {...rest} surface="artist" size={size} radius={SLOT_RADIUS.avatar} />
)
