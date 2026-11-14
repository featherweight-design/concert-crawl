// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SaveFailedToast } from './SaveFailedToast';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Toast } from '../people/PersonParts';

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
