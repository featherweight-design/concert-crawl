'use client'

interface ChipOption {
  value: string
  label: string
}

interface ChipGroupProps {
  label: string
  options: ChipOption[]
  value: string | null
  onChange: (value: string) => void
  error?: string | undefined
}

export function ChipGroup({
  label,
  options,
  value,
  onChange,
  error,
}: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wider font-mono">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                isActive
                  ? 'border-signal text-signal bg-signal/10'
                  : 'border-border-strong text-fg hover:border-fg-muted',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
