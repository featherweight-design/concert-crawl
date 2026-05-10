'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressDots } from './ProgressDots'
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import { BetaPill } from '@/components/brand/beta-pill/BetaPill'
import { FounderNote } from './steps/FounderNote'
import { HowItWorks } from './steps/HowItWorks'
import { WhatItDoesToday } from './steps/WhatItDoesToday'
import { WhatItDoesntYet } from './steps/WhatItDoesntYet'
import { YoureIn } from './steps/YoureIn'

const FLOW = ['welcome', 'how', 'today', 'notyet', 'done'] as const
type StepKey = (typeof FLOW)[number]

const STEP_LABELS: Record<StepKey, string> = {
  welcome: 'WELCOME',
  how: 'HOW IT WORKS',
  today: 'TODAY',
  notyet: 'NOT YET',
  done: "YOU'RE IN",
}

// Steps whose desktop card is wider (620px instead of 520px)
const WIDE_STEPS = new Set<StepKey>(['welcome', 'today', 'notyet'])

function StepContent({ stepKey }: { stepKey: StepKey }) {
  if (stepKey === 'welcome') return <FounderNote />
  if (stepKey === 'how') return <HowItWorks />
  if (stepKey === 'today') return <WhatItDoesToday />
  if (stepKey === 'notyet') return <WhatItDoesntYet />
  if (stepKey === 'done') return <YoureIn />
  return null
}

export function OnboardingShell() {
  const [index, setIndex] = useState(0)
  const router = useRouter()
  const total = FLOW.length
  const isFirst = index === 0
  const isLast = index === total - 1
  const stepKey = FLOW[index]!

  function goNext() {
    if (isLast) {
      router.push('/sign-up')
      return
    }
    setIndex((ii) => Math.min(ii + 1, total - 1))
  }

  function goBack() {
    if (isFirst) return
    setIndex((ii) => ii - 1)
  }

  return (
    <>
      {/* Mobile layout (< 1240px) */}
      <div
        style={{
          height: '100dvh',
          background: 'var(--bg)',
          color: 'var(--fg)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui',
        }}
        className="onboarding-mobile"
      >
        {/* Top chrome */}
        <header
          style={{
            flexShrink: 0,
            padding: '18px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CCClusterMark
              size={22}
              color="var(--signal)"
              glow="var(--accent)"
            />
            <CCWordmark size={16} />
          </div>
          <BetaPill />
        </header>

        {/* Progress strip */}
        <div
          style={{
            flexShrink: 0,
            padding: '4px 22px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <ProgressDots total={total} index={index} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {STEP_LABELS[stepKey]}
          </span>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 22px 8px',
          }}
        >
          <div
            style={{
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'safe center',
            }}
          >
            <StepContent stepKey={stepKey} />
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            flexShrink: 0,
            padding: '12px 22px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Primary CTA */}
          <button
            onClick={goNext}
            style={{
              all: 'unset',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 52,
              borderRadius: 10,
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '-0.01em',
              boxShadow: '0 12px 32px -12px var(--signal)',
            }}
          >
            {isLast ? 'Continue to sign-up →' : 'Next →'}
          </button>

          {/* Secondary row: back link + step counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
            }}
          >
            <button
              onClick={goBack}
              disabled={isFirst}
              style={{
                all: 'unset',
                cursor: isFirst ? 'default' : 'pointer',
                opacity: isFirst ? 0.4 : 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
              }}
            >
              ← Back
            </button>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              Step {index + 1} of {total}
            </span>
          </div>
        </nav>
      </div>

      {/* Desktop layout (≥ 1240px) */}
      <div style={{ display: 'none' }} className="onboarding-desktop">
        <OnboardingDesktop
          index={index}
          total={total}
          isFirst={isFirst}
          isLast={isLast}
          stepKey={stepKey}
          onNext={goNext}
          onBack={goBack}
        />
      </div>
    </>
  )
}

interface DesktopProps {
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  stepKey: StepKey
  onNext: () => void
  onBack: () => void
}

function OnboardingDesktop({
  index,
  total,
  isFirst,
  isLast,
  stepKey,
  onNext,
  onBack,
}: DesktopProps) {
  const cardWidth = WIDE_STEPS.has(stepKey) ? 620 : 520

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui',
        overflow: 'hidden',
      }}
    >
      {/* Faint watermark — cluster mark top-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <CCClusterMark
          size={380}
          color="var(--fg)"
          style={{ opacity: 0.07, transform: 'rotate(-12deg)' }}
        />
      </div>

      {/* Outer header */}
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          padding: '22px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          Code accepted · Welcome
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CCClusterMark size={26} color="var(--signal)" glow="var(--accent)" />
          <CCWordmark size={20} />
        </div>
        <BetaPill />
      </header>

      {/* Centered card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 48px 32px',
        }}
      >
        <div
          style={{
            width: cardWidth,
            height: 640,
            borderRadius: 16,
            border: '1px solid var(--border-strong)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Card header: progress dots + step label */}
          <div
            style={{
              flexShrink: 0,
              padding: '22px 32px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <ProgressDots total={total} index={index} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {STEP_LABELS[stepKey]}
            </span>
          </div>

          {/* Card body */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '8px 32px 12px',
            }}
          >
            <div
              style={{
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'safe center',
              }}
            >
              <StepContent stepKey={stepKey} />
            </div>
          </div>

          {/* Card nav */}
          <nav
            style={{
              flexShrink: 0,
              padding: '14px 32px 22px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              onClick={onNext}
              style={{
                all: 'unset',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 52,
                borderRadius: 10,
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-0.01em',
                boxShadow: '0 12px 32px -12px var(--signal)',
              }}
            >
              {isLast ? 'Continue to sign-up →' : 'Next →'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
              }}
            >
              <button
                onClick={onBack}
                disabled={isFirst}
                style={{
                  all: 'unset',
                  cursor: isFirst ? 'default' : 'pointer',
                  opacity: isFirst ? 0.4 : 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                }}
              >
                ← Back
              </button>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-subtle)',
                }}
              >
                Step {index + 1} of {total}
              </span>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
