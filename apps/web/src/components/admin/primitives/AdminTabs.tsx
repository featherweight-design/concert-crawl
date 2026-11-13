'use client';

import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

export interface AdminTab<K extends string> {
  key: K;
  label: ReactNode;
}

export interface AdminTabsProps<K extends string> {
  tabs: readonly AdminTab<K>[];
  value: K;
  onChange: (next: K) => void;
  /** The tablist's accessible name. */
  label: string;
  /** Each tab's element id, which its panel's `aria-labelledby` names. */
  tabId: (key: K) => string;
  /** The panel each tab controls. Several tabs may share one panel. */
  panelId: (key: K) => string;
  /** `underline`: tabs over a rule. `segments`: the phone's segmented control. */
  variant?: 'underline' | 'segments';
  /** Underline only: the phone strip, tighter, that scrolls sideways. */
  phone?: boolean;
  /** Underline only: the gap between desktop tabs. */
  gap?: number;
  tablistRef?: RefObject<HTMLDivElement | null>;
  testId?: string;
}

/** The key that moves selection, as the WAI-ARIA tabs pattern sets them. */
const KEY_STEP: Record<string, (at: number, last: number) => number> = {
  ArrowRight: (at, last) => (at === last ? 0 : at + 1),
  ArrowLeft: (at, last) => (at === 0 ? last : at - 1),
  Home: () => 0,
  End: (_at, last) => last,
};

const listStyle = (
  variant: 'underline' | 'segments',
  phone: boolean,
  gap: number,
): CSSProperties => {
  if (variant === 'segments') {
    return {
      display: 'flex',
      padding: 3,
      borderRadius: 10,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
    };
  }
  return {
    display: 'flex',
    gap: phone ? 0 : gap,
    borderBottom: '1px solid var(--border)',
    ...(phone ? { overflowX: 'auto', overflowY: 'hidden' } : {}),
  };
};

const tabStyle = (
  variant: 'underline' | 'segments',
  phone: boolean,
  on: boolean,
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: 'none',
  ...(variant === 'segments'
    ? {
        flex: 1,
        height: 32,
        borderRadius: 7,
        fontSize: 12.5,
        fontWeight: 600,
        background: on ? 'var(--bg-elevated)' : 'transparent',
      }
    : {
        flexShrink: 0,
        height: 40,
        padding: phone ? '0 10px' : '0 14px',
        fontSize: phone ? 13.5 : 14,
        fontWeight: 600,
        background: 'transparent',
        borderBottom: `2px solid ${on ? 'var(--signal)' : 'transparent'}`,
      }),
});

/**
 * Admin tabs (the ARIA tabs pattern): one tab in the Tab order (roving
 * tabindex); arrows, Home and End move focus and select; each tab names the
 * panel it controls. The panels are the caller's, labelled by `tabId`.
 */
export const AdminTabs = <K extends string>({
  tabs,
  value,
  onChange,
  label,
  tabId,
  panelId,
  variant = 'underline',
  phone = false,
  gap = 6,
  tablistRef,
  testId,
}: AdminTabsProps<K>) => {
  const onTabKeyDown = (evt: KeyboardEvent<HTMLButtonElement>) => {
    const move = KEY_STEP[evt.key];
    if (!move) return;
    evt.preventDefault();
    const at = tabs.findIndex((tab) => tab.key === value);
    const next = tabs[move(Math.max(at, 0), tabs.length - 1)];
    if (!next) return;
    onChange(next.key);
    evt.currentTarget.ownerDocument.getElementById(tabId(next.key))?.focus();
  };
  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label={label}
      data-testid={testId}
      style={listStyle(variant, phone, gap)}
    >
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <button
            key={tab.key}
            id={tabId(tab.key)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={panelId(tab.key)}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={onTabKeyDown}
            style={tabStyle(variant, phone, on)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
