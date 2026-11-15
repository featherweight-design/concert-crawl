'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { AUTH_FLOW_COPY } from './definitions/copy';
import { AuthErrorLine } from './AuthField';

const COPY = AUTH_FLOW_COPY;
const LENGTH = 6;

interface CodeBoxesProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
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
  const input = useRef<HTMLInputElement>(null);
  // Disabling a focused input drops focus to the page. When the screen unlocks
  // with the boxes cleared (a wrong code), focus goes back to the first box, so
  // a keyboard or screen-reader visitor can type again without finding it.
  const hadFocus = useRef(false);
  const wasDisabled = useRef(disabled);
  useEffect(() => {
    if (wasDisabled.current && !disabled && hadFocus.current && value === '') {
      // Only if focus is still nowhere: a visitor who moved on while it was
      // locked keeps the control they went to.
      const active = document.activeElement;
      // Chrome leaves a disabled input as the active element; others drop to
      // the page. Either way the visitor is nowhere else.
      if (!active || active === document.body || active === input.current) {
        input.current?.focus();
      }
    }
    wasDisabled.current = disabled;
  }, [disabled, value]);
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
          ref={input}
          id={id}
          value={value}
          onChange={(evt) =>
            onChange(evt.target.value.replace(/\D/g, '').slice(0, LENGTH))
          }
          onFocus={() => {
            hadFocus.current = true;
            setFocused(true);
          }}
          onBlur={(evt) => {
            // A blur caused by disabling is not the visitor leaving.
            if (!evt.currentTarget.disabled) hadFocus.current = false;
            setFocused(false);
          }}
          // The boxes show the next empty one, so the real caret stays at the
          // end: a tap or arrow key cannot leave it editing a digit that is
          // not the highlighted one.
          onSelect={(evt) => {
            const end = evt.currentTarget.value.length;
            if (evt.currentTarget.selectionStart !== end)
              evt.currentTarget.setSelectionRange(end, end);
          }}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          // No maxLength: it would cut "123 456" to five digits before the
          // spaces are stripped. The slice above keeps six.
          className="absolute inset-0 z-10 size-full cursor-text text-base opacity-0"
        />
        <div
          aria-hidden="true"
          className={`flex items-center justify-center gap-[9px] ${disabled ? 'opacity-55' : ''}`}
        >
          {Array.from({ length: LENGTH }, (_, index) => {
            const digit = value[index];
            const isActive = focused && !disabled && index === active;
            const border = invalid
              ? 'border-danger'
              : isActive
                ? 'border-border-focus shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_18%,transparent)]'
                : digit
                  ? 'border-[color-mix(in_srgb,var(--signal)_45%,var(--border-strong))]'
                  : 'border-border-strong';
            // The boxes share the row, up to the board's 46px, so six fit a
            // 320px phone (280px of room) without scrolling the page.
            return (
              <Fragment key={index}>
                {index === 3 ? (
                  <i className="h-0.5 w-2 shrink-0 rounded-[1px] bg-border-strong" />
                ) : null}
                <span
                  className={`flex h-14 max-w-[46px] min-w-0 flex-1 items-center justify-center rounded-xl border-[1.5px] bg-surface-1 font-mono text-[22px] font-semibold text-fg ${border}`}
                >
                  {digit ??
                    (isActive ? (
                      <i className="h-[22px] w-[1.5px] bg-signal" />
                    ) : null)}
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
      {/* Always mounted, so a screen reader hears the message arrive. */}
      <div className={error ? 'mt-2' : undefined} aria-live="polite">
        {error ? (
          <AuthErrorLine id={`${id}-error`}>{error}</AuthErrorLine>
        ) : null}
      </div>
    </div>
  );
}
