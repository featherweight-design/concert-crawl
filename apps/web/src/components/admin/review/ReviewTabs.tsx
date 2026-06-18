'use client'

import { useCallback, useRef, type KeyboardEvent } from 'react'

export type ReviewTabKind = 'warning' | 'signal' | 'danger'

export interface ReviewTabDescriptor {
  key: string
  label: string
  count?: number
  /**
   * Drives the active-badge background colour. Maps to a CSS token via
   * `var(--{kind})`. Optional — when omitted, the active badge falls back
   * to `var(--signal)`.
   */
  kind?: ReviewTabKind
}

export interface ReviewTabsProps {
  tabs: ReadonlyArray<ReviewTabDescriptor>
  activeTab: string
  onChange: (key: string) => void
  'aria-label'?: string
}

export const ReviewTabs = ({
  tabs,
  activeTab,
  onChange,
  'aria-label': ariaLabel,
}: ReviewTabsProps) => {
  // Refs keyed by tab key so arrow navigation can move both selection AND DOM
  // focus — required by WAI-ARIA tabs pattern. Without this, focus stays on
  // the original tab even after it loses tabIndex=0.
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())

  const focusTab = useCallback((key: string) => {
    tabRefs.current.get(key)?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (evt: KeyboardEvent<HTMLButtonElement>, focusedKey: string) => {
      const idx = tabs.findIndex((tab) => tab.key === focusedKey)
      if (idx === -1) return
      if (evt.key === 'ArrowRight') {
        evt.preventDefault()
        const next = tabs[(idx + 1) % tabs.length]
        if (next) {
          onChange(next.key)
          focusTab(next.key)
        }
      } else if (evt.key === 'ArrowLeft') {
        evt.preventDefault()
        const next = tabs[(idx - 1 + tabs.length) % tabs.length]
        if (next) {
          onChange(next.key)
          focusTab(next.key)
        }
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault()
        onChange(focusedKey)
      }
    },
    [tabs, onChange, focusTab],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        padding: 4,
        background: 'var(--surface-1)',
        borderRadius: 11,
        border: '1px solid var(--border)',
        gap: 6,
      }}
    >
      {tabs.map(({ key, label, count, kind }) => {
        const isActive = key === activeTab
        const activeBadgeBg =
          kind !== undefined ? `var(--${kind})` : 'var(--signal)'
        return (
          <button
            key={key}
            ref={(el) => {
              if (el) tabRefs.current.set(key, el)
              else tabRefs.current.delete(key)
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(evt) => handleKeyDown(evt, key)}
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 16px',
              border: 'none',
              borderRadius: 8,
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: isActive
                ? '0 1px 2px rgba(0,0,0,0.18), 0 0 0 1px var(--border)'
                : 'none',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13.5,
              fontWeight: isActive ? 700 : 600,
              color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 18,
                  height: 18,
                  padding: '0 6px',
                  borderRadius: 9,
                  background: isActive ? activeBadgeBg : 'var(--surface-2)',
                  color: isActive ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
