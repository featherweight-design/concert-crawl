'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import { BetaPill } from '@/components/brand/beta-pill/BetaPill'
import { GigPosterStack } from '@/components/brand/gig-poster/GigPosterStack'
import { WaitlistModal } from '@/components/waitlist/WaitlistModal'
import { CCMark } from '@/components/consumer/cc-mark/CCMark'
import type { Show } from '@/components/brand/gig-poster/GigPoster'

const VIBES = [
  {
    title: 'Browse',
    body: 'Every show in Denver this week — list or calendar, your call.',
  },
  {
    title: 'Save',
    body: 'Heart the ones you might hit. They sync to your phone calendar.',
  },
  {
    title: 'Crawl',
    body: 'Stack a bunch in one night. We map the route.',
  },
]

interface LandingClientShellProps {
  shows: Show[]
}

export default function LandingClientShell({ shows }: LandingClientShellProps) {
  const [waitlistOpen, setWaitlistOpen] = useState(false)

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
            I have a code →
          </Link>
        </div>
      </header>

      {/* Scrollable body */}
      <main
        style={{
          flex: 1,
          padding: '24px 22px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* Hero text */}
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
            See who&apos;s
            <br />
            playing
            <br />
            <span style={{ color: 'var(--accent)' }}>tonight.</span>
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
            Every show in Denver, in one place — sorted, savable, shareable.
            Built by fans, not algorithms.
          </p>
        </div>

        {/* Poster stack */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GigPosterStack
            shows={shows}
            width={290}
            height={400}
            intervalMs={5500}
          />
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            I have a code →
          </Link>
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
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--fg)',
              border: '1px solid var(--border-strong)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Join the waitlist
          </button>
        </div>

        {/* Vibes */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-muted)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            What you get
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {VIBES.map((vibe) => (
              <div
                key={vibe.title}
                style={{
                  padding: 18,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <h3
                  style={{
                    margin: '4px 0 0',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 800,
                    fontSize: 18,
                    color: 'var(--fg)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {vibe.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {vibe.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div>Denver pilot · more cities later</div>
            <div style={{ opacity: 0.7 }}>made by fans · v0.1 beta</div>
          </div>
        </footer>
      </main>

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </div>
  )
}
