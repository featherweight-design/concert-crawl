'use client'

import { useCallback, type KeyboardEvent } from 'react'

export interface ReviewTabDescriptor {
  key: string
  label: string
  count?: number
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
  const handleKeyDown = useCallback(
    (evt: KeyboardEvent<HTMLButtonElement>, focusedKey: string) => {
      const idx = tabs.findIndex((tab) => tab.key === focusedKey)
      if (idx === -1) return
      if (evt.key === 'ArrowRight') {
        evt.preventDefault()
        const next = tabs[(idx + 1) % tabs.length]
        if (next) onChange(next.key)
      } else if (evt.key === 'ArrowLeft') {
        evt.preventDefault()
        const next = tabs[(idx - 1 + tabs.length) % tabs.length]
        if (next) onChange(next.key)
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault()
        onChange(focusedKey)
      }
    },
    [tabs, onChange],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        padding: 4,
        background: 'var(--surface-1)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        gap: 6,
      }}
    >
      {tabs.map(({ key, label, count }) => {
        const isActive = key === activeTab
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(evt) => handleKeyDown(evt, key)}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              border: 'none',
              borderRadius: 7,
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 9,
                  background: isActive ? 'var(--signal)' : 'var(--surface-2)',
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
