'use client'

import Link from 'next/link'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import { LandingPosterAnimation } from '@/components/brand/landing-poster/LandingPosterAnimation'
import { CCMark } from '@/components/brand/cc-mark'
import type { LandingShow } from '@/components/brand/landing-poster/LandingPoster'
import { LANDING_COPY } from './definitions/copy'

interface LandingClientShellProps {
  shows: LandingShow[]
  // Shows in the next seven days, from the `to`-bounded probe in page.tsx —
  // scoped to match the rail's "this week" wording rather than counting all
  // upcoming shows. Null when that probe failed and there is no honest
  // number to print.
  showCount?: number | null
}

export default function LandingClientShell({
  shows,
  showCount = null,
}: LandingClientShellProps) {
  // Looking around costs nothing, so browsing leads and signing up follows.
  const ctaBrowse = (
    <Link
      href="/events"
      style={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px 22px',
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
      {LANDING_COPY.cta.browse}
    </Link>
  )

  const ctaSignUp = (
    <Link
      href="/sign-up"
      style={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px 22px',
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
      {LANDING_COPY.cta.signUp}
    </Link>
  )

  const noAccountNote = (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
      }}
    >
      {LANDING_COPY.cta.noAccountNote}
    </div>
  )

  const ctaBlock = (
    <>
      <div className="flex flex-col gap-3 md:flex-row">
        {ctaBrowse}
        {ctaSignUp}
      </div>
      {noAccountNote}
    </>
  )

  const seeAll = (
    <Link
      href="/events"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 44,
        fontFamily: 'Inter, system-ui',
        fontSize: 13.5,
        fontWeight: 700,
        color: 'var(--signal)',
        textDecoration: 'none',
      }}
    >
      {showCount === null
        ? LANDING_COPY.rail.seeAll
        : LANDING_COPY.rail.seeAllCounted(showCount)}
    </Link>
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
      {/* Top bar — lockup left, quiet Sign in right, at every breakpoint */}
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
        <Link
          href="/sign-in"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            paddingLeft: 6,
            paddingRight: 6,
            fontFamily: 'Inter, system-ui',
            fontWeight: 600,
            fontSize: 13,
            color: 'var(--fg-muted)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {LANDING_COPY.nav.signIn}
        </Link>
      </header>

      {/* Main content — single column on mobile, two-column grid on desktop */}
      <main
        className="flex-1 flex flex-col gap-8 md:grid md:grid-cols-2 md:items-start md:gap-x-16 md:gap-y-10"
        style={{ padding: '24px 22px 48px' }}
      >
        {/* Hero text — left column on desktop, first block on mobile */}
        <div className="md:col-start-1 md:row-start-1">
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
              {LANDING_COPY.hero.headingLine1}
              <br />
              {LANDING_COPY.hero.headingLine2}
              <br />
              <span style={{ color: 'var(--accent)' }}>
                {LANDING_COPY.hero.headingAccent}
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
              {LANDING_COPY.hero.subheading}
            </p>
          </div>
        </div>

        {/* Poster stack + the see-all rail — right column on desktop */}
        <div className="flex flex-col items-center gap-1 md:col-start-2 md:row-start-1 md:row-span-2 md:items-end">
          <LandingPosterAnimation
            mode="stack"
            shows={shows}
            width={290}
            intervalMs={5500}
          />
          {seeAll}
        </div>

        {/* CTAs — one instance, reflowed rather than duplicated per breakpoint */}
        <div className="flex flex-col gap-[10px] md:col-start-1 md:row-start-2">
          {ctaBlock}
        </div>
      </main>
    </div>
  )
}
