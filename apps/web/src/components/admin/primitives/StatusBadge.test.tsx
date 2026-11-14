// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

afterEach(cleanup);

describe('StatusBadge filled', () => {
  it('is a 14% tint with no ring and a plain dot, as the panel boards draw it', () => {
    render(
      <StatusBadge kind="success" variant="filled" dot>
        Live
      </StatusBadge>,
    );
    const chip = screen.getByText('Live');
    expect(chip.style.background).toContain('14%');
    expect(chip.style.border).toBe('none');
    expect(chip.style.fontSize).toBe('12px');
    const dot = chip.querySelector('span');
    expect(dot?.style.boxShadow).toBe('');
  });

  it('leaves the soft and outline variants as they were', () => {
    render(
      <StatusBadge kind="success" variant="outline" dot>
        Quiet
      </StatusBadge>,
    );
    const chip = screen.getByText('Quiet');
    expect(chip.style.background).toBe('transparent');
    expect(chip.style.border).toContain('1px solid');
    expect(chip.querySelector('span')?.style.boxShadow).not.toBe('');
  });
});
