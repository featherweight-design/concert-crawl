'use client'

// Connected fine, but zero of the user's artists have a Denver date yet
// (#763 PR 5, spotify-states.jsx mock). Primary flips auto-watch on so the
// first future match surfaces; secondary just browses.

import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from './definitions/copy'
import { StateBody, StateGlyphDisc } from './StateBody'
import { SignalButton, TextButton } from './SpotifyButtons'

const COPY = SPOTIFY_COPY.emptyDenverMatch

interface EmptyDenverMatchModalProps {
  open: boolean
  artistCount: number
  onWatch: () => void
  onBrowse: () => void
  onClose: () => void
}

export const EmptyDenverMatchModal = ({
  open,
  artistCount,
  onWatch,
  onBrowse,
  onClose,
}: EmptyDenverMatchModalProps) => (
  <ModalShell
    open={open}
    onClose={onClose}
    ariaLabel={COPY.ariaLabel}
    footer={
      <div className="flex flex-col gap-2.5">
        <SignalButton onClick={onWatch}>{COPY.primaryCta}</SignalButton>
        <TextButton onClick={onBrowse}>{COPY.secondaryCta}</TextButton>
      </div>
    }
  >
    <StateBody
      glyph={
        <StateGlyphDisc tone="signal">
          <SpotifyLogo size={36} />
        </StateGlyphDisc>
      }
      eyebrow={COPY.eyebrow(artistCount)}
      eyebrowTone="signal"
      title={COPY.title}
      body={COPY.body(artistCount)}
    />
  </ModalShell>
)
