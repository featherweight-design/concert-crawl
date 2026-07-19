'use client'

// Post-first-watch Spotify connect nudge card (#763 PR 5, connect-flow.jsx
// FirstWatchNudge mock). Rendered by FirstWatchNudgeGate as a fixed card
// (the gate lives at the layout level, so the mock's inline placement isn't
// available); fires once ever — the gate marks it seen when displayed.

import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from './definitions/copy'
import { SignalButton, TextButton } from './SpotifyButtons'

const COPY = SPOTIFY_COPY.firstWatchNudge

interface FirstWatchNudgeProps {
  onConnect: () => void
  onDismiss: () => void
}

export const FirstWatchNudge = ({
  onConnect,
  onDismiss,
}: FirstWatchNudgeProps) => (
  <div
    role="complementary"
    aria-label={COPY.ariaLabel}
    data-testid="first-watch-nudge"
    className="fixed inset-x-4 bottom-[72px] z-[70] mx-auto max-w-[420px] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]"
  >
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--signal) 9%, var(--surface-1)), var(--surface-1))',
        border:
          '1px solid color-mix(in oklch, var(--signal) 26%, var(--border))',
        boxShadow:
          '0 12px 40px color-mix(in oklch, var(--bg) 60%, transparent)',
      }}
    >
      <button
        type="button"
        aria-label={COPY.dismissAria}
        onClick={onDismiss}
        className="absolute right-3 top-3 cursor-pointer rounded p-1 text-[16px] leading-none text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        ✕
      </button>
      <div className="mb-2.5 flex items-center gap-2">
        <SpotifyLogo size={26} />
        <span
          className="text-[9px] font-bold uppercase tracking-[0.14em] text-signal"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {COPY.eyebrow}
        </span>
      </div>
      <h2 className="text-[17px] font-extrabold leading-[1.2] tracking-[-0.02em] text-fg">
        {COPY.title}
      </h2>
      <p className="mb-3.5 mt-1.5 text-[13px] leading-[1.4] text-fg-muted">
        {COPY.body}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SignalButton size="sm" withLogo onClick={onConnect}>
            {COPY.primaryCta}
          </SignalButton>
        </div>
        <TextButton size="sm" onClick={onDismiss}>
          {COPY.secondaryCta}
        </TextButton>
      </div>
    </div>
  </div>
)
