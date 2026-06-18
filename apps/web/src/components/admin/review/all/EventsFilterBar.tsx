'use client'

import { useState } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { StatusBadge } from '@/components/admin/primitives'
import {
  EMPTY_FILTERS,
  MISSING_DATA_FLAGS,
  countActiveFilters,
  type AllEventsFilters,
  type MissingDataFlag,
  type VerificationFilter,
} from './filters'

export interface EventsFilterBarProps {
  filters: AllEventsFilters
  onChange: (next: AllEventsFilters) => void
}

const COPY = ADMIN_COPY.review.allEvents.filters

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
}

const VerificationSegmented = ({
  value,
  onChange,
}: {
  value: VerificationFilter
  onChange: (next: VerificationFilter) => void
}) => {
  const options: ReadonlyArray<{ key: VerificationFilter; label: string }> = [
    { key: 'all', label: COPY.verification.all },
    { key: 'verified', label: COPY.verification.verified },
    { key: 'unverified', label: COPY.verification.unverified },
  ]
  return (
    <div
      role="group"
      aria-label={COPY.verification.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 3,
        gap: 2,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        height: 32,
      }}
    >
      {options.map(({ key, label }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '0 12px',
              borderRadius: 6,
              height: 24,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: active
                ? '0 1px 2px rgba(0,0,0,0.10), 0 0 0 1px var(--border)'
                : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export const EventsFilterBar = ({
  filters,
  onChange,
}: EventsFilterBarProps) => {
  const [genreDraft, setGenreDraft] = useState('')
  const activeCount = countActiveFilters(filters)

  const update = (patch: Partial<AllEventsFilters>) => {
    onChange({ ...filters, ...patch })
  }

  const addGenre = () => {
    const tag = genreDraft.trim().toLowerCase()
    if (!tag || filters.genre.includes(tag)) {
      setGenreDraft('')
      return
    }
    update({ genre: [...filters.genre, tag] })
    setGenreDraft('')
  }

  const removeGenre = (tag: string) => {
    update({ genre: filters.genre.filter((existing) => existing !== tag) })
  }

  const toggleMissing = (flag: MissingDataFlag) => {
    const next = filters.missingData.includes(flag)
      ? filters.missingData.filter((existing) => existing !== flag)
      : [...filters.missingData, flag]
    update({ missingData: next })
  }

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 13,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="search"
          value={filters.query}
          onChange={(evt) => update({ query: evt.target.value })}
          placeholder={COPY.searchPlaceholder}
          aria-label={COPY.searchAriaLabel}
          style={{
            flex: '1 1 240px',
            minWidth: 200,
            height: 32,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-1)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--fg)',
          }}
        />
        <VerificationSegmented
          value={filters.verified}
          onChange={(next) => update({ verified: next })}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>{COPY.dateFromLabel}</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(evt) => update({ dateFrom: evt.target.value })}
            aria-label={COPY.dateFromLabel}
            style={{
              height: 32,
              padding: '0 8px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-1)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              color: 'var(--fg)',
            }}
          />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>{COPY.dateToLabel}</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(evt) => update({ dateTo: evt.target.value })}
            aria-label={COPY.dateToLabel}
            style={{
              height: 32,
              padding: '0 8px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-1)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              color: 'var(--fg)',
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={labelStyle}>{COPY.genreLabel}</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {filters.genre.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 999,
                background: 'var(--surface-2)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg)',
              }}
            >
              {tag}
              <button
                type="button"
                aria-label={COPY.removeGenre(tag)}
                onClick={() => removeGenre(tag)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--fg-muted)',
                  padding: 0,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={genreDraft}
            onChange={(evt) => setGenreDraft(evt.target.value)}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter') {
                evt.preventDefault()
                addGenre()
              }
            }}
            placeholder={COPY.genreInputPlaceholder}
            aria-label={COPY.genreLabel}
            style={{
              flex: '0 1 160px',
              height: 28,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-1)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              color: 'var(--fg)',
            }}
          />
          <button
            type="button"
            onClick={addGenre}
            style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-1)',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg)',
            }}
          >
            {COPY.addGenre}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={labelStyle}>{COPY.missingDataLabel}</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {MISSING_DATA_FLAGS.map((flag) => {
            const checked = filters.missingData.includes(flag)
            return (
              <label
                key={flag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5,
                  color: 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMissing(flag)}
                />
                {COPY.missingFlag[flag]}
              </label>
            )
          })}
        </div>
      </div>

      {activeCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <StatusBadge kind="neutral" mono>
            {COPY.activeCount(activeCount)}
          </StatusBadge>
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.clearAll}
          </button>
        </div>
      )}
    </div>
  )
}
