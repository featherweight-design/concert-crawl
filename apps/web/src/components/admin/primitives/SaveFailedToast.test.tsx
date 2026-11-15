// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { SaveFailedToast } from './SaveFailedToast';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Toast } from './Toast';

const LONG = '@' + 'x'.repeat(60);

// Style contract only: jsdom has no layout, so these pin the inline
// `overflowWrap` that makes a long handle wrap; they cannot measure it.
// `Toast` reads useIsPhone, and jsdom ships no matchMedia.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('admin toasts set overflowWrap anywhere on their text', () => {
  it('SaveFailedToast title and body wrap anywhere', () => {
    render(
      <SaveFailedToast
        what={LONG}
        saved={`${LONG} is still Beta.`}
        onRetry={vi.fn()}
      />,
    );
    const copy = ADMIN_COPY.states.saveFailed;
    expect(screen.getByText(copy.title(LONG)).style.overflowWrap).toBe(
      'anywhere',
    );
    expect(
      screen.getByText(copy.body(`${LONG} is still Beta.`)).style.overflowWrap,
    ).toBe('anywhere');
  });

  it('people Toast title and body wrap anywhere', () => {
    render(<Toast title={`${LONG} is now Beta`} body="Body copy." />);
    expect(screen.getByText(`${LONG} is now Beta`).style.overflowWrap).toBe(
      'anywhere',
    );
    expect(screen.getByText('Body copy.').style.overflowWrap).toBe('anywhere');
  });
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

describe('SaveFailedToast look', () => {
  const cross = (toast: HTMLElement) => toast.querySelector('svg');

  it('draws 07/save-failed by default: gap 12, cross stroke 2', () => {
    render(<SaveFailedToast title="Couldn’t" body="Nothing changed." />);
    const toast = screen.getByTestId('save-failed');
    expect(toast.style.gap).toBe('12px');
    expect(cross(toast)?.getAttribute('stroke-width')).toBe('2');
  });

  it('takes crawl-all-failed-m’s gap 10 and stroke 2.2 when passed', () => {
    render(
      <SaveFailedToast
        title="Couldn’t"
        body="Nothing was queued."
        gap={10}
        crossStroke={2.2}
      />,
    );
    const toast = screen.getByTestId('save-failed');
    expect(toast.style.gap).toBe('10px');
    expect(cross(toast)?.getAttribute('stroke-width')).toBe('2.2');
  });
});
