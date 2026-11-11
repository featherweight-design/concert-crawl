// @vitest-environment jsdom

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from './StatusChip';

const chipFor = (label: string) => {
  const chip = screen.getByText(label).closest<HTMLElement>('span[style]');
  if (!chip) throw new Error(`no chip for ${label}`);
  return chip;
};

describe('StatusChip', () => {
  it.each([
    ['soldout', '--accent'],
    ['postponed', '--warning'],
    ['cancelled', '--danger'],
    ['available', '--success'],
  ] as const)('colors %s with %s', (status, token) => {
    render(<StatusChip status={status} label={status} />);
    expect(chipFor(status).style.color).toBe(`var(${token})`);
  });

  it('is solid when confirmed and dashed while pending', () => {
    const { rerender } = render(
      <StatusChip status="cancelled" label="Cancelled" />,
    );
    expect(chipFor('Cancelled').style.borderStyle).toBe('solid');
    rerender(<StatusChip status="cancelled" label="Cancelled" pending />);
    expect(chipFor('Cancelled').style.borderStyle).toBe('dashed');
  });

  it('draws no longer listed grey and dashed', () => {
    render(<StatusChip status="removed" label="No longer listed" />);
    const chip = chipFor('No longer listed');
    expect(chip.style.color).toBe('var(--fg-muted)');
    expect(chip.style.borderStyle).toBe('dashed');
  });
});
