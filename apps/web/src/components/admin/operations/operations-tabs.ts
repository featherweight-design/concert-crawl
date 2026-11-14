/**
 * Operations' tabs, outside the client module so the server page and its
 * loading skeleton can read them: a server component importing from a
 * `'use client'` file gets a client reference, not the value.
 */
export const OPERATIONS_TABS = ['feedback', 'emails', 'log'] as const;
export type OperationsTab = (typeof OPERATIONS_TABS)[number];

const isOperationsTab = (value: unknown): value is OperationsTab =>
  OPERATIONS_TABS.some((tab) => tab === value);

export const operationsTabOf = (value: unknown): OperationsTab =>
  isOperationsTab(value) ? value : 'feedback';
