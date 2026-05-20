'use client'

interface SPNumberFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  required?: boolean
  error?: string | undefined
  warning?: string | undefined
}

export function SPNumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  error,
  warning,
}: SPNumberFieldProps) {
  const borderClass = error
    ? 'border-warning'
    : warning
      ? 'border-warning'
      : 'border-border-strong'

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: error ? 'var(--warning)' : 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--warning)', marginLeft: 4 }}>*</span>
        )}
      </label>
      <div
        className={`flex min-w-0 items-center border ${borderClass} rounded-md px-3 h-[46px] bg-surface-1`}
      >
        <span className="font-mono text-sm font-bold text-fg-muted mr-1">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(evt) => onChange(evt.target.value.replace(/\D/g, ''))}
          className="flex-1 bg-transparent text-sm font-mono text-fg outline-none"
        />
      </div>
      {hint && !error && !warning && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--fg-subtle)',
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      )}
      {error && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--warning)',
            marginTop: 4,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}
        >
          {error}
        </span>
      )}
      {!error && warning && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--warning)',
            marginTop: 4,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}
        >
          {warning}
        </span>
      )}
    </div>
  )
}
