'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import { BetaPill } from '@/components/brand/beta-pill/BetaPill'
import { LandingPosterAnimation } from '@/components/brand/landing-poster/LandingPosterAnimation'
import { WaitlistModal } from '@/components/waitlist/WaitlistModal'
import { CCMark } from '@/components/brand/cc-mark'
import type { LandingShow } from '@/components/brand/landing-poster/LandingPoster'
import { COPY } from './definitions/copy'

interface LandingClientShellProps {
  shows: LandingShow[]
}

export default function LandingClientShell({ shows }: LandingClientShellProps) {
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  // "I have a code" is the primary action — it's the path for beta users
  const ctaCode = (
    <Link
      href="/auth/code"
      style={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        paddingLeft: 20,
        paddingRight: 20,
        borderRadius: 10,
        background: 'var(--signal)',
        color: 'var(--fg-on-accent)',
        fontFamily: 'Inter, system-ui',
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: '-0.01em',
        boxShadow: '0 8px 24px -8px var(--signal)',
        whiteSpace: 'nowrap',
      }}
    >
      {COPY.cta.code}
    </Link>
  )

  const ctaWaitlist = (
    <button
      onClick={() => setWaitlistOpen(true)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        paddingLeft: 20,
        paddingRight: 20,
        borderRadius: 10,
        background: 'transparent',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
        fontFamily: 'Inter, system-ui',
        fontWeight: 600,
        fontSize: 15,
        whiteSpace: 'nowrap',
      }}
    >
      {COPY.cta.waitlist}
    </button>
  )

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          padding: '20px 22px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CCMark size={26} />
          <CCWordmark size={20} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BetaPill />
          <Link
            href="/auth/code"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--fg)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
            className="hidden md:inline-flex items-center"
          >
            {COPY.nav.codeLink}
          </Link>
        </div>
      </header>

      {/* Main content — single column on mobile, two-column grid on desktop */}
      <main
        className="flex-1 flex flex-col gap-8 md:grid md:grid-cols-2 md:items-start md:gap-x-16 md:gap-y-10"
        style={{ padding: '24px 22px 48px' }}
      >
        {/* Left column: hero text + CTAs (desktop) */}
        <div className="flex flex-col gap-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'Inter, system-ui',
                fontWeight: 900,
                fontSize: 'clamp(36px, 10vw, 84px)',
                letterSpacing: '-0.035em',
                lineHeight: 0.95,
              }}
            >
              {COPY.hero.headingLine1}
              <br />
              {COPY.hero.headingLine2}
              <br />
              <span style={{ color: 'var(--accent)' }}>
                {COPY.hero.headingAccent}
              </span>
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--fg-muted)',
                lineHeight: 1.4,
                maxWidth: '44ch',
              }}
            >
              {COPY.hero.subheading}
            </p>
          </div>

          {/* CTAs — desktop only (horizontal row: code primary, waitlist secondary) */}
          <div className="hidden md:flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              {ctaCode}
              {ctaWaitlist}
            </div>
            <Link
              href="/sign-in"
              style={{
                fontSize: 13,
                color: 'var(--fg-muted)',
                textDecoration: 'none',
                fontFamily: 'Inter, system-ui',
                fontWeight: 500,
              }}
            >
              {COPY.cta.signIn}
            </Link>
          </div>
        </div>

        {/* Right column: poster stack */}
        <div className="flex justify-center md:justify-end">
          <LandingPosterAnimation
            mode="stack"
            shows={shows}
            width={290}
            intervalMs={5500}
          />
        </div>

        {/* CTAs — mobile only (stacked: code primary, waitlist secondary) */}
        <div className="flex flex-col gap-3 md:hidden">
          {ctaCode}
          {ctaWaitlist}
          <Link
            href="/sign-in"
            style={{
              fontSize: 13,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
              fontFamily: 'Inter, system-ui',
              fontWeight: 500,
            }}
          >
            {COPY.cta.signIn}
          </Link>
        </div>
      </main>

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </div>
  )
}
