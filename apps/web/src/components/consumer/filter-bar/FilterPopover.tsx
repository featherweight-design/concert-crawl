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
      className="fixed z-50 hidden min-w-[240px] rounded-xl border border-border-strong bg-bg-elevated py-1 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.55)] sm:block"
      style={{ top: anchorRect.bottom + 8, left: anchorRect.left }}
    >
      <div
        className="px-3.5 pb-1 pt-2 text-[9.5px] uppercase text-signal"
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: '0.12em',
        }}
      >
        {title}
      </div>

      <OptionButton
        label={placeholder}
        active={!value}
        onClick={() => {
          onSelect('')
          onClose()
        }}
      />

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
      className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[13.5px]"
      style={{
        color: active ? 'var(--signal)' : 'var(--fg)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--surface-1)' : 'transparent',
      }}
      onMouseEnter={(event) => {
        if (active) return
        event.currentTarget.style.background = 'var(--surface-1)'
      }}
      onMouseLeave={(event) => {
        if (active) return
        event.currentTarget.style.background = 'transparent'
      }}
    >
      <span>{label}</span>
      {active ? <span aria-hidden>✓</span> : null}
    </button>
  )
}
