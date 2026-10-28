'use client'

// The locked History takeover (#70), design_handoff_concert_history/history-routes.jsx:135-221.
//
// It is NOT a modal: no dismiss, no focus trap, no dialog role. It is the page's
// content for a plan that can't read history, so it's a plain <section> in the
// document flow (READINESS ♿ flag).
//
// The perk list is the canonical tier-picker feature array, resolved through the
// entitlements matrix — the handoff's inline three-perk list is the drift class
// Copilot caught on #820. Free-tier stats are hidden outright, not blurred or
// teased: handoff open question #4, answered in the plan.

import { useState } from 'react'
import type { PlanState } from '@concert-crawl/types'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { unlockTierFor } from '@/lib/unlock-tier'
import { HISTORY_COPY } from './definitions/copy'

const COPY = HISTORY_COPY.locked

// Mirrors derivePlanState's logged-out shape, as TasteFilterChip and
// EventDetailCtaBlock do — the picker needs a full PlanState and a logged-out
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

const LockIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    focusable="false"
  >
    <rect
      x="3"
      y="7"
      width="10"
      height="7"
      rx="1.8"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

// Faint stub silhouettes fanned behind the card — wallpaper, not bait
// (history-routes.jsx:94-129).
const SILHOUETTES: readonly { tx: number; rot: number; opacity: number }[] = [
  { tx: -110, rot: -16, opacity: 0.06 },
  { tx: -60, rot: -8, opacity: 0.09 },
  { tx: 0, rot: -2, opacity: 0.12 },
  { tx: 60, rot: 8, opacity: 0.09 },
  { tx: 110, rot: 16, opacity: 0.06 },
]

const SilhouetteStubs = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
  >
    <div className="relative" style={{ width: 320, height: 180 }}>
      {SILHOUETTES.map((stub) => (
        <div
          key={stub.tx}
          className="absolute left-1/2 top-1/2"
          style={{
            width: 180,
            height: 110,
            transform: `translate(-50%, -50%) translate(${stub.tx}px, 0) rotate(${stub.rot}deg)`,
            opacity: stub.opacity,
          }}
        >
          <svg width="180" height="110" viewBox="0 0 180 110" focusable="false">
            <path
              d="M0 12 Q0 0 12 0 L132 0 L132 110 L12 110 Q0 110 0 98 Z"
              fill="var(--fg)"
            />
            <path
              d="M140 0 L168 0 Q180 0 180 12 L180 98 Q180 110 168 110 L140 110 Z"
              fill="var(--fg)"
            />
            <line
              x1="136"
              y1="6"
              x2="136"
              y2="104"
              stroke="var(--bg)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.8"
            />
          </svg>
        </div>
      ))}
    </div>
  </div>
)

export const HistoryLocked = ({ scaRegion }: { scaRegion: boolean }) => {
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)

  const tier = unlockTierFor('concert-history')
  const ctaLabel = tier === null ? COPY.ctaFallback : COPY.cta(tier.name)

  return (
    <section className="relative flex min-h-[480px] flex-col items-center justify-center overflow-hidden px-6 py-10">
      <SilhouetteStubs />

      <div
        className="relative z-[1] flex w-full flex-col gap-[18px] rounded-2xl border border-border-strong bg-surface-1 px-[22px] pb-[22px] pt-[26px]"
        style={{
          maxWidth: 340,
          boxShadow:
            '0 24px 48px -16px var(--scrim), 0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex shrink-0 items-center justify-center rounded-[9px]"
            style={{
              width: 34,
              height: 34,
              background: 'color-mix(in oklch, var(--accent) 16%, transparent)',
              border:
                '1px solid color-mix(in oklch, var(--accent) 50%, transparent)',
              color: 'var(--accent)',
            }}
          >
            <LockIcon />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            {tier !== null && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                {tier.name} · {tier.priceText} {tier.priceUnit}
              </span>
            )}
            <h1
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.015em',
                color: 'var(--fg)',
                margin: 0,
              }}
            >
              {COPY.headline}
            </h1>
          </div>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            color: 'var(--fg-muted)',
            margin: 0,
          }}
        >
          {COPY.body}
        </p>

        {tier !== null && (
          <ul className="m-0 flex list-none flex-col gap-2.5 rounded-[10px] border border-border bg-surface-2 px-3.5 py-3">
            {tier.features.map((feature) => (
              <li key={feature.text} className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="shrink-0 rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: 'var(--accent)',
                    transform: 'translateY(-2px)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: '-0.005em',
                    color: 'var(--fg)',
                  }}
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen(true)}
          className="history-locked-cta flex min-h-[44px] w-full items-center justify-center rounded-lg"
          style={{
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            border: 'none',
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: '-0.005em',
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>

        <p
          className="text-center"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: 'var(--fg-subtle)',
            margin: 0,
          }}
        >
          {COPY.footer}
        </p>
      </div>

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry="paywall"
      />
    </section>
  )
}
