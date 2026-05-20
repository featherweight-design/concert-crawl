'use client'

import { useState, useEffect } from 'react'
import type { Release } from '@/lib/definitions/releases'
import { SpotlightHero } from './SpotlightHero'

interface SpotlightModalProps {
  release: Release
  onClose: () => void
  onCTA?: () => void
  variant?: 'desktop' | 'mobile'
}

export function SpotlightModal({
  release,
  onClose,
  onCTA,
  variant = 'desktop',
}: SpotlightModalProps) {
  const sp = release.spotlight
  const [step, setStep] = useState(0)

  useEffect(() => {
    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!sp) return null

  const isMobile = variant === 'mobile'
  const totalSteps = sp.steps.length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 32,
        zIndex: 200,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-modal-title"
        style={{
          width: isMobile ? '100%' : 580,
          maxWidth: '100%',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
          background: 'var(--bg-elevated)',
          borderRadius: isMobile ? 0 : 20,
          border: isMobile ? 'none' : '1px solid var(--border-strong)',
          boxShadow: isMobile ? 'none' : '0 32px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
        }}
      >
        {/* hero */}
        <div
          style={{
            position: 'relative',
            height: isMobile ? 280 : 300,
            background: 'var(--surface-2)',
            flexShrink: 0,
          }}
        >
          <SpotlightHero hero={sp.hero} />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              all: 'unset',
              cursor: 'pointer',
              position: 'absolute',
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div
            style={{
              position: 'absolute',
              left: 22,
              bottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--accent)',
                boxShadow: '0 0 6px var(--accent)',
                animation: 'rnPulse 1.4s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              }}
            >
              Feature drop · {release.version}
            </span>
          </div>
        </div>

        {/* body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '22px 22px 18px' : '26px 30px 22px',
          }}
        >
          <h2
            id="spotlight-modal-title"
            style={{
              fontSize: isMobile ? 28 : 30,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              margin: '0 0 6px',
            }}
          >
            {sp.title}
          </h2>
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--fg-muted)',
              margin: '0 0 22px',
              lineHeight: 1.4,
            }}
          >
            {sp.tagline}
          </p>

          {/* walkthrough carousel */}
          {totalSteps > 0 && (
            <div
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--fg-subtle)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  How it works
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--fg-subtle)',
                    letterSpacing: '0.12em',
                  }}
                >
                  {String(step + 1).padStart(2, '0')} /{' '}
                  {String(totalSteps).padStart(2, '0')}
                </span>
              </div>

              <div
                key={step}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  padding: '10px 0 16px',
                  animation: 'rnFadeUp 360ms ease both',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--signal)',
                    color: 'var(--signal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {step + 1}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 15,
                    lineHeight: 1.45,
                    color: 'var(--fg)',
                    letterSpacing: '-0.005em',
                    paddingTop: 5,
                  }}
                >
                  {sp.steps[step]?.caption}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  style={{
                    all: 'unset',
                    cursor: step === 0 ? 'default' : 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 800,
                    color: step === 0 ? 'var(--fg-subtle)' : 'var(--fg-muted)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    opacity: step === 0 ? 0.4 : 1,
                  }}
                >
                  ← Back
                </button>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStep(idx)}
                      aria-label={`Go to step ${idx + 1}`}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        width: idx === step ? 22 : 6,
                        height: 6,
                        borderRadius: 6,
                        background:
                          idx === step
                            ? 'var(--signal)'
                            : 'var(--border-strong)',
                        transition: 'width 220ms ease',
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(Math.min(totalSteps - 1, step + 1))}
                  disabled={step === totalSteps - 1}
                  style={{
                    all: 'unset',
                    cursor: step === totalSteps - 1 ? 'default' : 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 800,
                    color:
                      step === totalSteps - 1
                        ? 'var(--fg-subtle)'
                        : 'var(--signal)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    opacity: step === totalSteps - 1 ? 0.4 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* founder note */}
          {sp.founderNote && (
            <div
              style={{
                padding: '14px 16px',
                borderLeft: '2px solid var(--accent)',
                background: 'var(--surface-1)',
                borderRadius: '0 10px 10px 0',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {sp.founderEyebrow ?? 'Behind the build'}
              </div>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                  margin: 0,
                }}
              >
                {sp.founderNote}
              </p>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--fg-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {sp.founderSign ?? '— Hugh'}
              </div>
            </div>
          )}
        </div>

        {/* footer CTAs */}
        <div
          style={{
            padding: isMobile ? '14px 22px 22px' : '16px 30px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-1)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--fg-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Maybe later
          </button>
          <span style={{ flex: 1 }} />
          {sp.cta && sp.ctaHref ? (
            <button
              type="button"
              onClick={onCTA ?? onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                padding: '12px 20px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                boxShadow: '0 6px 16px var(--overlay-press)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {sp.cta}
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 3l4 3-4 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                padding: '12px 20px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                boxShadow: '0 6px 16px var(--overlay-press)',
              }}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
