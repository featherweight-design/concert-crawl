'use client'

import { useEffect, useRef, useState } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  PAGINATION_PAGE_SIZE_OPTIONS,
  derivePagination,
  pageWindow,
} from './pagination-logic'

// Match design tokens exactly — the JetBrains-first stack falls back to the
// platform-native monos when JetBrains isn't loaded yet.
const ADMIN_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const ADMIN_FONT = "'Inter', sans-serif"

// Hand-rolled icons match the design's stroke geometry (stroke-width 1.6,
// rounded caps). Inline SVG keeps us free of an icon dependency for this
// admin-only surface; the paths are copied from the design handoff.
type IconName = 'chevL' | 'chevR' | 'chevsL' | 'chevsR' | 'chevD' | 'check'

interface AdminIconProps {
  name: IconName
  size?: number
  color?: string
}

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  chevL: <path d="M15 6l-9 6 9 6" />,
  chevR: <path d="M9 6l6 6-6 6" />,
  chevsL: (
    <>
      <path d="M11 6l-6 6 6 6" />
      <path d="M19 6l-6 6 6 6" />
    </>
  ),
  chevsR: (
    <>
      <path d="M13 6l6 6-6 6" />
      <path d="M5 6l6 6-6 6" />
    </>
  ),
  chevD: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12l5 5L20 6" />,
}

const AdminIcon = ({ name, size = 14, color }: AdminIconProps) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? 'currentColor'}
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {ICON_PATHS[name]}
  </svg>
)

// Shared CSS for the pager: the spinner keyframes and the focus-visible
// outline. We inject this once per Pagination instance (sibling of the
// pager <nav>) so we can use pseudo-selectors without an external CSS
// file. `all: unset` on the controls strips the browser's default focus
// ring; the [data-pager-control] selector below restores it for keyboard
// users.
const PAGER_STYLE = `
@keyframes ccSpin { to { transform: rotate(360deg); } }
[data-pager-control]:focus-visible {
  outline: 2px solid var(--focus, var(--signal));
  outline-offset: 2px;
}
`

const Spinner = ({ size = 12, color = 'var(--signal)' }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ animation: 'ccSpin 0.9s linear infinite' }}
  >
    <circle
      cx={12}
      cy={12}
      r={9}
      stroke={color}
      strokeWidth={2.5}
      fill="none"
      opacity={0.2}
    />
    <path
      d="M21 12a9 9 0 00-9-9"
      stroke={color}
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
    />
  </svg>
)

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
}: PagerBtnProps) => {
  const [hover, setHover] = useState(false)
  const interactive = !disabled && !active
  const hovered = interactive && hover
  return (
    <button
      type="button"
      data-pager-control
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
        background: active
          ? 'var(--signal)'
          : hovered
            ? 'var(--surface-2)'
            : 'transparent',
        border: `1px solid ${
          active
            ? 'var(--signal)'
            : hovered
              ? 'var(--fg-subtle)'
              : 'var(--border-strong)'
        }`,
        opacity: disabled && !active ? 0.45 : 1,
        transition: 'background .12s, border-color .12s, color .12s',
      }}
    >
      {children}
    </button>
  )
}

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
    // Close on outside pointer-down (mouse + touch) and on Escape — the
    // common dismiss expectations for popovers on desktop and mobile.
    const outsideHandler = (evt: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(evt.target as Node)) {
        setOpen(false)
      }
    }
    const keyHandler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', outsideHandler)
    document.addEventListener('touchstart', outsideHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', outsideHandler)
      document.removeEventListener('touchstart', outsideHandler)
      document.removeEventListener('keydown', keyHandler)
    }
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
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {COPY.rowsLabel}
      </span>
      <button
        type="button"
        data-pager-control
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={COPY.sizeSelectorAriaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
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
        <AdminIcon name="chevD" size={13} color="var(--fg-subtle)" />
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
                data-pager-control
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
                {selected && <AdminIcon name="check" size={13} />}
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
  loading?: boolean
}

const RangeReadout = ({
  start,
  end,
  total,
  itemLabel,
  loading,
}: RangeReadoutProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    }}
  >
    {loading && <Spinner />}
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
  // Default the size selector to whether the caller wired up
  // `onPageSizeChange` — otherwise the dropdown opens but its options
  // would silently no-op. Callers can still force it on/off explicitly.
  showSizeSelector = onPageSizeChange !== undefined,
  itemLabel = 'results',
  forceCompact,
  threshold = 560,
}: PaginationProps) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const compact = usePagerCompact(wrapRef, threshold, forceCompact)
  const state = derivePagination({ page, pageSize, total })

  // Page-clamp sync: when the URL deep-links to ?page=99 but total only
  // supports 3 pages, derivePagination clamps `state.page` to 3 for the
  // UI — but the parent's query still fires with page=99 and returns
  // empty rows. Push the clamped value back so the controlled state
  // catches up and the query refetches against a real page.
  useEffect(() => {
    if (state.page !== page) onPageChange(state.page)
  }, [state.page, page, onPageChange])

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
        <style>{PAGER_STYLE}</style>
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
            loading={loading}
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
            <AdminIcon name="chevL" size={16} /> {COPY.prev}
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
            {COPY.next} <AdminIcon name="chevR" size={16} />
          </PagerBtn>
        </div>
      </nav>
    )
  }

  const window = pageWindow(state.page, state.totalPages)
  return (
    <nav ref={wrapRef} aria-label={COPY.navAriaLabel} style={footerStyle}>
      <style>{PAGER_STYLE}</style>
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
          loading={loading}
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
            <AdminIcon name="chevsL" size={14} />
          </PagerBtn>
          <PagerBtn
            onClick={() => go(state.page - 1)}
            disabled={state.atFirst}
            ariaLabel={COPY.previousAriaLabel}
          >
            <AdminIcon name="chevL" size={14} />
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
            <AdminIcon name="chevR" size={14} />
          </PagerBtn>
          <PagerBtn
            onClick={() => go(state.totalPages)}
            disabled={state.atLast}
            ariaLabel={COPY.lastAriaLabel}
          >
            <AdminIcon name="chevsR" size={14} />
          </PagerBtn>
        </div>
      </div>
    </nav>
  )
}
