'use client'

import type { FilterOption } from './filter-defs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.filterBar

interface FilterSheetProps {
  open: boolean
  title: string
  placeholder: string
  options: FilterOption[]
  value: string
  alwaysOn?: boolean
  onSelect: (nextValue: string) => void
  onClose: () => void
}

export function FilterSheet({
  open,
  title,
  placeholder,
  options,
  value,
  alwaysOn = false,
  onSelect,
  onClose,
}: FilterSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 sm:hidden" aria-hidden={!open}>
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'var(--scrim)' }}
        aria-label={copy.filterSheet.closeAriaLabel}
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${title} filter`}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full rounded-t-[20px] border-t border-border-strong bg-bg-elevated"
        style={{
          maxWidth: 402,
          paddingTop: 8,
          paddingBottom: 28,
          boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex justify-center" style={{ padding: '8px 0 4px' }}>
          <div className="h-1 w-9 rounded-full bg-border-strong" />
        </div>

        <div
          style={{
            padding: '10px 20px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {title}
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
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
      className="flex w-full items-center justify-between text-left"
      style={{
        padding: '13px 20px',
        fontSize: 16,
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--surface-1)' : 'transparent',
      }}
    >
      <span>{label}</span>
      {active ? (
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
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
