'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { AuthErrorLine } from './AuthField';

interface ConsentCheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Set once the form was pressed unticked: the card and box go red. */
  error?: string;
  /** The sentence, with a `LegalLink` for each document it names. */
  children: ReactNode;
}

/**
 * The agree-to-the-terms box. A real native checkbox, unticked to start, with
 * the whole card as its label so the target is 48px and up. The links inside
 * open the legal sheet and must not toggle the box.
 */
export function ConsentCheck({
  checked,
  onChange,
  error,
  children,
}: ConsentCheckProps) {
  const id = useId();
  const invalid = Boolean(error);
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-normal text-fg-muted ${invalid ? 'border-[1.5px] border-danger bg-[color-mix(in_srgb,var(--danger)_6%,transparent)]' : 'border-border bg-[color-mix(in_srgb,var(--surface-1)_60%,transparent)]'}`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(evt) => onChange(evt.target.checked)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] peer-focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--signal)] ${checked ? 'bg-[linear-gradient(135deg,var(--signal),var(--cta-end))]' : invalid ? 'border-[1.5px] border-danger bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]' : 'border-[1.5px] border-border-strong bg-surface-1'}`}
        >
          {checked ? (
            <Check size={15} strokeWidth={3} className="text-fg-on-accent" />
          ) : null}
        </span>
        <span>{children}</span>
      </label>
      {error ? (
        <div className="mt-2" aria-live="polite">
          <AuthErrorLine id={`${id}-error`}>{error}</AuthErrorLine>
        </div>
      ) : null}
    </div>
  );
}

/** A document name inside the consent sentence. A button, so it never toggles. */
export function LegalLink({
  onClick,
  ...rest
}: Omit<ComponentProps<'button'>, 'type'>) {
  return (
    <button
      type="button"
      {...rest}
      onClick={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        onClick?.(evt);
      }}
      className="inline p-0 text-sm font-bold text-fg underline decoration-[color-mix(in_srgb,var(--fg)_40%,transparent)] underline-offset-[3px]"
    />
  );
}
