'use client'

import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface Props {
  currentFilter: string | undefined
}

const OPTIONS = [
  { value: '', label: ADMIN_COPY.venuesPage.options.all },
  { value: 'active', label: ADMIN_COPY.venuesPage.options.active },
  { value: 'paused', label: ADMIN_COPY.venuesPage.options.paused },
  { value: 'blocked', label: ADMIN_COPY.venuesPage.options.blocked },
]

export function VenueStatusFilterButton({ currentFilter }: Props) {
  const router = useRouter()
  const isFiltered = Boolean(currentFilter)

  function handleChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const val = evt.target.value
    if (val) {
      router.push(`/admin/venues?status=${val}`)
    } else {
      router.push('/admin/venues')
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 14px',
          borderRadius: 8,
          border: `1px solid ${isFiltered ? 'var(--signal)' : 'var(--border-strong)'}`,
          background: isFiltered
            ? 'color-mix(in oklab, var(--signal) 10%, transparent)'
            : 'var(--bg-elevated)',
          fontFamily: 'var(--admin-font, Inter, sans-serif)',
          fontSize: 13,
          fontWeight: 600,
          color: isFiltered ? 'var(--signal)' : 'var(--fg)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <Filter size={14} />
        {isFiltered
          ? (OPTIONS.find((opt) => opt.value === currentFilter)?.label ??
            ADMIN_COPY.venuesPage.statusFallback)
          : ADMIN_COPY.venuesPage.statusFallback}
      </div>
      <select
        aria-label={ADMIN_COPY.venuesPage.ariaLabel}
        value={currentFilter ?? ''}
        onChange={handleChange}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
