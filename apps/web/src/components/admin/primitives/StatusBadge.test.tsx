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
    // jsdom normalises `border: none`, so pin that no 1px ring is drawn.
    expect(chip.style.border).not.toContain('1px solid');
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

describe('StatusBadge size="tile"', () => {
  it('is the Health boards’ 22px pill at 11.5px, 0 9px, with a plain dot', () => {
    render(
      <StatusBadge kind="danger" dot size="tile">
        Missed
      </StatusBadge>,
    );
    const chip = screen.getByText('Missed');
    expect(chip.style.height).toBe('22px');
    expect(chip.style.boxSizing).toBe('border-box');
    expect(chip.style.fontSize).toBe('11.5px');
    expect(chip.style.padding).toBe('0px 9px');
    expect(chip.style.borderRadius).toBe('999px');
    expect(chip.querySelector('span')?.style.width).toBe('6px');
    expect(chip.querySelector('span')?.style.boxShadow).toBe('');
  });

  it('leaves the default size unchanged', () => {
    render(<StatusBadge kind="danger">Failed</StatusBadge>);
    const chip = screen.getByText('Failed');
    expect(chip.style.height).toBe('');
    expect(chip.style.fontSize).toBe('11px');
    expect(chip.style.padding).toBe('2px 8px');
  });
});
