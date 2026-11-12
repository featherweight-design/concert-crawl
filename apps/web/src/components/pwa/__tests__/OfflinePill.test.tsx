// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { OfflinePill } from '../OfflinePill';
import { OFFLINE_COPY } from '../definitions/copy';

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
  });
};

afterEach(() => {
  cleanup();
  setOnline(true);
});

describe('OfflinePill', () => {
  it('renders nothing when online', () => {
    setOnline(true);
    const { container } = render(<OfflinePill />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a status with the pill label when offline', () => {
    setOnline(false);
    render(<OfflinePill />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toMatch(/offline/i);
  });

  // jsdom applies no media queries, so this pins the breakpoint classes that
  // swap the labels: the full label hides below 360, the short one shows there.
  it('swaps to the short label below 360px via its breakpoint classes', () => {
    setOnline(false);
    render(<OfflinePill />);
    expect(screen.getByRole('status').classList).toContain('whitespace-nowrap');
    const full = screen.getByText(OFFLINE_COPY.pillLabel).classList;
    const short = screen.getByText(OFFLINE_COPY.pillLabelShort).classList;
    expect(full).toContain('max-[360px]:hidden');
    expect(full).not.toContain('hidden');
    expect(short).toContain('hidden');
    expect(short).toContain('max-[360px]:inline');
  });

  it('switches to visible when the online event fires false', () => {
    setOnline(true);
    render(<OfflinePill />);
    // Initially online → nothing.
    expect(screen.queryByRole('status')).toBeNull();
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).not.toBeNull();
  });
});
