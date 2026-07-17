'use client'

import Link from 'next/link'
import { useRef, useState, type CSSProperties } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { JumpPicker } from '@/components/consumer/jump-picker'

interface WeekStripHeaderProps {
  monthLabel: string
  selectedDate: string
  today: string
  availability: Map<string, number>
  onPick: (iso: string) => void
  prevWeekHref: string | null
  nextWeekHref: string
}

const STYLE_ID = 'cjp-header-styles'
const STYLE_CONTENT = [
  '.cjp-cue{transition:background .12s,border-color .12s}',
  '.cjp-cue:hover{background:var(--overlay-hover)}',
  '.cjp-car{transition:transform .16s cubic-bezier(.2,.7,.3,1)}',
  '.cjp-chev{transition:background .12s,opacity .12s}',
  '.cjp-chev:hover:not(:disabled):not([aria-disabled="true"]){background:var(--overlay-hover)}',
  '.cjp-chev:disabled{opacity:.32;cursor:default}',
  // Click-catcher: invisible on desktop (popover model), a blurred scrim on
  // mobile (sheet model) per design §10. Closing the picker by clicking it is a
  // specified close path (closing="both").
  '.cjp-catch{position:fixed;inset:0;z-index:30;cursor:pointer}',
  '@media (max-width:640px){.cjp-catch{background:var(--scrim);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}}',
  // Positioner: left-anchored popover on desktop, centered full-width sheet
  // dropped from the top on mobile (design §2/§10). CSS media query only, so the
  // two models stay SSR-safe with no JS viewport branch.
  '.cjp-pos{position:absolute;top:46px;left:12px;z-index:40}',
  '@media (max-width:640px){.cjp-pos{top:150px;left:12px;right:12px;display:flex;justify-content:center}}',
  '@media (prefers-reduced-motion: reduce){.cjp-car{transition:none!important}}',
].join('\n')

const ensureStyles = (): void => {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = STYLE_CONTENT
  document.head.appendChild(styleEl)
}

const chevStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: '1px solid var(--border-strong)',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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

export const WeekStripHeader = ({
  monthLabel,
  selectedDate,
  today,
  availability,
  onPick,
  prevWeekHref,
  nextWeekHref,
}: WeekStripHeaderProps) => {
  const [open, setOpen] = useState(false)
  const cueRef = useRef<HTMLButtonElement>(null)

  ensureStyles()

  const close = () => {
    setOpen(false)
    cueRef.current?.focus()
  }

  const cueStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'Inter, system-ui',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--fg)',
    fontSize: 17,
    lineHeight: 1,
    borderRadius: 999,
    padding: '7px 12px',
    cursor: 'pointer',
    background: open ? 'var(--overlay-press)' : 'var(--surface-2)',
    border: open
      ? '1px solid var(--border-focus)'
      : '1px solid var(--border-strong)',
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ padding: '2px 12px 10px' }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            ref={cueRef}
            className="cjp-cue"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${monthLabel}. ${CONSUMER_COPY.jumpPickerCueSuffix}`}
            onClick={() => setOpen(true)}
            style={cueStyle}
          >
            <span>{monthLabel}</span>
            <span
              className="cjp-car"
              style={{
                display: 'inline-flex',
                transform: open ? 'rotate(180deg)' : 'none',
              }}
            >
              <svg
                width={11}
                height={7}
                viewBox="0 0 11 7"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1l4.5 4.5L10 1"
                  stroke="var(--fg-muted)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>

          <div className="flex gap-1">
            {prevWeekHref ? (
              <Link
                href={prevWeekHref}
                scroll={false}
                aria-label="Previous week"
                className="cjp-chev"
                style={chevStyle}
              >
                <ChevronGlyph dir="left" />
              </Link>
            ) : (
              <span
                className="cjp-chev"
                aria-disabled="true"
                style={{ ...chevStyle, opacity: 0.32, cursor: 'default' }}
              >
                <ChevronGlyph dir="left" />
              </span>
            )}
            <Link
              href={nextWeekHref}
              scroll={false}
              aria-label="Next week"
              className="cjp-chev"
              style={chevStyle}
            >
              <ChevronGlyph dir="right" />
            </Link>
          </div>
        </div>
      </div>

      {open && <div className="cjp-catch" onClick={close} aria-hidden="true" />}
      <div className="cjp-pos">
        <JumpPicker
          open={open}
          onClose={close}
          selectedDate={selectedDate}
          today={today}
          availability={availability}
          onPick={(iso) => {
            close()
            onPick(iso)
          }}
        />
      </div>
    </div>
  )
}
