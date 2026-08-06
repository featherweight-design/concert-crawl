'use client'

// The ONE create-a-crew affordance. Both places that offer it — the list
// header and the empty state — mount this component rather than each wiring
// its own entitlement check, because two copies of a paywall is how one of
// them ends up ungated.

import { useState } from 'react'
import type { PlanState, CrewSummary } from '@concert-crawl/types'

import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { unlockTierFor } from '@/lib/unlock-tier'
import { ModalShell } from '@/components/consumer/modal-shell'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { CreateCrewSheet } from './CreateCrewSheet'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

// Mirrors derivePlanState's logged-out shape, as HistoryLocked and
// EventDetailCtaBlock do: the picker needs a full PlanState and a logged-out
// viewer has none.
const LOGGED_OUT_PLAN_STATE: PlanState = {
  plan: 'logged-out',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
}

interface CreateCrewButtonProps {
  /** `header` is the trailing-edge pill; `empty` is the empty state's CTA. */
  variant: 'header' | 'empty'
  scaRegion: boolean
  onCreated: (crew: CrewSummary) => void
}

export const CreateCrewButton = ({
  variant,
  scaRegion,
  onCreated,
}: CreateCrewButtonProps) => {
  const { isLoading, active, surface } = useEntitlement('crews')
  const { data: planState } = usePlanState()
  const [createOpen, setCreateOpen] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const tier = unlockTierFor('crews')
  // A plan that once paid and no longer does keeps its crews; only starting
  // another one is gated. Saying so is the difference between a paywall and a
  // false alarm about work they already did.
  const lapsed = planState?.status === 'past_due' || planState?.plan === 'free'

  // Never flash a locked treatment while the plan is still resolving.
  const gated = !isLoading && !active

  const openPicker = () => {
    setGateOpen(false)
    setPickerOpen(true)
  }

  const onTap = () => {
    if (isLoading) return
    if (active) {
      setCreateOpen(true)
      return
    }
    if (surface === 'tier-picker-on-tap') {
      setPickerOpen(true)
      return
    }
    setGateOpen(true)
  }

  const isHeader = variant === 'header'

  return (
    <>
      <button
        type="button"
        onClick={onTap}
        disabled={isLoading}
        aria-haspopup="dialog"
        aria-expanded={createOpen || gateOpen || pickerOpen}
        {...(gated ? { 'aria-description': COPY.a11y.gatedCreate } : {})}
        className="flex cursor-pointer items-center justify-center gap-1.5"
        style={{
          minHeight: 44,
          padding: isHeader ? '0 14px' : '0 20px',
          borderRadius: 999,
          background: gated ? 'transparent' : 'var(--signal)',
          color: gated ? 'var(--fg)' : 'var(--fg-on-accent)',
          border: gated ? '1px solid var(--border-strong)' : 'none',
          fontFamily: 'var(--font-ui)',
          fontSize: isHeader ? 13 : 13.5,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          opacity: isLoading ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {COPY.list.create}
        {gated && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              color: 'var(--signal)',
            }}
          >
            ★
          </span>
        )}
      </button>

      <ModalShell
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        ariaLabel={COPY.gate.title}
        sheetHeight="short"
        desktopWidth={520}
      >
        <div className="flex flex-col gap-3.5 pb-2">
          {tier !== null && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              {COPY.gate.eyebrow(tier.name)}
            </span>
          )}
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {COPY.gate.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.gate.body}
          </p>
          {lapsed && tier !== null && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.gate.lapsed(tier.name)}
            </p>
          )}
          {tier !== null && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--fg-subtle)',
              }}
            >
              {COPY.gate.comparison(
                tier.name,
                `${tier.priceText} ${tier.priceUnit}`,
              )}
            </span>
          )}
          <button
            type="button"
            onClick={openPicker}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg"
            style={{
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              border: 'none',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {tier === null ? COPY.gate.ctaFallback : COPY.gate.cta(tier.name)}
          </button>
        </div>
      </ModalShell>

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry={
          surface === 'tier-picker-on-tap' ? 'logged-out-paywall' : 'paywall'
        }
      />

      <CreateCrewSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(crew) => {
          setCreateOpen(false)
          onCreated(crew)
        }}
      />
    </>
  )
}
