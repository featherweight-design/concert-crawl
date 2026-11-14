'use client';

/** The Source tab's building blocks: shared field styles, Card, Row, and its radio controls. */

import type { CSSProperties, ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { ReadMode } from './source-rules';

const COPY = ADMIN_COPY.venueSource;

export const fieldLabel: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
  display: 'block',
};
/** An Advanced row's own label (`G4/source-advanced-open`). */
export const advancedLabel: CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: 'var(--fg)',
  display: 'block',
};
/** Each Advanced row is its own section under a rule. */
export const advancedRow = (last: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: last ? '12px 0 0' : '12px 0',
  borderTop: '1px solid var(--border)',
});
export const hintStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--fg-subtle)',
  marginTop: 5,
};
/** An Advanced row's hint: the row's 8px gap spaces it, not a margin. */
export const advancedHint: CSSProperties = {
  ...hintStyle,
  marginTop: 0,
  lineHeight: 1.4,
};
export const errorStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--danger)',
  marginTop: 5,
};
export const inputStyle = (invalid: boolean, mono = false): CSSProperties => ({
  width: '100%',
  height: 38,
  boxSizing: 'border-box',
  borderRadius: 10,
  border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
  background: 'var(--bg)',
  color: 'var(--fg)',
  padding: '0 12px',
  fontSize: mono ? 12.5 : 13.5,
  fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
  minWidth: 0,
});

/** A card: title, then its body (`04/venue-source`). */
export const Card = ({
  title,
  phone,
  testId,
  warning = false,
  children,
}: {
  title: string;
  phone: boolean;
  testId: string;
  warning?: boolean;
  children: ReactNode;
}) => (
  <section
    data-testid={testId}
    aria-label={title}
    style={{
      borderRadius: 14,
      border: `1px solid ${
        warning
          ? 'color-mix(in srgb, var(--warning) 45%, transparent)'
          : 'var(--border)'
      }`,
      background: warning
        ? 'color-mix(in srgb, var(--warning) 5%, var(--bg-elevated))'
        : 'var(--bg-elevated)',
      padding: phone ? 14 : '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 0,
    }}
  >
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
    {children}
  </section>
);

/** A read-only row: label left, value right, a rule above. */
export const Row = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 13,
      padding: '8px 0',
      borderTop: '1px solid var(--border)',
    }}
  >
    <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
    <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
      {children}
    </span>
  </div>
);

/** Native radios, drawn as a segmented control (`G4/source-advanced-open`). */
export function Segments<T extends string>({
  name,
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  disabled: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'flex',
        padding: 3,
        gap: 3,
        borderRadius: 10,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <label
            key={option.value}
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 32,
              boxSizing: 'border-box',
              padding: '0 10px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: on ? 'var(--bg-elevated)' : 'transparent',
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={on}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

/** Native radios, drawn as pill chips that wrap (`G4/source-feed-edited`). */
export function Chips<T extends string>({
  name,
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  disabled: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <label
            key={option.value}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              height: 32,
              padding: '0 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...(on
                ? {
                    border: '1px solid transparent',
                    background:
                      'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
                    color: 'var(--fg)',
                  }
                : {
                    border: '1px solid var(--border)',
                    color: 'var(--fg-muted)',
                  }),
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={on}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

/** One of How we read it's radios. */
export const ModeRadio = ({
  name,
  mode,
  checked,
  sub,
  disabled,
  onPick,
}: {
  name: string;
  mode: ReadMode;
  checked: boolean;
  sub: string;
  disabled: boolean;
  onPick: (mode: ReadMode) => void;
}) => (
  <label
    style={{
      position: 'relative',
      display: 'flex',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...(checked
        ? {
            border: '1px solid transparent',
            background:
              'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
          }
        : { border: '1px solid var(--border)' }),
    }}
  >
    <input
      type="radio"
      name={name}
      value={mode}
      checked={checked}
      disabled={disabled}
      onChange={() => onPick(mode)}
      aria-labelledby={`${name}-${mode}-label`}
      aria-describedby={`${name}-${mode}-sub`}
      className="sr-only"
    />
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        marginTop: 2,
        flex: 'none',
        borderRadius: '50%',
        border: `1.5px solid ${checked ? 'var(--signal)' : 'var(--border-strong)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--signal)',
          }}
        />
      )}
    </span>
    <span>
      <span
        id={`${name}-${mode}-label`}
        style={{ display: 'block', fontSize: 14, fontWeight: 600 }}
      >
        {COPY.read.modes[mode].label}
      </span>
      <span
        id={`${name}-${mode}-sub`}
        style={{
          display: 'block',
          fontSize: 12.5,
          color: 'var(--fg-muted)',
          marginTop: 2,
          lineHeight: 1.4,
        }}
      >
        {sub}
      </span>
    </span>
  </label>
);
