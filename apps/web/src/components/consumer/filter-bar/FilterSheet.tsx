'use client'

import type { FilterOption } from './filter-defs'

interface FilterSheetProps {
  open: boolean
  title: string
  placeholder: string
  options: FilterOption[]
  value: string
  onSelect: (nextValue: string) => void
  onClose: () => void
}

export function FilterSheet({
  open,
  title,
  placeholder,
  options,
  value,
  onSelect,
  onClose,
}: FilterSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 sm:hidden" aria-hidden={!open}>
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close filter sheet"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${title} filter`}
        className="absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-border-strong bg-bg-elevated pb-6"
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-9 rounded-full bg-border-strong" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-5 pb-3">
          <div>
            <div
              className="text-[10px] uppercase text-signal"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}
            >
              {title}
            </div>
            <div
              className="pt-0.5 text-[11px] uppercase text-fg-muted"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              {placeholder}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-1 text-fg-muted"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
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
      </section>
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
      className="flex w-full items-center justify-between border-b border-border px-5 py-4 text-left"
      style={{
        color: active ? 'var(--signal)' : 'var(--fg)',
        fontWeight: active ? 700 : 500,
      }}
    >
      <span>{label}</span>
      {active ? <span aria-hidden>✓</span> : null}
    </button>
  )
}
