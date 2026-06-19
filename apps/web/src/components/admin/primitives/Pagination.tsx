'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  ChevronDown,
} from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  PAGINATION_PAGE_SIZE_OPTIONS,
  derivePagination,
  pageWindow,
} from './pagination-logic'

const ADMIN_MONO = "'JetBrains Mono', monospace"
const ADMIN_FONT = "'Inter', sans-serif"

const COPY = ADMIN_COPY.pagination

// Reusable pager for every admin Review tab. Server-driven (limit/offset);
// the parent owns `page`/`pageSize` and feeds in `total`. Renders inside a
// <Panel padding={0}> as its footer — same visual on every surface.
//
// Mobile collapse: a ResizeObserver swaps to a stacked Prev · Page X / Y ·
// Next layout under ~560px so the same component works on phones. Force
// either mode with `forceCompact` (used by tests and the design canvas).
export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (next: number) => void
  onPageSizeChange?: (next: number) => void
  pageSizeOptions?: ReadonlyArray<number>
  loading?: boolean
  showSizeSelector?: boolean
  itemLabel?: string
  forceCompact?: boolean
  threshold?: number
}

const usePagerCompact = (
  ref: React.RefObject<HTMLDivElement | null>,
  threshold: number,
  force?: boolean,
): boolean => {
  const [compact, setCompact] = useState<boolean>(force ?? false)
  useEffect(() => {
    if (force !== undefined) {
      setCompact(force)
      return
    }
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCompact(entry.contentRect.width < threshold)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [force, ref, threshold])
  return compact
}

interface PagerBtnProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  ariaLabel: string
  size?: number
  mono?: boolean
  grow?: boolean
}

const PagerBtn = ({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
  size = 32,
  mono = true,
  grow = false,
}: PagerBtnProps) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-current={active ? 'page' : undefined}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      all: 'unset',
      boxSizing: 'border-box',
      cursor: disabled ? 'not-allowed' : 'pointer',
      minWidth: size,
      height: size,
      padding: '0 9px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 8,
      fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
      fontSize: mono ? 12 : 13,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '0.02em',
      flex: grow ? 1 : '0 0 auto',
      color: active
        ? 'var(--fg-on-accent)'
        : disabled
          ? 'var(--fg-subtle)'
          : 'var(--fg)',
      background: active ? 'var(--signal)' : 'transparent',
      border: `1px solid ${active ? 'var(--signal)' : 'var(--border-strong)'}`,
      opacity: disabled && !active ? 0.45 : 1,
      transition: 'background .12s, border-color .12s, color .12s',
    }}
  >
    {children}
  </button>
)

interface SizeSelectProps {
  value: number
  options: ReadonlyArray<number>
  onChange: ((next: number) => void) | undefined
  disabled?: boolean
}

