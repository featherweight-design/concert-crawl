'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { EXPIRY_CHOICES, type ExpiryChoice } from './code-rules';

const COPY = ADMIN_COPY.codesPage.form;

export const INPUT: CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg)',
  color: 'var(--fg)',
  fontSize: 13.5,
  boxSizing: 'border-box',
};

export const Hint = ({
  children,
  tone = 'var(--fg-subtle)',
  id,
}: {
  children: ReactNode;
  tone?: string;
  id?: string;
}) => (
  <div id={id} style={{ fontSize: 12, color: tone, marginTop: 5 }}>
    {children}
  </div>
);

export const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) => (
  <div>
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        marginBottom: 6,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const pillStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1px solid transparent' : '1px solid var(--border)',
  background: on
    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
    : 'var(--surface-1)',
});

/** Arrow keys that move a radio group's choice, and which way. */
const ARROW_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * One-of-many pills (`07/edit-an-invite-code`), as a radio group: one Tab
 * stop (the checked pill), and the arrow keys move the choice.
 */
export const Pills = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
    onKeyDown={(evt) => {
      const step = ARROW_STEP[evt.key];
      if (step === undefined) return;
      evt.preventDefault();
      const at = options.findIndex((option) => option.value === value);
      const next = options[(at + step + options.length) % options.length];
      if (!next) return;
      onChange(next.value);
      const group = evt.currentTarget;
      // Focus follows the choice once it has rendered as checked.
      requestAnimationFrame(() =>
        group
          .querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
          ?.focus(),
      );
    }}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        tabIndex={option.value === value ? 0 : -1}
        onClick={() => onChange(option.value)}
        style={pillStyle(option.value === value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/** The expiry pills, with "Keep {date}" first when `keepDate` is given. */
export const ExpiryPills = ({
  value,
  onChange,
  keepDate,
}: {
  value: ExpiryChoice;
  onChange: (next: ExpiryChoice) => void;
  keepDate?: string | null;
}) => (
  <Field label={COPY.expires}>
    <Pills
      label={COPY.expires}
      value={value}
      onChange={onChange}
      options={[
        ...(keepDate
          ? [{ value: 'keep' as const, label: COPY.keep(keepDate) }]
          : []),
        ...EXPIRY_CHOICES.map((choice) => ({
          value: choice,
          label: COPY.expiry[choice],
        })),
      ]}
    />
  </Field>
);

export type SeatsChoice = `${number}` | 'other';

/**
 * Seats pills plus Other's number field. `typed` is Other's text; the parsed
 * count is the caller's, so the floor error can sit under it.
 */
export const SeatsField = ({
  presets,
  choice,
  typed,
  onChoice,
  onTyped,
  hint,
  error,
  inputRef,
}: {
  presets: readonly number[];
  choice: SeatsChoice;
  typed: string;
  onChoice: (next: SeatsChoice) => void;
  onTyped: (next: string) => void;
  hint: string;
  error: string | null;
  inputRef?: React.Ref<HTMLInputElement>;
}) => (
  <Field label={COPY.seats}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Pills<SeatsChoice>
        label={COPY.seats}
        value={choice}
        onChange={onChoice}
        options={[
          ...presets.map((seats) => ({
            value: `${seats}` as const,
            label: String(seats),
          })),
          { value: 'other', label: COPY.other },
        ]}
      />
      {choice === 'other' && (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          aria-label={COPY.otherLabel}
          aria-invalid={error ? true : undefined}
          value={typed}
          onChange={(evt) => onTyped(evt.target.value)}
          style={{
            ...INPUT,
            width: 96,
            height: 32,
            borderColor: error ? 'var(--danger)' : 'var(--border-strong)',
          }}
        />
      )}
    </div>
    {error ? <Hint tone="var(--danger)">{error}</Hint> : null}
    <Hint>{hint}</Hint>
  </Field>
);
