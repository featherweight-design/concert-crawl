'use client'

// The tour's search field, and the control that opens it.
//
// Both are drawn here because they are the same object in two states: the
// trigger is a field that has not been typed in yet. That is the cheapest way
// to say "this stays inside the step" — a dashed strip promises a door, and
// the thing behind this one is the same box you just pressed.
//
// Geometry is IMPORTED from the search surface, not matched to it. The brief
// asks for "the same object as the one on /search", and two copies of the same
// numbers stop being the same object the first time either moves.

import { Search, X } from 'lucide-react'
import { forwardRef } from 'react'
import {
  SEARCH_FIELD_BOX,
  SEARCH_FIELD_FONT_SIZE,
} from '@/components/consumer/search/definitions/constants'
import { ARTIST_PICKER_COPY } from './definitions/copy'

interface SearchTriggerProps {
  onOpen: () => void
}

export const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(
  function SearchTrigger({ onOpen }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{ ...SEARCH_FIELD_BOX, color: 'var(--fg-muted)' }}
      >
        <Search size={18} strokeWidth={1.5} aria-hidden />
        {/* The same type as the field it becomes. The premise of this file is
            one object in two states, and text that changes size and typeface
            mid-swap is two. */}
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: SEARCH_FIELD_FONT_SIZE,
            fontWeight: 500,
          }}
        >
          {ARTIST_PICKER_COPY.searchEscape}
        </span>
      </button>
    )
  },
)

interface SearchFieldProps {
  value: string
  onChange: (next: string) => void
  onClose: () => void
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ value, onChange, onClose }, ref) {
    return (
      <div style={SEARCH_FIELD_BOX}>
        <span
          aria-hidden
          style={{ color: 'var(--fg-muted)', display: 'inline-flex' }}
        >
          <Search size={18} strokeWidth={1.5} />
        </span>
        <input
          ref={ref}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          // Escape closes the mode rather than clearing the field: the field is
          // the mode, and a cleared box with no rows under it is the same
          // screen as the one Escape is asking to leave.
          onKeyDown={(ev) => {
            if (ev.key === 'Escape') onClose()
          }}
          placeholder={ARTIST_PICKER_COPY.searchPlaceholder}
          aria-label={ARTIST_PICKER_COPY.searchFieldLabel}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            fontSize: SEARCH_FIELD_FONT_SIZE,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
          }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={ARTIST_PICKER_COPY.searchCloseLabel}
          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
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
          <X size={12} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    )
  },
)
