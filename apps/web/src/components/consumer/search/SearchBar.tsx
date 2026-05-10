'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowLeft } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (val: string) => void
  onClear: () => void
  showBack?: boolean
  autoFocus?: boolean
}

export function SearchBar({
  value,
  onChange,
  onClear,
  showBack = false,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px 12px',
      }}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 44,
          padding: '0 14px',
          borderRadius: 12,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            color: 'var(--fg-muted)',
            flexShrink: 0,
            display: 'inline-flex',
          }}
        >
          <Search size={18} strokeWidth={1.5} />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          placeholder="Search artists, venues…"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            fontSize: 15,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
          }}
        />
        {value && (
          <button
            onClick={onClear}
            aria-label="Clear search"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 24,
              height: 24,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-3)',
              color: 'var(--fg-muted)',
              flexShrink: 0,
            }}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
