// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { OfflinePill } from '../OfflinePill';

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

  it('stays on one line and ellipsises its label rather than wrapping (320px)', () => {
    setOnline(false);
    render(<OfflinePill />);
    const status = screen.getByRole('status');
    expect(status.className).toContain('whitespace-nowrap');
    expect(status.className).toContain('min-w-0');
    expect(status.querySelector('.truncate')?.textContent).toMatch(/offline/i);
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
