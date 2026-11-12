// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SaveFailedToast } from './SaveFailedToast';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Toast } from '../people/PersonParts';

const LONG = '@' + 'x'.repeat(60);

// Style contract only: jsdom has no layout, so these pin the inline
// `overflowWrap` that makes a long handle wrap; they cannot measure it.
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
