// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Toast } from './Toast';

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
    render(<Toast title="Approved" body={null} />);
    const shadow = block().style.boxShadow;
    expect(shadow).toContain('var(--shadow-strong)');
    expect(shadow).toContain('14px 30px');
    expect(shadow).not.toBe('var(--shadow-strong)');
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
