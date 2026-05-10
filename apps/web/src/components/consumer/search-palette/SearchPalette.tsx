'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSearch } from '../../../lib/search/useSearch'
import { SearchDefaultState } from '../search/SearchDefaultState'
import { SearchResultsState } from '../search/SearchResultsState'
import { SearchEmptyState } from '../search/SearchEmptyState'

interface SearchPaletteProps {
  open: boolean
  onClose: () => void
}

const kbdStyle: React.CSSProperties = {
  padding: '1px 5px',
  borderRadius: 3,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-1)',
  color: 'var(--fg-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
}

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const search = useSearch()
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const selectedIdxRef = useRef(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    selectedIdxRef.current = -1
    setSelectedIdx(-1)
  }, [search.query])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      search.clearQuery()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return

    const artistResults = search.artistResults
    const venueResults = search.venueResults
    const totalResults = artistResults.length + venueResults.length

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        const nextIdx = Math.min(selectedIdxRef.current + 1, totalResults - 1)
        selectedIdxRef.current = nextIdx
        setSelectedIdx(nextIdx)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const nextIdx = Math.max(selectedIdxRef.current - 1, -1)
        selectedIdxRef.current = nextIdx
        setSelectedIdx(nextIdx)
      } else if (event.key === 'Enter' && selectedIdxRef.current >= 0) {
        event.preventDefault()
        const currentIdx = selectedIdxRef.current
        const artistCount = artistResults.length
        if (currentIdx < artistCount) {
          const artist = artistResults[currentIdx]
          if (artist) {
            search.navigateTo('artist', artist.name)
            onClose()
          }
        } else {
          const venue = venueResults[currentIdx - artistCount]
          if (venue) {
            search.navigateTo('venue', { slug: venue.slug })
            onClose()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, search, onClose])

  if (!open) return null

  const hasResults =
    search.artistResults.length > 0 || search.venueResults.length > 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          width: 560,
          maxHeight: 540,
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow:
            '0 24px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
        }}
      >
        {/* Search bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 18px',
            height: 56,
            flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--fg-muted)', display: 'inline-flex' }}>
            <Search size={18} strokeWidth={1.5} />
          </span>
          <input
            ref={inputRef}
            value={search.query}
            onChange={(ev) => search.setQuery(ev.target.value)}
            placeholder="Search artists or venues…"
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
          {search.query && (
            <button
              onClick={search.clearQuery}
              aria-label="Clear"
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 22,
                height: 22,
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                color: 'var(--fg-muted)',
              }}
            >
              <X size={10} strokeWidth={1.5} />
            </button>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-subtle)',
              padding: '3px 6px',
              borderRadius: 4,
              border: '1px solid var(--border-strong)',
            }}
          >
            esc
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {search.query.trim() === '' && (
            <SearchDefaultState
              recentSearches={search.recentSearches}
              popularEvents={search.popularEvents}
              onPickQuery={search.setQuery}
              onPickEvent={search.navigateTo}
            />
          )}
          {search.query.trim() !== '' && hasResults && (
            <SearchResultsState
              artistResults={search.artistResults}
              venueResults={search.venueResults}
              selectedIdx={selectedIdx}
              onHover={(idx) => {
                selectedIdxRef.current = idx
                setSelectedIdx(idx)
              }}
              onNavigateTo={(type, value) => {
                search.navigateTo(type, value)
                onClose()
              }}
            />
          )}
          {search.query.trim() !== '' && !hasResults && (
            <SearchEmptyState query={search.query} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            padding: '0 16px',
            height: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <kbd style={kbdStyle}>↑</kbd>
            <kbd style={kbdStyle}>↓</kbd> navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <kbd style={kbdStyle}>↵</kbd> open
          </span>
          <span
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ color: 'var(--accent)' }}>●</span>
            concert<span style={{ color: 'var(--accent)' }}>crawl.</span>
          </span>
        </div>
      </div>
    </div>
  )
}
