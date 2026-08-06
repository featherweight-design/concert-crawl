'use client'

import { useRef } from 'react'

export interface CrewTab {
  id: string
  label: string
  count: number
}

interface CrewTabsProps {
  tabs: CrewTab[]
  active: string
  onSelect: (id: string) => void
  label: string
  /** Stable per-page prefix so the panels can point back at their tab. */
  idPrefix: string
  wide: boolean
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`

/**
 * The ARIA tabs pattern with automatic activation: an arrow both moves focus
 * and selects, since every panel is already in hand and none costs a fetch.
 * Roving tabIndex means the strip
 * is one tab stop and the arrows move within it; wrapping at both ends is what
 * makes a three-tab strip navigable without counting.
 */
export const CrewTabs = ({
  tabs,
  active,
  onSelect,
  label,
  idPrefix,
  wide,
}: CrewTabsProps) => {
  const stripRef = useRef<HTMLDivElement>(null)

  const focusTab = (id: string) => {
    onSelect(id)
    stripRef.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(idPrefix, id))}`)
      ?.focus()
  }

  const onKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active)
    if (index < 0) return
    const last = tabs.length - 1
    const next =
      ev.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : ev.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : ev.key === 'Home'
            ? 0
            : ev.key === 'End'
              ? last
              : null
    if (next === null) return
    ev.preventDefault()
    const target = tabs[next]
    if (target !== undefined) focusTab(target.id)
  }

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: wide ? 6 : 4,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            className="cursor-pointer"
            style={{
              // A 44px hit area wrapping a 34px pill: the target is the
              // accessible size without the strip looking like one.
              minHeight: 44,
              padding: 0,
              background: 'none',
              border: 'none',
              // Narrow divides the row between the tabs rather than letting the
              // strip overflow: a scrolled-off third tab reads as a missing
              // section, since a strip this short shows no scroll affordance.
              flex: wide ? '0 0 auto' : '1 1 0',
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: wide ? 6 : 4,
                minHeight: 34,
                padding: wide ? '7px 12px' : '7px 6px',
                borderRadius: 8,
                background: selected ? 'var(--surface-2)' : 'transparent',
                border: `1px solid var(--${selected ? 'border-strong' : 'border'})`,
                fontFamily: 'var(--font-ui)',
                fontSize: 12.5,
                // Weight is identical in both states on purpose: a bolder
                // active tab reflows the strip every time it changes.
                fontWeight: 700,
                color: selected ? 'var(--fg)' : 'var(--fg-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  color: selected ? 'var(--signal)' : 'var(--fg-subtle)',
                }}
              >
                {tab.count}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
