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
  it('keeps an empty live region mounted and no pill when online', () => {
    setOnline(true);
    render(<OfflinePill />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    expect(screen.queryByTestId('offline-pill')).toBeNull();
  });

  it('announces the full sentence in the live region when offline', () => {
    setOnline(false);
    render(<OfflinePill />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBeNull();
    expect(status.classList).toContain('sr-only');
    expect(status.textContent).toBe(OFFLINE_COPY.pillAria);
    // The visible pill is hidden from assistive tech so nothing reads twice.
    expect(screen.getByTestId('offline-pill').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  // jsdom applies no media queries, so this pins the breakpoint classes that
  // swap the labels: short under 360 and from 640 to 1023, full otherwise.
  it('swaps labels and sizes by breakpoint class', () => {
    setOnline(false);
    render(<OfflinePill />);
    const pill = screen.getByTestId('offline-pill').classList;
    expect(pill).toContain('whitespace-nowrap');
    expect(pill).toContain('h-[36px]');
    expect(pill).toContain('px-3');
    expect(pill).toContain('max-[359px]:h-[30px]');
    expect(pill).toContain('max-[359px]:px-2.5');
    expect(pill).toContain('sm:h-[30px]');
    expect(pill).toContain('sm:px-2.5');
    expect(pill).toContain('lg:px-[11px]');
    const full = screen.getByText(OFFLINE_COPY.pillLabel).classList;
    const short = screen.getByText(OFFLINE_COPY.pillLabelShort).classList;
    expect(full).toContain('max-[359px]:hidden');
    expect(full).toContain('sm:max-lg:hidden');
    expect(full).not.toContain('hidden');
    expect(short).toContain('hidden');
    expect(short).toContain('max-[359px]:inline');
    expect(short).toContain('sm:max-lg:inline');
  });

  it('switches to visible when the online event fires false', () => {
    setOnline(true);
    render(<OfflinePill />);
    // Initially online → no pill.
    expect(screen.queryByTestId('offline-pill')).toBeNull();
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('offline-pill')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe(OFFLINE_COPY.pillAria);
  });
});
