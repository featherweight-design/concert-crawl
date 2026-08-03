'use client'

import { THEMES, THEME_META, type ThemeName } from './themes'
import { MiniMark } from './MiniMark'
import { THEME_COPY } from './definitions/copy'

export function ThemeSwatch({
  name,
  active,
  onClick,
  disabled,
}: {
  name: ThemeName
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const tokens = THEMES[name]
  const meta = THEME_META[name]
  const hasDistinctAccent2 = tokens['accent-2'] !== tokens['accent']

  return (
    <button
      type="button"
      aria-label={`${meta.label} theme`}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className="theme-swatch-btn"
      style={{
        all: 'unset',
        cursor: disabled ? 'wait' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 14,
        padding: 12,
        background: tokens['bg'],
        border: active
          ? `1.5px solid ${tokens['signal']}`
          : `1px solid ${tokens['border-strong']}`,
        transition: 'transform 120ms ease',
        minWidth: 0,
      }}
    >
      {/* Dots row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MiniMark tokens={tokens} size={22} />
        <span style={{ display: 'flex', gap: 4 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: tokens['signal'],
              display: 'block',
            }}
          />
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: tokens['accent'],
              display: 'block',
            }}
          />
          {hasDistinctAccent2 && (
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: tokens['accent-2'],
                display: 'block',
              }}
            />
          )}
        </span>
        {active && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              fontWeight: 700,
              color: tokens['signal'],
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {THEME_COPY.swatch.activeLabel}
          </span>
        )}
      </div>

      {/* Mini gig card */}
      <div
        style={{
          background: tokens['surface-1'],
          border: `1px solid ${tokens['border']}`,
          borderRadius: 8,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 800,
            color: tokens['fg'],
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {THEME_COPY.swatch.sampleGig.artist}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 900,
              color: tokens['signal'],
              letterSpacing: '-0.02em',
            }}
          >
            {THEME_COPY.swatch.sampleGig.price}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              fontWeight: 700,
              color: tokens['fg-subtle'],
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            {THEME_COPY.swatch.sampleGig.tier}
          </span>
        </div>
      </div>

      {/* Label + role pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 700,
            color: tokens['fg'],
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            fontWeight: 600,
            color: tokens['fg-muted'],
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {meta.role === 'base' ? meta.mode : meta.role}
        </span>
      </div>
    </button>
  )
}
