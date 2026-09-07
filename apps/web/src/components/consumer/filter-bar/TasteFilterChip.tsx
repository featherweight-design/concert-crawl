'use client'

// "Following" taste-filter toggle chip — leads the FilterBar chip row
// (#763 PR 7, taste-filter.jsx mock). Three states:
//   - off/on toggle for plans with spotify-sync (--signal active treatment),
//   - locked (dashed border + lock glyph) for everyone else. Locked taps
//     route per the entitlements matrix: paywall-on-tap → TasteUpsellSheet
//     (whose "See plans" opens the tier picker), tier-picker-on-tap
//     (logged-out) → tier picker directly.
// Renders nothing while the entitlement is still resolving — never flash a
// locked treatment at a paying user.

import { useEffect, useState } from 'react'
import type { PickerEntry } from '@concert-crawl/types'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TasteUpsellSheet } from './TasteUpsellSheet'
import { ChipDivider } from './ChipDivider'

const COPY = SPOTIFY_COPY.tasteFilter

const LockGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect
      x="2.2"
      y="5.4"
      width="7.6"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M4 5.4V4a2 2 0 014 0v1.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
)

interface TasteFilterChipProps {
  active: boolean
  onToggle: (next: boolean) => void
  // Server-resolved SCA-region boolean, forwarded to the tier picker's
  // checkout legal block (monetization spec §1.7).
  scaRegion: boolean
}

export const TasteFilterChip = ({
  active,
  onToggle,
  scaRegion,
}: TasteFilterChipProps) => {
  const { isLoading, surface } = useEntitlement('spotify-sync')
  const { data: planState } = usePlanState()
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerEntry, setPickerEntry] = useState<PickerEntry>('paywall')

  const resolved = !isLoading && surface !== null
  const usable = resolved && surface === 'visible-active'
  // 'hidden' means no affordance at all, not a locked one — it is what a
  // flagged-off release resolves to, and a locked chip would advertise a
  // feature nobody can buy yet.
  const shown = resolved && surface !== 'hidden'

  // Entitlement lapsed (downgrade / session change) with filterTaste=1 still
  // in the URL: the locked chip can't toggle and Clear-all excludes taste, so
  // release the stale param here rather than strand rejected taste fetches.
  useEffect(() => {
    if (resolved && !usable && active) onToggle(false)
  }, [resolved, usable, active, onToggle])

  // Hold rendering while the plan resolves — no locked flash — and render
  // nothing at all for a hidden surface.
  if (!shown) return null

  if (usable) {
    return (
      <>
        <button
          type="button"
          onClick={() => onToggle(!active)}
          aria-pressed={active}
          aria-label={COPY.chipAria}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{
            padding: '0 12px 0 8px',
            fontFamily: 'Inter, system-ui',
            fontWeight: 700,
            fontSize: 12,
            background: active ? 'var(--signal)' : 'transparent',
            borderColor: active ? 'var(--signal)' : 'var(--border-strong)',
            color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
          }}
        >
          <SpotifyLogo size={15} />
          <span style={{ whiteSpace: 'nowrap' }}>{COPY.chip}</span>
          {active && (
            <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
              ✕
            </span>
          )}
        </button>
        <ChipDivider />
      </>
    )
  }

  const onLockedTap = () => {
    if (surface === 'tier-picker-on-tap') {
      // Logged-out: straight to the tier picker.
      setPickerEntry('logged-out-paywall')
      setPickerOpen(true)
      return
    }
    // Free / supporter: the taste upsell first.
    setUpsellOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={onLockedTap}
        aria-label={COPY.chipLockedAria}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          padding: '0 11px 0 9px',
          fontFamily: 'Inter, system-ui',
          fontWeight: 700,
          fontSize: 12,
          background: 'transparent',
          border: '1px dashed var(--border-strong)',
          color: 'var(--fg-subtle)',
        }}
      >
        <SpotifyLogo size={15} />
        <span style={{ whiteSpace: 'nowrap' }}>{COPY.chip}</span>
        <LockGlyph />
      </button>
      <ChipDivider />
      <TasteUpsellSheet
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        onSeePlans={() => {
          setUpsellOpen(false)
          setPickerEntry('paywall')
          setPickerOpen(true)
        }}
      />
      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry={pickerEntry}
      />
    </>
  )
}
