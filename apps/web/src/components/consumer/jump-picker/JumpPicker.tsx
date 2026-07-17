'use client'

/*
 * The `YearMonth`/`MatrixCell` contract uses single-letter fields (`y`, `m`, `d`)
 * that this component reads and writes directly; `id-length` still flags those
 * keys in object *literals* and inline type members (it exempts interface
 * members), so relax the rule for property names in this file while keeping it
 * for variables and parameters — matching date-math.ts.
 */
/* eslint id-length: ["error", { "min": 2, "exceptions": ["i", "j", "k", "x", "y", "z", "_"], "properties": "never" }] */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  addMonths,
  isoOf,
  monthMatrix,
  pickerWindow,
  ymdKey,
  type MatrixCell,
  type YearMonth,
} from './date-math'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MON3 = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DOWFULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const CELL = 38
const GRID_GAP = 2

const STYLE_ID = 'cjp-styles'
const STYLE_CONTENT = [
  '.cjp-pop{transition:transform .13s cubic-bezier(.2,.7,.3,1),opacity .13s ease}',
  '.cjp-pop.scale{transform:scale(.95);opacity:0;transform-origin:34px -6px}',
  '.cjp-pop.cjp-in{transform:none;opacity:1}',
  // Popover width on desktop, full-width sheet under 640px (design §2/§10). CSS
  // media query keeps this SSR-safe — no JS viewport read, no hydration skew.
  '.cjp-w{width:min(324px, calc(100vw - 24px))}',
  '@media (max-width:640px){.cjp-w{width:100%}}',
  '.cjp-day{cursor:pointer;transition:background .12s,box-shadow .12s}',
  '.cjp-day.cjp-dis{cursor:default}',
  '.cjp-hit:hover:not(.cjp-dis){background:var(--overlay-hover)}',
  '.cjp-chev{cursor:pointer;transition:background .12s,opacity .12s}',
  '.cjp-chev:hover:not(:disabled){background:var(--overlay-hover)}',
  '.cjp-chev:disabled{opacity:.32;cursor:default}',
  '@media (prefers-reduced-motion: reduce){.cjp-pop{transition:none!important;transform:none!important;opacity:1!important}.cjp-car{transition:none!important}}',
].join('\n')

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = STYLE_CONTENT
  document.head.appendChild(styleEl)
}

const partsOf = (iso: string): { y: number; m: number; d: number } => {
  const parts = iso.split('-').map(Number)
  return { y: parts[0] ?? 0, m: (parts[1] ?? 1) - 1, d: parts[2] ?? 1 }
}

const ChevronGlyph = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
      stroke="var(--fg-muted)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const clampView = (
  ym: YearMonth,
  min: YearMonth,
  max: YearMonth,
): YearMonth => {
  const key = ym.y * 12 + ym.m
  const minKey = min.y * 12 + min.m
  const maxKey = max.y * 12 + max.m
  if (key < minKey) return min
  if (key > maxKey) return max
  return ym
}

const inWindow = (iso: string, from: string, to: string): boolean =>
  iso >= from && iso <= to

export interface JumpPickerProps {
  open: boolean
  onClose: () => void
  selectedDate: string
  today: string
  availability: Map<string, number>
  onPick: (iso: string) => void
}

