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
  // When true, render an accent-colored asterisk after the label. Mirrors the
  // SPNumberField `required` prop but uses var(--accent) instead of var(--warning)
  // — required-marker pattern locked in property table §3 "Vendor block — DEMOTED
  // BUT REQUIRED" and submitPriceV2 copy notes (FormLabel `req` accepts asterisk
  // separately from the label string).
  req?: boolean
}

export function ChipGroup({
  label,
  options,
  value,
  onChange,
  error,
  req,
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
        {req && (
          <span
            aria-hidden="true"
            style={{ color: 'var(--accent)', marginLeft: 4 }}
          >
            *
          </span>
        )}
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
