'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export type InspectorTab = 'overview' | 'diagnostics' | 'history'

interface InspectorTabsProps {
  value: InspectorTab
  onChange: (tab: InspectorTab) => void
  hasDiagnostics: boolean
}

export const InspectorTabs = ({
  value,
  onChange,
  hasDiagnostics,
}: InspectorTabsProps) => {
  const tabs: Array<{
    key: InspectorTab
    label: string
    disabled?: boolean
    dot?: 'danger' | null
  }> = [
    { key: 'overview', label: ADMIN_COPY.crawl.inspectorTabs.overview },
    {
      key: 'diagnostics',
      label: ADMIN_COPY.crawl.inspectorTabs.diagnostics,
      disabled: !hasDiagnostics,
      dot: hasDiagnostics ? 'danger' : null,
    },
    { key: 'history', label: ADMIN_COPY.crawl.inspectorTabs.history },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '0 22px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = value === tab.key
        const disabled = tab.disabled

        return (
          <button
            key={tab.key}
            onClick={() => !disabled && onChange(tab.key)}
            disabled={disabled}
            style={{
              all: 'unset' as const,
              cursor: disabled ? 'not-allowed' : 'pointer',
              position: 'relative',
              padding: '12px 14px',
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              color: disabled
                ? 'var(--fg-subtle)'
                : active
                  ? 'var(--fg)'
                  : 'var(--fg-muted)',
              opacity: disabled ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: active
                ? '2px solid var(--signal)'
                : '2px solid transparent',
              marginBottom: -1,
              boxSizing: 'border-box' as const,
              background: 'none',
            }}
          >
            {tab.label}
            {tab.dot && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: `var(--${tab.dot})`,
                  boxShadow: `0 0 0 3px color-mix(in oklab, var(--${tab.dot}) 22%, transparent)`,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
