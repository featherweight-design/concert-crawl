'use client';

/** The Details tab's building blocks: a labelled field and a two-up row. */

import type { ReactNode } from 'react';
import { errorStyle, fieldLabel, hintStyle } from '../source/source-parts';

/** A label over its input, then the input's error, else its hint. */
export const Field = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) => (
  <div style={{ minWidth: 0 }}>
    <label htmlFor={id} style={fieldLabel}>
      {label}
    </label>
    {children}
    {error !== undefined ? (
      <div role="alert" style={errorStyle}>
        {error}
      </div>
    ) : (
      hint !== undefined && <div style={hintStyle}>{hint}</div>
    )}
  </div>
);

/** Two fields side by side on desktop (`details-d`), stacked on phone (`details-m`). */
export const Pair = ({
  phone,
  children,
}: {
  phone: boolean;
  children: ReactNode;
}) =>
  phone ? (
    <>{children}</>
  ) : (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 10,
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
