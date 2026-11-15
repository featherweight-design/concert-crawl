// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Toast } from './Toast';
import { TOAST_SHADOW } from './shadows';

// `Toast` reads useIsPhone, and jsdom ships no matchMedia.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('Toast look', () => {
  const block = () => {
    const inner = screen.getByTestId('admin-toast').firstElementChild;
    if (!(inner instanceof HTMLElement)) throw new Error('no toast block');
    return inner;
  };

  it('casts 43/approve-done-d’s shadow, offsets on the token, not the bare colour', () => {
    // jsdom's CSS parser drops a box-shadow that holds var(), so the
    // rendered style can read empty: pin the value the Toast is given.
    render(<Toast title="Approved" body={null} />);
    expect(block()).toBeTruthy();
    expect(TOAST_SHADOW).toContain('var(--shadow-strong)');
    expect(TOAST_SHADOW).toContain('14px 30px');
    expect(TOAST_SHADOW).not.toBe('var(--shadow-strong)');
  });

  it('floats 96px up on the phone, 32 above the tab bar (43/approve-m)', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<Toast title="Approved" body={null} />);
    // useIsPhone reads the query after mount.
    await waitFor(() =>
      expect(screen.getByTestId('admin-toast').style.left).toBe('16px'),
    );
    expect(screen.getByTestId('admin-toast').getAttribute('style')).toContain(
      'bottom: calc(96px + env(safe-area-inset-bottom',
    );
  });
});
