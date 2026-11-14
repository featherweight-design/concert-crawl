'use client';

import type { FieldLook } from './boardFieldLook';

interface SPNumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  error?: string | undefined;
  warning?: string | undefined;
  // `board` draws the B+ price-sheet input: radius 12, the darker ground,
  // 17px Inter bold value, no required asterisk, amber label on a problem.
  look?: FieldLook;
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
  look = 'plain',
}: SPNumberFieldProps) {
  const board = look === 'board';
  const problem = Boolean(error) || Boolean(warning);
  const borderClass = problem ? 'border-warning' : 'border-border-strong';

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: (board ? problem : Boolean(error))
            ? 'var(--warning)'
            : 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
        {required && !board && (
          <span style={{ color: 'var(--warning)', marginLeft: 4 }}>*</span>
        )}
      </label>
      <div
        className={
          board
            ? `flex min-w-0 items-center border ${borderClass} rounded-xl px-4 h-[46px]`
            : `flex min-w-0 items-center border ${borderClass} rounded-md px-3 h-[46px] bg-surface-1`
        }
        style={board ? { background: 'var(--bg)' } : undefined}
      >
        <span
          className={
            board
              ? 'text-[17px] font-bold text-fg-muted mr-2'
              : 'font-mono text-sm font-bold text-fg-muted mr-1'
          }
        >
          $
        </span>
        <input
          id={id}
          aria-required={required || undefined}
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(evt) => onChange(evt.target.value.replace(/\D/g, ''))}
          className={
            board
              ? 'min-w-0 flex-1 bg-transparent text-[17px] font-bold text-fg outline-none placeholder:font-normal placeholder:text-fg-subtle'
              : 'flex-1 bg-transparent text-sm font-mono text-fg outline-none'
          }
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
  );
}
