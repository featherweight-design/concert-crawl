'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Release } from '@/lib/definitions/releases'
import { FeedbackModal } from '@/components/consumer/feedback/FeedbackModal'
import { useReleaseReadState } from './useReleaseReadState'
import { ReleaseEntry } from './ReleaseEntry'
import { SpotlightModal } from './SpotlightModal'
import { COPY } from './definitions/copy'

interface ReleasePageProps {
  releases: Release[]
}

export function ReleasePage({ releases }: ReleasePageProps) {
  const router = useRouter()
  const latestVersion = releases[0]?.version ?? ''
  const { markSeen } = useReleaseReadState(latestVersion)

  const [spotlightRelease, setSpotlightRelease] = useState<Release | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    markSeen()
  }, [markSeen])

  const handleOpenSpotlight = useCallback((release: Release) => {
    setSpotlightRelease(release)
  }, [])

  const handleCloseSpotlight = useCallback(() => {
    setSpotlightRelease(null)
  }, [])

  const handleCTA = useCallback(() => {
    if (!spotlightRelease?.spotlight?.ctaHref) return
    setSpotlightRelease(null)
    void router.push(spotlightRelease.spotlight.ctaHref)
  }, [router, spotlightRelease])

  return (
    <>
      <div
        style={{
          width: '100%',
          minHeight: '100%',
          background: 'var(--bg)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-ui)',
          padding: '56px 32px 80px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* page header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--signal)',
                boxShadow: '0 0 6px var(--signal)',
                animation: 'rnPulse 1.8s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--signal)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {COPY.page.eyebrow}
            </span>
          </div>

          <h1
            style={{
              fontSize: 46,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              margin: '4px 0 8px',
              lineHeight: 1.04,
            }}
          >
            {COPY.page.heading}
          </h1>

          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--fg-muted)',
              margin: '0 0 36px',
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            {COPY.page.description}{' '}
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                color: 'var(--accent)',
                borderBottom: '1px dotted var(--accent)',
              }}
            >
              {COPY.page.feedbackCta}
            </button>
            .
          </p>

          {/* timeline */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 11,
                top: 8,
                bottom: 8,
                width: 1,
                background:
                  'linear-gradient(to bottom, var(--border-strong), transparent 95%)',
              }}
            />
            {releases.map((release, idx) => (
              <ReleaseEntry
                key={release.version}
                release={release}
                isLatest={idx === 0}
                onOpenSpotlight={handleOpenSpotlight}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              padding: '18px 0',
              textAlign: 'center',
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {COPY.page.endOfLog}
          </div>
        </div>
      </div>

      {spotlightRelease && (
        <SpotlightModal
          release={spotlightRelease}
          onClose={handleCloseSpotlight}
          onCTA={handleCTA}
        />
      )}

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  )
}
