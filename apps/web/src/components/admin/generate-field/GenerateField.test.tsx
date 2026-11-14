// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { GenerateField } from './GenerateField';

const COPY = ADMIN_COPY.generateField;

describe('GenerateField', () => {
  afterEach(cleanup);

  it('disabled holds Accept and Regenerate, but never Discard', () => {
    render(
      <GenerateField
        state="review"
        result={{ content: 'A drafted line.' }}
        disabled
        onGenerate={vi.fn()}
        onRegenerate={vi.fn()}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    const button = (name: string) => screen.getByRole('button', { name });
    expect(button(COPY.review.accept)).toHaveProperty('disabled', true);
    expect(button(COPY.review.regenerate)).toHaveProperty('disabled', true);
    expect(button(COPY.review.discard)).toHaveProperty('disabled', false);
  });

  it('is live by default', () => {
    render(
      <GenerateField
        state="review"
        result={{ content: 'A drafted line.' }}
        onGenerate={vi.fn()}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: COPY.review.accept }),
    ).toHaveProperty('disabled', false);
  });
});
