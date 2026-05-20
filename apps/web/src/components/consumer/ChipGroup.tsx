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
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: error ? 'var(--warning)' : 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(opt.value)}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                isActive
                  ? 'border-signal text-signal bg-signal/10'
                  : error
                    ? 'border-warning text-fg hover:border-fg-muted'
                    : 'border-border-strong text-fg hover:border-fg-muted',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--warning)',
            marginTop: 2,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
