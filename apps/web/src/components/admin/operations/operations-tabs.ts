/**
 * Operations' tabs, outside the client module so the server page and its
 * loading skeleton can read them: a server component importing from a
 * `'use client'` file gets a client reference, not the value.
 * Emails joins between them once its tab is built.
 */
export const OPERATIONS_TABS = ['feedback', 'log'] as const;
export type OperationsTab = (typeof OPERATIONS_TABS)[number];

export const operationsTabOf = (value: unknown): OperationsTab =>
  value === 'log' ? 'log' : 'feedback';