const SizeSelect = ({
  value,
  options,
  onChange,
  disabled,
}: SizeSelectProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (evt: MouseEvent) => {
      if (ref.current && !ref.current.contains(evt.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: ADMIN_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {COPY.rowsLabel}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={COPY.sizeSelectorAriaLabel}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
          height: 30,
          padding: '0 8px 0 10px',
          borderRadius: 7,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-elevated)',
          fontFamily: ADMIN_MONO,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--fg)',
          fontVariantNumeric: 'tabular-nums',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {value}
        <ChevronDown size={13} color="var(--fg-subtle)" />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 38,
            minWidth: 88,
            padding: 4,
            zIndex: 30,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow:
              '0 14px 32px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.12)',
          }}
        >
          {options.map((opt) => {
            const selected = opt === value
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange?.(opt)
                  setOpen(false)
                }}
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '7px 10px',
                  borderRadius: 6,
                  fontFamily: ADMIN_MONO,
                  fontSize: 12,
                  fontWeight: 700,
                  color: selected ? 'var(--signal)' : 'var(--fg)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {opt}
                {selected && <Check size={13} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface RangeReadoutProps {
  start: number
  end: number
  total: number
  itemLabel: string
}

const RangeReadout = ({ start, end, total, itemLabel }: RangeReadoutProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontFamily: ADMIN_MONO,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {total === 0 ? (
        <span style={{ color: 'var(--fg-subtle)' }}>
          {COPY.noResults(itemLabel)}
        </span>
      ) : (
        <>
          <span style={{ fontWeight: 700, color: 'var(--fg)' }}>
            {start.toLocaleString()}–{end.toLocaleString()}
          </span>
          <span style={{ color: 'var(--fg-muted)' }}> {COPY.of} </span>
          <span style={{ fontWeight: 700, color: 'var(--fg)' }}>
            {total.toLocaleString()}
          </span>
        </>
      )}
    </span>
  </div>
)

export const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGINATION_PAGE_SIZE_OPTIONS,
  loading = false,
  showSizeSelector = true,
  itemLabel = 'results',
  forceCompact,
  threshold = 560,
}: PaginationProps) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const compact = usePagerCompact(wrapRef, threshold, forceCompact)
  const state = derivePagination({ page, pageSize, total })

  const go = (next: number) =>
    onPageChange(Math.min(state.totalPages, Math.max(1, next)))

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
    gap: compact ? 10 : 16,
    flexDirection: compact ? 'column' : 'row',
    flexWrap: compact ? 'nowrap' : 'wrap',
    justifyContent: 'space-between',
    padding: compact ? '10px 14px' : '11px 18px',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface-1)',
    borderRadius: '0 0 12px 12px',
    opacity: loading ? 0.72 : 1,
    pointerEvents: loading ? 'none' : 'auto',
    transition: 'opacity .15s',
  }

  if (compact) {
    return (
      <nav ref={wrapRef} aria-label={COPY.navAriaLabel} style={footerStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 12,
          }}
        >
          <RangeReadout
            start={state.start}
            end={state.end}
            total={state.total}
            itemLabel={itemLabel}
          />
          {showSizeSelector && (
            <SizeSelect
              value={state.pageSize}
              options={pageSizeOptions}
              onChange={onPageSizeChange}
              disabled={loading}
            />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 8,
            width: '100%',
          }}
        >
          <PagerBtn
            onClick={() => go(state.page - 1)}
            disabled={state.atFirst}
            size={44}
            mono={false}
            grow
            ariaLabel={COPY.previousAriaLabel}
          >
            <ChevronLeft size={16} /> {COPY.prev}
          </PagerBtn>
          <div
            style={{
              flex: '1.2 1 0',
              height: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              fontFamily: ADMIN_MONO,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--fg-muted)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            }}
          >
            <span>
              <span style={{ color: 'var(--fg)' }}>
                {COPY.pageLabel} {state.page}
              </span>{' '}
              / {state.totalPages}
            </span>
          </div>
          <PagerBtn
            onClick={() => go(state.page + 1)}
            disabled={state.atLast}
            size={44}
            mono={false}
            grow
            ariaLabel={COPY.nextAriaLabel}
          >
            {COPY.next} <ChevronRight size={16} />
          </PagerBtn>
        </div>
      </nav>
    )
  }

  const window = pageWindow(state.page, state.totalPages)
  return (
    <nav ref={wrapRef} aria-label={COPY.navAriaLabel} style={footerStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          minWidth: 0,
          flexWrap: 'wrap',
        }}
      >
        <RangeReadout
          start={state.start}
          end={state.end}
          total={state.total}
          itemLabel={itemLabel}
        />
        {showSizeSelector && (
          <>
            <span
              style={{
                width: 1,
                height: 18,
                background: 'var(--border)',
              }}
            />
            <SizeSelect
              value={state.pageSize}
              options={pageSizeOptions}
              onChange={onPageSizeChange}
              disabled={loading}
            />
          </>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PagerBtn
            onClick={() => go(1)}
            disabled={state.atFirst}
            ariaLabel={COPY.firstAriaLabel}
          >
            <ChevronsLeft size={14} />
          </PagerBtn>
          <PagerBtn
            onClick={() => go(state.page - 1)}
            disabled={state.atFirst}
            ariaLabel={COPY.previousAriaLabel}
          >
            <ChevronLeft size={14} />
          </PagerBtn>
          {window.map((pageNumber, idx) =>
            pageNumber === '…' ? (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  minWidth: 22,
                  textAlign: 'center',
                  color: 'var(--fg-subtle)',
                  fontFamily: ADMIN_MONO,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                …
              </span>
            ) : (
              <PagerBtn
                key={pageNumber}
                onClick={() => go(pageNumber)}
                active={pageNumber === state.page}
                ariaLabel={`${COPY.pageLabel} ${pageNumber}`}
              >
                {pageNumber}
              </PagerBtn>
            ),
          )}
          <PagerBtn
            onClick={() => go(state.page + 1)}
            disabled={state.atLast}
            ariaLabel={COPY.nextAriaLabel}
          >
            <ChevronRight size={14} />
          </PagerBtn>
          <PagerBtn
            onClick={() => go(state.totalPages)}
            disabled={state.atLast}
            ariaLabel={COPY.lastAriaLabel}
          >
            <ChevronsRight size={14} />
          </PagerBtn>
        </div>
      </div>
    </nav>
  )
}
