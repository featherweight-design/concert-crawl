'use client'

// Trial-ended takeover (#780, PR 4.2) — full-bleed surface shown once,
// next session after trial_ends_at. Renders the LOCKED #781 picker inline
// (TierRowMobile accordion / TierCardDesktop grid — per the handoff dev
// note, NOT wrapped in a sheet/modal chrome). Paid-tier CTA selections
// bubble to the gate, which routes to Settings · Plan.

import { useEffect, useState } from 'react'
import { useFounderWindow } from '@/lib/queries/use-founder-window'
import { visibleTiers } from '@/components/consumer/tier-picker/lib/visible-tiers'
import { scarcityRailData } from '@/components/consumer/tier-picker/lib/scarcity'
import { TierRowMobile } from '@/components/consumer/tier-picker/TierRowMobile'
import { TierCardDesktop } from '@/components/consumer/tier-picker/TierCardDesktop'
import { FULL_BLEED_TAKEOVER_Z_INDEX } from '@/components/consumer/tier-picker/definitions/constants'
import type {
  TierCta,
  TierKey,
} from '@/components/consumer/tier-picker/definitions/types'
import { LIFECYCLE_NUDGES_COPY } from './definitions/copy'
import { TAKEOVER_DEFAULT_EXPANDED_TIER } from './definitions/constants'

const TAKEOVER_COPY = LIFECYCLE_NUDGES_COPY.takeover

interface TrialEndedTakeoverProps {
  onDismiss: () => void
  onSelectTier: (tierKey: TierKey) => void
}

export const TrialEndedTakeover = ({
  onDismiss,
  onSelectTier,
}: TrialEndedTakeoverProps) => {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  // Body scroll lock while the full-bleed surface is up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Same founder-window derivation as TierPickerSheet: until the window
  // loads, treat it as pre-launch so the Founder card renders disabled
  // rather than flashing in/out.
  const founderWindow = useFounderWindow(true)
  const windowView = founderWindow.data ?? {
    state: 'pre-launch' as const,
    seatsTotal: 100,
    closesAt: null,
  }
  const tiers = visibleTiers(windowView.state, 'free')
  const rail = scarcityRailData(windowView, new Date())

  const [expandedTier, setExpandedTier] = useState<TierKey | null>(
    TAKEOVER_DEFAULT_EXPANDED_TIER,
  )

  const selectTier = (tierKey: TierKey, cta: TierCta) => {
    // Signed-in free user: paid tiers resolve to checkout — the gate
    // routes to Settings · Plan where the real sheet handles payment.
    if (cta.action === 'checkout') onSelectTier(tierKey)
  }

  const wide = !isMobile

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={TAKEOVER_COPY.ariaLabel}
      data-testid="trial-ended-takeover"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: FULL_BLEED_TAKEOVER_Z_INDEX,
        width: '100%',
        height: '100%',
        background:
          'radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--signal) 9%, var(--bg)) 0%, var(--bg) 55%)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: wide ? '48px 40px' : '70px 18px 26px',
        overflow: 'auto',
      }}
    >
      {/* Dismiss X — explicit reset instead of the design's all:unset so
          UA focus styles survive (codebase a11y convention). */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={TAKEOVER_COPY.dismissAria}
        style={{
          cursor: 'pointer',
          position: 'absolute',
          top: wide ? 22 : 56,
          right: wide ? 26 : 18,
          width: 34,
          height: 34,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          color: 'var(--fg-muted)',
          padding: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M3 3 L13 13 M13 3 L3 13"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        style={{
          width: '100%',
          maxWidth: wide ? 880 : '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: wide ? 26 : 18,
          alignItems: 'center',
        }}
      >
        {/* Head block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: wide ? 14 : 12,
            width: '100%',
            maxWidth: wide ? 880 : '100%',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            {/* RailHeader — tone muted */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  background: 'var(--fg-subtle)',
                  flexShrink: 0,
                  boxShadow: '0 0 8px var(--fg-subtle)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: 'var(--fg-subtle)',
                }}
              >
                {TAKEOVER_COPY.eyebrow}
              </span>
              <div
                style={{ flex: 1, height: 1, background: 'var(--border)' }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--fg-subtle)',
                }}
              >
                {TAKEOVER_COPY.code}
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: wide ? 'flex-end' : 'flex-start',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
                flex: 1,
                minWidth: wide ? 360 : 'auto',
              }}
            >
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: wide ? 52 : 34,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.0,
                  color: 'var(--fg)',
                  margin: 0,
                }}
              >
                {TAKEOVER_COPY.headline}
              </h1>
              <p
                style={{
                  fontWeight: 500,
                  fontSize: wide ? 16 : 14,
                  color: 'var(--fg-muted)',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.5,
                  maxWidth: 560,
                  margin: 0,
                }}
              >
                {TAKEOVER_COPY.subhead}
              </p>
            </div>
          </div>
        </div>

        {/* Picker — LOCKED #781 components inline */}
        {wide ? (
          <div
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: `repeat(${tiers.length}, 1fr)`,
              gap: 12,
              alignItems: 'stretch',
            }}
          >
            {tiers.map((tier) => (
              <TierCardDesktop
                key={tier.key}
                tier={tier}
                state="free"
                founderWindowState={windowView.state}
                scarcityRail={rail}
                onSelect={selectTier}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              width: '100%',
            }}
          >
            {tiers.map((tier) => (
              <TierRowMobile
                key={tier.key}
                tier={tier}
                state="free"
                founderWindowState={windowView.state}
                scarcityRail={rail}
                expanded={expandedTier === tier.key}
                onToggle={() =>
                  setExpandedTier(expandedTier === tier.key ? null : tier.key)
                }
                onSelect={selectTier}
              />
            ))}
          </div>
        )}

        {/* Bottom dismiss link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            paddingTop: wide ? 6 : 4,
          }}
        >
          <button
            type="button"
            onClick={onDismiss}
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              padding: '8px 10px',
            }}
          >
            {TAKEOVER_COPY.dismissLink}
          </button>
        </div>
      </div>
    </div>
  )
}
