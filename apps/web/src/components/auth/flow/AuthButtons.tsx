import type { ComponentProps, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY;

/** A 16px ring spinner; `onInk` draws it on the gradient button. */
function Spinner({ onInk }: { onInk?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`animate-spin motion-reduce:animate-none ${onInk ? 'text-fg-on-accent' : 'text-fg-muted'}`}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        strokeWidth="2"
        stroke="currentColor"
        opacity="0.25"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        strokeWidth="2"
        strokeLinecap="round"
        stroke="currentColor"
      />
    </svg>
  );
}

const BASE =
  'inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-bold outline-none focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--signal)]';

interface PrimaryProps extends ComponentProps<'button'> {
  /** Greys the label and holds the press (the form is not ready). */
  busy?: boolean;
  busyLabel?: string;
  /** The finished state: green, a tick and "You're in". */
  done?: boolean;
  doneLabel?: string;
  /** Content width rather than full width ("Try again"). */
  fit?: boolean;
}

/** The gradient call to action: idle, busy, done and off. */
export function PrimaryButton({
  busy,
  busyLabel,
  done,
  doneLabel,
  fit,
  disabled,
  children,
  className = '',
  ...rest
}: PrimaryProps) {
  const width = fit ? 'px-[26px]' : 'w-full';
  if (done) {
    return (
      <button
        type="button"
        disabled
        className={`${BASE} ${width} gap-2 bg-success font-extrabold text-fg-on-accent ${className}`}
      >
        <Check size={16} strokeWidth={2.6} aria-hidden />
        {doneLabel}
      </button>
    );
  }
  const off = disabled && !busy;
  const look = off
    ? 'border border-border bg-surface-2 text-fg-subtle'
    : 'bg-[linear-gradient(135deg,var(--signal),var(--cta-end))] text-fg-on-accent shadow-[0_8px_24px_color-mix(in_srgb,var(--signal)_20%,transparent)]';
  return (
    <button
      type="submit"
      {...rest}
      disabled={busy ? undefined : disabled}
      // Busy holds the press without `disabled`, so focus stays on the button
      // while the form is working (a disabled control drops focus to the body).
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={(evt) => {
        if (busy) {
          evt.preventDefault();
          return;
        }
        rest.onClick?.(evt);
      }}
      className={`${BASE} ${width} gap-2 ${look} ${busy ? 'gap-2.5 opacity-70' : ''} ${className}`}
    >
      {busy ? <Spinner onInk /> : null}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

interface SecondaryProps extends ComponentProps<'button'> {
  /** Borders it in the signal colour. */
  emphasis?: boolean;
}

export function SecondaryButton({
  emphasis,
  className = '',
  ...rest
}: SecondaryProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`${BASE} w-full border bg-transparent px-[18px] text-fg ${emphasis ? 'border-signal' : 'border-border-strong'} ${className}`}
    />
  );
}

/** A 44px text link: Forgot password, Use my password instead. */
export function LinkButton({
  className = '',
  ...rest
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center text-sm font-bold text-signal disabled:font-semibold disabled:text-fg-subtle ${className}`}
    />
  );
}

/** The Continue with Google button. */
export function GoogleButton({
  busy,
  ...rest
}: Omit<ComponentProps<'button'>, 'children'> & { busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={(evt) => {
        if (busy) return;
        rest.onClick?.(evt);
      }}
      className={`${BASE} w-full gap-2.5 border border-border-strong bg-[color-mix(in_srgb,var(--bg-elevated)_70%,transparent)] ${busy ? 'text-fg-muted' : 'text-fg'}`}
    >
      {busy ? <Spinner /> : <GoogleMark />}
      {busy ? COPY.google.busy : COPY.google.label}
    </button>
  );
}

/** Google's four brand colours. Theme-independent by Google's rules. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4" // fwd-allow-hex: Google brand colour
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853" // fwd-allow-hex: Google brand colour
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05" // fwd-allow-hex: Google brand colour
        d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33Z"
      />
      <path
        fill="#EA4335" // fwd-allow-hex: Google brand colour
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** "or", between Google and the email form. */
export function OrDivider() {
  return (
    <div
      className="my-0.5 flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase"
      role="separator"
    >
      <span className="h-px flex-1 bg-border" />
      {COPY.or}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** The mono "APPLIED" chip beside an invite code. */
export function AppliedChip(): ReactNode {
  return (
    <span className="inline-flex h-[22px] items-center self-start gap-[5px] rounded-md bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 font-mono text-[9.5px] leading-none font-bold tracking-[0.12em] text-success uppercase">
      <Check size={10} strokeWidth={3} aria-hidden />
      {COPY.applied}
    </span>
  );
}
