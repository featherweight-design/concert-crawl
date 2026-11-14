'use client';

import { useId, useState } from 'react';
import { AUTH_FLOW_COPY } from './definitions/copy';
import { AuthErrorLine } from './AuthField';

const COPY = AUTH_FLOW_COPY;
const LENGTH = 6;

interface CodeBoxesProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Six boxes over one real input, so paste and the phone's one-time-code
 * autofill both fill all six at once and a screen reader meets one field.
 * Digits only, at most six.
 */
export function CodeBoxes({
  value,
  onChange,
  error,
  disabled,
}: CodeBoxesProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, LENGTH - 1);
  const invalid = Boolean(error);
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[13px] font-semibold text-fg"
      >
        {COPY.code.label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(evt) =>
            onChange(evt.target.value.replace(/\D/g, '').slice(0, LENGTH))
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="absolute inset-0 z-10 size-full cursor-text opacity-0"
        />
        <div
          aria-hidden="true"
          className={`flex items-center justify-center gap-[9px] ${disabled ? 'opacity-55' : ''}`}
        >
          {Array.from({ length: LENGTH }, (_, index) => {
            const digit = value[index];
            const isActive = focused && index === active;
            const border = invalid
              ? 'border-danger'
              : isActive
                ? 'border-border-focus shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_18%,transparent)]'
                : digit
                  ? 'border-[color-mix(in_srgb,var(--signal)_45%,var(--border-strong))]'
                  : 'border-border-strong';
            return (
              <span key={index} className="flex items-center gap-[9px]">
                <span
                  className={`flex h-14 w-[46px] min-w-0 shrink items-center justify-center rounded-xl border-[1.5px] bg-surface-1 font-mono text-[22px] font-semibold text-fg ${border}`}
                >
                  {digit ??
                    (isActive ? (
                      <i className="h-[22px] w-[1.5px] bg-signal" />
                    ) : null)}
                </span>
                {index === 2 ? (
                  <i className="h-0.5 w-2 rounded-[1px] bg-border-strong" />
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
      {error ? (
        <div className="mt-2" aria-live="polite">
          <AuthErrorLine id={`${id}-error`}>{error}</AuthErrorLine>
        </div>
      ) : null}
    </div>
  );
}
