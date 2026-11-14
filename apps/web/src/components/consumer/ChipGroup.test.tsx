// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ChipGroup } from './ChipGroup';

afterEach(() => {
  cleanup();
});

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
];

describe('ChipGroup', () => {
  it('renders the label without an asterisk when req is omitted', () => {
    render(
      <ChipGroup
        label="Vendor"
        options={options}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Vendor')).toBeDefined();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('renders an accent-colored asterisk after the label when req=true', () => {
    render(
      <ChipGroup
        label="Vendor"
        options={options}
        value={null}
        onChange={vi.fn()}
        req
      />,
    );
    const asterisk = screen.getByText('*') as HTMLElement;
    expect(asterisk).toBeDefined();
    // The asterisk uses var(--accent) per FormLabel `req` contract (property
    // table §3 "Vendor block — DEMOTED BUT REQUIRED" + copy.ts:1111 note).
    expect(asterisk.style.color).toBe('var(--accent)');
  });

  it('marks the asterisk aria-hidden so screen readers do not announce it', () => {
    render(
      <ChipGroup
        label="Vendor"
        options={options}
        value={null}
        onChange={vi.fn()}
        req
      />,
    );
    const asterisk = screen.getByText('*');
    expect(asterisk.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ChipGroup — per-option disabled', () => {
  const OPTIONS = [
    { value: 'GA', label: 'GA' },
    { value: 'VIP', label: 'VIP', disabled: true },
  ];

  it('disables only the flagged option and swallows its clicks', () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        label="Tier"
        options={OPTIONS}
        value={null}
        onChange={onChange}
      />,
    );
    const gaButton = screen.getByText('GA').closest('button');
    const vipButton = screen.getByText('VIP').closest('button');
    expect(gaButton?.disabled).toBe(false);
    expect(vipButton?.disabled).toBe(true);
    fireEvent.click(vipButton!);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(gaButton!);
    expect(onChange).toHaveBeenCalledWith('GA');
  });

  it('group-level disabled still disables every option', () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        label="Tier"
        options={[{ value: 'GA', label: 'GA' }]}
        value={null}
        onChange={onChange}
        disabled
      />,
    );
    const gaButton = screen.getByText('GA').closest('button');
    expect(gaButton?.disabled).toBe(true);
  });
});

// The price sheet's board look (more-p-submit_two_m): sentence-case Inter
// label, and a chip taken in another tier card drawn struck through.
describe('ChipGroup — board look', () => {
  it('draws the label in Inter, not mono caps', () => {
    render(
      <ChipGroup
        label="Tier"
        options={[{ value: 'GA', label: 'GA' }]}
        value={null}
        onChange={vi.fn()}
        look="board"
      />,
    );
    const label = screen.getByText('Tier');
    expect(label.style.fontFamily).toBe('var(--font-ui)');
    expect(label.style.textTransform).toBe('');
  });

  it('strikes through a chip disabled for its own option, not a group lock', () => {
    const { rerender } = render(
      <ChipGroup
        label="Tier"
        options={[{ value: 'VIP', label: 'VIP', disabled: true }]}
        value={null}
        onChange={vi.fn()}
        look="board"
      />,
    );
    expect(screen.getByText('VIP').closest('button')?.className).toContain(
      'line-through',
    );
    rerender(
      <ChipGroup
        label="Tier"
        options={[{ value: 'VIP', label: 'VIP' }]}
        value={null}
        onChange={vi.fn()}
        look="board"
        disabled
      />,
    );
    expect(screen.getByText('VIP').closest('button')?.className).not.toContain(
      'line-through',
    );
  });

  it('keeps the plain look unless asked', () => {
    render(
      <ChipGroup
        label="Tier"
        options={[{ value: 'GA', label: 'GA' }]}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Tier').style.textTransform).toBe('uppercase');
  });
});
