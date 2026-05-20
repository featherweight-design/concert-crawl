'use client'

import { useEffect, useRef } from 'react'
import type { FilterOption } from './filter-defs'

interface FilterPopoverProps {
  open: boolean
  title: string
  placeholder: string
  options: FilterOption[]
  value: string
  anchorRect: DOMRect | null
  alwaysOn?: boolean
  onSelect: (nextValue: string) => void
  onClose: () => void
}

export function FilterPopover({
  open,
  title,
  placeholder,
  options,
  value,
  anchorRect,
  alwaysOn = false,
  onSelect,
  onClose,
}: FilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (popoverRef.current?.contains(target)) return
      onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, onClose])

  if (!open || !anchorRect) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${title} filter`}
      className="fixed z-50 hidden min-w-[240px] border border-border-strong bg-bg-elevated sm:block"
      style={{
        top: anchorRect.bottom + 6,
        left: anchorRect.left,
        borderRadius: 10,
        padding: 6,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
      }}
    >
      {!alwaysOn && (
        <OptionButton
          label={placeholder}
          active={!value}
          onClick={() => {
            onSelect('')
            onClose()
          }}
        />
      )}

      {options.map((option) => (
        <OptionButton
          key={option.value}
          label={option.label}
          active={value === option.value}
          onClick={() => {
            onSelect(option.value)
            onClose()
          }}
        />
      ))}
    </div>
  )
}

interface OptionButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function OptionButton({ label, active, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between text-left text-[13px]"
      style={{
        padding: '8px 10px',
        borderRadius: 6,
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--surface-2)' : 'transparent',
      }}
      onMouseEnter={(event) => {
        if (active) return
        event.currentTarget.style.background = 'var(--overlay-hover)'
      }}
      onMouseLeave={(event) => {
        if (active) return
        event.currentTarget.style.background = 'transparent'
      }}
    >
      <span>{label}</span>
      {active ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 6.5l2.5 2.5L10 3.5"
            stroke="var(--signal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  )
}
