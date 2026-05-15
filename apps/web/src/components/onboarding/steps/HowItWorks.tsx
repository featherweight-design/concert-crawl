import React from 'react'
import { Eyebrow, StepHeading, Lede } from './_primitives'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.howItWorks

const SOURCE_COLORS: Record<string, string> = {
  primary: 'var(--fg-muted)',
  community: 'var(--signal)',
  resale: 'var(--warning)',
}

function PriceSourceChip({ label, kind }: { label: string; kind: string }) {
  const color = SOURCE_COLORS[kind] ?? 'var(--fg-muted)'
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: '2px 5px',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

function PriceSourcesList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Flat grid: chip column sized to widest chip, descriptions share one left edge */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr',
          columnGap: 10,
          rowGap: 6,
          alignItems: 'center',
        }}
      >
        {copy.priceSources.map((source) => (
          <React.Fragment key={source.kind}>
            <div style={{ justifySelf: 'start', alignSelf: 'center' }}>
              <PriceSourceChip label={source.label} kind={source.kind} />
            </div>
            <span
              style={{
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--fg-muted)',
                letterSpacing: '-0.005em',
              }}
            >
              {source.description}
            </span>
          </React.Fragment>
        ))}
      </div>
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--fg-subtle)',
          letterSpacing: '-0.005em',
          marginTop: 2,
        }}
      >
        {copy.noPrice}
      </span>
    </div>
  )
}

export function HowItWorks() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <StepHeading>{copy.heading}</StepHeading>
      <Lede>{copy.lede}</Lede>
      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {copy.rows.map((row, ii) => (
          <div
            key={row.kicker}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 14,
              padding: '16px',
              borderTop: ii === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--surface-3)',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--signal)',
                letterSpacing: '0.04em',
              }}
            >
              {row.kicker}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.01em',
                }}
              >
                {row.title}
              </div>
              {row.body !== null ? (
                <div
                  style={{
                    fontFamily: 'Inter, system-ui',
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    color: 'var(--fg-muted)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {row.body}
                </div>
              ) : (
                <PriceSourcesList />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
