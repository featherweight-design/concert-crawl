'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressDots } from './ProgressDots'
import { FounderNote } from './steps/FounderNote'
import { HowItWorks } from './steps/HowItWorks'
import { WhatItDoesToday } from './steps/WhatItDoesToday'
import { WhatItDoesntYet } from './steps/WhatItDoesntYet'
import { YoureIn } from './steps/YoureIn'

const FLOW = ['welcome', 'how', 'today', 'notyet', 'done'] as const
type StepKey = (typeof FLOW)[number]

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
    <div
      style={{
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <header
        style={{
          flexShrink: 0,
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ProgressDots total={total} index={index} />
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {index + 1} / {total}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '8px 22px 24px',
        }}
      >
        <StepContent stepKey={FLOW[index]!} />
      </div>

      <nav
        style={{
          flexShrink: 0,
          padding: '16px 22px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 12,
        }}
      >
        {!isFirst && (
          <button
            onClick={goBack}
            style={{
              all: 'unset',
              cursor: 'pointer',
              height: 52,
              padding: '0 20px',
              borderRadius: 10,
              border: '1px solid var(--border-strong)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--fg)',
            }}
          >
            ← Back
          </button>
        )}
        <button
          onClick={goNext}
          style={{
            all: 'unset',
            cursor: 'pointer',
            flex: 1,
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
      </nav>
    </div>
  )
}
