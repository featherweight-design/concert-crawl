// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { TierAlternateRow } from './TierAlternateRow';

afterEach(() => {
  cleanup();
});

describe('TierAlternateRow', () => {
  it('renders boxoffice kind with gold dot', () => {
    const { container } = render(
      <TierAlternateRow
        tier="GA"
        vendor="Bluebird"
        floor={25}
        kind="boxoffice"
      />,
    );
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot!.style.background).toBe('var(--warning)');
  });

  it('renders community kind with a signal dot', () => {
    const { container } = render(
      <TierAlternateRow tier="GA" vendor="AXS" floor={30} kind="community" />,
    );
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot!.style.background).toBe('var(--signal)');
  });

  it('renders resale kind with a danger dot', () => {
    const { container } = render(
      <TierAlternateRow
        tier="VIP"
        vendor="StubHub"
        floor={150}
        kind="resale"
      />,
    );
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot!.style.background).toBe('var(--danger)');
    expect(screen.getByText('StubHub')).toBeDefined();
    expect(screen.getByText('$150')).toBeDefined();
  });

  it('renders null kind with muted dot', () => {
    const { container } = render(
      <TierAlternateRow tier="GA" vendor="Unknown" floor={20} kind={null} />,
    );
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot!.style.background).toBe('var(--fg-muted)');
  });
});
