'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { EXPIRY_CHOICES, type ExpiryChoice } from './code-rules';

const COPY = ADMIN_COPY.codesPage.form;

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

/** One-of-many pills (`07/edit-an-invite-code`), as a radio group. */
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
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
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
