// The band that replaces every wide full-bleed hero: a square panel, an ink
// field derived from it, and the title block as a real column beside it.
//
// The band owns the title, so the page below it starts at content — there is no
// negative margin pulling type back over an image any more (#1525).

import type { ReactNode } from 'react'
import {
  IdentityArt,
  identityFor,
} from '@/components/consumer/identity-art/IdentityArt'
import { Panel } from './Panel'
import type { SlotSource } from './definitions/types'
import { bandField } from './lib/band-field'

export type HeroBandProps = {
  /** The name the generated mark and the ink field are both keyed on. */
  name: string
  /** The title column. The band positions it; it owns its own type ramp. */
  children: ReactNode
  /** Back control, leading the row above the band. Keeps its own touch target. */
  back?: ReactNode
  /** Share and similar, trailing the same row. */
  actions?: ReactNode
} & SlotSource

/**
 * The backdrop turns the band's own mark a quarter-turn off the panel's.
 * Derived rather than fixed so it tracks whatever the generator picked for
 * this name, and offset so the two can never land on the same composition —
 * the panel drawing generated art and the backdrop drawing the identical
 * thing behind it was the failure mode this avoids.
 */
const backdropRotate = (natural: number): 0 | 1 | 2 | 3 => {
  const rotations = [0, 1, 2, 3] as const
  return rotations[(natural + 2) % 4] ?? 0
}

export const HeroBand = ({
  name,
  children,
  back,
  actions,
  ...source
}: HeroBandProps) => (
  <div
    className="relative border-b border-border px-4 pb-[18px] pt-4 sm:px-[34px] sm:pb-7 sm:pt-[26px]"
    style={{ background: bandField(name, source) }}
    data-testid="hero-band"
  >
    {/* Decorative: the band already says this name in type, and the mark
        carries no information the title doesn't. Sits under the content in
        source order so nothing needs a z-index to stay above it. */}
    <div className="hero-band-art" aria-hidden data-testid="hero-band-art">
      <IdentityArt
        name={name}
        kind="artist"
        scale="hero"
        rotateOverride={backdropRotate(
          identityFor(name, 'artist', { scale: 'hero' }).rotate,
        )}
      />
    </div>
    {/* One flow row rather than two floating chips. Positioned only so it
        stacks above the backdrop, which is the one thing in here that is
        absolutely placed. */}
    {(back || actions) && (
      <div className="relative mb-3 flex items-center justify-between sm:mb-4">
        <div className="flex gap-2">{back}</div>
        <div className="flex gap-2">{actions}</div>
      </div>
    )}
    <div className="relative flex items-start gap-3.5 sm:gap-6">
      {/* Sized in CSS rather than px because it steps at the breakpoint; the
          scale is stated so the art keeps hero density at both widths. */}
      <div className="w-32 shrink-0 sm:w-52">
        <Panel {...source} name={name} size="100%" scale="hero" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 sm:pt-1.5">{children}</div>
    </div>
  </div>
)