export const JumpPicker = ({
  open,
  onClose,
  selectedDate,
  today,
  availability,
  onPick,
}: JumpPickerProps) => {
  const initial = partsOf(selectedDate)
  const [view, setView] = useState<YearMonth>({ y: initial.y, m: initial.m })
  const [mounted, setMounted] = useState(false)
  const [focusIso, setFocusIso] = useState(selectedDate)
  const gridRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(false)

  ensureStyles()

  const { min, max, from: winFrom, to: winTo } = pickerWindow(today)
  const todayParts = partsOf(today)
  const todayKey = ymdKey(todayParts.y, todayParts.m, todayParts.d)

  const atMin = view.y === min.y && view.m === min.m
  const atMax = view.y === max.y && view.m === max.m

  // On open, focus the selected day.
  useEffect(() => {
    if (!open) return
    setView({ y: initial.y, m: initial.m })
    setFocusIso(selectedDate)
    pendingFocus.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate])

  // Scale-in on the frame after mount.
  useEffect(() => {
    if (!open) {
      setMounted(false)
      return
    }
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Move DOM focus onto the roving-tabindex target when it changes.
  useEffect(() => {
    if (!open || !pendingFocus.current) return
    const node = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-iso="${focusIso}"]`,
    )
    node?.focus()
    pendingFocus.current = false
  }, [open, focusIso, view])

  if (!open) return null

  const cells = monthMatrix(view.y, view.m)

  const isDisabled = (cell: MatrixCell): boolean =>
    !cell.inMonth || ymdKey(cell.y, cell.m, cell.d) < todayKey

  const hasInMonthShows = cells.some(
    (cell) =>
      cell.inMonth &&
      !isDisabled(cell) &&
      (availability.get(cell.iso) ?? 0) > 0,
  )

  const pageMonth = (delta: number, moveDomFocus: boolean) => {
    const next = clampView(addMonths(view, delta), min, max)
    setView(next)
    // Keep the roving tab-stop inside the newly-viewed month so it never lands
    // on an out-of-month spill cell. Only steal DOM focus for keyboard paging.
    setFocusIso(isoOf(next.y, next.m, 1))
    if (moveDomFocus) {
      pendingFocus.current = true
    }
  }

  const resetToToday = () => {
    setView({ y: todayParts.y, m: todayParts.m })
    setFocusIso(today)
    pendingFocus.current = true
  }

  const moveFocus = (deltaDays: number) => {
    const base = partsOf(focusIso)
    let cursor = new Date(base.y, base.m, base.d)
    for (let guard = 0; guard < 366; guard += 1) {
      cursor = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + deltaDays,
      )
      const cy = cursor.getFullYear()
      const cm = cursor.getMonth()
      const cd = cursor.getDate()
      const iso = isoOf(cy, cm, cd)
      if (!inWindow(iso, winFrom, winTo)) return
      const past = ymdKey(cy, cm, cd) < todayKey
      if (past) continue
      setFocusIso(iso)
      pendingFocus.current = true
      if (cy !== view.y || cm !== view.m) setView({ y: cy, m: cm })
      return
    }
  }

  const moveToWeekEnd = (toEnd: boolean) => {
    const base = partsOf(focusIso)
    const cursor = new Date(base.y, base.m, base.d)
    const dow = cursor.getDay()
    const delta = toEnd ? 6 - dow : -dow
    const target = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + delta,
    )
    // Walk inward to the nearest enabled day in the desired direction.
    const step = toEnd ? -1 : 1
    let probe = target
    for (let guard = 0; guard < 7; guard += 1) {
      const py = probe.getFullYear()
      const pm = probe.getMonth()
      const pd = probe.getDate()
      const iso = isoOf(py, pm, pd)
      const past = ymdKey(py, pm, pd) < todayKey
      if (inWindow(iso, winFrom, winTo) && !past) {
        setFocusIso(iso)
        pendingFocus.current = true
        if (py !== view.y || pm !== view.m) setView({ y: py, m: pm })
        return
      }
      probe = new Date(py, pm, pd + step)
    }
  }

  const onGridKeyDown = (evt: KeyboardEvent<HTMLDivElement>) => {
    switch (evt.key) {
      case 'ArrowRight':
        evt.preventDefault()
        moveFocus(1)
        break
      case 'ArrowLeft':
        evt.preventDefault()
        moveFocus(-1)
        break
      case 'ArrowDown':
        evt.preventDefault()
        moveFocus(7)
        break
      case 'ArrowUp':
        evt.preventDefault()
        moveFocus(-7)
        break
      case 'Home':
        evt.preventDefault()
        moveToWeekEnd(false)
        break
      case 'End':
        evt.preventDefault()
        moveToWeekEnd(true)
        break
      case 'PageUp':
        evt.preventDefault()
        pageMonth(evt.shiftKey ? -12 : -1, true)
        break
      case 'PageDown':
        evt.preventDefault()
        pageMonth(evt.shiftKey ? 12 : 1, true)
        break
      case 'Escape':
        evt.preventDefault()
        onClose()
        break
      default:
        break
    }
  }

  const onRootKeyDown = (evt: KeyboardEvent<HTMLDivElement>) => {
    if (evt.key === 'Escape') {
      evt.preventDefault()
      onClose()
    }
  }

  const chevBtn: CSSProperties = {
    all: 'unset',
    width: 30,
    height: 30,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  }

  const footerCopy = hasInMonthShows
    ? CONSUMER_COPY.jumpPickerFooterHint
    : `${CONSUMER_COPY.jumpPickerEmptyPrefix} ${MON3[view.m]}. ${CONSUMER_COPY.jumpPickerEmptySuffix}`

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`${CONSUMER_COPY.jumpPickerDialogPrefix} — ${MONTHS[view.m]} ${view.y}`}
      className={`cjp-pop cjp-w scale ${mounted ? 'cjp-in' : ''}`}
      onKeyDown={onRootKeyDown}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.3)',
        padding: 14,
        boxSizing: 'border-box',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      {/* pager header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          className="cjp-chev"
          onClick={() => pageMonth(-1, false)}
          disabled={atMin}
          aria-label={CONSUMER_COPY.jumpPickerPrevMonth}
          style={chevBtn}
        >
          <ChevronGlyph dir="left" />
        </button>
        <div
          aria-live="polite"
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '-0.01em',
          }}
        >
          {MONTHS[view.m]}{' '}
          <span style={{ color: 'var(--fg-muted)', fontWeight: 700 }}>
            {view.y}
          </span>
        </div>
        <button
          type="button"
          className="cjp-chev"
          onClick={() => pageMonth(1, false)}
          disabled={atMax}
          aria-label={CONSUMER_COPY.jumpPickerNextMonth}
          style={chevBtn}
        >
          <ChevronGlyph dir="right" />
        </button>
        <button
          type="button"
          className="cjp-chev"
          onClick={onClose}
          aria-label={CONSUMER_COPY.jumpPickerClose}
          style={{ ...chevBtn, marginLeft: 2 }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
            <path
              d="M2 2l9 9M11 2l-9 9"
              stroke="var(--fg-muted)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* weekday header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: GRID_GAP,
          marginBottom: 4,
        }}
      >
        {DOW1.map((label, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color:
                i === 0 || i === 6 ? 'var(--fg-muted)' : 'var(--fg-subtle)',
              paddingBottom: 2,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div
        ref={gridRef}
        role="grid"
        onKeyDown={onGridKeyDown}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: GRID_GAP,
        }}
      >
        {cells.map((cell, i) => {
          const count = availability.get(cell.iso) ?? 0
          const past = ymdKey(cell.y, cell.m, cell.d) < todayKey
          const sel = cell.iso === selectedDate
          const isToday = cell.iso === today
          const disabled = isDisabled(cell)
          const isWknd = cell.dow === 0 || cell.dow === 6

          let background = 'transparent'
          if (sel) {
            background = 'var(--signal)'
          } else if (isWknd && cell.inMonth && !disabled) {
            background =
              'color-mix(in oklch, var(--surface-2) 60%, transparent)'
          }

          const numColor = sel
            ? 'var(--fg-on-accent)'
            : !cell.inMonth
              ? 'var(--fg-subtle)'
              : past
                ? 'var(--fg-subtle)'
                : isToday
                  ? 'var(--accent)'
                  : 'var(--fg)'

          const opacity = !cell.inMonth ? 0.4 : past ? 0.45 : 1
          const boxShadow =
            isToday && !sel ? 'inset 0 0 0 1.5px var(--accent)' : 'none'

          const countClause =
            count > 0 ? `, ${count} show${count > 1 ? 's' : ''}` : ', no shows'
          const ariaLabel = `${DOWFULL[cell.dow]}, ${MONTHS[cell.m]} ${cell.d}${countClause}${isToday ? ', today' : ''}`

          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              data-iso={cell.iso}
              className={`cjp-day cjp-hit ${disabled ? 'cjp-dis' : ''}`}
              onClick={disabled ? undefined : () => onPick(cell.iso)}
              tabIndex={cell.iso === focusIso ? 0 : -1}
              aria-disabled={disabled}
              aria-selected={sel}
              aria-label={ariaLabel}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                position: 'relative',
                height: CELL,
                borderRadius: 9,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                background,
                opacity,
                boxShadow,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontWeight: sel || isToday ? 800 : 600,
                  fontSize: 13.5,
                  color: numColor,
                  lineHeight: 1,
                }}
              >
                {cell.d}
              </span>
              {count > 0 && !disabled ? (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 4,
                    background: sel ? 'var(--fg-on-accent)' : 'var(--accent)',
                  }}
                />
              ) : (
                <span style={{ height: 4 }} />
              )}
            </button>
          )
        })}
      </div>

      {/* footer: today reset + hint / empty-month line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 12,
          minHeight: 22,
        }}
      >
        <button
          type="button"
          onClick={resetToToday}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid var(--border-strong)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-muted)',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 5,
              background: 'var(--accent)',
            }}
          />{' '}
          {CONSUMER_COPY.jumpPickerToday}
        </button>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {footerCopy}
        </span>
      </div>
    </div>
  )
}
