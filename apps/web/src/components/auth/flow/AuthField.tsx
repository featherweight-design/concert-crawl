'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY;

/** The red "!" disc beside an error line. */
export function AuthErrorLine({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      className="m-0 flex gap-[7px] text-[13px] leading-[1.45] text-danger"
    >
      <span
        aria-hidden="true"
        className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[10px] font-extrabold"
      >
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

interface AuthFieldProps extends Omit<ComponentProps<'input'>, 'size'> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** Sits opposite the label (the Forgot link). */
  labelAside?: ReactNode;
  /** Sits inside the shell, after the input (the Show toggle). */
  trailing?: ReactNode;
}

/**
 * A labelled text field on the auth boards: 48px, radius 12, a 1.5px border,
 * 16px text (never smaller: iOS zooms). Invalid sets `aria-invalid` and wires
 * the message through `aria-describedby`; a locked or busy field is disabled.
 */
export function AuthField({
  label,
  hint,
  error,
  labelAside,
  trailing,
  id,
  className,
  disabled,
  ...rest
}: AuthFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const invalid = Boolean(error);
  return (
    <div className={className}>
      <div className="mb-[7px] flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-fg">
          {label}
        </label>
        {labelAside}
      </div>
      <div
        data-invalid={invalid || undefined}
        className="flex h-12 items-center gap-2 rounded-xl border-[1.5px] border-border-strong bg-surface-1 pr-1.5 pl-3.5 focus-within:border-border-focus focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_18%,transparent)] data-[invalid]:border-danger data-[invalid]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_14%,transparent)] has-[:disabled]:border-border has-[:disabled]:opacity-55"
      >
        <input
          {...rest}
          id={inputId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-fg caret-signal outline-none placeholder:text-fg-subtle"
        />
        {trailing}
      </div>
      <div className={error ? 'mt-[7px]' : undefined} aria-live="polite">
        {error ? <AuthErrorLine id={noteId}>{error}</AuthErrorLine> : null}
      </div>
      {!error && hint ? (
        <p
          id={noteId}
          className="mt-[7px] mb-0 text-[13px] leading-[1.45] text-fg-muted"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** AuthField with the board's Show and Hide toggle inside the shell. */
export function PasswordField(
  props: Omit<AuthFieldProps, 'type' | 'trailing'>,
) {
  const [shown, setShown] = useState(false);
  return (
    <AuthField
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShown((prev) => !prev)}
          aria-label={shown ? COPY.password.hideLabel : COPY.password.showLabel}
          disabled={props.disabled}
          className="h-11 min-w-11 rounded-lg px-2.5 text-[13px] font-bold text-fg-muted"
        >
          {shown ? COPY.password.hide : COPY.password.show}
        </button>
      }
    />
  );
}
