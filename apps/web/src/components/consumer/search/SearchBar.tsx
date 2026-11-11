'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft } from 'lucide-react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  SEARCH_FIELD_BOX,
  SEARCH_FIELD_FONT_SIZE,
  SEARCH_FIELD_GRADIENT_EDGE,
} from './definitions/constants';

const copy = CONSUMER_COPY.search;

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  showBack?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  showBack = false,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

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
          aria-label={copy.backAriaLabel}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 44,
            height: 44,
            marginLeft: -8,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg)',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
      )}
      {/* The shared field box, under the B+ blue-to-pink edge
          (`more-r3-search_m`). The edge is this bar's alone: the onboarding
          tour borrows the box, not the edge. */}
      <div
        style={{
          flex: 1,
          ...SEARCH_FIELD_BOX,
          ...SEARCH_FIELD_GRADIENT_EDGE,
        }}
      >
        <span
          style={{
            color: 'var(--signal)',
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
          placeholder={copy.searchPlaceholder}
          aria-label={copy.inputAriaLabel}
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
        {value && (
          <button
            onClick={onClear}
            aria-label={copy.clearSearchAriaLabel}
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
  );
}
