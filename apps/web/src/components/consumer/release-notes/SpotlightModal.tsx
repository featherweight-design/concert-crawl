'use client';

import { useState, useEffect, useRef } from 'react';
import type { Release } from '@/lib/definitions/releases';
import { SpotlightHero } from './SpotlightHero';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const COPY = CONSUMER_COPY.releaseNotes;

interface SpotlightModalProps {
  release: Release;
  onClose: () => void;
  onCTA?: () => void;
}

export function SpotlightModal({
  release,
  onClose,
  onCTA,
}: SpotlightModalProps) {
  const sp = release.spotlight;
  const featureName = sp ? COPY.modal.heroFeatureNames[sp.hero] : undefined;
  const [step, setStep] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroScale, setHeroScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  // The stage is drawn 580×300; its box follows the scale so a narrow sheet
  // has no blank band under the art.
  const stageHeight = Math.round(300 * heroScale);

  useEffect(() => {
    if (!sp) return;
    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, sp]);

  // isMobile tracks viewport width — intentionally separate from heroScale so
  // the dialog layout never feeds back into the ResizeObserver measurement.
  useEffect(() => {
    if (!sp) return;
    function update() {
      setIsMobile(window.innerWidth < 580);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sp]);

  // heroScale tracks the actual rendered width of the hero container so the
  // 580×300 stage scales down correctly on narrow viewports.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setHeroScale(Math.min(1, entry.contentRect.width / 580));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!sp) return null;
  const totalSteps = sp.steps.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        // A phone gets a sheet from the bottom with rounded top corners; a wide
        // screen a centred card.
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 32,
        zIndex: 200,
      }}
      // A tap on the backdrop closes it, like Escape and Maybe later.
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-modal-title"
        // B+ rule 7: the blue-to-pink top edge that follows the rounded top
        // corners and fades down the sides (more-r3-feature_modal). The fill
        // and the edge are one layered background, so the sheet-edge utility
        // owns both, and the elevated fill comes in through --sheet-bg.
        className="sheet-edge"
        style={{
          ['--sheet-bg' as string]: 'var(--bg-elevated)',
          // 520 wide as drawn; the 580x300 stage scales to it.
          width: isMobile ? '100%' : 520,
          maxWidth: '100%',
          height: 'auto',
          // `svh`, not `vh`: a sheet pinned to the bottom must not sit behind
          // the URL bar.
          maxHeight: isMobile ? '92svh' : '90vh',
          borderRadius: isMobile ? '22px 22px 0 0' : 20,
          boxShadow: isMobile
            ? '0 -16px 48px rgba(0,0,0,0.45)'
            : '0 32px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
        }}
      >
        {/* hero — 580×300 Showtime stage per SHOWTIME_HANDOFF.md §2. Its box
            is as tall as the scaled stage, so a narrow sheet has no blank band
            under the art. */}
        <div
          ref={heroRef}
          data-testid="spotlight-hero"
          style={{
            position: 'relative',
            height: stageHeight,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Scale wrapper: always present; scale=1 when container ≥ 580px */}
          <div
            style={{
              width: '100%',
              height: stageHeight,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 580,
                height: 300,
                transform: `scale(${heroScale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <SpotlightHero hero={sp.hero} />
            </div>
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
          {/* more-r3-feature_modal: the eyebrow sits in the body above the
              title, not over the art, so it can never land on a hero's corner
              content. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span
              aria-hidden
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
              }}
            >
              {featureName
                ? `${COPY.modal.newFeaturePrefix}${featureName}`
                : `${COPY.modal.featureDropPrefix}${release.version}`}
            </span>
          </div>
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
                  {COPY.modal.walkthroughLabel}
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
                  {String(step + 1).padStart(2, '0')}
                  {COPY.modal.stepSeparator}
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
                {/* more-r3-feature_modal: a plain gradient numeral, no circle. */}
                <div
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: 20,
                    fontSize: 24,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    background:
                      'linear-gradient(135deg, var(--signal), var(--cta-end))',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
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
                  {COPY.modal.prevButton}
                </button>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStep(idx)}
                      aria-label={COPY.modal.stepIndicatorAriaLabel(idx + 1)}
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
                  {COPY.modal.nextButton}
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
                {sp.founderEyebrow ?? COPY.modal.founderEyebrowFallback}
              </div>
              {(Array.isArray(sp.founderNote)
                ? sp.founderNote
                : [sp.founderNote]
              ).map((para, idx) => (
                <p
                  key={idx}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--fg)',
                    letterSpacing: '-0.005em',
                    margin: 0,
                    marginTop: idx > 0 ? 10 : 0,
                  }}
                >
                  {para}
                </p>
              ))}
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
                {sp.founderSign ?? COPY.modal.founderSignFallback}
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
              whiteSpace: 'nowrap',
            }}
          >
            {COPY.modal.dismissCta}
          </button>
          <span style={{ flex: 1 }} />
          {sp.cta && sp.ctaHref ? (
            <button
              type="button"
              onClick={onCTA ?? onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                // The gradient pill with the signal glow, as drawn
                // (more-r3-feature_modal, notif-tab-failed-m).
                background:
                  'linear-gradient(135deg, var(--signal), var(--cta-end))',
                color: 'var(--fg-on-accent)',
                padding: '12px 20px',
                whiteSpace: 'nowrap',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                boxShadow:
                  '0 8px 24px color-mix(in oklab, var(--signal) 22%, transparent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {sp.cta}
              {/* The drawn arrow glyph (→), not a chevron. */}
              <svg
                width="14"
                height="12"
                viewBox="0 0 14 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1.5 6h10.5M8 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
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
                // The gradient pill with the signal glow, as drawn
                // (more-r3-feature_modal, notif-tab-failed-m).
                background:
                  'linear-gradient(135deg, var(--signal), var(--cta-end))',
                color: 'var(--fg-on-accent)',
                padding: '12px 20px',
                whiteSpace: 'nowrap',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                boxShadow:
                  '0 8px 24px color-mix(in oklab, var(--signal) 22%, transparent)',
              }}
            >
              {COPY.modal.fallbackCta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
