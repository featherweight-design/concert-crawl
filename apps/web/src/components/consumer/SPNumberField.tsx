'use client'

interface SPNumberFieldProps {
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
    ? 'border-danger'
    : warning
      ? 'border-warning'
      : 'border-border-strong'

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-fg-muted uppercase tracking-wider font-mono">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <div
        className={`flex items-center border ${borderClass} rounded-md px-3 h-[46px] bg-surface-1`}
      >
        <span className="font-mono text-sm font-bold text-fg-muted mr-1">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(evt) => onChange(evt.target.value.replace(/\D/g, ''))}
          className="flex-1 bg-transparent text-sm font-mono text-fg outline-none"
        />
      </div>
      {hint && !error && !warning && (
        <span className="text-xs text-fg-subtle">{hint}</span>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && warning && (
        <span className="text-xs text-warning">{warning}</span>
      )}
    </div>
  )
}
